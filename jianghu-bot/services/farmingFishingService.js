const ZoneTile = require('../models/ZoneTile');
const Player = require('../models/Player');
const Item = require('../models/Item');
const ActivityLog = require('../models/ActivityLog');
const { getCurrentStamina } = require('../utils/stamina');

function awardExp(professions, expType, expGain) {
  if (!professions) professions = {};
  if (!professions[expType]) {
    professions[expType] = { level: 1, exp: 0, isUnlocked: true };
  }
  professions[expType].isUnlocked = true;
  professions[expType].exp += expGain;

  let reqExp = professions[expType].level * 100;
  let leveledUp = false;
  while (professions[expType].exp >= reqExp) {
    professions[expType].exp -= reqExp;
    professions[expType].level += 1;
    reqExp = professions[expType].level * 100;
    leveledUp = true;
  }
  return { prof: professions[expType], leveledUp };
}

class FarmingFishingService {
  /**
   * Menanam bibit tanaman pada petak tanah milik sendiri
   */
  async plantCrop(discordId, guildId, tileX, tileY, cropName, options = {}) {
    const player = await Player.findOne({ discordId, guildId });
    if (!player) return { ok: false, error: 'Karakter belum terdaftar.' };

    const zoneId = options.zoneId || player.gridPosition?.zoneId || 'xingcun_village';

    const tile = await ZoneTile.findOne({ guildId, zoneId, tileX, tileY });
    if (!tile) return { ok: false, error: 'Petak tanah tidak ditemukan.' };

    if (tile.ownerId !== discordId) {
      return { ok: false, error: 'Kamu hanya dapat menanam di atas lahan tanah milikmu sendiri!' };
    }

    if (tile.isOccupied && tile.cropPlantedAt) {
      return { ok: false, error: 'Petak tanah ini sudah ditanami bibit yang sedang tumbuh.' };
    }

    const currentStamina = getCurrentStamina(player);
    if (currentStamina < 3) {
      return { ok: false, error: 'Stamina tidak mencukupi untuk bercocok tanam (Butuh 3 Stamina).' };
    }

    // Konsumsi Stamina
    player.currentStamina = Math.max(0, currentStamina - 3);

    // Set status tanam pada tile
    const growSeconds = options.growSeconds || 60;
    const now = new Date();
    const readyAt = new Date(now.getTime() + growSeconds * 1000);

    tile.isOccupied = true;
    tile.cropPlantedAt = now;
    tile.cropReadyAt = readyAt;
    tile.cropType = cropName || 'Gandum Emas';
    tile.label = `Ladang: ${tile.cropType}`;
    await tile.save();

    // Berikan EXP Farming
    if (!player.professions) player.professions = {};
    const expResult = awardExp(player.professions, 'farming', 15);
    await player.save();

    await ActivityLog.create({
      guildId,
      discordId,
      actionType: 'farm_plant',
      details: { zoneId, tileX, tileY, cropName: tile.cropType, readyAt },
      serverValidated: true
    });

    return {
      ok: true,
      cropName: tile.cropType,
      readyAt,
      growSeconds,
      remainingStamina: player.currentStamina,
      farmingLevel: expResult.prof.level
    };
  }

  /**
   * Memanen hasil tani yang telah matang
   */
  async harvestCrop(discordId, guildId, tileX, tileY, options = {}) {
    const player = await Player.findOne({ discordId, guildId });
    if (!player) return { ok: false, error: 'Karakter belum terdaftar.' };

    const zoneId = options.zoneId || player.gridPosition?.zoneId || 'xingcun_village';

    const tile = await ZoneTile.findOne({ guildId, zoneId, tileX, tileY });
    if (!tile || !tile.cropPlantedAt) {
      return { ok: false, error: 'Tidak ada tanaman yang sedang tumbuh di petak ini.' };
    }

    if (tile.ownerId !== discordId) {
      return { ok: false, error: 'Kamu tidak berhak memanen hasil ladang milik pendekar lain!' };
    }

    const now = new Date();
    if (now < tile.cropReadyAt) {
      const waitSec = Math.ceil((tile.cropReadyAt.getTime() - now.getTime()) / 1000);
      return { 
        ok: false, 
        error: `Tanaman belum siap dipanen! Masih membutuhkan waktu ${waitSec} detik lagi untuk matang.` 
      };
    }

    // Ambil atau buat Item hasil panen di database
    const cropName = tile.cropType || 'Gandum Emas';
    let itemDoc = await Item.findOne({ guildId, name: cropName });
    if (!itemDoc) {
      itemDoc = await Item.create({
        guildId,
        name: cropName,
        type: 'material',
        rarity: 'common',
        description: 'Hasil panen pertanian segar dari ladang pemukiman.'
      });
    }

    // Tambahkan ke inventory player
    const existingSlot = player.inventory.find(i => i.itemId && i.itemId.toString() === itemDoc._id.toString());
    const harvestQty = 2;
    if (existingSlot) {
      existingSlot.quantity += harvestQty;
    } else {
      player.inventory.push({ itemId: itemDoc._id, quantity: harvestQty });
    }

    // Bersihkan status ladang
    tile.isOccupied = false;
    tile.cropPlantedAt = null;
    tile.cropReadyAt = null;
    tile.label = `Kavling Milik ${player.characterName}`;
    await tile.save();

    // EXP Farming Panen
    const expRes = awardExp(player.professions, 'farming', 30);
    await player.save();

    await ActivityLog.create({
      guildId,
      discordId,
      actionType: 'farm_harvest',
      details: { zoneId, tileX, tileY, cropName, quantity: harvestQty },
      serverValidated: true,
      itemOriginLogged: true
    });

    return {
      ok: true,
      cropName,
      quantity: harvestQty,
      farmingLevel: expRes.prof.level,
      leveledUp: expRes.leveledUp
    };
  }

