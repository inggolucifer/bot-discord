const Player = require('../models/Player');
const ZoneTile = require('../models/ZoneTile');
const PropertyStructure = require('../models/PropertyStructure');
const Npc = require('../models/Npc');
const { generateDefaultEstateLayout, decompressLayoutRLE, TILE_METADATA } = require('../utils/propertyManager');

class InteriorService {
  /**
   * Pemain masuk ke dalam interior bangunan dari petak pintu luar
   */
  async enterBuilding(discordId, guildId, options = {}) {
    const player = await Player.findOne({ discordId, guildId });
    if (!player) {
      return { ok: false, error: 'Karakter belum terdaftar.' };
    }

    if (player.gridPosition?.interiorInstanceId) {
      return { ok: false, error: 'Kamu sudah berada di dalam suatu bangunan. Gunakan `/keluar` terlebih dahulu.' };
    }

    const zoneId = player.gridPosition?.zoneId || 'xingcun_village';
    const tileX = player.gridPosition?.tileX ?? 16;
    const tileY = player.gridPosition?.tileY ?? 16;

    // Cari tile tempat pemain berdiri
    const currentTile = await ZoneTile.findOne({ guildId, zoneId, tileX, tileY });
    if (!currentTile || !currentTile.isDoor) {
      return { 
        ok: false, 
        error: 'Kamu tidak berada di depan pintu masuk bangunan manapun. Berdirilah tepat di petak bertanda pintu (🚪).' 
      };
    }

    // Cari atau inisialisasi instance PropertyStructure untuk pintu/bangunan ini
    let structure = null;
    if (currentTile.propertyStructureId || currentTile.targetInteriorStructureId) {
      const refId = currentTile.targetInteriorStructureId || currentTile.propertyStructureId;
      structure = await PropertyStructure.findById(refId);
    }

    if (!structure) {
      // Cari berdasar koordinat pintu
      structure = await PropertyStructure.findOne({ guildId, zoneId, tileX, tileY });
    }

    if (!structure) {
      // Inisialisasi struktur interior bawaan jika belum ada di database
      const defaultLayout = generateDefaultEstateLayout(12, 12);
      structure = await PropertyStructure.create({
        guildId,
        zoneId,
        tileX,
        tileY,
        ownerId: currentTile.ownerId || 'system_npc',
        ownerName: currentTile.ownerName || currentTile.buildingName || 'Tetua Pemukiman',
        structureName: currentTile.buildingName || 'Kediaman Jianghu',
        structureType: currentTile.buildingType || 'shop',
        interiorLayoutCompressed: defaultLayout,
        subGridWidth: 12,
        subGridHeight: 12,
        isOpenToPublic: currentTile.isOpenToPublic !== false
      });

      // Kaitkan kembali ke tile
      currentTile.targetInteriorStructureId = structure._id;
      await currentTile.save();
    }

    // Validasi Izin Akses (Permissions)
    if (!structure.isOpenToPublic && structure.ownerId !== discordId) {
      return {
        ok: false,
        error: `Pintu terkunci! Bangunan '${structure.structureName}' bersifat privat dan hanya dapat dimasuki oleh pemiliknya.`
      };
    }

    // Pindahkan state player ke interior
    player.gridPosition.interiorInstanceId = structure._id;
    // Simpan koordinat pintu luar di currentLocation atau memo agar bisa keluar balik ke titik semula
    if (!player.currentLocation) player.currentLocation = {};
    player.currentLocation.buildingName = structure.structureName;
    await player.save();

    // Broadcast transisi socket
    const io = options.io || global.io;
    if (io && options.socketId) {
      const socket = io.sockets.sockets.get(options.socketId);
      if (socket) {
        socket.leave(`zone:${zoneId}`);
        socket.join(`interior:${structure._id}`);
      }
    }

    // Cari NPC yang ada di dalam bangunan jika ini toko atau balai
    const npcs = await Npc.find({ 
      guildId, 
      $or: [
        { zoneId: zoneId, tileX: tileX, tileY: tileY },
        { homeLocation: structure.structureName }
      ] 
    }).lean();

    return {
      ok: true,
      structureId: structure._id,
      structureName: structure.structureName,
      structureType: structure.structureType,
      ownerName: structure.ownerName,
      subGridWidth: structure.subGridWidth,
      subGridHeight: structure.subGridHeight,
      npcsInside: npcs.map(n => ({ name: n.name, title: n.title, role: n.role })),
      doorReturnCoords: { zoneId, tileX, tileY }
    };
  }

  /**
   * Pemain keluar dari interior kembali ke petak depan pintu luar
   */
  async exitBuilding(discordId, guildId, options = {}) {
    const player = await Player.findOne({ discordId, guildId });
    if (!player) {
      return { ok: false, error: 'Karakter belum terdaftar.' };
    }

    const structureId = player.gridPosition?.interiorInstanceId;
    if (!structureId) {
      return { ok: false, error: 'Kamu sedang berada di luar ruangan (outdoor).' };
    }

    const structure = await PropertyStructure.findById(structureId);
    
    // Kembalikan posisi outdoor
    const returnZoneId = structure ? structure.zoneId : (player.gridPosition.zoneId || 'xingcun_village');
    const returnX = structure ? structure.tileX : player.gridPosition.tileX;
    const returnY = structure ? structure.tileY : player.gridPosition.tileY;

    player.gridPosition.interiorInstanceId = null;
    player.gridPosition.zoneId = returnZoneId;
    player.gridPosition.tileX = returnX;
    player.gridPosition.tileY = returnY;
    if (player.currentLocation) {
      player.currentLocation.buildingName = null;
    }
    await player.save();

    // Broadcast transisi socket
    const io = options.io || global.io;
    if (io && options.socketId) {
      const socket = io.sockets.sockets.get(options.socketId);
      if (socket) {
        socket.leave(`interior:${structureId}`);
        socket.join(`zone:${returnZoneId}`);
      }
    }

    return {
      ok: true,
      restoredPosition: {
        zoneId: returnZoneId,
        tileX: returnX,
        tileY: returnY
      },
      exitedBuildingName: structure ? structure.structureName : 'Bangunan'
    };
  }

  /**
   * Mengambil layout interior lengkap dengan dekompresi matriks
   */
  async getInteriorLayout(structureId) {
    const structure = await PropertyStructure.findById(structureId).lean();
    if (!structure) return null;

    const tiles1D = decompressLayoutRLE(structure.interiorLayoutCompressed);
    const width = structure.subGridWidth || 12;
    const height = structure.subGridHeight || 12;

    const matrix = [];
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        const val = tiles1D[y * width + x] || 0;
        row.push({
          x,
          y,
          tileId: val,
          ...TILE_METADATA[val]
        });
      }
      matrix.push(row);
    }

    return {
      structure,
      width,
      height,
      matrix
    };
  }
}

module.exports = new InteriorService();
