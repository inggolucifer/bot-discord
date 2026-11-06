/**
 * web-api/routes/instancedZones.js
 * REST API untuk Area Khusus Berinstans V25 (Server-Authoritative, Persistent & Hardened)
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../middlewares/auth');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const InstancedZoneSession = require('../../models/InstancedZoneSession');
const instancedEngine = require('../../services/instancedZoneEngine');
const zonesV23 = require('../../world-data/zones-v23.json');
const { getRealmIndex } = require('../../utils/cultivation');

function getPlayerQuery(userId) {
  if (!userId) return { _id: null };
  const isObjId = mongoose.Types.ObjectId.isValid(userId) && String(new mongoose.Types.ObjectId(userId)) === String(userId);
  return isObjId ? { $or: [{ discordId: userId }, { _id: userId }] } : { discordId: String(userId) };
}

/**
 * Memformat dokumen sesi MongoDB agar kompatibel dengan kontrak klien/engine
 */
function formatSessionResponse(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const sessionData = obj.sessionData || {};

  return {
    _id: obj._id,
    id: String(obj._id),
    playerId: obj.playerId,
    discordId: obj.discordId,
    zoneId: obj.zoneId,
    zoneName: obj.zoneName || sessionData.name || obj.zoneId,
    type: obj.zoneType,
    zoneType: obj.zoneType,
    dangerTier: obj.dangerTier,
    tier: obj.dangerTier,
    requiredRealmIndex: obj.requiredRealmIndex,
    sessionSeed: obj.sessionSeed,
    status: obj.status,
    stepIndex: obj.stepIndex || 0,
    startedAt: obj.startedAt,
    expiresAt: obj.expiresAt,
    claimedAt: obj.claimedAt,
    rewards: obj.rewards && obj.rewards.length > 0 ? obj.rewards : sessionData.rewards,
    claimedRewards: obj.claimedRewards,
    // Data spesifik tipe zona
    currentRoomIndex: sessionData.currentRoomIndex ?? 0,
    rooms: sessionData.rooms || [],
    currentChamber: sessionData.currentChamber ?? 1,
    chambers: sessionData.chambers || [],
    currentWave: sessionData.currentWave ?? 1,
    totalWaves: sessionData.totalWaves || (sessionData.waves ? sessionData.waves.length : 5),
    waves: sessionData.waves || [],
    element: sessionData.element,
    milestoneReward: sessionData.milestoneReward
  };
}

/**
 * Mencari definisi zona dari file world-data/zones-v23.json
 */
function findZoneDef(zoneId) {
  if (!zoneId) return null;
  const cleanId = String(zoneId).replace(/^inst_/, '');
  const all = zonesV23.zones || [];
  return all.find(z => z.id === cleanId || z.id === zoneId) || null;
}

/**
 * GET /api/instanced-zones/session
 * Mengambil sesi zona instans aktif/selesai pemain dari database
 */
router.get('/session', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user.discordId;
    const player = await Player.findOne(getPlayerQuery(userId));

    if (!player) {
      return res.json({ success: true, session: null });
    }

    const sessionDoc = await InstancedZoneSession.findOne({
      playerId: player._id,
      status: { $in: ['active', 'completed'] }
    }).sort({ startedAt: -1 });

    return res.json({
      success: true,
      session: sessionDoc ? formatSessionResponse(sessionDoc) : null
    });
  } catch (err) {
    console.error('[INSTANCED-ZONE] GET session error:', err);
    return res.status(500).json({ success: false, error: 'Gagal mengambil sesi zona.' });
  }
});

/**
 * POST /api/instanced-zones/enter
 * Memasuki area khusus berinstans (Server Authoritative: membaca konfigurasi dari zones-v23.json)
 */