  /**
   * Memancing di spot sumber daya air
   */
  async goFishing(discordId, guildId, options = {}) {
    const player = await Player.findOne({ discordId, guildId });
    if (!player) return { ok: false, error: 'Karakter belum terdaftar.' };

    const zoneId = player.gridPosition?.zoneId || 'xingcun_village';
    const px = player.gridPosition?.tileX ?? 16;
    const py = player.gridPosition?.tileY ?? 16;

    // Cari node memancing terdekat (jarak <= 1)
    const fishNode = await ZoneTile.findOne({
      guildId,
      zoneId,
      resourceType: 'fish',
      tileX: { $gte: px - 1, $lte: px + 1 },
      tileY: { $gte: py - 1, $lte: py + 1 }
    });

    if (!fishNode) {
      return { 
        ok: false, 
        error: 'Kamu tidak berada di dekat dermaga atau tepian air memancing. Dekatilah petak sungai bertanda pancing (🐟).' 
      };
    }

    const currentStamina = getCurrentStamina(player);
    if (currentStamina < 5) {
      return { ok: false, error: 'Stamina tidak mencukupi untuk memancing (Butuh 5 Stamina).' };
    }

    const now = new Date();
    if (fishNode.nodeRespawnAt && now < fishNode.nodeRespawnAt) {
      const waitSec = Math.ceil((fishNode.nodeRespawnAt.getTime() - now.getTime()) / 1000);
      return { ok: false, error: `Ikan di spot ini baru saja dijaring. Tunggu ${waitSec} detik untuk tenang kembali.` };
    }

    // Konsumsi Stamina
    player.currentStamina = Math.max(0, currentStamina - 5);

    // Tentukan Hasil Tangkapan
    const fishOptions = ['Ikan Nila Sungai', 'Ikan Mas Spiritual', 'Ikan Gurami Rawa'];
    const caughtFishName = fishOptions[Math.floor(Math.random() * fishOptions.length)];

    let fishItem = await Item.findOne({ guildId, name: caughtFishName });
    if (!fishItem) {
      fishItem = await Item.create({
        guildId,
        name: caughtFishName,
        type: 'material',
        rarity: 'common',
        description: 'Ikan segar kaya Qi yang berhasil dipancing dari aliran sungai.'
      });
    }

    const existingSlot = player.inventory.find(i => i.itemId && i.itemId.toString() === fishItem._id.toString());
    if (existingSlot) {
      existingSlot.quantity += 1;
    } else {
      player.inventory.push({ itemId: fishItem._id, quantity: 1 });
    }

    // Set Cooldown Node (10 detik)
    fishNode.nodeRespawnAt = new Date(now.getTime() + 10 * 1000);
    await fishNode.save();

    // EXP Fishing
    if (!player.professions) player.professions = {};
    const expRes = awardExp(player.professions, 'fishing', 20);
    await player.save();

    await ActivityLog.create({
      guildId,
      discordId,
      actionType: 'fish_catch',
      details: { zoneId, tileX: fishNode.tileX, tileY: fishNode.tileY, fishName: caughtFishName },
      serverValidated: true,
      itemOriginLogged: true
    });

    return {
      ok: true,
      fishName: caughtFishName,
      quantity: 1,
      fishingLevel: expRes.prof.level,
      remainingStamina: player.currentStamina,
      leveledUp: expRes.leveledUp
    };
  }
}

module.exports = new FarmingFishingService();
