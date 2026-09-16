const mongoose = require('mongoose');
const AdminLog = require('../models/AdminLog');
const Player = require('../models/Player');
const ZoneTile = require('../models/ZoneTile');
const PropertyStructure = require('../models/PropertyStructure');
const GridZone = require('../models/GridZone');
const ActivityLog = require('../models/ActivityLog');

const SENSITIVE_KEYS = ['token', 'password', 'secret', 'key', 'auth', 'webhook', 'hash'];

function redactSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitiveData);

  const cleaned = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some(sk => k.toLowerCase().includes(sk))) {
      cleaned[k] = '[REDACTED]';
    } else if (v && typeof v === 'object') {
      cleaned[k] = redactSensitiveData(v);
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

class AdminInspectService {
  /**
   * Memeriksa apakah user adalah owner bot dari .env
   */
  isOwner(discordId) {
    const ownerIds = (process.env.OWNER_IDS || '').split(/[, ]+/).filter(Boolean);
    return ownerIds.includes(String(discordId));
  }

  /**
   * 1. /admin db-collections: Daftar koleksi dan jumlah dokumen
   */
  async getCollectionsSummary(adminId, guildId) {
    if (!this.isOwner(adminId)) {
      return { ok: false, error: 'Akses ditolak. Perintah ini hanya dapat dijalankan oleh OWNER_IDS.' };
    }

    const collections = await mongoose.connection.db.listCollections().toArray();
    const summary = [];

    for (const col of collections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      summary.push({ name: col.name, count });
    }

    summary.sort((a, b) => b.count - a.count);

    await AdminLog.create({
      guildId: guildId || 'GLOBAL',
      adminId,
      action: 'INSPECT_DB_COLLECTIONS',
      details: `Memeriksa ringkasan ${summary.length} koleksi MongoDB.`
    });

    return { ok: true, collections: summary, totalCollections: summary.length };
  }

  /**
   * 2. /admin db-find: Kueri read-only dengan pembatasan dan redaksi data sensitif
   */
  async findCollectionDocs(adminId, guildId, collectionName, filterStr = '{}', limit = 5) {
    if (!this.isOwner(adminId)) {
      return { ok: false, error: 'Akses ditolak. Perintah ini hanya dapat dijalankan oleh OWNER_IDS.' };
    }

    let filter = {};
    try {
      if (filterStr && filterStr.trim()) {
        filter = JSON.parse(filterStr);
      }
    } catch (err) {
      return { ok: false, error: `Filter JSON tidak valid: ${err.message}` };
    }

    const safeLimit = Math.min(10, Math.max(1, parseInt(limit, 10) || 5));
    const rawDocs = await mongoose.connection.db.collection(collectionName)
      .find(filter)
      .limit(safeLimit)
      .toArray();

    const cleanedDocs = rawDocs.map(d => redactSensitiveData(d));

    await AdminLog.create({
      guildId: guildId || 'GLOBAL',
      adminId,
      action: 'INSPECT_DB_FIND',
      details: `Kueri pada koleksi '${collectionName}' dengan filter: ${JSON.stringify(filter)} (limit: ${safeLimit}).`
    });

    return {
      ok: true,
      collection: collectionName,
      returnedCount: cleanedDocs.length,
      docs: cleanedDocs
    };
  }

  /**
   * 3. /admin player-inspect: Ringkasan lengkap satu pemain lintas seluruh koleksi
   */
  async inspectPlayer(adminId, guildId, targetDiscordId) {
    if (!this.isOwner(adminId)) {
      return { ok: false, error: 'Akses ditolak. Perintah ini hanya dapat dijalankan oleh OWNER_IDS.' };
    }

    const player = await Player.findOne({ discordId: targetDiscordId, guildId }).lean();
    if (!player) {
      return { ok: false, error: `Karakter dengan discordId '${targetDiscordId}' tidak ditemukan di guild ini.` };
    }

    // Ambil data tanah milik pemain
    const lands = await ZoneTile.find({ guildId, ownerId: targetDiscordId }).lean();

    // Ambil bangunan interior milik pemain
    const buildings = await PropertyStructure.find({ guildId, ownerId: targetDiscordId }).lean();

    // Ambil 5 aktivitas terakhir
    const recentActivities = await ActivityLog.find({ guildId, discordId: targetDiscordId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    await AdminLog.create({
      guildId,
      adminId,
      action: 'INSPECT_PLAYER',
      targetUserId: targetDiscordId,
      details: `Inspeksi mendalam karakter '${player.characterName}'.`
    });

    return {
      ok: true,
      characterName: player.characterName,
      discordId: player.discordId,
      realm: player.systemCultivation?.realm || 'Mortal',
      stage: player.systemCultivation?.stage || 0,
      qi: player.systemCultivation?.qi || 0,
      currentHp: player.currentHp,
      currentStamina: player.currentStamina,
      currency: player.currency,
      position: player.gridPosition,
      ownedPlots: lands.map(l => ({ zoneId: l.zoneId, x: l.tileX, y: l.tileY, label: l.label })),
      ownedBuildings: buildings.map(b => ({ name: b.structureName, type: b.structureType, zoneId: b.zoneId })),
      professions: player.professions || {},
      inventoryCount: player.inventory?.length || 0,
      kungfuSkills: player.kungfuSkills || {},
      recentActivities: recentActivities.map(a => ({ action: a.actionType, time: a.createdAt }))
    };
  }

  /**
   * 4. /admin land-map: Render ringkas grid kepemilikan tanah zona
   */
  async renderLandMap(adminId, guildId, zoneId = 'xingcun_village') {
    if (!this.isOwner(adminId)) {
      return { ok: false, error: 'Akses ditolak. Perintah ini hanya dapat dijalankan oleh OWNER_IDS.' };
    }

    const zone = await GridZone.findOne({ guildId, zoneId }).lean();
    const tiles = await ZoneTile.find({ guildId, zoneId }).lean();

    const width = zone?.width || 32;
    const height = zone?.height || 32;

    const tileMap = {};
    for (const t of tiles) {
      tileMap[`${t.tileX},${t.tileY}`] = t;
    }

    let stats = {
      totalTiles: tiles.length,
      claimablePlots: 0,
      ownedPlots: 0,
      buildings: 0,
      waterTiles: 0,
      resourceNodes: 0
    };

    // Bangun ASCII Map sampel (16x16 tengah atau ringkasan)
    const viewSize = 16;
    const lines = [];

    for (let y = 8; y < 8 + viewSize && y < height; y++) {
      let row = '';
      for (let x = 8; x < 8 + viewSize && x < width; x++) {
        const t = tileMap[`${x},${y}`];
        if (!t) {
          row += ' . ';
        } else if (t.ownerId) {
          stats.ownedPlots++;
          row += ' P '; // Player Owned
        } else if (t.buildingName || t.buildingType) {
          stats.buildings++;
          row += ' B '; // Building
        } else if (t.isClaimable) {
          stats.claimablePlots++;
          row += ' C '; // Claimable Plot
        } else if (t.resourceType) {
          stats.resourceNodes++;
          row += ' * '; // Resource Node
        } else if (t.tileType === 'water' || t.terrainType === 'water') {
          stats.waterTiles++;
          row += ' ~ '; // Water
        } else if (t.isSolid) {
          row += ' # '; // Solid Wall / Mountain
        } else if (t.tileType === 'road') {
          row += ' = '; // Road
        } else {
          row += ' . '; // Ground
        }
      }
      lines.push(row);
    }

    await AdminLog.create({
      guildId,
      adminId,
      action: 'INSPECT_LAND_MAP',
      details: `Render peta tanah wilayah '${zoneId}'.`
    });

    return {
      ok: true,
      zoneId,
      zoneName: zone?.name || zoneId,
      dimensions: `${width}x${height}`,
      stats,
      asciiMap: lines.join('\n'),
      legend: 'P=Milik Player, C=Kavling Kosong, B=Bangunan, *=Resource Node, ~=Air, #=Dinding, ==Jalan, .=Tanah'
    };
  }
}

module.exports = new AdminInspectService();
