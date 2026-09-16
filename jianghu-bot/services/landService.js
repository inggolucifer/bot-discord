const ZoneTile = require('../models/ZoneTile');
const Player = require('../models/Player');
const ActivityLog = require('../models/ActivityLog');

const MAX_PLOTS_PER_PLAYER = 3;

class LandService {
  /**
   * Mengambil daftar seluruh kavling tanah yang dapat dibeli di suatu zona
   */
  async getAvailablePlots(guildId, zoneId) {
    return await ZoneTile.find({
      guildId,
      zoneId,
      isClaimable: true,
      ownerId: null
    }).sort({ tileY: 1, tileX: 1 }).lean();
  }

  /**
   * Mengambil seluruh petak tanah yang dimiliki oleh pemain
   */
  async getPlayerLands(guildId, discordId) {
    return await ZoneTile.find({
      guildId,
      ownerId: discordId
    }).sort({ zoneId: 1, tileY: 1, tileX: 1 }).lean();
  }

  /**
   * Membeli kavling tanah dengan proteksi anti-race condition dan anti-monopoli
   */
  async purchaseLandPlot(discordId, guildId, targetX, targetY, targetZoneId = null) {
    const player = await Player.findOne({ discordId, guildId });
    if (!player) {
      return { ok: false, error: 'Karakter pemain belum terdaftar.' };
    }

    const zoneId = targetZoneId || player.gridPosition?.zoneId || 'xingcun_village';

    // 1. Validasi Batas Maksimal Kepemilikan Lahan (Anti-Monopoli)
    const ownedCount = await ZoneTile.countDocuments({ guildId, ownerId: discordId });
    if (ownedCount >= MAX_PLOTS_PER_PLAYER) {
      return {
        ok: false,
        error: `Kamu telah mencapai batas maksimal kepemilikan tanah (${MAX_PLOTS_PER_PLAYER} petak). Kamu tidak dapat membeli petak tambahan.`
      };
    }

    // 2. Cari petak tanah target
    let tile = await ZoneTile.findOne({
      guildId,
      zoneId,
      tileX: targetX,
      tileY: targetY
    });

    // Jika tile belum tersimpan di DB, cek dari procedural engine untuk zona master 5000x5000
    if (!tile) {
      const proceduralWorldEngine = require('../utils/proceduralWorldEngine');
      const pTile = proceduralWorldEngine.getTileAt(targetX, targetY);
      if (pTile && pTile.isClaimable && !pTile.isSolid) {
        tile = new ZoneTile({
          guildId,
          zoneId,
          tileX: targetX,
          tileY: targetY,
          tileType: 'buildable_plot',
          terrainType: pTile.terrainType || 'plains',
          isClaimable: true,
          isSolid: false,
          plotPriceSilver: 100
        });
        await tile.save();
      }
    }

    if (!tile) {
      return { ok: false, error: `Petak tanah pada koordinat (${targetX}, ${targetY}) tidak ditemukan di ${zoneId}.` };
    }

    if (!tile.isClaimable && tile.tileType !== 'buildable_plot') {
      return { ok: false, error: 'Petak tanah ini adalah fasilitas umum atau wilayah alam yang tidak dapat diperjualbelikan.' };
    }

    if (tile.ownerId) {
      const ownerLabel = tile.ownerId === discordId ? 'kamu sendiri' : (tile.ownerName || 'pemain lain');
      return { ok: false, error: `Petak tanah ini sudah dimiliki oleh ${ownerLabel}.` };
    }

    const { convertToCopper, convertFromCopper } = require('../utils/currencyNormalize');
    const priceSilver = tile.plotPriceSilver || 100;
    const priceInCopper = priceSilver * 100;
    const playerTotalCopper = convertToCopper(player.currency);

    if (playerTotalCopper < priceInCopper) {
      const currentSilverEq = Math.floor(playerTotalCopper / 100);
      return {
        ok: false,
        error: `Perak tidak mencukupi! Harga tanah: ${priceSilver} Perak, Kekayaan milikmu: ${currentSilverEq} Perak.`
      };
    }

    // 3. Operasi Atomik Database (Mencegah Race Condition / Dobel Klaim)
    const claimedPlot = await ZoneTile.findOneAndUpdate(
      {
        _id: tile._id,
        ownerId: null,
        isClaimable: true
      },
      {
        $set: {
          ownerId: discordId,
          ownerType: 'player',
          ownerName: player.characterName,
          label: `Kavling Milik ${player.characterName}`,
          isOpenToPublic: true
        }
      },
      { new: true }
    );

    if (!claimedPlot) {
      // Race condition terpicu: pemain lain berhasil klaim tepat di saat yang sama
      return {
        ok: false,
        error: 'Kavling tanah ini baru saja dibeli oleh pendekar lain! Transaksi dibatalkan.'
      };
    }

    // 4. Potong Kekayaan Pemain secara presisi
    const newCopperBalance = playerTotalCopper - priceInCopper;
    player.currency = convertFromCopper(newCopperBalance);
    await player.save();

    const remainingSilverEq = Math.floor(newCopperBalance / 100);

    // 5. Catat ke ActivityLog (Audit Trail Anti-Cheat)
    await ActivityLog.create({
      guildId,
      discordId,
      actionType: 'land_buy',
      details: {
        zoneId,
        tileX: targetX,
        tileY: targetY,
        plotPriceSilver: priceSilver,
        characterName: player.characterName
      },
      serverValidated: true
    });

    return {
      ok: true,
      plot: claimedPlot,
      pricePaid: priceSilver,
      remainingSilver: remainingSilverEq,
      totalOwnedPlots: ownedCount + 1
    };
  }
}

module.exports = new LandService();