router.post('/enter', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user.discordId;
    const { zoneId } = req.body;

    if (!zoneId) {
      return res.status(400).json({ success: false, error: 'zoneId wajib disertakan.' });
    }

    const zone = findZoneDef(zoneId);
    if (!zone) {
      return res.status(404).json({ success: false, error: 'Zona instans tidak ditemukan di peta semesta.' });
    }

    const validTypes = ['spirit_valley', 'land_of_spirits', 'defense_circle', 'elemental_land'];
    if (!validTypes.includes(zone.type)) {
      return res.status(400).json({ success: false, error: `Tipe zona '${zone.type}' tidak valid sebagai area instans.` });
    }

    const player = await Player.findOne(getPlayerQuery(userId));

    if (!player) {
      return res.status(404).json({ success: false, error: 'Karakter pemain tidak ditemukan.' });
    }

    // 1. Validasi Posisi Otoritatif Server (Jarak Chebyshev <= 3 petak)
    const px = player.gridPosition?.tileX !== undefined
      ? Number(player.gridPosition.tileX)
      : (player.currentPosition?.x !== undefined ? Number(player.currentPosition.x) : zone.x);
    const py = player.gridPosition?.tileY !== undefined
      ? Number(player.gridPosition.tileY)
      : (player.currentPosition?.y !== undefined ? Number(player.currentPosition.y) : zone.y);
    const dist = Math.max(Math.abs(px - zone.x), Math.abs(py - zone.y));

    if (dist > 3) {
      return res.status(400).json({
        success: false,
        error: `Terlalu jauh, dekati lokasi (<= 3 petak). Jarak saat ini: ${dist} petak.`
      });
    }

    // 2. Validasi Status Pemain
    if (player.isTraveling) {
      return res.status(400).json({ success: false, error: 'Sedang dalam perjalanan' });
    }
    if (player.activeBattleId) {
      return res.status(400).json({ success: false, error: 'Sedang dalam pertarungan' });
    }

    // 3. Validasi Ranah Kultivasi
    const requiredRealm = zone.requiredRealmIndex !== undefined
      ? zone.requiredRealmIndex
      : (zone.dangerTier >= 5 ? 2 : (zone.dangerTier >= 3 ? 1 : 0));

    const actualRealm = player.realmIndex !== undefined ? Number(player.realmIndex) : getRealmIndex(player.systemCultivation?.realm || player.realm);
    if (actualRealm < requiredRealm) {
      return res.status(400).json({
        success: false,
        error: `Kultivasi Anda belum mencukupi. Perlu ranah tingkat ${requiredRealm}.`
      });
    }

    // 4. Periksa Sesi yang Sedang Berjalan (Resume jika zona sama, tolak jika zona berbeda)
    const existingSession = await InstancedZoneSession.findOne({
      playerId: player._id,
      status: { $in: ['active', 'completed'] }
    });

    if (existingSession) {
      if (existingSession.zoneId === zone.id) {
        return res.json({
          success: true,
          message: 'Melanjutkan ekspedisi yang sedang berjalan.',
          session: formatSessionResponse(existingSession)
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Anda masih memiliki ekspedisi aktif di zona lain. Selesaikan atau batalkan terlebih dahulu.'
        });
      }
    }

    // 5. Validasi & Pengurangan Biaya Masuk (Atomic Server Deduction)
    if (zone.entryCost) {
      const curStamina = player.currentStamina !== undefined ? player.currentStamina : (player.stamina || 0);
      if (zone.entryCost.stamina && curStamina < zone.entryCost.stamina) {
        return res.status(400).json({
          success: false,
          error: `Stamina tidak mencukupi (memerlukan ${zone.entryCost.stamina} stamina).`
        });
      }

      if (zone.entryCost.spiritStones) {
        const stones = player.spiritStones ?? player.silver ?? 0;
        if (stones < zone.entryCost.spiritStones) {
          return res.status(400).json({
            success: false,
            error: `Batu Roh tidak mencukupi (memerlukan ${zone.entryCost.spiritStones} Batu Roh).`
          });
        }
      }

      if (zone.entryCost.item) {
        const inv = player.inventory || [];
        const hasItem = inv.some(it => (it.itemId || it.id || it.name) === zone.entryCost.item && (it.quantity || it.amount || 1) >= 1);
        if (!hasItem) {
          return res.status(400).json({
            success: false,
            error: `Membutuhkan item kunci '${zone.entryCost.item}' untuk membuka gerbang.`
          });
        }
      }

      // Potong biaya secara permanen
      if (zone.entryCost.stamina) {
        const newSta = Math.max(0, curStamina - zone.entryCost.stamina);
        player.currentStamina = newSta;
        player.stamina = newSta;
      }
      if (zone.entryCost.spiritStones) {
        if (player.spiritStones !== undefined) player.spiritStones -= zone.entryCost.spiritStones;
        else player.silver = Math.max(0, (player.silver || 0) - zone.entryCost.spiritStones);
      }
      if (zone.entryCost.item) {
        const itemIdx = player.inventory.findIndex(it => (it.itemId || it.id || it.name) === zone.entryCost.item);
        if (itemIdx !== -1) {
          const qty = player.inventory[itemIdx].quantity || player.inventory[itemIdx].amount || 1;
          if (qty <= 1) player.inventory.splice(itemIdx, 1);
          else if (player.inventory[itemIdx].quantity !== undefined) player.inventory[itemIdx].quantity--;
          else player.inventory[itemIdx].amount--;
        }
      }
      await player.save();
    }

    // 6. Inisialisasi Sesi Otoritatif Engine
    const startedAt = Date.now();
    let sessionData = null;
    let initialRewards = [];

    if (zone.type === 'spirit_valley') {
      sessionData = instancedEngine.createSpiritValleySession(String(player._id), zone.id, zone.dangerTier, startedAt);
    } else if (zone.type === 'land_of_spirits') {
      sessionData = instancedEngine.createLandOfSpiritsSession(String(player._id), zone.id, zone.dangerTier, startedAt);
    } else if (zone.type === 'defense_circle') {
      sessionData = instancedEngine.createDefenseCircleSession(String(player._id), zone.id, zone.dangerTier, startedAt);
    } else if (zone.type === 'elemental_land') {
      const element = zone.element || 'api';
      const elRewards = instancedEngine.createElementalLandLoot(element, zone.dangerTier, startedAt);
      sessionData = {
        type: 'elemental_land',
        zoneId: zone.id,
        name: zone.name,
        element,
        tier: zone.dangerTier,
        status: 'active',
        currentWave: 1,
        totalWaves: 3,
        startedAt,
        rewards: elRewards
      };
      initialRewards = [elRewards];
    }

    const sessionSeed = sessionData.sessionSeed || ((Date.now() ^ zone.x) >>> 0);
    const expiresAt = new Date(Date.now() + 2 * 3600 * 1000); // Masa berlaku 2 jam

    const sessionDoc = new InstancedZoneSession({
      playerId: player._id,
      discordId: String(player.discordId || userId),
      zoneId: zone.id,
      zoneName: zone.name,
      zoneType: zone.type,
      dangerTier: zone.dangerTier,
      requiredRealmIndex: requiredRealm,
      sessionSeed,
      status: 'active',
      stepIndex: 0,
      sessionData,
      rewards: initialRewards,
      startedAt: new Date(startedAt),
      expiresAt
    });

    await sessionDoc.save();

    return res.json({
      success: true,
      message: `Berhasil memasuki ${zone.name}!`,
      session: formatSessionResponse(sessionDoc)
    });
  } catch (err) {
    console.error('[INSTANCED-ZONE] POST enter error:', err);
    return res.status(500).json({ success: false, error: 'Gagal memasuki zona instans.' });
  }
});

