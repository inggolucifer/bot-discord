const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const PlayerBuilding = require('../../models/PlayerBuilding');
const Player = require('../../models/Player');
const { computeNearbyEntities } = require('../../utils/nearbyEngine');
const zonesV23 = require('../../world-data/zones-v23.json');
const { getRealmIndex } = require('../../utils/cultivation');

// In-memory rate limiting map: userId -> timestamp ms
const rateLimitMap = new Map();
const userCacheMap = new Map();

// Pembersihan cache berkala setiap 5 menit
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap.entries()) {
    if (now - v > 10000) rateLimitMap.delete(k);
  }
  for (const [k, v] of userCacheMap.entries()) {
    if (now - v.timestamp > 10000) userCacheMap.delete(k);
  }
}, 300000);

function formatEntryCostSummary(zone) {
  if (!zone.entryCost) return 'Gratis';
  const parts = [];
  if (zone.entryCost.item) {
    parts.push(zone.entryCost.item === 'item_spirit_key' ? '1x Kunci Roh' : `1x ${zone.entryCost.item}`);
  }
  if (zone.entryCost.spiritStones) parts.push(`${zone.entryCost.spiritStones} Batu Roh`);
  if (zone.entryCost.spiritFruits) parts.push(`${zone.entryCost.spiritFruits} Buah Roh`);
  if (zone.entryCost.stamina) parts.push(`${zone.entryCost.stamina} Stamina`);
  return parts.length > 0 ? parts.join(', ') : 'Gratis';
}

