const Blueprint = require('../models/Blueprint');
const ZoneTile = require('../models/ZoneTile');
const Player = require('../models/Player');
const Item = require('../models/Item');
const PropertyStructure = require('../models/PropertyStructure');
const ActivityLog = require('../models/ActivityLog');
const { generateDefaultEstateLayout } = require('../utils/propertyManager');
const { convertToCopper, convertFromCopper } = require('../utils/currencyNormalize');

class ConstructionService {
  /**
   * Mengambil daftar blueprint yang aktif
   */
  async getBlueprints() {
    return await Blueprint.find({ isActive: true }).lean();
  }

  /**
   * Memulai proses konstruksi bangunan di atas petak tanah milik sendiri
   */
  async startConstruction(discordId, guildId, targetX, targetY, blueprintId, options = {}) {
    const player = await Player.findOne({ discordId, guildId });
    if (!player) {
      return { ok: false, error: 'Karakter pemain belum terdaftar.' };
    }

    const zoneId = options.zoneId || player.gridPosition?.zoneId || 'xingcun_village';

    // 1. Cek Blueprint
    const blueprint = await Blueprint.findOne({ blueprintId, isActive: true });
    if (!blueprint) {
      return { ok: false, error: `Cetak biru bangunan '${blueprintId}' tidak ditemukan.` };
    }

    // 2. Cek Kepemilikan Petak Tanah
    const tile = await ZoneTile.findOne({
      guildId,
      zoneId,
      tileX: targetX,
      tileY: targetY
    });

    if (!tile) {
      return { ok: false, error: `Petak tanah (${targetX}, ${targetY}) tidak ditemukan.` };
    }

    if (tile.ownerId !== discordId) {
      return { ok: false, error: 'Kamu hanya dapat mendirikan bangunan di atas petak tanah milikmu sendiri!' };
    }

    if (tile.buildingName && !tile.isUnderConstruction) {
      return { ok: false, error: `Petak tanah ini sudah memiliki bangunan berdiri: ${tile.buildingName}.` };
    }

    if (tile.isUnderConstruction) {
      return { ok: false, error: 'Petak tanah ini sedang dalam proses konstruksi bangunan lain.' };
    }

    // 3. Cek Perak
    const priceInCopper = (blueprint.requiredSilver || 0) * 100;
    const playerTotalCopper = convertToCopper(player.currency);

    if (playerTotalCopper < priceInCopper) {
      const playerSilver = Math.floor(playerTotalCopper / 100);
      return {
        ok: false,
        error: `Perak tidak mencukupi! Dibutuhkan: ${blueprint.requiredSilver} Perak, Dimiliki: ${playerSilver} Perak.`
      };
    }

    // 4. Cek dan Konsumsi Material Inventory
    if (Array.isArray(blueprint.requiredMaterials) && blueprint.requiredMaterials.length > 0) {
      // Validasi ketersediaan semua bahan terlebih dahulu
      for (const mat of blueprint.requiredMaterials) {
        let foundQty = 0;
        for (const inv of player.inventory) {
          if (mat.itemId && inv.itemId && inv.itemId.toString() === mat.itemId.toString()) {
            foundQty += inv.quantity;
          }
        }

        // Jika pencarian berdasarkan itemId tidak cukup, coba cek lewat nama Item jika ada
        if (foundQty < mat.quantity && mat.itemName) {
          const itemDocs = await Item.find({ name: new RegExp(`^${mat.itemName}$`, 'i') }).select('_id');
          const matchingIds = itemDocs.map(d => d._id.toString());
          foundQty = player.inventory
            .filter(inv => matchingIds.includes(inv.itemId?.toString()))
            .reduce((sum, inv) => sum + inv.quantity, 0);
        }

        if (foundQty < mat.quantity) {
          return {
            ok: false,
            error: `Material kurang! Memerlukan ${mat.quantity}x ${mat.itemName} (Dimiliki: ${foundQty}).`
          };
        }
      }

      // Potong Material dari Inventory
      for (const mat of blueprint.requiredMaterials) {
        let needed = mat.quantity;
        for (let i = player.inventory.length - 1; i >= 0 && needed > 0; i--) {
          const inv = player.inventory[i];
          let isMatch = (mat.itemId && inv.itemId && inv.itemId.toString() === mat.itemId.toString());
          if (!isMatch && mat.itemName) {
            const itemDoc = await Item.findById(inv.itemId).select('name');
            if (itemDoc && itemDoc.name.toLowerCase() === mat.itemName.toLowerCase()) {
              isMatch = true;
            }
          }

          if (isMatch) {
            if (inv.quantity <= needed) {
              needed -= inv.quantity;
              player.inventory.splice(i, 1);
            } else {
              inv.quantity -= needed;
              needed = 0;
            }
          }
        }
      }
    }

    // 5. Potong Perak Pemain
    const newCopper = playerTotalCopper - priceInCopper;
    player.currency = convertFromCopper(newCopper);
    await player.save();

    // 6. Pasang Status Konstruksi pada Tile
    const durationSec = options.overrideDurationSeconds != null 
      ? options.overrideDurationSeconds 
      : blueprint.buildDurationSeconds;

    const finishAt = new Date(Date.now() + durationSec * 1000);

    tile.buildingName = blueprint.name;
    tile.buildingType = blueprint.category;
    tile.isUnderConstruction = true;
    tile.constructionCompleteAt = finishAt;
    tile.isSolid = false; // Belum solid saat dibangun
    tile.isOpenToPublic = true;
    tile.label = `Konstruksi: ${blueprint.name}`;
    await tile.save();

    // 7. Audit Log
    await ActivityLog.create({
      guildId,
      discordId,
      actionType: 'asset_build',
      details: {
        zoneId,
        tileX: targetX,
        tileY: targetY,
        blueprintId: blueprint.blueprintId,
        buildingName: blueprint.name,
        silverSpent: blueprint.requiredSilver,
        finishAt
      },
      serverValidated: true
    });

    return {
      ok: true,
      blueprintName: blueprint.name,
      targetX,
      targetY,
      durationSeconds: durationSec,
      finishAt,
      remainingSilver: Math.floor(newCopper / 100)
    };
  }

