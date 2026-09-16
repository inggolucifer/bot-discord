const GridZone = require('../models/GridZone');
const ZoneTile = require('../models/ZoneTile');

/**
 * Service pengelola spasial GridZone dan ZoneTile
 */
class GridZoneService {
  /**
   * Mengambil metadata GridZone
   */
  async getGridZone(guildId, zoneId) {
    return await GridZone.findOne({ guildId, zoneId }).lean();
  }

  /**
   * Mendaftarkan atau memperbarui GridZone
   */
  async createOrUpdateZone(guildId, zoneData) {
    const { zoneId, ...rest } = zoneData;
    return await GridZone.findOneAndUpdate(
      { guildId, zoneId },
      { $set: { ...rest, guildId, zoneId } },
      { upsert: true, new: true }
    );
  }

  /**
   * Mengambil semua tile dalam sebuah zona
   */
  async getZoneTiles(guildId, zoneId, filter = {}) {
    return await ZoneTile.find({ guildId, zoneId, ...filter }).lean();
  }

  /**
   * Mengambil satu tile spesifik pada koordinat (tileX, tileY)
   */
  async getTile(guildId, zoneId, tileX, tileY) {
    return await ZoneTile.findOne({ guildId, zoneId, tileX, tileY }).lean();
  }

  /**
   * Memeriksa apakah suatu tile dapat dilewati (collision & bounds check)
   */
  async isTilePassable(guildId, zoneId, tileX, tileY, playerTraits = {}) {
    const zone = await this.getGridZone(guildId, zoneId);
    if (!zone) {
      return { passable: false, reason: `Zona '${zoneId}' tidak ditemukan.` };
    }

    // 1. Cek Batas Peta (Bounds Checking)
    if (tileX < 0 || tileX >= zone.width || tileY < 0 || tileY >= zone.height) {
      return { passable: false, reason: 'Langkah berada di luar batas wilayah pemukiman.' };
    }

    // 2. Cek Dokumen Tile
    const tile = await this.getTile(guildId, zoneId, tileX, tileY);
    if (!tile) {
      // Default tile behavior bila belum ada dokumen eksplisit
      return { passable: true, tile: null, staminaCostMultiplier: 1.0 };
    }

    // 3. Tebing Gunung / Dinding Batu
    if (tile.terrainType === 'mountain' && tile.isSolid) {
      if (!playerTraits.canFly) {
        return { 
          passable: false, 
          reason: 'Tebing batu curam menghalangi jalan. Memerlukan pedang terbang untuk melintas.',
          tile 
        };
      } else {
        return {
          passable: true,
          tile,
          staminaCostMultiplier: 1.2
        };
      }
    }

    // 4. Perairan Dalam
    if ((tile.tileType === 'water' || tile.terrainType === 'water') && !tile.isDoor) {
      if (!playerTraits.canSwim && !playerTraits.canFly) {
        return { 
          passable: false, 
          reason: 'Perairan sungai dalam menghalangi jalan. Perlu perahu atau teknik meringankan tubuh.',
          tile 
        };
      } else {
        return {
          passable: true,
          tile,
          staminaCostMultiplier: 1.5
        };
      }
    }

    // 5. Obstruksi Dinding / Bangunan Solid
    if (tile.isSolid && !tile.isDoor) {
      const obstacleName = tile.buildingName || tile.label || 'bangunan kokoh';
      return { 
        passable: false, 
        reason: `Jalur terhalang oleh ${obstacleName}.`,
        tile 
      };
    }

    return {
      passable: true,
      tile,
      isDoor: !!tile.isDoor,
      staminaCostMultiplier: tile.staminaCostMultiplier || 1.0,
      targetInteriorStructureId: tile.targetInteriorStructureId || null
    };
  }

  /**
   * Mengambil tile tetangga (N, S, E, W)
   */
  async getAdjacentTiles(guildId, zoneId, currentX, currentY) {
    const directions = [
      { dir: 'N', x: currentX, y: currentY - 1 },
      { dir: 'S', x: currentX, y: currentY + 1 },
      { dir: 'E', x: currentX + 1, y: currentY },
      { dir: 'W', x: currentX - 1, y: currentY }
    ];

    const results = {};
    for (const d of directions) {
      results[d.dir] = await this.isTilePassable(guildId, zoneId, d.x, d.y);
    }
    return results;
  }
}

module.exports = new GridZoneService();
