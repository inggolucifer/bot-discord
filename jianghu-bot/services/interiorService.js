const Player = require('../models/Player');
const ZoneTile = require('../models/ZoneTile');
const PropertyStructure = require('../models/PropertyStructure');
const Npc = require('../models/Npc');
const {
  generateDefaultEstateLayout,
  generateCottageLayout,
  decompressLayoutRLE,
  TILE_METADATA
} = require('../utils/propertyManager');
const { getChunkObjects, getObjectCoveringCell } = require('../utils/objectScatter');
const { getTileAt } = require('../utils/proceduralWorldEngine');
const worldData = require('../utils/worldData');

class InteriorService {
  /**
   * Pemain masuk ke dalam interior bangunan dari petak pintu luar atau bangunan sekitar
   */
  async enterBuilding(discordId, guildId, options = {}) {
    const player = await Player.findOne({ discordId, guildId });
    if (!player) {
      return { ok: false, error: 'Karakter belum terdaftar.' };
    }

    const currentZoneId = player.gridPosition?.zoneId || 'tianyuan_world_map';
    const px = player.gridPosition?.tileX ?? 2050;
    const py = player.gridPosition?.tileY ?? 2650;

    // 1. Koordinat target bangunan (gunakan opsi dari client jika valid, atau posisi pemain saat ini)
    let targetX = px;
    let targetY = py;
    let targetZoneId = currentZoneId;

    if (options.targetX !== undefined && options.targetY !== undefined) {
      const parsedX = Number(options.targetX);
      const parsedY = Number(options.targetY);
      if (Number.isInteger(parsedX) && Number.isInteger(parsedY) && parsedX >= 0 && parsedX <= 4999 && parsedY >= 0 && parsedY <= 4999) {
        // Validasi jarak Chebyshev maksimal 1 petak dari posisi pemain di server
        const dist = Math.max(Math.abs(parsedX - px), Math.abs(parsedY - py));
        if (dist > 1) {
          return { ok: false, error: 'Terlalu jauh dari bangunan (Maksimal 1 petak).' };
        }
        targetX = parsedX;
        targetY = parsedY;
      }
    }
    if (options.zoneId) {
      targetZoneId = options.zoneId;
    }

    let structure = null;

    // 2. Pembersihan status terkunci otomatis jika lebih dari 30 menit (Stale Session Auto-Clean)
    // atau Idempotent return jika masuk ke ruangan yang sama
    if (player.gridPosition?.interiorInstanceId) {
      const enteredAt = player.gridPosition.interiorEnteredAt
        ? new Date(player.gridPosition.interiorEnteredAt).getTime()
        : 0;
      const isStale = (Date.now() - enteredAt) > 30 * 60 * 1000;

      if (isStale) {
        player.gridPosition.interiorInstanceId = null;
        player.gridPosition.interiorEnteredAt = null;
        await player.save();
      } else {
        const activeStructure = await PropertyStructure.findById(player.gridPosition.interiorInstanceId);
        if (activeStructure && (
          (activeStructure.tileX === targetX && activeStructure.tileY === targetY && activeStructure.zoneId === targetZoneId) ||
          Math.max(Math.abs(activeStructure.tileX - targetX), Math.abs(activeStructure.tileY - targetY)) <= 1
        )) {
          structure = activeStructure;
        } else {
          return {
            ok: false,
            error: 'Kamu sudah berada di dalam suatu bangunan. Gunakan tombol keluar terlebih dahulu.'
          };
        }
      }
    }

    // 3. Pencarian Struktur Bertingkat (ZoneTile -> PropertyStructure DB -> Scatter Prosedural On-Demand)
    let currentTile = null;

    // a) Cek ZoneTile di database
    if (!structure) {
      currentTile = await ZoneTile.findOne({
        guildId,
        zoneId: targetZoneId,
        tileX: targetX,
        tileY: targetY
      });

      if (currentTile && (currentTile.propertyStructureId || currentTile.targetInteriorStructureId)) {
        const refId = currentTile.targetInteriorStructureId || currentTile.propertyStructureId;
        structure = await PropertyStructure.findById(refId);
      }
    }

    // b) Cek PropertyStructure berdasarkan koordinat
    if (!structure) {
      structure = await PropertyStructure.findOne({
        guildId,
        zoneId: targetZoneId,
        tileX: targetX,
        tileY: targetY
      });
    }

    // c) Jika belum ada di DB, periksa apakah terdapat bangunan scatter prosedural / anchor pemukiman
    if (!structure) {
      let candidateName = currentTile?.buildingName || null;
      let candidateType = currentTile?.buildingType || null;
      let isCottage = false;

      // Cek scatter objects di chunk target menggunakan getObjectCoveringCell (G5)
      const cov = getObjectCoveringCell ? getObjectCoveringCell(targetX, targetY) : null;
      let scatterObj = cov ? cov.o : null;
      if (!scatterObj) {
        const chunkX = Math.floor(targetX / 32);
        const chunkY = Math.floor(targetY / 32);
        const chunkObjs = getChunkObjects(chunkX, chunkY);
        scatterObj = chunkObjs.find(o => {
          const cw = o.cw || 1;
          const ch = o.ch || 1;
          return (targetX >= o.x && targetX < o.x + cw && targetY >= o.y && targetY < o.y + ch);
        });
      }

      if (scatterObj) {
        const def = (scatterObj.defId || '').toLowerCase();
        candidateName = scatterObj.customLabel || scatterObj.defId.replace(/_/g, ' ');
        if (def.includes('cottage') || def.includes('shack') || def.includes('hut') || def.includes('cabin')) {
          candidateType = 'cottage';
          isCottage = true;
        } else if (def.includes('shop') || def.includes('market') || def.includes('warehouse')) {
          candidateType = 'shop';
        } else if (def.includes('library') || def.includes('sect') || def.includes('pagoda')) {
          candidateType = 'library';
        } else {
          candidateType = 'residence';
        }
      }

      // Cek apakah petak berada di dekat anchor pemukiman/kota
      if (!candidateName) {
        const anchors = worldData.getAnchors();
        const anchor = anchors.find(a => Math.max(Math.abs(a.x - targetX), Math.abs(a.y - targetY)) <= 2);
        if (anchor) {
          candidateName = `Kediaman ${anchor.name}`;
          candidateType = 'residence';
        }
      }

      // Jika ada ZoneTile yang merupakan pintu (meski belum terhubung ke struktur)
      if (!candidateName && currentTile && currentTile.isDoor) {
        candidateName = currentTile.buildingName || 'Kediaman Jianghu';
        candidateType = currentTile.buildingType || 'shop';
      }

      // Cek apakah nama atau tipe bangunan mengindikasikan pondok kecil 6x5
      if (candidateName) {
        const cLow = candidateName.toLowerCase();
        if (cLow.includes('pondok') || cLow.includes('gubuk') || cLow.includes('cottage') || cLow.includes('shack') || cLow.includes('hut')) {
          isCottage = true;
          candidateType = 'cottage';
        }
      }
      if (options.buildingType === 'cottage' || currentTile?.buildingType === 'cottage') {
        isCottage = true;
        candidateType = 'cottage';
      }

      // Tentukan dimensi dan layout templat interior
      const subGridWidth = isCottage ? 6 : 12;
      const subGridHeight = isCottage ? 5 : 12;
      const defaultLayout = isCottage
        ? generateCottageLayout(subGridWidth, subGridHeight)
        : generateDefaultEstateLayout(subGridWidth, subGridHeight);

      // Inisialisasi atomik menggunakan findOneAndUpdate upsert untuk mencegah race condition duplicate key
      structure = await PropertyStructure.findOneAndUpdate(
        {
          guildId,
          zoneId: targetZoneId,
          tileX: targetX,
          tileY: targetY
        },
        {
          $setOnInsert: {
            ownerId: currentTile?.ownerId || 'system_npc',
            ownerName: currentTile?.ownerName || currentTile?.buildingName || 'Tetua Pemukiman',
            structureName: candidateName,
            structureType: candidateType || 'shop',
            interiorLayoutCompressed: defaultLayout,
            subGridWidth,
            subGridHeight,
            isOpenToPublic: currentTile?.isOpenToPublic !== false,
            qiGatheringArrayTier: 1,
            alchemyCrucibleTier: 1,
            forgeAnvilTier: 1,
            herbPlotsUnlocked: 2
          }
        },
        { upsert: true, new: true }
      );

      // Kaitkan kembali ke ZoneTile jika dokumennya ada
      if (currentTile && !currentTile.targetInteriorStructureId) {
        currentTile.targetInteriorStructureId = structure._id;
        await currentTile.save().catch(() => {});
      }
    }

    // 4. Validasi Izin Akses (Permissions)
    if (!structure.isOpenToPublic && structure.ownerId !== discordId) {
      return {
        ok: false,
        error: `Pintu terkunci! Bangunan '${structure.structureName}' bersifat privat dan hanya dapat dimasuki oleh pemiliknya.`
      };
    }

    // 5. Pindahkan status pemain ke interior dengan waktu masuk
    player.gridPosition.interiorInstanceId = structure._id;
    player.gridPosition.interiorEnteredAt = new Date();
    if (!player.currentLocation) player.currentLocation = {};
    player.currentLocation.buildingName = structure.structureName;
    await player.save();

    // Broadcast transisi socket jika ada
    const io = options.io || global.io;
    if (io && options.socketId) {
      const socket = io.sockets.sockets.get(options.socketId);
      if (socket) {
        socket.leave(`zone:${targetZoneId}`);
        socket.join(`interior:${structure._id}`);
      }
    }

    // 6. Siapkan respons tunggal lengkap
    const layout1D = decompressLayoutRLE(structure.interiorLayoutCompressed);
    const width = structure.subGridWidth || (layout1D.length <= 30 ? 6 : 12);
    const height = structure.subGridHeight || (layout1D.length <= 30 ? 5 : 12);

    // Titik spawn pemain di dalam interior (di depan pintu)
    const doorSpawn = width <= 6
      ? { x: 2, y: Math.max(0, height - 2) }
      : { x: 5, y: Math.max(0, height - 2) };

    const npcs = await Npc.find({
      guildId,
      $or: [
        { zoneId: targetZoneId, tileX: targetX, tileY: targetY },
        { homeLocation: structure.structureName }
      ]
    }).lean().catch(() => []);

    return {
      ok: true,
      structureId: structure._id,
      structureName: structure.structureName,
      structureType: structure.structureType,
      isOwner: structure.ownerId === discordId,
      ownerName: structure.ownerName,
      width,
      height,
      layout: layout1D,
      doorSpawn,
      property: {
        id: structure._id,
        structureName: structure.structureName,
        structureType: structure.structureType,
        width,
        height,
        doorSpawn
      },
      tileMetadata: TILE_METADATA,
      facilities: {
        qiGatheringArrayTier: structure.qiGatheringArrayTier || 1,
        alchemyCrucibleTier: structure.alchemyCrucibleTier || 1,
        forgeAnvilTier: structure.forgeAnvilTier || 1,
        herbPlotsUnlocked: structure.herbPlotsUnlocked || 2
      },
      npcsInside: npcs.map(n => ({ name: n.name, title: n.title, role: n.role })),
      doorReturnCoords: { zoneId: targetZoneId, tileX: targetX, tileY: targetY }
    };
  }