/**
 * POST /api/instanced-zones/step
 * Menjalankan satu aksi langkah dalam sesi instans
 */
router.post('/step', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user.discordId;
    const { action, options = {} } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, error: 'Aksi wajib disertakan.' });
    }

    const player = await Player.findOne(getPlayerQuery(userId));

    if (!player) {
      return res.status(404).json({ success: false, error: 'Pemain tidak ditemukan.' });
    }

    const sessionDoc = await InstancedZoneSession.findOne({
      playerId: player._id,
      status: 'active'
    });

    if (!sessionDoc) {
      return res.status(400).json({ success: false, error: 'Tidak ada sesi zona instans aktif.' });
    }

    const sessionData = sessionDoc.sessionData || {};

    // Resolusi khusus elemental land
    if (sessionDoc.zoneType === 'elemental_land') {
      if (action === 'clear_wave') {
        const curWave = sessionData.currentWave || 1;
        const totWaves = sessionData.totalWaves || 3;
        if (curWave < totWaves) {
          sessionData.currentWave = curWave + 1;
          sessionDoc.stepIndex = (sessionDoc.stepIndex || 0) + 1;
          if (typeof sessionDoc.markModified === 'function') {
            if (typeof sessionDoc.markModified === 'function') {
      sessionDoc.markModified('sessionData');
    }
          }
          await sessionDoc.save();
          return res.json({
            success: true,
            stepResult: { ok: true, completed: false },
            session: formatSessionResponse(sessionDoc)
          });
        } else {
          sessionDoc.status = 'completed';
          sessionData.status = 'completed';
          sessionDoc.stepIndex = (sessionDoc.stepIndex || 0) + 1;
          if (typeof sessionDoc.markModified === 'function') {
            if (typeof sessionDoc.markModified === 'function') {
      sessionDoc.markModified('sessionData');
    }
          }
          await sessionDoc.save();
          return res.json({
            success: true,
            stepResult: { ok: true, completed: true },
            session: formatSessionResponse(sessionDoc)
          });
        }
      }
    }

    // Resolusi melalui engine otoritatif
    const result = instancedEngine.resolveStepAction(sessionData, action, options);
    if (!result.ok) {
      return res.status(400).json({ success: false, error: result.error || 'Aksi gagal.' });
    }

    // Terapkan damage jika jebakan terpicu
    if (result.damageIgnoringDef && result.damageIgnoringDef > 0) {
      if (player.currentHp !== undefined) {
        player.currentHp = Math.max(1, (player.currentHp || 100) - result.damageIgnoringDef);
        await player.save();
      }
    }

    sessionDoc.stepIndex = (sessionDoc.stepIndex || 0) + 1;
    if (sessionData.status === 'completed' || result.completed) {
      sessionDoc.status = 'completed';
    }

    if (typeof sessionDoc.markModified === 'function') {
      sessionDoc.markModified('sessionData');
    }
    await sessionDoc.save();

    return res.json({
      success: true,
      stepResult: result,
      session: formatSessionResponse(sessionDoc)
    });
  } catch (err) {
    console.error('[INSTANCED-ZONE] POST step error:', err);
    return res.status(500).json({ success: false, error: 'Gagal menjalankan aksi zona.' });
  }
});

