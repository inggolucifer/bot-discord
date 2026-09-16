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

    const { getLandPriceForPlayer } = require('../utils/landPriceEngine');
    const { convertToCopper, convertFromCopper } = require('../utils/currencyNormalize');

    const ownedPlotsCount = await ZoneTile.countDocuments({ ownerId: discordId });
    const priceInfo = getLandPriceForPlayer(ownedPlotsCount);

    const playerTotalCopper = convertToCopper(player.currency);
    if (playerTotalCopper < priceInfo.priceInCopper) {
      return {
        ok: false,
        error: `Dana tidak mencukupi! Dibutuhkan ${priceInfo.label} untuk membeli tanah ke-${priceInfo.plotNumber}. Kekayaanmu belum mencukupi.`
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
          plotPriceLabel: priceInfo.label,
          plotPriceSilver: Math.floor(priceInfo.priceInCopper / 100),
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
    const newCopperBalance = playerTotalCopper - priceInfo.priceInCopper;
    player.currency = convertFromCopper(newCopperBalance);
    await player.save();

    const priceSilver = Math.floor(priceInfo.priceInCopper / 100);
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
      priceLabel: priceInfo.label,
      remainingSilver: remainingSilverEq,
      totalOwnedPlots: ownedPlotsCount + 1
    };
  }

  /**
   * Auto-resolusi status konstruksi bangunan yang telah melewati waktu pengerjaan
   * Mengubah isUnderConstruction -> false, isOccupied -> true, dan aset player -> active
   */
  async resolveZoneConstruction(zoneId, guildId) {
    try {
      const now = new Date();
      const query = {
        zoneId,
        isUnderConstruction: true,
        $or: [
          { constructionCompleteAt: { $lte: now } },
          { constructionCompleteAt: null }
        ]
      };
      if (guildId) {
        query.$or.push({ guildId, isUnderConstruction: true, constructionCompleteAt: { $lte: now } });
      }

      const expiredPlots = await ZoneTile.find(query);
      if (expiredPlots.length > 0) {
        for (const plot of expiredPlots) {
          plot.isUnderConstruction = false;
          plot.isOccupied = true;
          if (plot.buildingName) {
            plot.label = `${plot.buildingName} (${plot.ownerName || 'Pemain'})`;
          }
          await plot.save();
        }

        const Player = require('../models/Player');
        await Player.updateMany(
          {
            'assets.placement.zoneId': zoneId,
            'assets.status': 'building',
            $or: [
              { 'assets.constructionCompleteAt': { $lte: now } },
              { 'assets.constructionCompleteAt': null }
            ]
          },
          {
            $set: { 'assets.$[elem].status': 'active' }
          },
          {
            arrayFilters: [
              {
                'elem.status': 'building',
                $or: [
                  { 'elem.constructionCompleteAt': { $lte: now } },
                  { 'elem.constructionCompleteAt': null }
                ]
              }
            ]
          }
        );
      }
      return { resolvedCount: expiredPlots.length };
    } catch (err) {
      console.warn('[LAND-SERVICE] resolveZoneConstruction warning:', err.message);
      return { resolvedCount: 0, error: err.message };
    }
  }
}

module.exports = new LandService();
