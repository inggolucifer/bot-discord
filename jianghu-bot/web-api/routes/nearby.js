const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const PlayerBuilding = require('../../models/PlayerBuilding');
const Player = require('../../models/Player');
const { computeNearbyEntities } = require('../../utils/nearbyEngine');
const { getNearbyHazards } = require('../../utils/monsterSpawnEngine');

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

/**
 * GET /api/world/nearby
 * Mengambil daftar entitas 'Sekitar Anda' (bangunan, kultivator, POI) dalam radius <= 2 chunk.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const now = Date.now();

    // 1. Rate Limiting: 1 request / 2 detik per pemain
    const lastRequestTime = rateLimitMap.get(userId) || 0;
    if (now - lastRequestTime < 1000) { // toleransi 1 detik agar UX tidak kaku
      const cached = userCacheMap.get(userId);
      if (cached) {
        res.setHeader('ETag', cached.etag);
        res.setHeader('Cache-Control', 'private, max-age=2');
        return res.json(cached.data);
      }
      return res.status(429).json({ error: 'Permintaan terlalu cepat. Harap tunggu sesaat.' });
    }
    rateLimitMap.set(userId, now);

    // 2. Parse Parameter
    const cx = parseInt(req.query.cx, 10);
    const cy = parseInt(req.query.cy, 10);
    const radiusParam = parseInt(req.query.r, 10);
    const r = Math.min(2, Math.max(1, isNaN(radiusParam) ? 1 : radiusParam));

    if (isNaN(cx) || isNaN(cy)) {
      return res.status(400).json({ error: 'Parameter cx dan cy wajib berupa angka valid.' });
    }

    const tileXParam = parseInt(req.query.tileX, 10);
    const tileYParam = parseInt(req.query.tileY, 10);
    const centerTileX = !isNaN(tileXParam) ? tileXParam : cx * 32 + 16;
    const centerTileY = !isNaN(tileYParam) ? tileYParam : cy * 32 + 16;

    const minCx = cx - r;
    const maxCx = cx + r;
    const minCy = cy - r;
    const maxCy = cy + r;

    // 3. Kueri Bangunan Pemain (menggunakan compound index chunkX_1_chunkY_1)
    let buildings = [];
    try {
      buildings = await PlayerBuilding.find({
        chunkX: { $gte: minCx, $lte: maxCx },
        chunkY: { $gte: minCy, $lte: maxCy }
      }).lean();
    } catch (dbErr) {
      // Graceful fallback bila db connection sedang transisi
      buildings = [];
    }

    // 4. Kueri Pemain Aktif di Area Tersebut
    const minTileX = minCx * 32;
    const maxTileX = (maxCx + 1) * 32 - 1;
    const minTileY = minCy * 32;
    const maxTileY = (maxCy + 1) * 32 - 1;

    let players = [];
    try {
      players = await Player.find({
        discordId: { $ne: userId },
        'currentPosition.x': { $gte: minTileX, $lte: maxTileX },
        'currentPosition.y': { $gte: minTileY, $lte: maxTileY }
      }).select('discordId username name avatar level realmIndex currentPosition sect sectId').lean();
    } catch (dbErr) {
      players = [];
    }

    // 5. Agregasi Entitas
    const rawEntities = [];

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

    for (const p of players) {
      const px = p.currentPosition?.x || (cx * 32 + 16);
      const py = p.currentPosition?.y || (cy * 32 + 16);
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

// 5b. Agregasi Bahaya Tetap (Radius 14 Petak)
    const hazards = getNearbyHazards(centerTileX, centerTileY, 14);
    for (const h of hazards) {
      rawEntities.push({
        id: `hazard_${h.id}`,
        type: 'hazard',
        name: h.name,
        x: h.x,
        y: h.y,
        chunkX: Math.floor(h.x / 32),
        chunkY: Math.floor(h.y / 32),
        status: `Tier ${h.dangerTier} • ${h.type.replace('_', ' ').toUpperCase()}`,
        visibility: 'public'
      });
    }

    // 6. Hitung & Urutkan Spasial
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
      items: result.items,
      nearbyHazards: hazards
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
