
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const Player = require('../../models/Player');
const Location = require('../../models/Location');
const { deductCopper, silverToCopper, formatCopper, getTotalCopper } = require('../../utils/currencyNormalize');
const LockManager = require('../utils/lockManager');

const { setPlayerAuthoritativePosition } = require('../../services/movementService');

const FERRY_ROUTES = [
  {
    id: 'xingcun_to_southern_rimba',
    name: 'Penyeberangan Sungai Sembilan Naga',
    from: { regionSlug: 'central_plains', settlementName: 'Desa Xingcun', dockName: 'Dermaga Sungai Xingcun' },
    to: { regionSlug: 'southern_demon_domain', settlementName: 'Scar of Heaven Camp', dockName: 'Dermaga Rimba Selatan', tileX: 2300, tileY: 1900 },
    raftCostSilver: 25,
    raftDurationSeconds: 30,
    fastShipCostSilver: 150
  },
  {
    id: 'southern_rimba_to_xingcun',
    name: 'Penyeberangan Kembali ke Dataran Tengah',
    from: { regionSlug: 'southern_demon_domain', settlementName: 'Scar of Heaven Camp', dockName: 'Dermaga Rimba Selatan' },
    to: { regionSlug: 'central_plains', settlementName: 'Desa Xingcun', dockName: 'Dermaga Sungai Xingcun', tileX: 2450, tileY: 2480 },
    raftCostSilver: 25,
    raftDurationSeconds: 30,
    fastShipCostSilver: 150
  },
  {
    id: 'eastern_port_to_turtle_island',
    name: 'Pelayaran Bahari Laut Timur ke Pulau Penyu Raksasa (Turtle Island)',
    from: { regionSlug: 'eastern_sea', settlementName: 'Pelabuhan Timur', dockName: 'Dermaga Timur' },
    to: { regionSlug: 'eastern_sea', settlementName: 'Pulau Penyu Raksasa', dockName: 'Dermaga Karang Penyu', tileX: 4350, tileY: 2750 },
    raftCostSilver: 40,
    raftDurationSeconds: 45,
    fastShipCostSilver: 250
  },
  {
    id: 'turtle_island_to_eastern_port',
    name: 'Pelayaran Kembali dari Pulau Penyu ke Pelabuhan Timur',
    from: { regionSlug: 'eastern_sea', settlementName: 'Pulau Penyu Raksasa', dockName: 'Dermaga Karang Penyu' },
    to: { regionSlug: 'eastern_sea', settlementName: 'Pelabuhan Timur', dockName: 'Dermaga Timur', tileX: 3900, tileY: 2500 },
    raftCostSilver: 40,
    raftDurationSeconds: 45,
    fastShipCostSilver: 250
  }
];

// GET /api/ferry/routes
router.get('/routes', authenticateToken, async (req, res) => {
  try {
    const player = await Player.findOne({ discordId: req.user.userId });
    if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

    const currentRegion = player.currentLocation?.regionSlug || 'central_plains';
    const currentSettlement = player.currentLocation?.settlementName || 'Desa Xingcun';

    // Cari rute yang berawal dari lokasi saat ini atau berikan rute umum
    const availableRoutes = FERRY_ROUTES.filter(r => 
      r.from.regionSlug === currentRegion || r.from.settlementName === currentSettlement
    );

    res.json({
      currentLocation: player.currentLocation,
      routes: availableRoutes.length > 0 ? availableRoutes : FERRY_ROUTES
    });
  } catch (error) {
    console.error('[API-FERRY] Error fetching routes:', error);
    res.status(500).json({ error: 'Gagal memuat rute penyeberangan.' });
  }
});