/**
 * POST /api/instanced-zones/claim
 * Mengklaim hadiah setelah ekspedisi terselesaikan (Idempoten)
 */
router.post('/claim', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user.discordId;

    const player = await Player.findOne(getPlayerQuery(userId));

    if (!player) {
      return res.status(404).json({ success: false, error: 'Pemain tidak ditemukan.' });
    }

    const sessionDoc = await InstancedZoneSession.findOne({
      playerId: player._id,
      status: { $in: ['completed', 'claimed'] }
    }).sort({ updatedAt: -1 });

    if (!sessionDoc) {
      return res.status(400).json({ success: false, error: 'Zona instans belum selesai atau tidak ditemukan!' });
    }

    // Idempotency check: Hadiah sudah diklaim
    if (sessionDoc.status === 'claimed') {
      return res.status(409).json({
        success: false,
        error: 'Hadiah sudah diklaim sebelumnya.',
        claimedRewards: sessionDoc.claimedRewards
      });
    }

    // Tentukan hadiah berdasarkan tipe zona & konfigurasi
    let rewards = [];
    const sessionData = sessionDoc.sessionData || {};

    if (sessionDoc.zoneType === 'spirit_valley') {
      rewards = [
        { item: 'spirit_herb_high', name: 'Herba Roh Tingkat Tinggi', quantity: 3 },
        { item: 'copper', name: 'Koin Tembaga', quantity: 500 }
      ];
    } else if (sessionDoc.zoneType === 'land_of_spirits') {
      rewards = sessionData.milestoneReward
        ? [sessionData.milestoneReward]
        : [{ item: 'spirit_stone', name: 'Batu Roh', quantity: 500 }];
    } else if (sessionDoc.zoneType === 'defense_circle') {
      rewards = [
        { item: 'spirit_fruit', name: 'Buah Roh Murni', quantity: 3 },
        { item: 'pure_qi_pill', name: 'Pil Intisari Qi', quantity: 2 }
      ];
    } else if (sessionDoc.zoneType === 'elemental_land') {
      const elR = sessionData.rewards || {};
      rewards = [{
        item: elR.shardKey || 'fire_shard',
        name: elR.shardName || 'Keping Roh Api',
        quantity: elR.quantity || 3
      }];
    }

    // Berikan hadiah ke pemain
    if (!Array.isArray(player.inventory)) player.inventory = [];
    for (const r of rewards) {
      if (r.item === 'copper' || r.item === 'silver') {
        player.silver = (player.silver || 0) + (r.quantity || 0);
      } else if (r.item === 'spirit_stone') {
        player.spiritStones = (player.spiritStones || 0) + (r.quantity || 0);
      } else {
        const itemName = r.name || r.item;
        const itemKey = r.item;
        let itemDoc = null;
        if (mongoose.connection && mongoose.connection.readyState === 1) {
          try {
            const guildId = player.guildId || process.env.GUILD_ID || 'DEFAULT_GUILD';
            itemDoc = await Item.findOne({
              $or: [
                { guildId, name: itemName },
                { guildId, itemId: itemKey },
                { name: itemName },
                ...(mongoose.Types.ObjectId.isValid(itemKey) ? [{ _id: itemKey }] : [])
              ]
            });
            if (!itemDoc) {
              itemDoc = await Item.create({
                guildId,
                name: itemName,
                itemId: itemKey,
                category: 'material',
                tier: 1,
                description: `Material berharga dari ekspedisi instans: ${itemName}`
              });
            }
          } catch (e) {
            itemDoc = null;
          }
        }
        const itemIdVal = itemDoc?._id || (mongoose.Types.ObjectId.isValid(itemKey) ? itemKey : new mongoose.Types.ObjectId());
        const existing = player.inventory.find(i => i.itemId && i.itemId.toString() === String(itemIdVal));
        if (existing) {
          existing.quantity = (existing.quantity || 1) + (r.quantity || 1);
        } else {
          player.inventory.push({
            itemId: itemIdVal,
            name: itemName,
            quantity: r.quantity || 1
          });
        }
      }
    }
    if (typeof player.markModified === 'function') {
      player.markModified('inventory');
    }

    // Tandai status sesi sebagai 'claimed'
    sessionDoc.status = 'claimed';
    sessionDoc.claimedRewards = rewards;
    sessionDoc.claimedAt = new Date();
    await sessionDoc.save();
    await player.save();

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

/**
 * POST /api/instanced-zones/abandon
 * Membatalkan ekspedisi yang sedang berlangsung
 */
router.post('/abandon', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user.discordId;

    const player = await Player.findOne(getPlayerQuery(userId));

    if (!player) {
      return res.status(404).json({ success: false, error: 'Pemain tidak ditemukan.' });
    }

    const sessionDoc = await InstancedZoneSession.findOne({
      playerId: player._id,
      status: 'active'
    });

    if (!sessionDoc) {
      return res.status(400).json({ success: false, error: 'Tidak ada sesi aktif untuk dibatalkan.' });
    }

    sessionDoc.status = 'abandoned';
    await sessionDoc.save();

    return res.json({
      success: true,
      message: 'Ekspedisi zona instans berhasil dibatalkan.'
    });
  } catch (err) {
    console.error('[INSTANCED-ZONE] POST abandon error:', err);
    return res.status(500).json({ success: false, error: 'Gagal membatalkan ekspedisi.' });
  }
});

module.exports = router;