  /**
   * Memeriksa dan memfinalisasi bangunan jika timer konstruksi telah selesai
   */
  async checkAndFinalizeConstruction(guildId, zoneId, targetX, targetY) {
    const tile = await ZoneTile.findOne({
      guildId,
      zoneId,
      tileX: targetX,
      tileY: targetY
    });

    if (!tile) {
      return { ok: false, error: 'Petak tidak ditemukan.' };
    }

    if (!tile.isUnderConstruction) {
      return { 
        ok: true, 
        isBuildingDone: true, 
        buildingName: tile.buildingName, 
        message: 'Bangunan sudah selesai berdiri sempurna.' 
      };
    }

    const now = new Date();
    if (now < tile.constructionCompleteAt) {
      const remainingSec = Math.ceil((tile.constructionCompleteAt.getTime() - now.getTime()) / 1000);
      return {
        ok: true,
        isBuildingDone: false,
        remainingSeconds: remainingSec,
        finishAt: tile.constructionCompleteAt,
        message: `Konstruksi ${tile.buildingName} sedang berlangsung (Sisa waktu: ${remainingSec} detik).`
      };
    }

    // Finalisasi: Bangunan Selesai!
    tile.isUnderConstruction = false;
    tile.isSolid = false; // Petak tanah utama berfungsi sebagai pintu/akses
    tile.isDoor = true;   // Berubah jadi pintu masuk interior
    tile.label = tile.buildingName;

    // Buat PropertyStructure interior
    const defaultLayout = generateDefaultEstateLayout(12, 12);
    const structure = await PropertyStructure.create({
      guildId,
      zoneId,
      tileX: targetX,
      tileY: targetY,
      ownerId: tile.ownerId,
      ownerName: tile.ownerName || 'Pendekar Pemilik',
      structureName: tile.buildingName,
      structureType: tile.buildingType || 'residence',
      interiorLayoutCompressed: defaultLayout,
      subGridWidth: 12,
      subGridHeight: 12,
      isOpenToPublic: true
    });

    tile.propertyStructureId = structure._id;
    tile.targetInteriorStructureId = structure._id;
    await tile.save();

    return {
      ok: true,
      isBuildingDone: true,
      buildingName: tile.buildingName,
      structureId: structure._id,
      message: `Selamat! Konstruksi ${tile.buildingName} telah rampung 100% dan dapat dimasuki via /masuk.`
    };
  }
}

module.exports = new ConstructionService();