  /**
   * Pemain keluar dari interior kembali ke petak depan pintu luar (Idempoten)
   */
  async exitBuilding(discordId, guildId, options = {}) {
    const player = await Player.findOne({ discordId, guildId });
    if (!player) {
      return { ok: false, error: 'Karakter belum terdaftar.' };
    }

    const structureId = player.gridPosition?.interiorInstanceId;
    if (!structureId) {
      // Bersifat idempoten: tidak melempar error jika pemain memang sudah berada di luar ruangan
      return {
        ok: true,
        alreadyOutdoor: true,
        message: 'Karakter sudah berada di area luar ruangan.'
      };
    }

    const structure = await PropertyStructure.findById(structureId);

    // Kembalikan posisi outdoor
    const returnZoneId = structure ? structure.zoneId : (player.gridPosition.zoneId || 'tianyuan_world_map');
    const returnX = structure ? structure.tileX : (player.gridPosition.tileX ?? 2050);
    const returnY = structure ? structure.tileY : (player.gridPosition.tileY ?? 2650);

    player.gridPosition.interiorInstanceId = null;
    player.gridPosition.interiorEnteredAt = null;
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
    const width = structure.subGridWidth || (tiles1D.length <= 30 ? 6 : 12);
    const height = structure.subGridHeight || (tiles1D.length <= 30 ? 5 : 12);

    const matrix = [];
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        const val = tiles1D[y * width + x] || 0;
        row.push({
          x,
          y,
          tileId: val,
          ...(TILE_METADATA[val] || { name: 'Lantai', isSolid: false, interactable: false })
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
