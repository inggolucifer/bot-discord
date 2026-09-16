const express = require('express');
const router = express.Router();
const gridZoneService = require('../../services/gridZoneService');
const movementService = require('../../services/movementService');
const interiorService = require('../../services/interiorService');
const landService = require('../../services/landService');
const constructionService = require('../../services/constructionService');
const farmingFishingService = require('../../services/farmingFishingService');
const craftingService = require('../../services/craftingService');
const forageTrainingService = require('../../services/forageTrainingService');
const expeditionService = require('../../services/expeditionService');

// Helper untuk mengekstrak userId dan guildId dari token JWT atau body request
function getContext(req) {
  const discordId = req.user?.userId || req.body?.discordId || req.query?.discordId;
  const guildId = req.user?.guildId || req.body?.guildId || req.query?.guildId || process.env.DEFAULT_GUILD_ID || '1169651733470126100';
  return { discordId, guildId };
}

// 1. Ambil data GridZone & seluruh petak ZoneTile
router.get('/zone/:zoneId', async (req, res) => {
  try {
    const { guildId } = getContext(req);
    const zoneId = req.params.zoneId || 'xingcun_village';

    const zone = await gridZoneService.getGridZone(guildId, zoneId);
    const tiles = await gridZoneService.getZoneTiles(guildId, zoneId);

    res.json({
      ok: true,
      zone: zone || { zoneId, name: 'Desa Xingcun', width: 32, height: 32 },
      tiles
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 2. Pergerakan Karakter di Grid
router.post('/move', async (req, res) => {
  try {
    const { discordId, guildId } = getContext(req);
    const { direction } = req.body;

    if (!discordId) return res.status(400).json({ ok: false, error: 'discordId diperlukan.' });
    if (!direction) return res.status(400).json({ ok: false, error: 'Arah pergerakan diperlukan.' });

    const result = await movementService.movePlayer(discordId, guildId, direction, { io: req.app.get('io') });
    if (!result.ok) return res.status(400).json(result);

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 3. Masuk Bangunan Interior
router.post('/building/enter', async (req, res) => {
  try {
    const { discordId, guildId } = getContext(req);
    if (!discordId) return res.status(400).json({ ok: false, error: 'discordId diperlukan.' });

    const result = await interiorService.enterBuilding(discordId, guildId);
    if (!result.ok) return res.status(400).json(result);

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 4. Keluar Bangunan Interior
router.post('/building/exit', async (req, res) => {
  try {
    const { discordId, guildId } = getContext(req);
    if (!discordId) return res.status(400).json({ ok: false, error: 'discordId diperlukan.' });

    const result = await interiorService.exitBuilding(discordId, guildId);
    if (!result.ok) return res.status(400).json(result);

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 5. Ambil Layout Denah Interior 12x12
router.get('/interior/:structureId', async (req, res) => {
  try {
    const { structureId } = req.params;
    const layout = await interiorService.getInteriorLayout(structureId);
    if (!layout) return res.status(404).json({ ok: false, error: 'Struktur interior tidak ditemukan.' });

    res.json({ ok: true, ...layout });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 6. Beli Tanah (Land Ownership)
router.post('/land/purchase', async (req, res) => {
  try {
    const { discordId, guildId } = getContext(req);
    const { x, y, zoneId } = req.body;

    if (!discordId) return res.status(400).json({ ok: false, error: 'discordId diperlukan.' });
    if (x == null || y == null) return res.status(400).json({ ok: false, error: 'Koordinat x dan y diperlukan.' });

    const result = await landService.purchaseLandPlot(discordId, guildId, x, y, zoneId);
    if (!result.ok) return res.status(400).json(result);

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 7. Mulai Konstruksi Aset
router.post('/construction/start', async (req, res) => {
  try {
    const { discordId, guildId } = getContext(req);
    const { x, y, blueprintId } = req.body;

    if (!discordId) return res.status(400).json({ ok: false, error: 'discordId diperlukan.' });
    if (!blueprintId) return res.status(400).json({ ok: false, error: 'blueprintId diperlukan.' });

    const result = await constructionService.startConstruction(discordId, guildId, x, y, blueprintId);
    if (!result.ok) return res.status(400).json(result);

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 8. Finalisasi / Cek Konstruksi
router.post('/construction/finalize', async (req, res) => {
  try {
    const { guildId } = getContext(req);
    const { x, y, zoneId } = req.body;

    const result = await constructionService.checkAndFinalizeConstruction(guildId, zoneId || 'xingcun_village', x, y);
    if (!result.ok) return res.status(400).json(result);

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 9. Profesi Farming (Tanam & Panen)
router.post('/profession/farm/plant', async (req, res) => {
  try {
    const { discordId, guildId } = getContext(req);
    const { x, y, cropName } = req.body;

    const result = await farmingFishingService.plantCrop(discordId, guildId, x, y, cropName);
    if (!result.ok) return res.status(400).json(result);

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/profession/farm/harvest', async (req, res) => {
  try {
    const { discordId, guildId } = getContext(req);
    const { x, y } = req.body;

    const result = await farmingFishingService.harvestCrop(discordId, guildId, x, y);
    if (!result.ok) return res.status(400).json(result);

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 10. Profesi Mancing
router.post('/profession/fish', async (req, res) => {
  try {
    const { discordId, guildId } = getContext(req);
    const result = await farmingFishingService.goFishing(discordId, guildId);
    if (!result.ok) return res.status(400).json(result);

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 11. Profesi Tempa & Masak
router.post('/profession/craft/smith', async (req, res) => {
  try {
    const { discordId, guildId } = getContext(req);
    const { recipe } = req.body;

    const result = await craftingService.craftSmithing(discordId, guildId, recipe);
    if (!result.ok) return res.status(400).json(result);

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/profession/craft/cook', async (req, res) => {
  try {
    const { discordId, guildId } = getContext(req);
    const { recipe } = req.body;

    const result = await craftingService.craftCooking(discordId, guildId, recipe);
    if (!result.ok) return res.status(400).json(result);

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 12. Foraging & Kungfu Training
router.post('/profession/forage', async (req, res) => {
  try {
    const { discordId, guildId } = getContext(req);
    const result = await forageTrainingService.gatherResource(discordId, guildId);
    if (!result.ok) return res.status(400).json(result);

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/profession/train', async (req, res) => {
  try {
    const { discordId, guildId } = getContext(req);
    const { skill } = req.body;

    const result = await forageTrainingService.trainKungfu(discordId, guildId, skill);
    if (!result.ok) return res.status(400).json(result);

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 13. Ekspedisi Dungeon
router.post('/expedition/start', async (req, res) => {
  try {
    const { discordId, guildId } = getContext(req);
    const { dungeon } = req.body;

    const result = await expeditionService.startExpedition(discordId, guildId, dungeon);
    if (!result.ok) return res.status(400).json(result);

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/expedition/search', async (req, res) => {
  try {
    const { discordId, guildId } = getContext(req);
    const result = await expeditionService.searchLoot(discordId, guildId);
    if (!result.ok) return res.status(400).json(result);

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/expedition/evacuate', async (req, res) => {
  try {
    const { discordId, guildId } = getContext(req);
    const result = await expeditionService.evacuateExpedition(discordId, guildId);
    if (!result.ok) return res.status(400).json(result);

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