/**
 * GET /api/world/nearby
 * Mengambil daftar entitas 'Sekitar Anda' (bangunan, kultivator, zona instans, dan bahaya tetap)
 * V25 K1: Berbasis posisi server otoritatif pemain (radius 14 petak untuk zona/bahaya).
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user.discordId;
    const now = Date.now();

    // 1. Rate Limiting: 1 request / 2 detik per pemain (V21)
    const lastRequestTime = rateLimitMap.get(userId) || 0;
    if (now - lastRequestTime < 1000) { // toleransi 1 detik agar UX mulus
      const cached = userCacheMap.get(userId);
      if (cached) {
        res.setHeader('ETag', cached.etag);
        res.setHeader('Cache-Control', 'private, max-age=2');
        return res.json(cached.data);
      }
      return res.status(429).json({ error: 'Permintaan terlalu cepat. Harap tunggu sesaat.' });
    }
    rateLimitMap.set(userId, now);

    // 2. Posisi Otoritatif Server Pemain
    const isObjId = mongoose.Types.ObjectId.isValid(userId) && String(new mongoose.Types.ObjectId(userId)) === String(userId);
    const playerQuery = isObjId ? { $or: [{ discordId: userId }, { _id: userId }] } : { discordId: String(userId) };
    const player = await Player.findOne(playerQuery)
      .select('discordId username name avatar level realmIndex systemCultivation realm gridPosition currentPosition sect sectId isTraveling activeBattleId inventory stamina')
      .lean();

    const centerTileX = player?.gridPosition?.tileX !== undefined
      ? Number(player.gridPosition.tileX)
      : (player?.currentPosition?.x !== undefined ? Number(player.currentPosition.x) : 2051);
    const centerTileY = player?.gridPosition?.tileY !== undefined
      ? Number(player.gridPosition.tileY)
      : (player?.currentPosition?.y !== undefined ? Number(player.currentPosition.y) : 2652);
    const playerRealm = player?.realmIndex !== undefined
      ? Number(player.realmIndex)
      : getRealmIndex(player?.systemCultivation?.realm || player?.realm);
    const cx = Math.floor(centerTileX / 32);
    const cy = Math.floor(centerTileY / 32);
    const r = 1; // Radius 1 chunk

    const minCx = cx - r;
    const maxCx = cx + r;
    const minCy = cy - r;
    const maxCy = cy + r;

    // 3. Kueri Bangunan Pemain
    let buildings = [];
    try {
      buildings = await PlayerBuilding.find({
        chunkX: { $gte: minCx, $lte: maxCx },
        chunkY: { $gte: minCy, $lte: maxCy }
      }).lean();
    } catch (dbErr) {
      buildings = [];
    }

    // 4. Kueri Pemain Aktif di Sekitar
    const minTileX = minCx * 32;
    const maxTileX = (maxCx + 1) * 32 - 1;
    const minTileY = minCy * 32;
    const maxTileY = (maxCy + 1) * 32 - 1;

    let players = [];
    try {
      players = await Player.find({
        discordId: { $ne: userId },
        $or: [
          { 'gridPosition.tileX': { $gte: minTileX, $lte: maxTileX }, 'gridPosition.tileY': { $gte: minTileY, $lte: maxTileY } },
          { 'currentPosition.x': { $gte: minTileX, $lte: maxTileX }, 'currentPosition.y': { $gte: minTileY, $lte: maxTileY } }
        ]
      }).select('discordId username name characterName avatar level realmIndex gridPosition currentPosition sect sectId').lean();
    } catch (dbErr) {
      players = [];
    }

    let npcs = [];
    try {
      const Npc = require('../../models/Npc');
      npcs = await Npc.find({
        'vitalStatus.isAlive': true,
        $or: [
          { 'schedule.tileX': { $gte: minTileX, $lte: maxTileX }, 'schedule.tileY': { $gte: minTileY, $lte: maxTileY } },
          { tileX: { $gte: minTileX, $lte: maxTileX }, tileY: { $gte: minTileY, $lte: maxTileY } }
        ]
      }).select('name title personality dao cultivation schedule vitalStatus gender portraitUrl').lean();
    } catch (npcErr) {
      npcs = [];
    }

    // 5. Agregasi Entitas
    const rawEntities = [];

    // Bangunan (koordinat dikirim)
    for (const b of buildings) {
      rawEntities.push({
        id: `building_${b._id}`,
        type: 'building',
        name: b.name,
        x: b.cellX !== undefined ? (b.chunkX * 32 + b.cellX) : (b.chunkX * 32 + 16),
        y: b.cellY !== undefined ? (b.chunkY * 32 + b.cellY) : (b.chunkY * 32 + 16),
        chunkX: b.chunkX,
        chunkY: b.chunkY,
        status: b.type,
        ownerId: b.ownerId,
        sectId: b.sectId,
        visibility: b.visibility || 'public'
      });
    }

    // Pemain Lain (koordinat dikirim)
    for (const p of players) {
      const px = p.gridPosition?.tileX ?? p.currentPosition?.x ?? (cx * 32 + 16);
      const py = p.gridPosition?.tileY ?? p.currentPosition?.y ?? (cy * 32 + 16);
      rawEntities.push({
        id: `player_${p.discordId}`,
        type: 'player',
        name: p.name || p.username || 'Kultivator Pengembara',
        x: px,
        y: py,
        chunkX: Math.floor(px / 32),
        chunkY: Math.floor(py / 32),
        status: `Lv.${p.level || 1} • Ranah ${p.realmIndex || 0}`,
        ownerId: p.discordId,
        sectId: p.sectId || p.sect,
        visibility: 'public'
      });
    }

    // 5a. Living NPCs (V27)
    for (const n of npcs) {
      const nx = n.schedule?.tileX ?? n.tileX ?? (cx * 32 + 16);
      const ny = n.schedule?.tileY ?? n.tileY ?? (cy * 32 + 16);
      rawEntities.push({
        id: `npc_${n._id}`,
        type: 'npc',
        name: n.name,
        title: n.title || 'Warga Jianghu',
        x: nx,
        y: ny,
        chunkX: Math.floor(nx / 32),
        chunkY: Math.floor(ny / 32),
        status: `${n.title || 'Warga'} • Ranah ${n.cultivation?.realmIndex ?? 0}`,
        gender: n.gender || 'male',
        portraitUrl: n.portraitUrl || null,
        personality: n.personality?.primary || 'righteous',
        activityState: n.schedule?.activityState || 'idle',
        visibility: 'public'
      });
    }

    // 5b. Zona Instans & Bahaya Tetap (world-data/zones-v23.json dalam Radius 14 Petak)
    const allZones = zonesV23.zones || [];
    for (const z of allZones) {
      const dx = z.x - centerTileX;
      const dy = z.y - centerTileY;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));

      if (dist <= 14) {
        const isInstanced = ['spirit_valley', 'land_of_spirits', 'defense_circle', 'elemental_land'].includes(z.type);
        const id = isInstanced ? `inst_${z.id}` : `haz_${z.id}`;
        const type = isInstanced ? 'zone' : 'hazard';
        const requiredRealm = z.requiredRealmIndex !== undefined ? z.requiredRealmIndex : (z.dangerTier >= 5 ? 2 : (z.dangerTier >= 3 ? 1 : 0));

        let canEnter = true;
        let reason = null;

        if (dist > 3) {
          canEnter = false;
          reason = 'Terlalu jauh, dekati lokasi (<= 3 petak)';
        } else if (player?.isTraveling) {
          canEnter = false;
          reason = 'Sedang dalam perjalanan';
        } else if (player?.activeBattleId) {
          canEnter = false;
          reason = 'Sedang dalam pertarungan';
        } else if (playerRealm < requiredRealm) {
          canEnter = false;
          reason = `Perlu ranah tingkat ${requiredRealm}`;
        }

        rawEntities.push({
          id,
          type,
          name: z.name,
          zoneType: z.type,
          tier: z.dangerTier,
          requiredRealmIndex: requiredRealm,
          canEnter,
          reason,
          entryCostSummary: formatEntryCostSummary(z),
          status: `Tier ${z.dangerTier} • ${z.type.replace(/_/g, ' ').toUpperCase()}`,
          x: z.x,
          y: z.y,
          visibility: 'public'
        });
      }
    }

    // 6. Hitung & Urutkan Spasial (Maksimal 30 entri, koordinat zone/hazard dihapus di nearbyEngine)
    const result = computeNearbyEntities({
      fromX: centerTileX,
      fromY: centerTileY,
      entities: rawEntities,
      viewer: {
        id: userId,
        sectId: req.user.sectId
      },
      maxResults: 30
    });

    const responsePayload = {
      center: { chunkX: cx, chunkY: cy, tileX: centerTileX, tileY: centerTileY },
      radiusChunks: r,
      totalCount: result.totalCount,
      countOthers: result.countOthers,
      items: result.items
    };

    // 7. ETag Generation & 304 Handling
    const hash = crypto.createHash('md5').update(JSON.stringify(responsePayload)).digest('hex');
    const etag = `W/"${hash}"`;

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    // Simpan ke cache lokal
    userCacheMap.set(userId, { data: responsePayload, etag, timestamp: now });

    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, max-age=2');
    return res.json(responsePayload);
  } catch (error) {
    console.error('[API-NEARBY-ERROR]', error);
    return res.status(500).json({ error: 'Gagal memproses data Sekitar Anda.' });
  }
});

module.exports = router;