// POST /api/ferry/cross
router.post('/cross', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const lockKey = `pay_${userId}_ferry`;
  const releaseLock = await LockManager.acquire(lockKey);
  if (!releaseLock) return res.status(429).json({ error: 'Transaksi sedang diproses. Mohon tunggu.' });

  try {
    const { routeId, mode = 'raft' } = req.body; // mode: 'raft' | 'fast_ship'

    const route = FERRY_ROUTES.find(r => r.id === routeId);
    if (!route) return res.status(404).json({ error: 'Rute penyeberangan tidak ditemukan.' });

    const player = await Player.findOne({ discordId: userId });
    if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

    const costSilver = mode === 'fast_ship' ? route.fastShipCostSilver : route.raftCostSilver;
    const needCopper = silverToCopper(costSilver);
    if (!player.currency) player.currency = { copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 };

    try {
      deductCopper(player.currency, needCopper, 'Biaya Ferry');
    } catch (err) {
      return res.status(400).json({
        error: `Koin tidak mencukupi! Dibutuhkan setara ${costSilver} Perak (${formatCopper(needCopper)}), kamu hanya memiliki ${formatCopper(getTotalCopper(player.currency))}.`
      });
    }
    player.markModified('currency');

    if (mode === 'fast_ship') {
      // Penyeberangan Kilat / Pedang Terbang: Tiba seketika
      await setPlayerAuthoritativePosition(player, {
        zoneId: 'tianyuan_world_map',
        tileX: route.to.tileX,
        tileY: route.to.tileY
      }, {
        regionSlug: route.to.regionSlug,
        settlementName: route.to.settlementName,
        buildingName: route.to.dockName,
        clearTravelStatus: true
      });

      return res.json({
        success: true,
        mode: 'fast_ship',
        instant: true,
        message: `Kapal Layar Cepat melaju kencang membelah ombak! Kamu telah tiba seketika di ${route.to.dockName} (${route.to.settlementName}).`,
        newLocation: player.currentLocation
      });
    }

    // Penyeberangan Santai (Rakit Bambu): Countdown 30 detik
    const voyageArrivesAt = new Date(Date.now() + (route.raftDurationSeconds * 1000));
    player.ferryVoyage = {
      routeId: route.id,
      destinationRegionSlug: route.to.regionSlug,
      destinationSettlementName: route.to.settlementName,
      destinationDockName: route.to.dockName,
      targetX: route.to.tileX,
      targetY: route.to.tileY,
      durationSeconds: route.raftDurationSeconds,
      arrivesAt: voyageArrivesAt,
      hasFished: false
    };

    await player.save();

    res.json({
      success: true,
      mode: 'raft',
      instant: false,
      message: `Rakit bambu mulai berlayar melintasi riak air. Estimasi waktu berlayar: ${route.raftDurationSeconds} detik. Santai dan nikmati pemandangan!`,
      voyage: player.ferryVoyage,
      remainingSeconds: route.raftDurationSeconds
    });
  } catch (error) {
    console.error('[API-FERRY] Cross error:', error);
    res.status(500).json({ error: 'Gagal memulai penyeberangan air.' });
  } finally {
    if (typeof releaseLock === 'function') releaseLock();
  }
});

// POST /api/ferry/resolve
router.post('/resolve', authenticateToken, async (req, res) => {
  try {
    const player = await Player.findOne({ discordId: req.user.userId });
    if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

    if (!player.ferryVoyage || !player.ferryVoyage.arrivesAt) {
      return res.status(400).json({ error: 'Kamu tidak sedang dalam pelayaran rakit.' });
    }

    const now = Date.now();
    const arrives = new Date(player.ferryVoyage.arrivesAt).getTime();
    if (now < arrives) {
      const remaining = Math.max(1, Math.ceil((arrives - now) / 1000));
      return res.status(400).json({
        error: `Rakit masih berlayar di tengah perairan. Harap tunggu ${remaining} detik lagi.`,
        remainingSeconds: remaining
      });
    }

    const voyage = player.ferryVoyage;
    player.ferryVoyage = null;

    await setPlayerAuthoritativePosition(player, {
      zoneId: 'tianyuan_world_map',
      tileX: voyage.targetX || 2450,
      tileY: voyage.targetY || 2480
    }, {
      regionSlug: voyage.destinationRegionSlug,
      settlementName: voyage.destinationSettlementName,
      buildingName: voyage.destinationDockName,
      clearTravelStatus: true
    });

    res.json({
      success: true,
      arrived: true,
      message: `Rakit bambu telah merapat dengan selamat di ${voyage.destinationDockName}!`,
      newLocation: player.currentLocation
    });
  } catch (error) {
    console.error('[API-FERRY] Resolve error:', error);
    res.status(500).json({ error: 'Gagal merapatkan rakit.' });
  }
});

// POST /api/ferry/fish-on-deck
router.post('/fish-on-deck', authenticateToken, async (req, res) => {
  try {
    const player = await Player.findOne({ discordId: req.user.userId });
    if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

    if (!player.ferryVoyage) {
      return res.status(400).json({ error: 'Aktivitas mancing di geladak hanya bisa saat menaiki rakit penyeberangan.' });
    }

    if (player.ferryVoyage.hasFished) {
      return res.status(400).json({ error: 'Kamu sudah melempar kail di pelayaran ini.' });
    }

    if (player.currentStamina < 5) {
      return res.status(400).json({ error: 'Stamina tidak mencukupi untuk melempar kail.' });
    }

    player.currentStamina -= 5;
    player.ferryVoyage.hasFished = true;

    // Hadiah ikan sungai
    if (!player.currency) player.currency = { copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 };
    player.currency.silver = (player.currency.silver || 0) + 10;
    player.markModified('currency');

    await player.save();

    res.json({
      success: true,
      message: 'Kailmu menyentuh arus dalam! Berhasil menarik Ikan Mas Sungai (+10 Perak)!',
      currentStamina: player.currentStamina
    });
  } catch (error) {
    console.error('[API-FERRY] Fish on deck error:', error);
    res.status(500).json({ error: 'Gagal melempar kail di rakit.' });
  }
});

module.exports = router;
