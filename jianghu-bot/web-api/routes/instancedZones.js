/**
 * web-api/routes/instancedZones.js
 * REST API untuk Area Khusus Berinstans V23 (Ala Tale of Immortal R8)
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const Player = require('../../models/Player');
const instancedEngine = require('../../services/instancedZoneEngine');

// In-memory active session store (keyed by playerId)
const activeSessions = new Map();

/**
 * GET /api/instanced-zones/session
 * Mengambil sesi zona instans aktif pemain saat ini
 */
router.get('/session', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.discordId;
    const session = activeSessions.get(userId) || null;
    return res.json({ success: true, session });
  } catch (err) {
    console.error('[INSTANCED-ZONE] GET session error:', err);
    return res.status(500).json({ success: false, error: 'Gagal mengambil sesi zona.' });
  }
});

/**
 * POST /api/instanced-zones/enter
 * Memasuki area khusus berinstans dan menginisialisasi sesi
 */
router.post('/enter', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.discordId;
    const { zoneId, zoneType = 'spirit_valley', dangerTier = 3 } = req.body;

    if (!zoneId) {
      return res.status(400).json({ success: false, error: 'zoneId wajib disertakan.' });
    }

    const player = await Player.findOne({
      $or: [{ discordId: userId }, { _id: userId }]
    });

    if (!player) {
      return res.status(404).json({ success: false, error: 'Karakter pemain tidak ditemukan.' });
    }

    let session = null;
    const startedAt = Date.now();

    if (zoneType === 'spirit_valley') {
      session = instancedEngine.createSpiritValleySession(String(player._id), zoneId, dangerTier, startedAt);
    } else if (zoneType === 'land_of_spirits') {
      session = instancedEngine.createLandOfSpiritsSession(String(player._id), zoneId, dangerTier, startedAt);
    } else if (zoneType === 'defense_circle') {
      session = instancedEngine.createDefenseCircleSession(String(player._id), zoneId, dangerTier, startedAt);
    } else if (zoneType === 'elemental_land') {
      const element = req.body.element || 'fire';
      session = {
        type: 'elemental_land',
        zoneId,
        element,
        tier: dangerTier,
        status: 'active',
        currentWave: 1,
        totalWaves: 3,
        startedAt,
        rewards: instancedEngine.createElementalLandLoot(element, dangerTier, startedAt)
      };
    } else {
      return res.status(400).json({ success: false, error: `Tipe zona '${zoneType}' tidak valid.` });
    }

    activeSessions.set(userId, session);

    return res.json({
      success: true,
      message: `Berhasil memasuki ${session.name || zoneType}!`,
      session
    });
  } catch (err) {
    console.error('[INSTANCED-ZONE] POST enter error:', err);
    return res.status(500).json({ success: false, error: 'Gagal memasuki zona instans.' });
  }
});

/**
 * POST /api/instanced-zones/step
 * Menjalankan aksi satu langkah dalam sesi instans
 */
router.post('/step', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.discordId;
    const session = activeSessions.get(userId);

    if (!session) {
      return res.status(400).json({ success: false, error: 'Tidak ada sesi zona instans aktif.' });
    }

    const { action, options = {} } = req.body;
    if (!action) {
      return res.status(400).json({ success: false, error: 'Aksi wajib disertakan.' });
    }

    // Untuk elemental land sederhana
    if (session.type === 'elemental_land') {
      if (action === 'clear_wave') {
        if (session.currentWave < session.totalWaves) {
          session.currentWave++;
          return res.json({ success: true, stepResult: { ok: true, completed: false }, session });
        } else {
          session.status = 'completed';
          return res.json({ success: true, stepResult: { ok: true, completed: true }, session });
        }
      }
    }

    const result = instancedEngine.resolveStepAction(session, action, options);
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error || 'Aksi gagal.' });
    }

    // Terapkan damage jika jebakan gagal dijinakkan
    if (result.trapDamage && result.trapDamage > 0) {
      const player = await Player.findOne({
        $or: [{ discordId: userId }, { _id: userId }]
      });
      if (player && player.currentHp !== undefined) {
        player.currentHp = Math.max(1, (player.currentHp || 100) - result.trapDamage);
        await player.save();
      }
    }

    return res.json({
      success: true,
      stepResult: result,
      session
    });
  } catch (err) {
    console.error('[INSTANCED-ZONE] POST step error:', err);
    return res.status(500).json({ success: false, error: 'Gagal menjalankan aksi zona.' });
  }
});

/**
 * POST /api/instanced-zones/claim
 * Mengklaim hadiah setelah sesi zona instans terselesaikan
 */
router.post('/claim', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.discordId;
    const session = activeSessions.get(userId);

    if (!session) {
      return res.status(400).json({ success: false, error: 'Tidak ada sesi zona instans aktif.' });
    }

    if (session.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Zona instans belum selesai!' });
    }

    const player = await Player.findOne({
      $or: [{ discordId: userId }, { _id: userId }]
    });

    if (!player) {
      return res.status(404).json({ success: false, error: 'Pemain tidak ditemukan.' });
    }

    let rewards = [];
    if (session.type === 'spirit_valley') {
      rewards = [{ item: 'spirit_herb_high', quantity: 3 }, { item: 'copper', quantity: 500 }];
    } else if (session.type === 'land_of_spirits') {
      rewards = session.milestoneReward ? [session.milestoneReward] : [{ item: 'spirit_stone', quantity: 500 }];
    } else if (session.type === 'defense_circle') {
      rewards = [{ item: 'spirit_fruit', quantity: 3 }, { item: 'pure_qi_pill', quantity: 2 }];
    } else if (session.type === 'elemental_land') {
      rewards = session.rewards || [{ item: 'fire_shard', quantity: 5 }];
    }

    // Bersihkan sesi aktif
    activeSessions.delete(userId);

    return res.json({
      success: true,
      message: 'Selamat! Hadiah area khusus berhasil diklaim.',
      rewards
    });
  } catch (err) {
    console.error('[INSTANCED-ZONE] POST claim error:', err);
    return res.status(500).json({ success: false, error: 'Gagal mengklaim hadiah zona.' });
  }
});

module.exports = router;
