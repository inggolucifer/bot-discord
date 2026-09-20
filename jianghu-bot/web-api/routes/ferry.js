
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const Player = require('../../models/Player');
const Location = require('../../models/Location');

const FERRY_ROUTES = [
  {
    id: 'xingcun_to_southern_rimba',
    name: 'Penyeberangan Sungai Sembilan Naga',
    from: { regionSlug: 'central_plains', settlementName: 'Desa Xingcun', dockName: 'Dermaga Sungai Xingcun' },
    to: { regionSlug: 'southern_demon_domain', settlementName: 'Desa Rimba Lembah', dockName: 'Dermaga Rimba Selatan', tileX: 16, tileY: 16 },
    raftCostSilver: 25,
    raftDurationSeconds: 30,
    fastShipCostSilver: 150
  },
  {
    id: 'southern_rimba_to_xingcun',
    name: 'Penyeberangan Kembali ke Dataran Tengah',
    from: { regionSlug: 'southern_demon_domain', settlementName: 'Desa Rimba Lembah', dockName: 'Dermaga Rimba Selatan' },
    to: { regionSlug: 'central_plains', settlementName: 'Desa Xingcun', dockName: 'Dermaga Sungai Xingcun', tileX: 16, tileY: 16 },
    raftCostSilver: 25,
    raftDurationSeconds: 30,
    fastShipCostSilver: 150
  },
  {
    id: 'eastern_port_to_jade_island',
    name: 'Pelayaran Bahari Laut Timur ke Pulau Istana Giok',
    from: { regionSlug: 'eastern_sea', settlementName: 'Pelabuhan Pesisir Timur', dockName: 'Dermaga Utama Timur' },
    to: { regionSlug: 'eastern_sea', settlementName: 'Pulau Istana Giok', dockName: 'Dermaga Istana Giok', tileX: 20, tileY: 20 },
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
  try {
    const userId = req.user.userId;
    const { routeId, mode = 'raft' } = req.body; // mode: 'raft' | 'fast_ship'

    const route = FERRY_ROUTES.find(r => r.id === routeId);
    if (!route) return res.status(404).json({ error: 'Rute penyeberangan tidak ditemukan.' });

    const player = await Player.findOne({ discordId: userId });
    if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

    const cost = mode === 'fast_ship' ? route.fastShipCostSilver : route.raftCostSilver;
    const playerSilver = player.currencies?.silver || 0;

    if (playerSilver < cost) {
      return res.status(400).json({
        error: `Koin Perak tidak mencukupi! Dibutuhkan ${cost} Perak, kamu hanya memiliki ${playerSilver} Perak.`
      });
    }

    // Potong koin perak
    player.currencies.silver -= cost;

    if (mode === 'fast_ship') {
      // Penyeberangan Kilat / Pedang Terbang: Tiba seketika
      player.currentLocation = {
        regionSlug: route.to.regionSlug,
        settlementName: route.to.settlementName,
        buildingName: route.to.dockName
      };
      if (!player.gridPosition) player.gridPosition = {};
      player.gridPosition.tileX = route.to.tileX;
      player.gridPosition.tileY = route.to.tileY;

      await player.save();

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
    player.currentLocation = {
      regionSlug: voyage.destinationRegionSlug,
      settlementName: voyage.destinationSettlementName,
      buildingName: voyage.destinationDockName
    };
    if (!player.gridPosition) player.gridPosition = {};
    player.gridPosition.tileX = voyage.targetX || 16;
    player.gridPosition.tileY = voyage.targetY || 16;
    player.ferryVoyage = null;

    await player.save();

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
    if (!player.currencies) player.currencies = {};
    player.currencies.silver = (player.currencies.silver || 0) + 10;

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
