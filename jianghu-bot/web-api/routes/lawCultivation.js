/**
 * LAW CULTIVATION API ROUTES
 * 
 * Endpoint terpadu untuk sistem 15 Hukum Semesta (Law Cultivation):
 * - GET  /law/status         → State lengkap law, Qi bar, rank name, sisa cap harian
 * - POST /law/bind           → Bind Law Slot 1 (Manual) + Slot 2 (Common Entity)
 * - POST /law/channel/start  → Mulai channeling meditasi
 * - POST /law/channel/stop   → Hentikan channeling, sinkronisasi Qi
 * - POST /law/daily-claim    → Klaim pencerahan harian + update login streak
 * - POST /law/breakthrough/stage → Mini-breakthrough per stage (+2 LvCap, +1 Skill Pt)
 * - POST /law/breakthrough/rank  → Major breakthrough + tribulasi langit
 * - GET  /law/skill-tree     → Pohon skill tersedia untuk law aktif
 * - POST /law/skill/allocate → Alokasi skill point ke pohon skill
 * - POST /law/combat-loadout → Update loadout jurus aktif (max 4)
 * 
 * Referensi: implementation_plan.md §2, §3, §5, §11.3
 */

const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const ZoneTile = require('../../models/ZoneTile');
const Asset = require('../../models/Asset');
const LawSkillDefinition = require('../../models/LawSkillDefinition');
const { authenticateToken } = require('../middlewares/auth');
const LockManager = require('../utils/lockManager');
const CustomError = require('../utils/CustomError');
const { withTransaction } = require('../utils/dbTransaction');
const { z } = require('zod');
const { isClaimedToday, isClaimedYesterday } = require('../../utils/dailyClaim');
const { getSkillPointCost, getMaxSkillLevel, getRequiredSkillCombatExp } = require('../../utils/kungfuMastery');

const {
  LAW_DEFINITIONS,
  LAW_RANK_NAMES,
  NATURAL_ESSENCES,
  getQiRequired,
  syncLawChanneling,
  checkAndResetDailyCap,
  claimDailyEpiphany,
  attemptMiniBreakthrough,
  attemptMajorBreakthrough,
  getMiniBreakthroughCost,
  meetsLawRankRequirements,
  getLawStatus,
  startBodyTemperingPart,
  claimBodyTemperingPart,
  getMaxEssenceStorage,
  getTierAffinity,
  getGuMaxSlots
} = require('../../utils/lawCultivationEngine');

// ═══════════════════════════════════════════════════════════════
// Helper: Resolve player dari JWT token
// ═══════════════════════════════════════════════════════════════
async function resolvePlayer(req, session = null) {
  const userId = req.user.userId;
  const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
  const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);
  const query = Player.findOne({ discordId: userId, guildId }).populate('cultivationLaw.breakthroughPillSlot');
  if (session) query.session(session);
  const player = await query;
  if (!player) throw new CustomError('Karakter tidak ditemukan.', 404);
  if (player.status !== 'active') throw new CustomError(`Karaktermu berstatus ${player.status}.`, 403);
  return player;
}

// ═══════════════════════════════════════════════════════════════
// GET /law/status — State lengkap Law Cultivation
// ═══════════════════════════════════════════════════════════════
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);

    // Reset daily cap jika hari sudah berganti
    checkAndResetDailyCap(player);

    const status = getLawStatus(player);
    res.json({ success: true, data: status });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error fetching law status:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// ═══════════════════════════════════════════════════════════════
const LAW_BINDING_REQUIREMENTS = {
  element_phoenix_fire:     { slot2Required: true,  tag: 'fire_catalyst',      name: 'Intisari Api Merah / Pil Api' },
  element_azure_water:      { slot2Required: true,  tag: 'water_catalyst',     name: 'Embun Es Abadi / Giok Air' },
  element_xuanwu_earth:     { slot2Required: true,  tag: 'earth_catalyst',     name: 'Batu Inti Purba / Tanah Kuning' },
  element_qingdi_wood:      { slot2Required: true,  tag: 'wood_catalyst',      name: 'Getah Pohon Roh / Benih Hayat' },
  element_roc_wind:         { slot2Required: true,  tag: 'wind_catalyst',      name: 'Bulu Burung Roc / Kristal Badai' },
  element_godthunder_light: { slot2Required: true,  tag: 'thunder_catalyst',   name: 'Pasir Petir Langit / Obsidian Kilat' },
  body_tempering:           { slot2Required: false, tag: null,                 name: null }, // Slot 2 Hidden!
  gu_master:                { slot2Required: true,  tag: 'gu_larva',           name: 'Bibit Ulat Gu Fana' },
  natal_artifact:           { slot2Required: true,  tag: 'common_artifact',    name: 'Benda Common (Pedang Patah/Mangkuk Retak/dll)' },
  natal_beast:              { slot2Required: true,  tag: 'common_beast',       name: 'Satwa Common (Anak Anjing/Ular Rumput/dll)' },
  demonic_turbid_core:      { slot2Required: true,  tag: 'beast_core',         name: 'Inti Siluman Kotor Tingkat 1' },
  demonic_blood_soul:       { slot2Required: true,  tag: 'blood_vial',         name: 'Botol Darah Monster Segar' },
  demonic_myriad_venom:     { slot2Required: true,  tag: 'venom_sac',          name: 'Kantung Racun Ular Rawa' },
  demonic_abyssal_pact:     { slot2Required: true,  tag: 'abyssal_scroll',     name: 'Perkamen Darah Gelap' },
  demonic_nether_darkness:  { slot2Required: true,  tag: 'yin_stone',          name: 'Batu Yin Kuburan Tua' }
};

// ═══════════════════════════════════════════════════════════════
// GET /law/binding/inventory — Real Inventory Picker for Slot 1 & 2
// ═══════════════════════════════════════════════════════════════
router.get('/binding/inventory', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const { getRealmIndex } = require('../../utils/cultivation');
    const realmIdx = getRealmIndex(player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)');
    const stage = player.systemCultivation?.stage || 1;
    const isBound = !!player.cultivationLaw?.activeLawType;
    const isOrdinary = !!player.isNormalCultivator;

    await player.populate({
      path: 'inventory.itemId',
      select: 'name category rank tier lawType tags description imageUrl basePrice priceCurrency'
    });

    const slot1Manuals = [];
    const slot2Items = [];

    for (const inv of (player.inventory || [])) {
      if (!inv.itemId || inv.quantity < 1) continue;
      const item = inv.itemId;

      if (item.category === 'law' || item.lawType || (item.tags && item.tags.includes('law_manual'))) {
        slot1Manuals.push({
          inventoryId: inv._id ? inv._id.toString() : item._id.toString(),
          itemId: item._id.toString(),
          name: item.name,
          lawType: item.lawType || detectLawTypeFromItem(item),
          quantity: inv.quantity,
          rank: item.rank || 'Common',
          tier: item.tier || 1,
          description: item.description,
          imageUrl: item.imageUrl || null
        });
      }

      const isCandidateSlot2 = 
        (item.rank === 'Common') ||
        (item.category === 'material') ||
        (item.category === 'weapon' && item.rank === 'Common') ||
        (item.category === 'pet' && item.rank === 'Common') ||
        (item.tags && item.tags.some(t => [
          'catalyst', 'fire_catalyst', 'water_catalyst', 'earth_catalyst', 'wood_catalyst', 'wind_catalyst', 'thunder_catalyst',
          'gu_larva', 'common_artifact', 'common_beast', 'beast_core', 'blood_vial', 'venom_sac', 'abyssal_scroll', 'yin_stone'
        ].includes(t)));

      if (isCandidateSlot2 && item.category !== 'law') {
        slot2Items.push({
          inventoryId: inv._id ? inv._id.toString() : item._id.toString(),
          itemId: item._id.toString(),
          name: item.name,
          category: item.category,
          rank: item.rank || 'Common',
          quantity: inv.quantity,
          tags: item.tags || [],
          description: item.description,
          imageUrl: item.imageUrl || null
        });
      }
    }

    res.json({
      success: true,
      data: {
        isEligible: realmIdx === 0 && !isBound && !isOrdinary,
        currentRealm: player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)',
        currentStage: stage,
        isBound,
        boundLawType: player.cultivationLaw?.activeLawType || null,
        isNormalCultivator: isOrdinary,
        canChooseOrdinary: stage >= 10 && !isBound && !isOrdinary,
        slot1Manuals,
        slot2Items,
        requirementsMap: LAW_BINDING_REQUIREMENTS
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error fetching binding inventory:', error);
    res.status(500).json({ error: 'Gagal memuat inventori pengikatan Hukum.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /law/bind — Pengikatan Fondasi Law Mortal (PERMANEN, Real Inventory)
// ═══════════════════════════════════════════════════════════════
const bindSchema = z.object({
  slot1ManualItemId: z.string().min(1),
  slot2CompanionItemId: z.string().nullable().optional().default(null),
  customEntityName: z.string().max(30).nullable().optional().default(null)
});

router.post('/bind', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const validation = bindSchema.safeParse(req.body);
  if (!validation.success) return res.status(400).json({ error: 'Payload tidak valid.', details: validation.error.flatten() });

  const { slot1ManualItemId, slot2CompanionItemId, customEntityName } = validation.data;

  const lockKey = `law_bind_${userId}`;
  const releaseLock = await LockManager.acquire(lockKey);
  if (!releaseLock) return res.status(429).json({ error: 'Pengikatan sedang diproses.' });

  try {
    await withTransaction(async (session) => {
      const player = await resolvePlayer(req, session);

      // Validasi: Sudah punya Law atau memilih Jalur Biasa → TIDAK BOLEH GANTI
      if (player.cultivationLaw?.activeLawType) {
        throw new CustomError('Kamu sudah mematri Hukum Semesta ke dalam fondasi fana. Pilihan ini bersifat PERMANEN dan tidak dapat diubah.', 400);
      }
      if (player.isNormalCultivator) {
        throw new CustomError('Kamu telah memilih Jalur Kultivator Biasa. Tubuh fana telah mengunci diri dari ikatan Hukum Semesta.', 400);
      }

      // Validasi: Harus masih Mortal (realmIndex === 0)
      const { getRealmIndex } = require('../../utils/cultivation');
      const realmIdx = getRealmIndex(player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)');
      if (realmIdx > 0) {
        throw new CustomError('Dantianmu telah terikat ranah Qi. Hanya tubuh fana yang murni yang dapat menerima Hukum Semesta.', 400);
      }

      // Validasi Slot 1: Manual Law Item
      const mongoose = require('mongoose');
      let manualItem = null;
      if (mongoose.Types.ObjectId.isValid(slot1ManualItemId)) {
        manualItem = await Item.findById(slot1ManualItemId).session(session);
      }
      if (!manualItem) {
        manualItem = await Item.findOne({ lawType: slot1ManualItemId }).session(session) ||
                     await Item.findOne({ category: 'law', lawType: slot1ManualItemId }).session(session);
      }

      if (!manualItem) throw new CustomError('Item Kitab Hukum tidak valid.', 400);

      // Deteksi law type dari item (menggunakan field lawType atau name matching)
      const lawType = manualItem.lawType || detectLawTypeFromItem(manualItem);
      if (!lawType || !LAW_DEFINITIONS[lawType]) {
        throw new CustomError('Item ini bukan Kitab Hukum Semesta yang sah.', 400);
      }

      // Validasi kepemilikan manual di tas/inventori
      let manualInv = player.inventory.find(i => i.itemId.toString() === manualItem._id.toString());
      if (!manualInv || manualInv.quantity < 1) {
        throw new CustomError(`Kitab Hukum "${manualItem.name}" tidak ditemukan di inventori tasmu. Dapatkan terlebih dahulu dari quest, eksplorasi, atau pasar.`, 400);
      }

      // Konsumsi manual dari inventori
      manualInv.quantity -= 1;
      if (manualInv.quantity <= 0) {
        player.inventory = player.inventory.filter(i => i.itemId.toString() !== manualItem._id.toString());
      }
      player.markModified('inventory');

      // Validasi Slot 2: Persyaratan Law
      const reqConfig = LAW_BINDING_REQUIREMENTS[lawType];
      if (reqConfig && reqConfig.slot2Required) {
        if (!slot2CompanionItemId) {
          throw new CustomError(`Hukum Semesta ${LAW_DEFINITIONS[lawType].name} membutuhkan item persyaratan di Slot 2: ${reqConfig.name}.`, 400);
        }

        let companionItem = null;
        if (mongoose.Types.ObjectId.isValid(slot2CompanionItemId)) {
          companionItem = await Item.findById(slot2CompanionItemId).session(session);
        }
        if (!companionItem) {
          companionItem = await Item.findOne({ name: slot2CompanionItemId }).session(session);
        }
        if (!companionItem) {
          throw new CustomError('Item persyaratan Slot 2 tidak ditemukan di dunia Jianghu.', 400);
        }

        let companionInv = player.inventory.find(i => i.itemId.toString() === companionItem._id.toString());
        if (!companionInv || companionInv.quantity < 1) {
          throw new CustomError(`Item persyaratan "${companionItem.name}" tidak ada di inventori tasmu (butuh minimal 1).`, 400);
        }

        // Konsumsi item persyaratan dari tas
        companionInv.quantity -= 1;
        if (companionInv.quantity <= 0) {
          player.inventory = player.inventory.filter(i => i.itemId.toString() !== companionItem._id.toString());
        }
        player.markModified('inventory');

        // Jika Law berwujud Companion Entity (Natal Artifact / Natal Beast), inisialisasi boundEntity
        if (lawType === 'natal_artifact' || lawType === 'natal_beast') {
          const entityType = lawType === 'natal_artifact' ? 'artifact' : 'beast';
          player.cultivationLaw.boundEntity = {
            entityType,
            baseItemId: companionItem._id,
            originalName: companionItem.name,
            customName: customEntityName || companionItem.name,
            rankLevel: 0,
            evolutionStage: entityType === 'beast' ? 'Telur Purba' : 'Fana',
            essence: 0,
            maxEssence: 100,
            isEgg: entityType === 'beast' ? true : false,
            hatchedAt: null,
            beastCurrentHp: entityType === 'beast' ? 100 : 0,
            beastMaxHp: entityType === 'beast' ? 100 : 0,
            beastAtk: entityType === 'beast' ? 15 : 0,
            beastDef: entityType === 'beast' ? 10 : 0,
            beastSpd: entityType === 'beast' ? 12 : 0,
            artifactAtk: entityType === 'artifact' ? 15 : 0,
            artifactDef: entityType === 'artifact' ? 10 : 0,
            artifactCrit: entityType === 'artifact' ? 5 : 0,
            artifactRes: entityType === 'artifact' ? 5 : 0
          };
        }
      }

      // Inisialisasi cultivationLaw
      player.cultivationLaw.activeLawType = lawType;
      player.cultivationLaw.boundAt = new Date();
      player.cultivationLaw.rank = 0;
      player.cultivationLaw.stage = 0;
      player.cultivationLaw.qi = 0;
      player.cultivationLaw.maxQi = getQiRequired(0, 0);
      player.cultivationLaw.lawLevelCapBonus = 0;
      player.cultivationLaw.lawSkillPoints = 0;

      player.markModified('cultivationLaw');
      await player.save({ session });

      const lawDef = LAW_DEFINITIONS[lawType];
      const rankName = LAW_RANK_NAMES[lawType]?.[0] || 'Rank 0';

      res.json({
        success: true,
        message: `✨ Berhasil mematri ${lawDef.name} ke dalam fondasi fana! Perjalanan kultivasi dimulai sebagai "${rankName}".`,
        data: {
          activeLawType: lawType,
          lawName: lawDef.name,
          rank: 0,
          stage: 0,
          maxQi: player.cultivationLaw.maxQi,
          rankDisplayName: rankName,
          boundEntity: player.cultivationLaw.boundEntity?.entityType ? player.cultivationLaw.boundEntity : null
        }
      });
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error binding law:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mematri Hukum Semesta.' });
  } finally {
    if (typeof releaseLock === 'function') releaseLock();
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /law/ordinary/confirm — Mengunci Jalur Kultivator Biasa
// ═══════════════════════════════════════════════════════════════
router.post('/ordinary/confirm', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const lockKey = `law_ordinary_${userId}`;
  const releaseLock = await LockManager.acquire(lockKey);
  if (!releaseLock) return res.status(429).json({ error: 'Aksi sedang diproses.' });

  try {
    const player = await resolvePlayer(req);

    if (player.cultivationLaw?.activeLawType) {
      return res.status(400).json({ error: 'Kamu telah mematri Hukum Semesta. Tidak dapat berpindah ke Jalur Kultivator Biasa.' });
    }

    if (player.isNormalCultivator) {
      return res.status(400).json({ error: 'Kamu sudah berada di Jalur Kultivator Biasa.' });
    }

    const { getRealmIndex } = require('../../utils/cultivation');
    const realmIdx = getRealmIndex(player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)');
    const stage = player.systemCultivation?.stage || 1;

    // Gerbang pilihan terbuka pada Tahap 10 Mortal atau di luar Mortal
    if (stage < 10 && realmIdx === 0) {
      return res.status(400).json({ error: 'Pilihan Jalur Kultivator Biasa baru terbuka pada gerbang Fondasi Fana Tahap 10.' });
    }

    player.isNormalCultivator = true;
    player.normalCultivatorConfirmedAt = new Date();
    player.markModified('isNormalCultivator');
    await player.save();

    res.json({
      success: true,
      message: '📜 Keputusan terpatri! Kamu memilih berjalan tanpa belenggu Hukum Semesta sebagai Kultivator Biasa. Stat tempur disesuaikan (×0.95).',
      data: {
        isNormalCultivator: true,
        normalCultivatorConfirmedAt: player.normalCultivatorConfirmedAt
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error confirming ordinary path:', error);
    res.status(500).json({ error: 'Gagal mengonfirmasi jalur Kultivator Biasa.' });
  } finally {
    releaseLock();
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /law/channel/start — Mulai channeling meditasi
// ═══════════════════════════════════════════════════════════════
router.post('/channel/start', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const lockKey = `law_channel_${userId}`;
  const releaseLock = await LockManager.acquire(lockKey);
  if (!releaseLock) {
    return res.status(429).json({ error: 'Aksi meditasi sedang diproses. Mohon tunggu sejenak.' });
  }

  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;

    if (!law?.activeLawType) {
      return res.status(400).json({ error: 'Belum memilih Hukum Semesta (Law).' });
    }

    if (law.isChanneling) {
      // Sinkronkan sesi meditasi sebelumnya terlebih dahulu agar Qi tidak hilang
      syncLawChanneling(player);
      law.isChanneling = false;
      player.markModified('cultivationLaw');
      await player.save();
    }

    // Check daily cap
    checkAndResetDailyCap(player);
    const { getDailyChannelCap } = require('../../utils/lawCultivationEngine');
    const cap = getDailyChannelCap(law.dailyData?.dailyStreakDays || player.dailyStreak || 0);
    const used = law.dailyData?.channelMinutesToday || 0;

    if (used >= cap) {
      return res.status(400).json({ error: `Batas meditasi harian tercapai (${Math.floor(used)}/${cap} menit). Istirahatlah.` });
    }

    // Check if Qi already full
    if (law.qi >= law.maxQi) {
      return res.status(400).json({ error: 'Qi sudah penuh. Lakukan penerobosan (breakthrough).' });
    }

    law.isChanneling = true;
    law.lastChannelSyncAt = new Date();
    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: '🧘 Meditasi dimulai. Qi mengalir perlahan ke dalam dantian...',
      data: { isChanneling: true, channelCapRemaining: Math.max(0, cap - used) }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error starting channel:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat memulai meditasi.' });
  } finally {
    releaseLock();
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /law/channel/stop — Hentikan channeling, sinkronisasi Qi
// ═══════════════════════════════════════════════════════════════
router.post('/channel/stop', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const lockKey = `law_channel_${userId}`;
  const releaseLock = await LockManager.acquire(lockKey);
  if (!releaseLock) {
    return res.status(429).json({ error: 'Aksi meditasi sedang diproses. Mohon tunggu sejenak.' });
  }

  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;

    if (!law?.activeLawType) {
      return res.status(400).json({ error: 'Belum memilih Hukum Semesta (Law).' });
    }

    if (!law.isChanneling) {
      return res.status(400).json({ error: 'Tidak sedang bermeditasi.' });
    }

    // Pastikan daily cap dicek terlebih dahulu jika melewati tengah malam
    checkAndResetDailyCap(player);

    const result = syncLawChanneling(player);
    law.isChanneling = false;
    player.markModified('cultivationLaw');
    await player.save();

    const gainedMsg = result.qiGained > 0
      ? `+${Math.floor(result.qiGained)} Qi terserap (${Math.floor(result.minutesSynced)} menit).`
      : `Meditasi baru saja dimulai (kurang dari 1 menit). Belum ada Qi terserap.`;

    res.json({
      success: true,
      message: `Meditasi dihentikan. ${gainedMsg}`,
      data: {
        isChanneling: false,
        qiGained: result.qiGained,
        qi: Math.floor(law.qi),
        maxQi: law.maxQi,
        minutesSynced: Math.floor(result.minutesSynced),
        isCapReached: result.isCapReached,
        isQiFull: result.isQiFull
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error stopping channel:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat menghentikan meditasi.' });
  } finally {
    releaseLock();
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /law/daily-claim — Klaim pencerahan harian & update streak
// ═══════════════════════════════════════════════════════════════
router.post('/daily-claim', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const lockKey = `law_daily_claim_${userId}`;
  const releaseLock = await LockManager.acquire(lockKey);
  if (!releaseLock) {
    return res.status(429).json({ error: 'Klaim pencerahan harian sedang diproses. Mohon tunggu sejenak.' });
  }

  try {
    const player = await resolvePlayer(req);
    const result = claimDailyEpiphany(player);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    // Sinkronkan streak login karakter ke law dailyData (tanpa merusak player.lastDailyClaim)
    if (player.cultivationLaw?.dailyData) {
      player.cultivationLaw.dailyData.dailyStreakDays = player.dailyStreak || 1;
    }

    player.markModified('cultivationLaw');
    if (player.currency) player.markModified('currency');
    await player.save();

    res.json({
      success: true,
      message: result.message,
      data: {
        qiGranted: result.qiGranted,
        copperGranted: result.copperGranted,
        streak: player.dailyStreak || 1,
        qi: Math.floor(player.cultivationLaw.qi),
        maxQi: player.cultivationLaw.maxQi
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error claiming daily:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengklaim pencerahan harian.' });
  } finally {
    releaseLock();
  }
});

// POST /law/breakthrough/set-pill — Pasang pil penerobosan dari inventori
router.post('/breakthrough/set-pill', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const lockKey = `law_pill_${userId}`;
  const releaseLock = await LockManager.acquire(lockKey);
  if (!releaseLock) return res.status(429).json({ error: 'Aksi sedang diproses.' });

  const { itemId } = req.body;
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (!law) return res.status(400).json({ error: 'Karakter belum memiliki Law.' });

    if (!itemId) {
      law.breakthroughPillSlot = null;
      player.markModified('cultivationLaw');
      await player.save();
      return res.json({ success: true, message: 'Slot pil penerobosan dikosongkan.', data: { pill: null } });
    }

    await player.populate({ path: 'inventory.itemId' });
    const invItem = player.inventory.find(i => i.itemId && (i.itemId._id?.toString() === itemId.toString() || i.itemId.id === itemId || i.itemId.toString() === itemId));
    if (!invItem || invItem.quantity < 1) {
      return res.status(400).json({ error: 'Item pil tidak ditemukan di dalam inventori.' });
    }

    const pillDoc = invItem.itemId;
    const cat = (pillDoc.category || '').toLowerCase();
    const tags = Array.isArray(pillDoc.tags) ? pillDoc.tags : [];
    const isPill = cat === 'pill' || cat === 'alchemy' || tags.includes('breakthrough_pill') || (pillDoc.name || '').toLowerCase().includes('pil');
    if (!isPill) {
      return res.status(400).json({ error: 'Item yang dipilih bukan jenis pil penerobosan.' });
    }

    const targetRank = (law.rank || 0) + 1;
    const pillTier = pillDoc.tier || (pillDoc.rank === 'uncommon' ? 2 : pillDoc.rank === 'rare' ? 3 : (pillDoc.rank === 'epic' ? 4 : 1));
    if (pillTier > targetRank) {
      return res.status(400).json({
        error: `Pil [${pillDoc.name}] bertier ${pillTier}, melebihi batas penerobosan Rank ${targetRank}! Dantian menolak menyerap pil melampaui ranah tujuan.`
      });
    }

    law.breakthroughPillSlot = pillDoc._id;
    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `💊 Pil [${pillDoc.name}] berhasil dipasang ke slot penerobosan! (+20% Peluang Sukses & Proteksi Deviasi Qi)`,
      data: {
        pill: {
          id: pillDoc._id,
          name: pillDoc.name,
          tier: pillDoc.tier || 1,
          description: pillDoc.description
        }
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal memasang pil penerobosan.' });
  } finally {
    releaseLock();
  }
});

// POST /law/breakthrough/remove-pill — Lepas pil penerobosan
router.post('/breakthrough/remove-pill', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const lockKey = `law_pill_${userId}`;
  const releaseLock = await LockManager.acquire(lockKey);
  if (!releaseLock) return res.status(429).json({ error: 'Aksi sedang diproses.' });

  try {
    const player = await resolvePlayer(req);
    if (player.cultivationLaw) {
      player.cultivationLaw.breakthroughPillSlot = null;
      player.markModified('cultivationLaw');
      await player.save();
    }
    res.json({ success: true, message: 'Pil berhasil dilepas dari slot penerobosan.', data: { pill: null } });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal melepas pil penerobosan.' });
  } finally {
    releaseLock();
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /law/breakthrough/stage — Mini-breakthrough (Stage 0-8 → +1)
// ═══════════════════════════════════════════════════════════════
router.post('/breakthrough/stage', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const lockKey = `law_mini_bt_${userId}`;
  const releaseLock = await LockManager.acquire(lockKey);
  if (!releaseLock) return res.status(429).json({ error: 'Penerobosan sedang diproses.' });

  try {
    await withTransaction(async (session) => {
      const player = await resolvePlayer(req, session);
      const law = player.cultivationLaw;

      // Sinkronisasi channeling terlebih dahulu
      if (law?.isChanneling) {
        syncLawChanneling(player);
        law.isChanneling = false;
      }

      // Validasi biaya material (deduct Copper)
      const cost = getMiniBreakthroughCost(law.rank, law.stage);
      const totalCopper = (player.currency?.copper || 0)
        + (player.currency?.silver || 0) * 100
        + (player.currency?.gold || 0) * 10000;

      if (totalCopper < cost) {
        throw new CustomError(`Material tidak cukup. Butuh ${cost} Copper, kamu punya ${totalCopper} Copper.`, 400);
      }

      // Deduct dari copper terlebih dahulu
      let remaining = cost;
      if (player.currency.copper >= remaining) {
        player.currency.copper -= remaining;
        remaining = 0;
      } else {
        remaining -= player.currency.copper;
        player.currency.copper = 0;
        // Fallback ke silver
        const silverNeeded = Math.ceil(remaining / 100);
        if (player.currency.silver >= silverNeeded) {
          player.currency.silver -= silverNeeded;
          player.currency.copper += (silverNeeded * 100) - remaining;
          remaining = 0;
        }
      }

      // Validasi mood
      const { assertMood, applyMoodDelta } = require('../../utils/moodManager');
      assertMood(player, 15); // Mood ≥ 15 untuk mini breakthrough

      // Cek dan konsumsi Pil Penerobosan jika terpasang di slot
      let pillOptions = {};
      if (law.breakthroughPillSlot) {
        const pillTargetId = (law.breakthroughPillSlot._id || law.breakthroughPillSlot)?.toString();
        await player.populate({ path: 'inventory.itemId' });
        const pillIdx = player.inventory.findIndex(inv => {
          if (!inv.itemId) return false;
          const invId = (inv.itemId._id || inv.itemId)?.toString();
          return invId === pillTargetId || inv.itemId.id === pillTargetId;
        });
        if (pillIdx !== -1 && player.inventory[pillIdx].quantity > 0) {
          player.inventory[pillIdx].quantity -= 1;
          if (player.inventory[pillIdx].quantity <= 0) {
            player.inventory.splice(pillIdx, 1);
          }
          player.markModified('inventory');
          pillOptions = { pillBonusRate: 20, pillProtectLoss: true };
          law.breakthroughPillSlot = null; // Terkonsumsi
        } else {
          law.breakthroughPillSlot = null;
        }
      }

      const result = attemptMiniBreakthrough(player, pillOptions);

      if (result.isSuccess) {
        applyMoodDelta(player, -5);
      } else {
        applyMoodDelta(player, -10);
      }

      player.markModified('cultivationLaw');
      player.markModified('currency');
      await player.save({ session });

      res.json(result);
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error mini-breakthrough:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat penerobosan stage.' });
  } finally {
    if (typeof releaseLock === 'function') releaseLock();
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /law/breakthrough/rank — Major Breakthrough + Tribulasi
// ═══════════════════════════════════════════════════════════════
router.post('/breakthrough/rank', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const lockKey = `law_major_bt_${userId}`;
  const releaseLock = await LockManager.acquire(lockKey);
  if (!releaseLock) return res.status(429).json({ error: 'Penerobosan besar sedang diproses.' });

  try {
    await withTransaction(async (session) => {
      const player = await resolvePlayer(req, session);
      const law = player.cultivationLaw;

      // Sinkronisasi channeling
      if (law?.isChanneling) {
        syncLawChanneling(player);
        law.isChanneling = false;
      }

      // Gate Mutual: Cek Character Realm requirements
      const targetRank = law.rank + 1;
      if (!meetsLawRankRequirements(player, targetRank)) {
        const { LAW_RANK_REALM_REQUIREMENTS } = require('../../utils/lawCultivationEngine');
        const req_data = LAW_RANK_REALM_REQUIREMENTS[targetRank];
        throw new CustomError(`Ranah karaktermu belum memenuhi syarat. Butuh Realm Index ≥ ${req_data?.minRealmIndex} dan Level ≥ ${req_data?.minLevel}.`, 400);
      }

      // Validasi Khusus Penempaan Raga Suci (Body Tempering: 9 Bagian Tubuh) (Master Plan §3.3 & §5.3)
      // Tabel Syarat Level 9 Bagian Tubuh: Menuju Rank R, tiap bagian wajib >= Lv. R * 2
      if (law.activeLawType === 'body_tempering') {
        const parts = law.bodyTemperingParts || {};
        const requiredParts = ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'spine', 'dantian', 'skin'];
        const requiredLevel = targetRank * 2;
        const unreadyParts = requiredParts.filter(p => (parts[p] || 0) < requiredLevel);
        if (unreadyParts.length > 0) {
          const partLabels = {
            head: 'Kepala', torso: 'Dada', leftArm: 'Lengan Kiri', rightArm: 'Lengan Kanan',
            leftLeg: 'Kaki Kiri', rightLeg: 'Kaki Kanan', spine: 'Tulang Punggung', dantian: 'Dantian Raga', skin: 'Kulit Luar'
          };
          const unreadyList = unreadyParts.map(p => `${partLabels[p] || p} (${parts[p] || 0}/${requiredLevel})`).join(', ');
          throw new CustomError(`Penempaan Raga belum tuntas. Menuju Rank ${targetRank}, seluruh 9 bagian tubuh wajib mencapai minimal Lv. ${requiredLevel}. Belum siap: ${unreadyList}.`, 400);
        }
      }

      // Validasi mood
      const { assertMood, applyMoodDelta } = require('../../utils/moodManager');
      assertMood(player, 25); // Mood ≥ 25 untuk major breakthrough

      // Cek dan konsumsi Pil Penerobosan jika terpasang di slot
      let pillOptions = {};
      if (law.breakthroughPillSlot) {
        const pillTargetId = (law.breakthroughPillSlot._id || law.breakthroughPillSlot)?.toString();
        await player.populate({ path: 'inventory.itemId' });
        const pillIdx = player.inventory.findIndex(inv => {
          if (!inv.itemId) return false;
          const invId = (inv.itemId._id || inv.itemId)?.toString();
          return invId === pillTargetId || inv.itemId.id === pillTargetId;
        });
        if (pillIdx !== -1 && player.inventory[pillIdx].quantity > 0) {
          player.inventory[pillIdx].quantity -= 1;
          if (player.inventory[pillIdx].quantity <= 0) {
            player.inventory.splice(pillIdx, 1);
          }
          player.markModified('inventory');
          pillOptions = { pillBonusRate: 20, pillProtectLoss: true };
          law.breakthroughPillSlot = null; // Terkonsumsi
        } else {
          law.breakthroughPillSlot = null;
        }
      }

      const result = attemptMajorBreakthrough(player, pillOptions);

      if (result.isSuccess) {
        applyMoodDelta(player, -15);

        // Juga naikkan rank boundEntity jika ada
        if (law.boundEntity?.entityType) {
          law.boundEntity.rankLevel = law.rank;
          const evolStages = ['Mortal', 'Spirit', 'Earth', 'Heaven', 'Primordial', 'Celestial', 'Void', 'Chaos', 'Apex'];
          law.boundEntity.evolutionStage = evolStages[Math.min(law.rank, evolStages.length - 1)];

          if (law.boundEntity.entityType === 'beast') {
            if (law.rank >= 1 && law.boundEntity.isEgg) {
              law.boundEntity.isEgg = false;
              law.boundEntity.hatchedAt = new Date();
            }
            law.boundEntity.beastAtk = 15 + law.rank * 15;
            law.boundEntity.beastDef = 10 + law.rank * 10;
            law.boundEntity.beastMaxHp = 100 + law.rank * 60;
            law.boundEntity.beastCurrentHp = law.boundEntity.beastMaxHp;
            law.boundEntity.beastSpd = 12 + law.rank * 5;
          } else if (law.boundEntity.entityType === 'artifact') {
            law.boundEntity.artifactAtk = 15 + law.rank * 15;
            law.boundEntity.artifactDef = 10 + law.rank * 10;
            law.boundEntity.artifactCrit = 5 + law.rank * 2;
            law.boundEntity.artifactRes = 5 + law.rank * 2;
          }
        }
      } else {
        applyMoodDelta(player, -20);
      }

      player.markModified('cultivationLaw');
      await player.save({ session });

      // Emit socket update
      if (req.io && req.user) {
        req.io.to(req.user.userId).emit('user_update', { message: result.message });
      }

      res.json(result);
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error major-breakthrough:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat penerobosan besar.' });
  } finally {
    if (typeof releaseLock === 'function') releaseLock();
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /law/skill-tree & /law/skills — Pohon skill tersedia untuk law aktif
// ═══════════════════════════════════════════════════════════════
router.get(['/skill-tree', '/skills'], authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;

    if (!law?.activeLawType) {
      return res.status(400).json({ error: 'Belum memilih Hukum Semesta (Law).' });
    }

    // Ambil semua skill definition untuk law ini
    const skills = await LawSkillDefinition.find({ lawType: law.activeLawType })
      .sort({ tier: 1, name: 1 })
      .lean();

    // Tandai mana yang sudah unlock dan level-nya
    const unlockedMap = {};
    (law.unlockedSkillIds || []).forEach(id => {
      unlockedMap[id] = true;
    });

    const skillTree = skills.map(skill => {
      const tierCost = getSkillPointCost(skill.tier || 1);
      const cost = (skill.skillPointCost && skill.skillPointCost >= tierCost) ? skill.skillPointCost : tierCost;
      const lvl = (law.skillLevels ? (law.skillLevels.get ? law.skillLevels.get(skill.skillId) : law.skillLevels[skill.skillId]) : 1) || 1;
      const exp = (law.skillExp ? (law.skillExp.get ? law.skillExp.get(skill.skillId) : law.skillExp[skill.skillId]) : 0) || 0;
      const maxLvl = getMaxSkillLevel(skill.tier || 1);
      const reqExp = getRequiredSkillCombatExp(lvl);

      return {
        ...skill,
        skillPointCost: cost,
        level: lvl,
        exp,
        reqExp,
        maxLevel: maxLvl,
        isUnlocked: !!unlockedMap[skill.skillId],
        isEquipped: (law.combatLoadout || []).includes(skill.skillId),
        canUnlock: !unlockedMap[skill.skillId]
          && law.rank >= (skill.requiredRank || 0)
          && (law.lawSkillPoints || 0) >= cost
          && (!skill.requiredParentSkillId || !!unlockedMap[skill.requiredParentSkillId])
      };
    });

    res.json({
      success: true,
      data: {
        lawType: law.activeLawType,
        availablePoints: law.lawSkillPoints,
        totalUnlocked: law.unlockedSkillIds?.length || 0,
        skills: skillTree
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error fetching skill tree:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat memuat pohon skill.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /law/skill/allocate — Alokasi skill point ke pohon skill
// ═══════════════════════════════════════════════════════════════
const allocateSchema = z.object({
  skillId: z.string().min(1)
});

router.post('/skill/allocate', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const lockKey = `law_skill_alloc_${userId}`;
  const releaseLock = await LockManager.acquire(lockKey);
  if (!releaseLock) return res.status(429).json({ error: 'Aksi alokasi skill sedang diproses.' });

  const validation = allocateSchema.safeParse(req.body);
  if (!validation.success) {
    releaseLock();
    return res.status(400).json({ error: 'Skill ID tidak valid.' });
  }

  const { skillId } = validation.data;

  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;

    if (!law?.activeLawType) {
      return res.status(400).json({ error: 'Belum memilih Hukum Semesta (Law).' });
    }

    // Cari skill definition
    const skillDef = await LawSkillDefinition.findOne({ skillId, lawType: law.activeLawType }).lean();
    if (!skillDef) {
      return res.status(404).json({ error: 'Skill tidak ditemukan untuk jalur Law ini.' });
    }

    // Cek apakah sudah unlock
    if ((law.unlockedSkillIds || []).includes(skillId)) {
      return res.status(400).json({ error: 'Skill ini sudah dipelajari.' });
    }

    // Cek rank requirement
    if (law.rank < (skillDef.requiredRank || 0)) {
      return res.status(400).json({ error: `Rank Law belum cukup. Butuh Rank ${skillDef.requiredRank}.` });
    }

    // Cek parent skill
    if (skillDef.requiredParentSkillId && !(law.unlockedSkillIds || []).includes(skillDef.requiredParentSkillId)) {
      return res.status(400).json({ error: 'Skill prasyarat belum dipelajari.' });
    }

    // Cek skill points (Tier-scaled: Tier 1=1, Tier 2=2, Tier 3=3, Tier 4=5, Tier 5=7)
    const tierCost = getSkillPointCost(skillDef.tier || 1);
    const cost = (skillDef.skillPointCost && skillDef.skillPointCost >= tierCost) ? skillDef.skillPointCost : tierCost;
    if ((law.lawSkillPoints || 0) < cost) {
      return res.status(400).json({ error: `Poin skill tidak cukup. Butuh ${cost} SP (Tier ${skillDef.tier || 1}), punya ${law.lawSkillPoints || 0} SP.` });
    }

    // Alokasikan SP
    law.lawSkillPoints -= cost;
    if (!law.unlockedSkillIds) law.unlockedSkillIds = [];
    law.unlockedSkillIds.push(skillId);

    // Inisialisasi Level 1 dan Exp 0
    if (!law.skillLevels) law.skillLevels = new Map();
    if (!law.skillExp) law.skillExp = new Map();
    if (law.skillLevels.set) {
      law.skillLevels.set(skillId, 1);
      law.skillExp.set(skillId, 0);
    } else {
      law.skillLevels[skillId] = 1;
      law.skillExp[skillId] = 0;
    }

    // Sinergi Law ke Spiritual Root XP (Automatic Dao Resonance)
    const lawDef = LAW_DEFINITIONS[law.activeLawType];
    const rootTarget = (lawDef?.rootKey || (skillDef.element ? skillDef.element.toLowerCase() : null));
    let resonanceXp = 0;
    if (rootTarget) {
      if (!player.extendedStats) player.extendedStats = {};
      if (!player.extendedStats.spiritualRoot) player.extendedStats.spiritualRoot = {};
      const currentXp = player.extendedStats.spiritualRoot[rootTarget] || 0;
      player.extendedStats.spiritualRoot[rootTarget] = currentXp + 25;
      resonanceXp = 25;
      player.markModified('extendedStats');
    }

    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `✨ Berhasil mempelajari jurus: ${skillDef.icon} ${skillDef.name}!${resonanceXp > 0 ? ` (Resonansi Dao: +${resonanceXp} Spiritual Root ${rootTarget.toUpperCase()} XP)` : ''}`,
      data: {
        skillId: skillDef.skillId,
        name: skillDef.name,
        tier: skillDef.tier,
        remainingPoints: law.lawSkillPoints,
        totalUnlocked: law.unlockedSkillIds.length,
        daoResonance: resonanceXp > 0 ? { element: rootTarget, xpGranted: resonanceXp } : null
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error allocating skill:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mempelajari jurus.' });
  } finally {
    releaseLock();
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /law/combat-loadout & /law/loadout — Update loadout jurus aktif (max 4)
// ═══════════════════════════════════════════════════════════════
const loadoutSchema = z.object({
  skillIds: z.array(z.string()).max(4)
});

router.post(['/combat-loadout', '/loadout'], authenticateToken, async (req, res) => {
  const validation = loadoutSchema.safeParse(req.body);
  if (!validation.success) return res.status(400).json({ error: 'Loadout tidak valid. Maksimal 4 jurus.' });

  const { skillIds } = validation.data;

  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;

    if (!law?.activeLawType) {
      return res.status(400).json({ error: 'Belum memilih Hukum Semesta (Law).' });
    }

    // Validasi semua skill sudah di-unlock
    const unlocked = new Set(law.unlockedSkillIds || []);
    const invalidSkills = skillIds.filter(id => !unlocked.has(id));
    if (invalidSkills.length > 0) {
      return res.status(400).json({ error: `Jurus belum dipelajari: ${invalidSkills.join(', ')}` });
    }

    // Validasi semua skill bukan pasif (hanya aktif yang bisa di-equip ke loadout)
    const skillDefs = await LawSkillDefinition.find({ skillId: { $in: skillIds } }).lean();
    const passiveSkills = skillDefs.filter(s => s.isPassive);
    if (passiveSkills.length > 0) {
      return res.status(400).json({ error: `Jurus pasif tidak bisa dipasang ke loadout: ${passiveSkills.map(s => s.name).join(', ')}` });
    }

    law.combatLoadout = skillIds;
    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `Loadout jurus aktif berhasil diperbarui (${skillIds.length}/4 slot).`,
      data: { combatLoadout: law.combatLoadout }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error updating loadout:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat memperbarui loadout.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// Helper: Deteksi law type dari nama item (fallback jika lawType field belum di-seed)
// ═══════════════════════════════════════════════════════════════
function detectLawTypeFromItem(item) {
  const name = (item.name || '').toLowerCase();
  const mapping = {
    'api phoenix': 'element_phoenix_fire',
    'samudra naga azure': 'element_azure_water',
    'inti bumi xuanwu': 'element_xuanwu_earth',
    'pohon hayat qingdi': 'element_qingdi_wood',
    'sayap badai roc': 'element_roc_wind',
    'petir hukuman dewa': 'element_godthunder_light',
    'penempaan raga': 'body_tempering',
    'sepuluh ribu gu': 'gu_master',
    'pusaka kelahiran': 'natal_artifact',
    'satwa roh purba': 'natal_beast',
    'pelebur inti siluman': 'demonic_turbid_core',
    'penghisap darah': 'demonic_blood_soul',
    'seribu racun': 'demonic_myriad_venom',
    'kontrak iblis': 'demonic_abyssal_pact',
    'bayangan sembilan yin': 'demonic_nether_darkness'
  };

  for (const [keyword, lawType] of Object.entries(mapping)) {
    if (name.includes(keyword)) return lawType;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// LAW-SPECIFIC ENDPOINTS (§12 & Master Overhaul)
// ═══════════════════════════════════════════════════════════════

// 0. UNIVERSAL ESSENCE FEEDER (Untuk Seluruh 15 Law)
router.post('/essence/feed', authenticateToken, async (req, res) => {
  const { feedType, itemId } = req.body;
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (!law?.activeLawType) {
      return res.status(400).json({ error: 'Belum memilih Hukum Semesta (Law).' });
    }

    const { getMaxEssence } = require('../../utils/lawCultivationEngine');
    const maxEss = law.maxEssence || getMaxEssence(law.rank || 0);

    if (feedType === 'blood') {
      const currentVit = player.extendedStats?.vitality ?? player.vitality ?? 100;
      if (currentVit < 15) {
        return res.status(400).json({ error: 'Vitality fisik terlalu lemah untuk meneteskan darah (butuh minimal 15 Vitality).' });
      }
      if (!player.extendedStats) player.extendedStats = {};
      player.extendedStats.vitality = Math.max(0, currentVit - 15);
      player.vitality = player.extendedStats.vitality;

      law.currentEssence = Math.min(maxEss, (law.currentEssence || 0) + 35);
      player.markModified('extendedStats');
      player.markModified('cultivationLaw');
      await player.save();

      return res.json({
        success: true,
        message: `🩸 Tetes Darah Sendiri berhasil! Bar Esensi terisi +35 (${Math.floor(law.currentEssence)}/${maxEss}) [-15 Vitality].`,
        data: { currentEssence: law.currentEssence, maxEssence: maxEss, vitality: player.extendedStats.vitality }
      });
    }

    // Mode Item Esensi
    await player.populate({ path: 'inventory.itemId' });
    const invIndex = player.inventory.findIndex(inv => {
      if (!inv.itemId || inv.quantity < 1) return false;
      if (itemId && (inv.itemId._id?.toString() === itemId || inv._id?.toString() === itemId)) return true;
      const tags = inv.itemId.tags || [];
      return tags.includes('essence') || tags.includes('catalyst') || tags.includes('gu_feed') || tags.includes('medicinal_herb') || tags.includes('beast_meat');
    });

    if (invIndex === -1) {
      return res.status(400).json({ error: 'Tidak ada item bahan esensi yang cocok di dalam tas inventori.' });
    }

    const inv = player.inventory[invIndex];
    const item = inv.itemId;
    const itemTier = item.tier || 1;
    const playerTier = (law.rank || 0) + 1;

    const affinity = getTierAffinity(playerTier, itemTier);
    if (!affinity.allowed) {
      return res.status(400).json({ error: affinity.reason || 'Item di atas ranahmu. Dantian menolak menyerap.' });
    }

    const baseEssence = 30 * Math.pow(2.2, Math.max(0, itemTier - 1));
    const essenceGain = Math.max(15, Math.floor(baseEssence * affinity.efficiency));

    inv.quantity -= 1;
    if (inv.quantity <= 0) {
      player.inventory.splice(invIndex, 1);
    }

    law.currentEssence = Math.min(maxEss, (law.currentEssence || 0) + essenceGain);
    law.qi = Math.min(law.maxQi, (law.qi || 0) + Math.floor(essenceGain * 0.5));

    player.markModified('inventory');
    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `✨ Berhasil menyerap ${item.name}! Bar Esensi terisi +${essenceGain} (${Math.floor(law.currentEssence)}/${maxEss})!`,
      data: { currentEssence: law.currentEssence, maxEssence: maxEss, qi: law.qi }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error feeding essence:', error);
    res.status(500).json({ error: 'Gagal menyerap bahan esensi.' });
  }
});

// 0.1 FASILITAS ALTAR KHUSUS (Build / Upgrade Altar)
router.post('/facility/build-or-upgrade', authenticateToken, async (req, res) => {
  const { facilityType } = req.body;
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (!law?.activeLawType) {
      return res.status(400).json({ error: 'Belum memilih Hukum Semesta (Law).' });
    }

    if (!law.facilities) {
      law.facilities = {
        bodyCauldronTier: 0,
        abyssalAltarTier: 0,
        guCrucibleTier: 1
      };
    }

    await player.populate({ path: 'inventory.itemId' });

    let facilityName = '';
    let currentTier = 0;
    let nextTier = 0;
    let requiredMaterials = []; // [{ name, qty }]
    let costSilver = 0;
    let isAltarOnMap = false;

    if (facilityType === 'body_cauldron') {
      facilityName = 'Kuali Bak Mandi Raga';
      currentTier = law.facilities.bodyCauldronTier || 0;
      nextTier = currentTier + 1;
      if (nextTier > 4) return res.status(400).json({ error: `${facilityName} sudah mencapai tingkat maksimal (Tier 4).` });

      if (nextTier === 1) {
        requiredMaterials = [{ name: 'Kayu Bambu Keras', qty: 5 }, { name: 'Batu Kasar Gunung', qty: 5 }];
        costSilver = 30;
      } else if (nextTier === 2) {
        requiredMaterials = [{ name: 'Herba Tulang Besi', qty: 5 }, { name: 'Bijih Besi Tempa', qty: 5 }];
        costSilver = 100;
      } else if (nextTier === 3) {
        requiredMaterials = [{ name: 'Darah Siluman Berenergi', qty: 3 }];
        costSilver = 250;
      } else {
        costSilver = 500;
      }
    } else if (facilityType === 'gu_crucible') {
      facilityName = 'Kendi Penyuling Gu Purba';
      currentTier = law.facilities.guCrucibleTier || 1;
      nextTier = currentTier + 1;
      if (nextTier > 4) return res.status(400).json({ error: `${facilityName} sudah mencapai tingkat maksimal (Tier 4).` });

      if (nextTier === 2) {
        requiredMaterials = [{ name: 'Intisari Serangga Gu', qty: 5 }, { name: 'Batu Kasar Gunung', qty: 5 }];
        costSilver = 80;
      } else {
        requiredMaterials = [{ name: 'Madu Ratu Kalajengking Roh', qty: 3 }];
        costSilver = 250;
      }
    } else if (facilityType === 'abyssal_altar') {
      // KHUSUS DEMONIC ABYSSAL PATH: MEMERLUKAN ALTAR DI LAHAN PETA DUNIA!
      isAltarOnMap = true;
      facilityName = 'Altar Kurban Darah Abyss';
      currentTier = law.facilities.abyssalAltarTier || 0;
      nextTier = currentTier + 1;
      if (nextTier > 3) return res.status(400).json({ error: `${facilityName} sudah mencapai tingkat maksimal (Tier 3).` });

      if (nextTier === 1) {
        requiredMaterials = [{ name: 'Batu Obsidian Hitam Abyss', qty: 3 }, { name: 'Botol Esensi Darah Segar', qty: 2 }];
        costSilver = 50;
      } else if (nextTier === 2) {
        requiredMaterials = [{ name: 'Batu Obsidian Hitam Abyss', qty: 5 }, { name: 'Inti Siluman Kotor', qty: 3 }];
        costSilver = 200;
      } else {
        costSilver = 500;
      }
    } else {
      return res.status(400).json({ error: 'Jenis fasilitas tidak valid.' });
    }

    // Validasi Khusus Altar Demonic: Wajib Memiliki Kavling Lahan di Peta Dunia
    let targetPlot = null;
    if (isAltarOnMap) {
      const ownedPlots = await ZoneTile.find({ ownerId: player.discordId });
      if (!ownedPlots || ownedPlots.length === 0) {
        return res.status(400).json({
          error: 'Praktisi Kontrak Iblis Abyss wajib memiliki kavling tanah di peta Jianghu (/world) untuk mendirikan Altar Kurban Darah Abyss!'
        });
      }
      targetPlot = ownedPlots.find(p => !p.buildingName || p.buildingName.includes(facilityName)) || ownedPlots[0];
    }

    // Validasi Silver
    if ((player.currency?.silver || 0) < costSilver) {
      return res.status(400).json({ error: `Saldo Perak tidak cukup. Butuh ${costSilver} Silver untuk pembuatan/upgrade.` });
    }

    // Validasi Bahan di Inventory
    for (const reqMat of requiredMaterials) {
      const inv = player.inventory.find(i => i.itemId?.name === reqMat.name && i.quantity >= reqMat.qty);
      if (!inv) {
        return res.status(400).json({ error: `Bahan tidak mencukupi: Butuh ${reqMat.qty}x ${reqMat.name}.` });
      }
    }

    // Potong Bahan
    for (const reqMat of requiredMaterials) {
      const invIndex = player.inventory.findIndex(i => i.itemId?.name === reqMat.name);
      if (invIndex !== -1) {
        player.inventory[invIndex].quantity -= reqMat.qty;
        if (player.inventory[invIndex].quantity <= 0) {
          player.inventory.splice(invIndex, 1);
        }
      }
    }

    player.currency.silver -= costSilver;

    // Jika Altar Demonic: Pasang Fisik di Petak Peta & Daftarkan Aset
    if (isAltarOnMap && targetPlot) {
      targetPlot.buildingName = facilityName;
      targetPlot.buildingType = 'crafting_station';
      targetPlot.label = `${facilityName} [T${nextTier}] (${player.characterName})`;
      targetPlot.isOccupied = true;
      await targetPlot.save();

      const assetDoc = await Asset.findOne({ name: facilityName });
      if (!player.assets) player.assets = [];
      const existingAssetIdx = player.assets.findIndex(a => a.name === facilityName);
      if (existingAssetIdx !== -1) {
        player.assets[existingAssetIdx].status = 'active';
        player.assets[existingAssetIdx].placement = {
          zoneId: targetPlot.zoneId,
          tileX: targetPlot.tileX,
          tileY: targetPlot.tileY
        };
      } else {
        if ((player.assets.length + 1) > (player.assetSlots || 1)) {
          player.assetSlots = player.assets.length + 1;
        }
        player.assets.push({
          assetId: assetDoc ? assetDoc._id : new mongoose.Types.ObjectId(),
          name: facilityName,
          quantity: 1,
          status: 'active',
          placement: {
            zoneId: targetPlot.zoneId,
            tileX: targetPlot.tileX,
            tileY: targetPlot.tileY
          },
          isOpenToPublic: false,
          isPubliclyVisible: true
        });
      }
      player.markModified('assets');
    }

    // Update Status Fasilitas Law
    if (facilityType === 'body_cauldron') law.facilities.bodyCauldronTier = nextTier;
    if (facilityType === 'gu_crucible') law.facilities.guCrucibleTier = nextTier;
    if (facilityType === 'abyssal_altar') law.facilities.abyssalAltarTier = nextTier;

    player.markModified('inventory');
    player.markModified('currency');
    player.markModified('cultivationLaw');
    await player.save();

    const successMsg = isAltarOnMap && targetPlot
      ? `🏛️ Berhasil mendirikan/memperkuat ${facilityName} ke Tier ${nextTier} di atas kavling lahan (${targetPlot.tileX}, ${targetPlot.tileY})! Aset iblis resmi berdiri di peta dunia.`
      : `✨ Berhasil membuat/meng-upgrade ${facilityName} ke Tier ${nextTier}!`;

    res.json({
      success: true,
      message: successMsg,
      data: {
        facilities: law.facilities,
        plot: targetPlot ? { zoneId: targetPlot.zoneId, tileX: targetPlot.tileX, tileY: targetPlot.tileY } : null
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error building facility:', error);
    res.status(500).json({ error: 'Gagal membangun fasilitas altar.' });
  }
});

// 1. GU MASTER (Dual Mode Feed & Real Synthesis)
router.post('/gu/feed', authenticateToken, async (req, res) => {
  const { slotIndex, feedType, itemId } = req.body;
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (law?.activeLawType !== 'gu_master') {
      return res.status(400).json({ error: 'Hanya praktisi Gu Master yang dapat memberi pakan cacing Gu.' });
    }

    if (!law.guSlots || law.guSlots.length === 0) {
      law.guSlots = [{
        guName: 'Gu Cacing Sutra Roh',
        guType: 'healing',
        tier: 1,
        level: 1,
        satiety: 80,
        hunger: 80,
        bonusAtk: 5,
        bonusDef: 3,
        lastFedAt: new Date()
      }];
    }

    const idx = Math.max(0, Math.min(law.guSlots.length - 1, Number(slotIndex) || 0));
    const targetGu = law.guSlots[idx];

    const baseSatiety = targetGu.satiety !== undefined ? targetGu.satiety : (targetGu.hunger || 80);
    const hoursSinceFed = targetGu.lastFedAt ? (Date.now() - new Date(targetGu.lastFedAt).getTime()) / 3600000 : 0;
    const currentEffectiveSatiety = Math.max(0, Math.min(100, baseSatiety - Math.floor(hoursSinceFed * 2)));

    if (feedType === 'blood') {
      const currentVit = player.extendedStats?.vitality ?? player.vitality ?? 100;
      if (currentVit < 15) {
        return res.status(400).json({ error: 'Vitality fisik terlalu lemah untuk meneteskan darah.' });
      }
      if (!player.extendedStats) player.extendedStats = {};
      player.extendedStats.vitality = Math.max(0, currentVit - 15);
      player.vitality = player.extendedStats.vitality;

      targetGu.satiety = Math.min(100, currentEffectiveSatiety + 35);
      targetGu.hunger = targetGu.satiety;
      targetGu.lastFedAt = new Date();
      law.qi = Math.min(law.maxQi, (law.qi || 0) + 35);

      player.markModified('extendedStats');
      player.markModified('cultivationLaw');
      await player.save();

      return res.json({
        success: true,
        message: `🩸 Tetes Darah Sendiri berhasil! ${targetGu.guName} kenyang ${targetGu.satiety}% (-15 Vitality, +35 Qi)!`,
        data: { guSlots: law.guSlots, qi: law.qi, vitality: player.extendedStats.vitality }
      });
    }

    // Mode Item Esensi dari Tas
    await player.populate({ path: 'inventory.itemId' });
    const invIndex = player.inventory.findIndex(inv => {
      if (!inv.itemId || inv.quantity < 1) return false;
      if (itemId && (inv.itemId._id?.toString() === itemId || inv._id?.toString() === itemId)) return true;
      const tags = inv.itemId.tags || [];
      const name = (inv.itemId.name || '').toLowerCase();
      return tags.includes('gu_feed') || tags.includes('gu_essence') || name.includes('serangga') || name.includes('madu') || name.includes('daging');
    });

    if (invIndex === -1) {
      return res.status(400).json({ error: 'Bahan pakan cacing Gu tidak ditemukan di tas inventori. Gunakan mode Tetes Darah Sendiri!' });
    }

    const inv = player.inventory[invIndex];
    const itemDoc = inv.itemId;
    const itemTier = itemDoc.tier || itemDoc.rank || 1;
    const playerTier = (law.rank || 0) + 1;

    const affinity = getTierAffinity(playerTier, itemTier);
    if (!affinity.allowed) {
      return res.status(400).json({
        error: `${affinity.reason} Rongga cacing Gu milikmu belum sanggup mencerna nutrisi Tier ${itemTier} (Ranahmu setara Tier ${playerTier}).`
      });
    }

    const satietyGain = Math.round(60 * affinity.efficiency);
    const qiGain = Math.round(50 * itemTier * affinity.efficiency);

    inv.quantity -= 1;
    if (inv.quantity <= 0) {
      player.inventory.splice(invIndex, 1);
    }

    targetGu.satiety = Math.min(100, currentEffectiveSatiety + satietyGain);
    targetGu.hunger = targetGu.satiety;
    targetGu.lastFedAt = new Date();
    law.qi = Math.min(law.maxQi, (law.qi || 0) + qiGain);

    player.markModified('inventory');
    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `🍖 Berhasil memberi makan ${targetGu.guName} dengan ${itemDoc.name}! Kekenyangan ${targetGu.satiety}% (+${qiGain} Qi)!`,
      data: { guSlots: law.guSlots, qi: law.qi }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error feeding Gu:', error);
    res.status(500).json({ error: 'Gagal memberi pakan serangga Gu.' });
  }
});

// POST /gu/equip — Memasang Gu ke dalam slot rongga aperture (Master Plan §3.2)
router.post('/gu/equip', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const lockKey = `law_gu_equip_${userId}`;
  const releaseLock = await LockManager.acquire(lockKey);
  if (!releaseLock) return res.status(429).json({ error: 'Aksi pasang Gu sedang diproses.' });

  const { itemId } = req.body;
  if (!itemId) {
    releaseLock();
    return res.status(400).json({ error: 'ID item Gu wajib disertakan.' });
  }

  try {
    let resultData = null;
    await withTransaction(async (session) => {
      const player = await resolvePlayer(req, session);
      const law = player.cultivationLaw;
      if (law?.activeLawType !== 'gu_master') {
        throw new CustomError('Hanya praktisi Gu Master yang dapat memasang cacing Gu ke rongga tubuh.', 400);
      }

      if (!law.guSlots) law.guSlots = [];
      const maxSlots = getGuMaxSlots(law.rank || 0);
      law.guMaxSlots = maxSlots;

      if (law.guSlots.length >= maxSlots) {
        throw new CustomError(`Rongga aperture Gu milikmu penuh! Rank ${law.rank || 0} hanya dapat menampung maksimal ${maxSlots} slot Gu. Naikkan ranah Law untuk memperluas rongga.`, 400);
      }

      await player.populate({ path: 'inventory.itemId' });
      const invIndex = player.inventory.findIndex(inv => {
        if (!inv.itemId || inv.quantity < 1) return false;
        return inv.itemId._id?.toString() === itemId || inv._id?.toString() === itemId;
      });

      if (invIndex === -1) {
        throw new CustomError('Item Gu tidak ditemukan di tas inventori.', 404);
      }

      const inv = player.inventory[invIndex];
      const itemDoc = inv.itemId;
      const tags = itemDoc.tags || [];
      const cat = (itemDoc.category || '').toLowerCase();
      const isGuItem = tags.includes('gu') || tags.includes('gu_larva') || tags.includes('gu_master') || cat === 'gu' || (itemDoc.name || '').toLowerCase().includes('gu ');

      if (!isGuItem) {
        throw new CustomError('Item ini bukan entitas Gu yang sah dan tidak dapat diserap ke dalam rongga aperture.', 400);
      }

      // Potong 1 item dari tas inventori
      inv.quantity -= 1;
      if (inv.quantity <= 0) {
        player.inventory.splice(invIndex, 1);
      }

      const itemTier = Number(itemDoc.tier) || Number(itemDoc.rank) || 1;
      const newGu = {
        guItemId: itemDoc._id,
        guName: itemDoc.name,
        guType: itemDoc.guType || 'attack',
        tier: itemTier,
        level: 1,
        satiety: 80,
        hunger: 80,
        bonusAtk: (itemDoc.stats?.atk || itemDoc.stats?.attack || (10 * itemTier)),
        bonusDef: (itemDoc.stats?.def || itemDoc.stats?.defense || (6 * itemTier)),
        lastFedAt: new Date()
      };

      law.guSlots.push(newGu);
      player.markModified('inventory');
      player.markModified('cultivationLaw');
      await player.save({ session });

      resultData = {
        guSlots: law.guSlots,
        guMaxSlots: law.guMaxSlots,
        equippedGu: newGu
      };
    });

    return res.json({
      success: true,
      message: `🪲 Berhasil menanamkan [${resultData.equippedGu.guName}] ke dalam rongga aperture (${resultData.guSlots.length}/${resultData.guMaxSlots} slot)!`,
      data: resultData
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error equipping Gu:', error);
    res.status(500).json({ error: error.message || 'Gagal memasang Gu ke aperture.' });
  } finally {
    releaseLock();
  }
});

// POST /gu/unequip — Melepaskan Gu dari rongga aperture (Master Plan §3.2)
router.post('/gu/unequip', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const lockKey = `law_gu_unequip_${userId}`;
  const releaseLock = await LockManager.acquire(lockKey);
  if (!releaseLock) return res.status(429).json({ error: 'Aksi lepas Gu sedang diproses.' });

  const { slotIndex } = req.body;
  if (slotIndex === undefined || slotIndex === null) {
    releaseLock();
    return res.status(400).json({ error: 'Index slot Gu wajib disertakan.' });
  }

  try {
    let resultData = null;
    let hadSedative = false;
    let backlashMsg = '';

    await withTransaction(async (session) => {
      const player = await resolvePlayer(req, session);
      const law = player.cultivationLaw;
      if (law?.activeLawType !== 'gu_master') {
        throw new CustomError('Hanya praktisi Gu Master yang dapat melepaskan Gu dari rongga tubuh.', 400);
      }

      const idx = Number(slotIndex);
      if (!law.guSlots || idx < 0 || idx >= law.guSlots.length) {
        throw new CustomError('Slot Gu yang dipilih tidak valid atau kosong.', 400);
      }

      const targetGu = law.guSlots[idx];
      const guName = targetGu.guName || 'Cacing Gu';

      // Cek apakah pemain memiliki Pil Penenang Gu di tas
      await player.populate({ path: 'inventory.itemId' });
      const sedativeIndex = player.inventory.findIndex(inv => {
        if (!inv.itemId || inv.quantity < 1) return false;
        const tags = inv.itemId.tags || [];
        const name = (inv.itemId.name || '').toLowerCase();
        return tags.includes('sedative_pill') || tags.includes('gu_sedative') || name.includes('penenang gu') || name.includes('pil penenang');
      });

      if (sedativeIndex !== -1) {
        // Konsumsi 1 Pil Penenang Gu -> Unequip bersih tanpa luka/backlash
        hadSedative = true;
        player.inventory[sedativeIndex].quantity -= 1;
        if (player.inventory[sedativeIndex].quantity <= 0) {
          player.inventory.splice(sedativeIndex, 1);
        }
      } else {
        // Tanpa pil penenang -> Backlash keras! (HP -20%, Vitality -20%, debuff 2 jam)
        hadSedative = false;
        const maxHp = player.combatStats?.maxHp || 100;
        const hpDmg = Math.floor(maxHp * 0.20);
        if (!player.combatStats) player.combatStats = {};
        player.combatStats.hp = Math.max(1, (player.combatStats.hp || maxHp) - hpDmg);

        if (player.extendedStats?.vitality !== undefined) {
          player.extendedStats.vitality = Math.max(0, Math.floor(player.extendedStats.vitality * 0.80));
        }
        if (player.vitality !== undefined) {
          player.vitality = Math.max(0, Math.floor(player.vitality * 0.80));
        }

        const backlashDuration = 2 * 3600 * 1000; // 2 jam
        const backlashUntil = new Date(Date.now() + backlashDuration);
        law.guBacklashUntil = backlashUntil;
        if (!player.demonicData) player.demonicData = {};
        player.demonicData.guBacklashUntil = backlashUntil;

        backlashMsg = `⚠️ Tanpa Pil Penenang Gu, pencabutan paksa menimbulkan luka dalam (Backlash)! HP -20% (-${hpDmg} HP), Vitality -20%, dan Dantian terguncang selama 2 jam!`;
      }

      // Kembalikan Gu ke inventori jika targetGu memiliki guItemId
      if (targetGu.guItemId) {
        const existingInv = player.inventory.find(inv => inv.itemId?._id?.toString() === targetGu.guItemId.toString());
        if (existingInv) {
          existingInv.quantity += 1;
        } else {
          player.inventory.push({ itemId: targetGu.guItemId, quantity: 1 });
        }
      }

      // Hapus dari guSlots
      law.guSlots.splice(idx, 1);
      law.guMaxSlots = getGuMaxSlots(law.rank || 0);

      player.markModified('inventory');
      player.markModified('combatStats');
      player.markModified('extendedStats');
      player.markModified('cultivationLaw');
      player.markModified('demonicData');
      await player.save({ session });

      resultData = {
        guSlots: law.guSlots,
        guMaxSlots: law.guMaxSlots,
        removedGuName: guName,
        hadSedative,
        guBacklashUntil: law.guBacklashUntil
      };
    });

    const msg = hadSedative
      ? `✨ Berhasil melepaskan [${resultData.removedGuName}] dari rongga menggunakan Pil Penenang Gu tanpa luka.`
      : `🩸 Berhasil melepaskan [${resultData.removedGuName}] secara paksa! ${backlashMsg}`;

    return res.json({
      success: true,
      message: msg,
      data: resultData
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error unequipping Gu:', error);
    res.status(500).json({ error: error.message || 'Gagal melepaskan Gu dari aperture.' });
  } finally {
    releaseLock();
  }
});

// POST /gu/fuse — Fusi dua cacing Gu di Kendi Penyuling Gu (Master Plan §3.2)
router.post('/gu/fuse', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const lockKey = `law_gu_fuse_${userId}`;
  const releaseLock = await LockManager.acquire(lockKey);
  if (!releaseLock) return res.status(429).json({ error: 'Aksi fusi Gu sedang diproses.' });

  const { slotA, slotB, prioritySlot, sacrificeSlot } = req.body;
  const pSlot = prioritySlot !== undefined ? prioritySlot : slotA;
  const sSlot = sacrificeSlot !== undefined ? sacrificeSlot : slotB;

  if (pSlot === undefined || sSlot === undefined || Number(pSlot) === Number(sSlot)) {
    releaseLock();
    return res.status(400).json({ error: 'Pilih Gu Prioritas dan Gu Pengorbanan yang berbeda dari slot rongga untuk difusikan.' });
  }

  try {
    let responsePayload = null;

    await withTransaction(async (session) => {
      const player = await resolvePlayer(req, session);
      const law = player.cultivationLaw;
      if (law?.activeLawType !== 'gu_master') {
        throw new CustomError('Hanya praktisi Gu Master yang dapat memfusikan Gu.', 400);
      }

      const pIdx = Number(pSlot);
      const sIdx = Number(sSlot);

      if (!law.guSlots || !law.guSlots[pIdx] || !law.guSlots[sIdx]) {
        throw new CustomError('Slot Gu yang dipilih tidak valid.', 400);
      }

      const priorityGu = law.guSlots[pIdx];
      const sacrificeGu = law.guSlots[sIdx];
      const crucibleTier = law.facilities?.guCrucibleTier || 1;

      // Formula exact plan (§3.2):
      // Rate = max(10%, 85% - (Tier_prioritas * 18%) + (Tier_kendi_atau_crucible * 6%))
      const tierP = priorityGu.tier || 1;
      const successRate = Math.max(10, Math.min(95, 85 - (tierP * 18) + (crucibleTier * 6)));
      const roll = Math.random() * 100;
      const isSuccess = roll <= successRate;

      // GU PENGORBANAN PASTI LENYAP! Hapus sacrificeGu dari rongga
      const sacrificeName = sacrificeGu.guName;
      const updatedGuSlots = law.guSlots.filter((_, idx) => idx !== sIdx);

      // Cari index baru dari priorityGu setelah penghapusan
      const newPIdx = updatedGuSlots.findIndex(g => g === priorityGu || (g.guName === priorityGu.guName && g.tier === priorityGu.tier));
      const targetGu = newPIdx !== -1 ? updatedGuSlots[newPIdx] : priorityGu;

      if (isSuccess) {
        // FUSI SUKSES: Tingkatkan Tier Gu Prioritas
        const oldTier = targetGu.tier || 1;
        targetGu.tier = Math.min(5, oldTier + 1);
        targetGu.bonusAtk = (targetGu.bonusAtk || 5) + 12;
        targetGu.bonusDef = (targetGu.bonusDef || 3) + 8;
        targetGu.satiety = 100;
        targetGu.hunger = 100;
        targetGu.lastFedAt = new Date();
        law.guSlots = updatedGuSlots;
        law.guMaxSlots = getGuMaxSlots(law.rank || 0);
        law.qi = Math.min(law.maxQi, (law.qi || 0) + 150);

        player.markModified('cultivationLaw');
        await player.save({ session });

        responsePayload = {
          success: true,
          isSuccess: true,
          message: `✨ FUSI BERHASIL! Gu Prioritas [${targetGu.guName}] berevolusi ke Tier ${targetGu.tier}! Gu Pengorbanan [${sacrificeName}] telah lenyap diserap. (+150 Qi Dantian)`,
          data: { guSlots: law.guSlots, qi: law.qi, upgradedGu: targetGu }
        };
      } else {
        // FUSI GAGAL: Gu Pengorbanan TETAP LENYAP, tapi diserap sebagai nutrisi makanan
        targetGu.satiety = 100;
        targetGu.hunger = 100;
        targetGu.level = (targetGu.level || 1) + 1;
        targetGu.lastFedAt = new Date();
        law.guSlots = updatedGuSlots;
        law.guMaxSlots = getGuMaxSlots(law.rank || 0);
        law.qi = Math.min(law.maxQi, (law.qi || 0) + 40);

        player.markModified('cultivationLaw');
        await player.save({ session });

        responsePayload = {
          success: false,
          isSuccess: false,
          message: `💥 Fusi Gu gagal menembus Tier baru! Gu Pengorbanan [${sacrificeName}] lenyap diserap oleh [${targetGu.guName}] sebagai nutrisi (Kekenyangan 100% + 40 Qi).`,
          data: { guSlots: law.guSlots, qi: law.qi, priorityGu: targetGu }
        };
      }
    });

    return res.json(responsePayload);
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error fusing Gu:', error);
    res.status(500).json({ error: error.message || 'Gagal memfusikan Gu.' });
  } finally {
    releaseLock();
  }
});

// 2. BODY TEMPERING (22 Esensi Alam Primordial & 9 Bagian Anatomi Tubuh)

// POST /law/body/temper-start — Memulai penempaan bagian tubuh dengan timer countdown
router.post('/body/temper-start', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const lockKey = `law_body_temper_${userId}`;
  const releaseLock = await LockManager.acquire(lockKey);
  if (!releaseLock) return res.status(429).json({ error: 'Aksi penempaan raga sedang diproses.' });

  const { part, essenceKey } = req.body;
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (law?.activeLawType !== 'body_tempering') {
      return res.status(400).json({ error: 'Hanya praktisi Penempaan Raga Suci yang dapat menempa raga.' });
    }

    const result = startBodyTemperingPart(player, part, essenceKey);

    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `🔥 Memulai penempaan bagian [${part}] menggunakan ${NATURAL_ESSENCES[essenceKey]?.fullName || essenceKey}! Selesai dalam ${result.durationSec} detik.`,
      data: result
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(400).json({ error: error.message || 'Gagal memulai penempaan raga.' });
  } finally {
    releaseLock();
  }
});

// POST /law/body/temper-claim — Mengklaim hasil penempaan yang telah selesai
router.post('/body/temper-claim', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const lockKey = `law_body_temper_${userId}`;
  const releaseLock = await LockManager.acquire(lockKey);
  if (!releaseLock) return res.status(429).json({ error: 'Aksi klaim penempaan raga sedang diproses.' });

  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (law?.activeLawType !== 'body_tempering') {
      return res.status(400).json({ error: 'Hanya praktisi Penempaan Raga Suci yang dapat mengklaim penempaan.' });
    }

    const claimResult = claimBodyTemperingPart(player);

    player.markModified('cultivationLaw');
    player.markModified('extendedStats');
    player.markModified('stats');
    await player.save();

    res.json({
      success: true,
      message: `💪 Penempaan [${claimResult.partId}] berhasil diselesaikan! Level naik menjadi Lv. ${claimResult.newLevel}! (+${claimResult.trueQiGained} True Qi)`,
      data: claimResult
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(400).json({ error: error.message || 'Gagal mengklaim penempaan raga.' });
  } finally {
    releaseLock();
  }
});

// POST /law/body/temper — Compatibility wrapper
router.post('/body/temper', authenticateToken, async (req, res) => {
  const { part, essenceKey, feedType } = req.body;
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (law?.activeLawType !== 'body_tempering') {
      return res.status(400).json({ error: 'Hanya praktisi Penempaan Raga Suci yang dapat menempa fisik.' });
    }

    if (essenceKey) {
      const result = startBodyTemperingPart(player, part || 'skin', essenceKey);
      player.markModified('cultivationLaw');
      await player.save();
      return res.json({ success: true, message: `🔥 Memulai penempaan raga.`, data: result });
    }

    if (!law.bodyTemperingParts) {
      law.bodyTemperingParts = { head: 0, torso: 0, leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0, spine: 0, dantian: 0, skin: 0 };
    }
    const targetPart = (part && law.bodyTemperingParts[part] !== undefined) ? part : 'skin';

    const currentVit = player.extendedStats?.vitality ?? player.vitality ?? 100;
    if (currentVit < 20) {
      return res.status(400).json({ error: 'Vitalitas tubuh terlalu lemah untuk memeras True Qi (butuh 20 Vitality).' });
    }
    if (!player.extendedStats) player.extendedStats = {};
    player.extendedStats.vitality = Math.max(0, currentVit - 20);
    player.vitality = player.extendedStats.vitality;

    law.bodyTemperingParts[targetPart] = (law.bodyTemperingParts[targetPart] || 0) + 1;
    law.qi = Math.min(law.maxQi, (law.qi || 0) + 60);

    player.markModified('extendedStats');
    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `💪 Memeras daging fana berhasil! Bagian [${targetPart}] kematangan +1 Lv (+60 True Qi)!`,
      data: { bodyTemperingParts: law.bodyTemperingParts, qi: law.qi }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal menempa raga.' });
  }
});

router.post('/body/gather-essence', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (law?.activeLawType !== 'body_tempering') {
      return res.status(400).json({ error: 'Hanya praktisi Penempaan Raga Suci yang dapat memeras True Qi.' });
    }
    const currentVit = player.extendedStats?.vitality ?? player.vitality ?? 100;
    if (currentVit < 15) {
      return res.status(400).json({ error: 'Vitality fisik terlalu lemah (butuh minimal 15 Vitality).' });
    }
    if (!player.extendedStats) player.extendedStats = {};
    player.extendedStats.vitality = Math.max(0, currentVit - 15);
    player.vitality = player.extendedStats.vitality;
    law.qi = Math.min(law.maxQi, (law.qi || 0) + 75);

    player.markModified('extendedStats');
    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: '🔥 Berhasil memeras intisari fisik menjadi +75 True Qi (-15 Vitality)!',
      data: { vitality: player.extendedStats.vitality, qi: law.qi }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal memeras intisari fisik.' });
  }
});

// 3. NATAL SOUL ARTIFACT
router.post('/artifact/infuse', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (law?.activeLawType !== 'natal_artifact') {
      return res.status(400).json({ error: 'Hanya praktisi Pusaka Jiwa Kelahiran yang dapat menginfus pusaka.' });
    }
    if (!law.boundEntity) {
      return res.status(400).json({ error: 'Belum ada pusaka jiwa yang terikat.' });
    }

    const { itemId } = req.body;
    await player.populate({ path: 'inventory.itemId' });

    let oreIndex = -1;
    if (itemId) {
      oreIndex = player.inventory.findIndex(inv => {
        if (!inv.itemId || inv.quantity < 1) return false;
        const id = (inv.itemId._id || inv.itemId).toString();
        return id === itemId.toString();
      });
      if (oreIndex === -1) {
        return res.status(400).json({ error: 'Item mineral/pengasah tidak ditemukan di dalam tas inventori!' });
      }
    } else {
      oreIndex = player.inventory.findIndex(inv => {
        if (!inv.itemId || inv.quantity < 1) return false;
        const name = (inv.itemId.name || '').toLowerCase();
        return name.includes('asah') || name.includes('besi') || name.includes('batu') || name.includes('mineral') || inv.itemId.category === 'material';
      });
    }

    let essenceGain = 20;
    let itemUsedName = 'Hawa Murni';
    if (oreIndex !== -1) {
      const itemSlot = player.inventory[oreIndex];
      itemUsedName = itemSlot.itemId.name || 'Mineral';
      const itemTier = itemSlot.itemId.tier || 1;
      const playerTier = (law.rank || 0) + 1;

      const affinity = getTierAffinity(playerTier, itemTier);
      if (!affinity.allowed) {
        return res.status(400).json({
          error: `${affinity.reason} Pusaka jiwa belum mampu menyerap ${itemUsedName} Tier ${itemTier} (Ranahmu setara Tier ${playerTier})!`
        });
      }
      essenceGain = Math.round(35 * itemTier * affinity.efficiency);

      itemSlot.quantity -= 1;
      if (itemSlot.quantity <= 0) player.inventory.splice(oreIndex, 1);
      player.markModified('inventory');
    }

    law.boundEntity.essence = Math.min(law.boundEntity.maxEssence || 100, (law.boundEntity.essence || 0) + essenceGain);
    law.qi = Math.min(law.maxQi, (law.qi || 0) + 45);

    if (law.boundEntity.essence >= (law.boundEntity.maxEssence || 100)) {
      law.boundEntity.essence = 0;
      law.boundEntity.rankLevel = (law.boundEntity.rankLevel || 0) + 1;
      law.boundEntity.artifactAtk = (law.boundEntity.artifactAtk || 15) + 6;
      law.boundEntity.artifactDef = (law.boundEntity.artifactDef || 10) + 4;
      const stages = ['Fana (Mortal)', 'Rohani (Spirit)', 'Bumi (Earth)', 'Langit (Heaven)', 'Primordial Chaos'];
      law.boundEntity.evolutionStage = stages[Math.min(stages.length - 1, law.boundEntity.rankLevel)];
    }

    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `🗡️ Berhasil mengasah pusaka jiwa ${law.boundEntity.customName || law.boundEntity.originalName} dengan ${itemUsedName} (+${essenceGain} Intisari, +45 Qi)!`,
      data: { boundEntity: law.boundEntity, qi: law.qi }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal menginfus pusaka jiwa.' });
  }
});

// 4. NATAL BEAST COMPANION
router.post('/beast/feed', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (law?.activeLawType !== 'natal_beast') {
      return res.status(400).json({ error: 'Hanya praktisi Satwa Roh yang dapat memberi makan satwa.' });
    }
    if (!law.boundEntity) {
      return res.status(400).json({ error: 'Belum ada satwa roh yang terikat.' });
    }

    const { itemId } = req.body;
    await player.populate({ path: 'inventory.itemId' });

    let meatIndex = -1;
    if (itemId) {
      meatIndex = player.inventory.findIndex(inv => {
        if (!inv.itemId || inv.quantity < 1) return false;
        const id = (inv.itemId._id || inv.itemId).toString();
        return id === itemId.toString();
      });
      if (meatIndex === -1) {
        return res.status(400).json({ error: 'Pakan satwa tidak ditemukan di dalam tas inventori!' });
      }
    } else {
      meatIndex = player.inventory.findIndex(inv => {
        if (!inv.itemId || inv.quantity < 1) return false;
        const name = (inv.itemId.name || '').toLowerCase();
        return name.includes('daging') || name.includes('ikan') || name.includes('jantung') || inv.itemId.category === 'food' || inv.itemId.category === 'herb';
      });
    }

    let essenceGain = 25;
    let foodName = 'Ransum Biasa';
    if (meatIndex !== -1) {
      const itemSlot = player.inventory[meatIndex];
      foodName = itemSlot.itemId.name || 'Daging Roh';
      const itemTier = itemSlot.itemId.tier || 1;
      const playerTier = (law.rank || 0) + 1;

      const affinity = getTierAffinity(playerTier, itemTier);
      if (!affinity.allowed) {
        return res.status(400).json({
          error: `${affinity.reason} Satwa roh belum mampu mencerna pakan ${foodName} Tier ${itemTier} (Ranahmu setara Tier ${playerTier})!`
        });
      }
      essenceGain = Math.round(40 * itemTier * affinity.efficiency);

      itemSlot.quantity -= 1;
      if (itemSlot.quantity <= 0) player.inventory.splice(meatIndex, 1);
      player.markModified('inventory');
    }

    law.boundEntity.essence = Math.min(law.boundEntity.maxEssence || 100, (law.boundEntity.essence || 0) + essenceGain);
    law.boundEntity.beastCurrentHp = law.boundEntity.beastMaxHp || 120;
    law.boundEntity.lastFeedAt = new Date();
    law.qi = Math.min(law.maxQi, (law.qi || 0) + 40);

    if (law.boundEntity.essence >= (law.boundEntity.maxEssence || 100)) {
      law.boundEntity.essence = 0;
      law.boundEntity.rankLevel = (law.boundEntity.rankLevel || 0) + 1;
      law.boundEntity.beastAtk = (law.boundEntity.beastAtk || 18) + 6;
      law.boundEntity.beastDef = (law.boundEntity.beastDef || 12) + 4;
      law.boundEntity.beastMaxHp = (law.boundEntity.beastMaxHp || 120) + 30;
      law.boundEntity.beastCurrentHp = law.boundEntity.beastMaxHp;
      const evoStages = ['Feral Liar', 'Satwa Berbakat', 'Satwa Rohani', 'Siluman Sejati', 'Avatar Dewa Purba'];
      law.boundEntity.evolutionStage = evoStages[Math.min(evoStages.length - 1, law.boundEntity.rankLevel)];
    }

    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `🐾 ${law.boundEntity.customName || law.boundEntity.originalName} memakan ${foodName} dengan lahap (+${essenceGain} Intisari Satwa, HP Penuh, +40 Qi)!`,
      data: { boundEntity: law.boundEntity, qi: law.qi }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal memberi pakan satwa roh.' });
  }
});

// POST /natal/rename — Memberi nama kustom pada pusaka jiwa atau satwa roh
router.post('/natal/rename', authenticateToken, async (req, res) => {
  try {
    const { customName } = req.body || {};
    if (!customName || typeof customName !== 'string') {
      return res.status(400).json({ error: 'Nama kustom tidak boleh kosong.' });
    }
    const cleanName = customName.trim().slice(0, 24);
    if (cleanName.length < 2) {
      return res.status(400).json({ error: 'Nama kustom minimal 2 karakter.' });
    }

    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (!law || (law.activeLawType !== 'natal_artifact' && law.activeLawType !== 'natal_beast')) {
      return res.status(400).json({ error: 'Hanya praktisi Pusaka Jiwa atau Satwa Roh yang dapat memberi nama kustom.' });
    }

    if (!law.boundEntity) {
      return res.status(400).json({ error: 'Belum ada entitas jiwa yang terikat.' });
    }

    law.boundEntity.customName = cleanName;
    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `✨ Berhasil menamai entitas ikatan jiwamu menjadi "${cleanName}"!`,
      data: { customName: cleanName }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal mengubah nama entitas.' });
  }
});

// 5. DEMONIC LAWS
router.post('/demonic/turbid-absorb', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (law?.activeLawType !== 'demonic_turbid_core') {
      return res.status(400).json({ error: 'Hanya praktisi Pelebur Inti Siluman yang dapat menyerap inti kotor.' });
    }

    const { itemId } = req.body;
    await player.populate({ path: 'inventory.itemId' });

    let coreIndex = -1;
    if (itemId) {
      coreIndex = player.inventory.findIndex(inv => {
        if (!inv.itemId || inv.quantity < 1) return false;
        const id = (inv.itemId._id || inv.itemId).toString();
        return id === itemId.toString();
      });
      if (coreIndex === -1) {
        return res.status(400).json({ error: 'Inti siluman tidak ditemukan di dalam tas inventori!' });
      }
    } else {
      coreIndex = player.inventory.findIndex(inv => {
        if (!inv.itemId || inv.quantity < 1) return false;
        const name = (inv.itemId.name || '').toLowerCase();
        return name.includes('inti') || name.includes('core');
      });
    }

    let coreName = 'Inti Siluman Kotor';
    let qiBonus = 80;
    if (coreIndex !== -1) {
      const itemSlot = player.inventory[coreIndex];
      coreName = itemSlot.itemId.name || 'Inti Siluman';
      const itemTier = itemSlot.itemId.tier || 1;
      const playerTier = (law.rank || 0) + 1;

      const affinity = getTierAffinity(playerTier, itemTier);
      if (!affinity.allowed) {
        return res.status(400).json({
          error: `${affinity.reason} Dantian iblis menolak inti siluman Tier ${itemTier} (Ranahmu setara Tier ${playerTier})!`
        });
      }
      qiBonus = Math.round(80 * itemTier * affinity.efficiency);

      itemSlot.quantity -= 1;
      if (itemSlot.quantity <= 0) player.inventory.splice(coreIndex, 1);
      player.markModified('inventory');
    }

    if (!law.demonicData) law.demonicData = {};
    law.demonicData.turbidCoresConsumed = (law.demonicData.turbidCoresConsumed || 0) + 1;
    law.demonicData.corruptionIndex = Math.min(100, (law.demonicData.corruptionIndex || 0) + 3);
    law.qi = Math.min(law.maxQi, (law.qi || 0) + qiBonus);

    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `👹 Berhasil melahap ${coreName} (+${qiBonus} Qi, +3 Poin Korupsi Batin)!`,
      data: { demonicData: law.demonicData, qi: law.qi }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal melahap inti siluman.' });
  }
});

router.post('/demonic/blood-harvest', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (law?.activeLawType !== 'demonic_blood_soul') {
      return res.status(400).json({ error: 'Hanya praktisi Penghisap Darah yang dapat memanen darah.' });
    }
    if (!law.demonicData) law.demonicData = {};

    let sourceName = 'esensi darah segar';
    let qiBonus = 65;
    const { itemId } = req.body || {};
    if (itemId) {
      await player.populate({ path: 'inventory.itemId' });
      const invIndex = player.inventory.findIndex(inv =>
        inv.itemId && (inv.itemId._id?.toString() === itemId.toString() || inv.itemId.id === itemId.toString() || inv._id?.toString() === itemId.toString())
      );
      if (invIndex === -1 || player.inventory[invIndex].quantity < 1) {
        return res.status(400).json({ error: 'Item botol darah tidak ditemukan di inventori tasmu.' });
      }

      const invEntry = player.inventory[invIndex];
      const itemDoc = invEntry.itemId;
      const itemTier = itemDoc.tier || itemDoc.rank || 1;
      const playerTier = (law.rank || 0) + 1;

      const affinity = getTierAffinity(playerTier, itemTier);
      if (!affinity.allowed) {
        return res.status(400).json({
          error: `${affinity.reason} Wadah dantianmu belum mampu menampung intisari darah Tier ${itemTier} (Ranahmu setara Tier ${playerTier}).`
        });
      }

      qiBonus = Math.round(90 * itemTier * affinity.efficiency);
      sourceName = itemDoc.name;

      invEntry.quantity -= 1;
      if (invEntry.quantity <= 0) {
        player.inventory.splice(invIndex, 1);
      }
      player.markModified('inventory');
    }

    law.demonicData.bloodEssenceVials = (law.demonicData.bloodEssenceVials || 0) + 1;
    law.demonicData.infamy = (law.demonicData.infamy || 0) + 5;
    player.infamy = law.demonicData.infamy;
    player.markModified('infamy');
    law.qi = Math.min(law.maxQi, (law.qi || 0) + qiBonus);

    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `🩸 Berhasil memanen ${sourceName} (+1 Botol Darah, +${qiBonus} Qi, +5 Status Buronan)!`,
      data: { demonicData: law.demonicData, qi: law.qi }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal memanen esensi darah.' });
  }
});

router.post('/demonic/soul-banner', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (law?.activeLawType !== 'demonic_blood_soul') {
      return res.status(400).json({ error: 'Hanya praktisi Penghisap Darah & Jiwa yang dapat mengikat Panji Ruh.' });
    }
    if (!law.demonicData) law.demonicData = {};

    let soulSource = 'arwah penasaran liar';
    let qiBonus = 70;
    const { itemId } = req.body || {};
    if (itemId) {
      await player.populate({ path: 'inventory.itemId' });
      const invIndex = player.inventory.findIndex(inv =>
        inv.itemId && (inv.itemId._id?.toString() === itemId.toString() || inv.itemId.id === itemId.toString() || inv._id?.toString() === itemId.toString())
      );
      if (invIndex === -1 || player.inventory[invIndex].quantity < 1) {
        return res.status(400).json({ error: 'Item arwah/jiwa tidak ditemukan di inventori tasmu.' });
      }

      const invEntry = player.inventory[invIndex];
      const itemDoc = invEntry.itemId;
      const itemTier = itemDoc.tier || itemDoc.rank || 1;
      const playerTier = (law.rank || 0) + 1;

      const affinity = getTierAffinity(playerTier, itemTier);
      if (!affinity.allowed) {
        return res.status(400).json({
          error: `${affinity.reason} Panji Sembilan Ruh milikmu belum mampu membelenggu jiwa Tier ${itemTier} (Ranahmu setara Tier ${playerTier}).`
        });
      }

      qiBonus = Math.round(95 * itemTier * affinity.efficiency);
      soulSource = itemDoc.name;

      invEntry.quantity -= 1;
      if (invEntry.quantity <= 0) {
        player.inventory.splice(invIndex, 1);
      }
      player.markModified('inventory');
    }

    law.demonicData.soulBannerCaptures = (law.demonicData.soulBannerCaptures || 0) + 1;
    law.demonicData.infamy = (law.demonicData.infamy || 0) + 5;
    player.infamy = law.demonicData.infamy;
    player.markModified('infamy');
    law.qi = Math.min(law.maxQi, (law.qi || 0) + qiBonus);

    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `👻 Berhasil mengikat ${soulSource} ke dalam Panji Sembilan Ruh (+1 Jiwa Tersegel, +${qiBonus} Qi)!`,
      data: { demonicData: law.demonicData, qi: law.qi }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal mengikat arwah ke panji.' });
  }
});

router.post('/demonic/venom-ingest', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (law?.activeLawType !== 'demonic_myriad_venom') {
      return res.status(400).json({ error: 'Hanya praktisi Racun Maut yang dapat meminum racun.' });
    }

    let poisonName = 'Racun Mematikan';
    const { itemId } = req.body || {};
    if (itemId) {
      await player.populate({ path: 'inventory.itemId' });
      const invIndex = player.inventory.findIndex(inv =>
        inv.itemId && (inv.itemId._id?.toString() === itemId.toString() || inv.itemId.id === itemId.toString())
      );
      if (invIndex === -1 || player.inventory[invIndex].quantity < 1) {
        return res.status(400).json({ error: 'Item racun tidak ditemukan di inventori tasmu.' });
      }

      const invEntry = player.inventory[invIndex];
      const itemDoc = invEntry.itemId;
      const itemTier = itemDoc.tier || itemDoc.rank || 1;
      const playerTier = (law.rank || 0) + 1;

      const affinity = getTierAffinity(playerTier, itemTier);
      if (!affinity.allowed) {
        return res.status(400).json({
          error: `${affinity.reason} Tingkat keganasan racun ini terlalu tinggi (Tier ${itemTier}, Ranahmu setara Tier ${playerTier}).`
        });
      }

      poisonName = itemDoc.name;
      invEntry.quantity -= 1;
      if (invEntry.quantity <= 0) {
        player.inventory.splice(invIndex, 1);
      }
      player.markModified('inventory');
    }

    // Pengurangan HP akibat racun menelan hanya mentok di 1 HP (non-lethal floor) sampai efek racun hilang
    const currentHp = player.currentHp || player.maxHp || 100;
    const hpLoss = Math.floor(currentHp * 0.25);
    player.currentHp = Math.max(1, currentHp - hpLoss);

    // Berikan status keracunan pada karakter (menyusut bertahap)
    const { normalizeConditions } = require('../../utils/conditionEngine');
    player.conditions = normalizeConditions(player.conditions);
    player.conditions.poison = Math.min(100, (player.conditions.poison || 0) + 15);
    player.markModified('conditions');

    if (!law.demonicData) law.demonicData = {};
    law.demonicData.venomToxinLevel = (law.demonicData.venomToxinLevel || 0) + 1;
    law.demonicData.venomTolerancePct = Math.min(80, (law.demonicData.venomToxinLevel || 0) * 5);
    law.demonicData.infamy = (law.demonicData.infamy || 0) + 3;
    player.infamy = law.demonicData.infamy;
    player.markModified('infamy');
    const qiGain = Math.round(75 * (affinity ? affinity.efficiency : 1));
    law.qi = Math.min(law.maxQi, (law.qi || 0) + qiGain);

    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `🧪 Berhasil menelan ${poisonName}! Rasa terbakar mengoyak kerongkongan (-${hpLoss} HP, sisa ${player.currentHp} HP), namun meridian menyerap bisanya (+1 Toleransi Racun, +75 Qi)!`,
      data: { demonicData: law.demonicData, qi: law.qi, currentHp: player.currentHp }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal meminum racun.' });
  }
});

router.post('/demonic/pact-tribute', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (law?.activeLawType !== 'demonic_abyssal_pact') {
      return res.status(400).json({ error: 'Hanya praktisi Kontrak Iblis Abyss yang dapat menyetor upeti.' });
    }

    const altarTier = law.facilities?.abyssalAltarTier || 0;
    if (altarTier < 1) {
      return res.status(400).json({
        error: 'Wajib mendirikan Altar Kurban Darah Abyss terlebih dahulu sebelum menyetor upeti kurban!'
      });
    }

    // Validasi Koordinat Posisi Pemain: Wajib Berdiri Tepat di Petak Altar Abyss
    const altarAsset = player.assets?.find(a => a.name === 'Altar Kurban Darah Abyss' && a.status === 'active' && a.placement?.tileX !== undefined);
    let altarTileX = altarAsset?.placement?.tileX;
    let altarTileY = altarAsset?.placement?.tileY;
    let altarZoneId = altarAsset?.placement?.zoneId;

    if (altarTileX === undefined) {
      const altarTile = await ZoneTile.findOne({
        ownerId: player.discordId,
        buildingName: { $regex: /Altar Kurban Darah Abyss/i }
      });
      if (altarTile) {
        altarTileX = altarTile.tileX;
        altarTileY = altarTile.tileY;
        altarZoneId = altarTile.zoneId;
      }
    }

    if (altarTileX !== undefined && altarTileY !== undefined) {
      const playerTileX = player.gridPosition?.tileX;
      const playerTileY = player.gridPosition?.tileY;
      const playerZoneId = player.gridPosition?.zoneId;
      const isSamePos = (playerTileX === altarTileX && playerTileY === altarTileY) && (!altarZoneId || playerZoneId === altarZoneId);
      if (!isSamePos) {
        return res.status(400).json({
          error: `Kamu harus berdiri tepat di atas petak koordinat Altar Kurban Darah Abyss milikmu (${altarTileX}, ${altarTileY}) di peta untuk menyetor upeti kurban! Posisi saat ini: (${playerTileX || 0}, ${playerTileY || 0}).`
        });
      }
    }

    // Opsi konsumsi persembahan dari tas jika ada itemId
    const { itemId } = req.body || {};
    let itemOfferingMsg = '';
    if (itemId) {
      await player.populate({ path: 'inventory.itemId' });
      const invIndex = player.inventory.findIndex(inv =>
        inv.itemId && (inv.itemId._id?.toString() === itemId.toString() || inv.itemId.id === itemId.toString())
      );
      if (invIndex === -1 || player.inventory[invIndex].quantity < 1) {
        return res.status(400).json({ error: 'Item persembahan kurban tidak ditemukan di inventori tasmu.' });
      }

      const invEntry = player.inventory[invIndex];
      const itemDoc = invEntry.itemId;
      const itemTier = itemDoc.tier || itemDoc.rank || 1;
      const playerTier = (law.rank || 0) + 1;

      const affinity = getTierAffinity(playerTier, itemTier);
      if (!affinity.allowed) {
        return res.status(400).json({
          error: `${affinity.reason} Altar Abyss milikmu belum mampu menampung intisari Tier ${itemTier} (Ranahmu setara Tier ${playerTier}).`
        });
      }

      invEntry.quantity -= 1;
      if (invEntry.quantity <= 0) {
        player.inventory.splice(invIndex, 1);
      }
      player.markModified('inventory');
      itemOfferingMsg = ` Mengorbankan 1x ${itemDoc.name}.`;
    }

    const tributeDurationDays = altarTier === 1 ? 7 : (altarTier === 2 ? 15 : 30);
    if (!law.demonicData) law.demonicData = {};
    law.demonicData.abyssalTributeDueAt = new Date(Date.now() + tributeDurationDays * 24 * 3600 * 1000);
    law.qi = Math.min(law.maxQi, (law.qi || 0) + 90);

    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `📜 Berhasil menyetor upeti kurban di Altar Abyss!${itemOfferingMsg} Tenggat kontrak diperpanjang ${tributeDurationDays} hari (+90 Qi)!`,
      data: { demonicData: law.demonicData, qi: law.qi }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal menyetor upeti iblis.' });
  }
});

router.post('/demonic/nether-channel', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (law?.activeLawType !== 'demonic_nether_darkness') {
      return res.status(400).json({ error: 'Hanya praktisi Qi Gelap Nether yang dapat menyerap hawa Yin.' });
    }

    let absorbSource = 'hawa dingin Yin Sembilan Lapis Netherworld';
    let qiBonus = 70;
    const { itemId } = req.body || {};
    if (itemId) {
      await player.populate({ path: 'inventory.itemId' });
      const invIndex = player.inventory.findIndex(inv =>
        inv.itemId && (inv.itemId._id?.toString() === itemId.toString() || inv.itemId.id === itemId.toString())
      );
      if (invIndex === -1 || player.inventory[invIndex].quantity < 1) {
        return res.status(400).json({ error: 'Item batu Yin tidak ditemukan di inventori tasmu.' });
      }

      const invEntry = player.inventory[invIndex];
      const itemDoc = invEntry.itemId;
      const itemTier = itemDoc.tier || itemDoc.rank || 1;
      const playerTier = (law.rank || 0) + 1;

      if (itemTier > playerTier) {
        return res.status(400).json({
          error: `Hawa kematian item ini terlalu pekat (Tier ${itemTier}). Tubuhmu belum mampu menampung energi Yin melampaui ranahmu (Tier ${playerTier}).`
        });
      }

      absorbSource = itemDoc.name;
      qiBonus = 100;
      invEntry.quantity -= 1;
      if (invEntry.quantity <= 0) {
        player.inventory.splice(invIndex, 1);
      }
      player.markModified('inventory');
    }

    law.qi = Math.min(law.maxQi, (law.qi || 0) + qiBonus);
    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `🌑 Berhasil menyerap ${absorbSource} (+${qiBonus} Qi)!`,
      data: { qi: law.qi }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal menyerap hawa Yin.' });
  }
});

// 6. 6 DIVINE ELEMENTAL LAWS (Penyerapan Item Elemen & Ritual Resonansi)

// POST /element/absorb — Konsumsi item esensi elemen dari tas inventori dengan validasi Tier otoritatif
router.post('/element/absorb', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const lockKey = `law_element_${userId}`;
  const releaseLock = await LockManager.acquire(lockKey);
  if (!releaseLock) return res.status(429).json({ error: 'Aksi penyerapan elemen sedang diproses.' });

  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (!law?.activeLawType || !law.activeLawType.startsWith('element_')) {
      return res.status(400).json({ error: 'Hanya praktisi 6 Hukum Elemen yang dapat menyerap item elemen.' });
    }

    const { itemId } = req.body;
    if (!itemId) {
      return res.status(400).json({ error: 'Pilih item elemen dari tas inventori yang ingin diserap!' });
    }

    await player.populate({ path: 'inventory.itemId' });
    const invIndex = player.inventory.findIndex(inv => {
      if (!inv.itemId || inv.quantity < 1) return false;
      const id = (inv.itemId._id || inv.itemId).toString();
      return id === itemId.toString();
    });

    if (invIndex === -1) {
      return res.status(400).json({ error: 'Item elemen tidak ditemukan di dalam tas inventori!' });
    }

    const itemSlot = player.inventory[invIndex];
    const item = itemSlot.itemId;

    // Pemetaan Elemen Hukum
    const ELEMENT_MAP = {
      element_phoenix_fire:     { key: 'fire',      name: 'Api',     reservoir: 'Samadhi Flame Reservoir',    tags: ['fire_catalyst', 'fire_essence', 'flame', 'api'] },
      element_azure_water:      { key: 'water',     name: 'Air',     reservoir: 'Azure Tide Reservoir',       tags: ['water_catalyst', 'water_essence', 'water', 'air', 'es'] },
      element_xuanwu_earth:     { key: 'earth',     name: 'Tanah',   reservoir: 'Leyline Earth Reservoir',    tags: ['earth_catalyst', 'earth_essence', 'earth', 'tanah', 'batu'] },
      element_qingdi_wood:      { key: 'wood',      name: 'Kayu',    reservoir: 'Life Wood Reservoir',        tags: ['wood_catalyst', 'wood_essence', 'wood', 'kayu', 'herba'] },
      element_roc_wind:         { key: 'wind',      name: 'Angin',   reservoir: 'Astral Gale Reservoir',      tags: ['wind_catalyst', 'wind_essence', 'wind', 'angin', 'badai'] },
      element_godthunder_light: { key: 'thunder',   name: 'Petir',   reservoir: 'Heavenly Thunder Reservoir', tags: ['thunder_catalyst', 'thunder_essence', 'thunder', 'petir', 'kilat'] }
    };

    const targetElem = ELEMENT_MAP[law.activeLawType];
    if (!targetElem) {
      return res.status(400).json({ error: 'Hukum elemen tidak valid.' });
    }

    // Validasi afinitas elemen item
    const itemName = (item.name || '').toLowerCase();
    const itemDesc = (item.description || '').toLowerCase();
    const itemTags = Array.isArray(item.tags) ? item.tags.map(t => t.toLowerCase()) : [];
    const itemElem = (item.element || '').toLowerCase();

    const isMatching = targetElem.tags.some(tag => 
      itemTags.includes(tag) || itemName.includes(tag) || itemDesc.includes(tag)
    ) || itemElem.includes(targetElem.key) || item.category === `element_${targetElem.key}` || item.category === 'herb' || item.category === 'material';

    if (!isMatching) {
      return res.status(400).json({
        error: `Item '${item.name}' tidak selaras dengan elemen ${targetElem.name}! Dantianmu hanya menerima intisari elemen ${targetElem.name}.`
      });
    }

    // Tier Rule Formula:
    // Item Tier vs Player Rank (Player Tier = rank + 1, e.g. Rank 0 = Tier 1)
    const itemTier = item.tier || (item.rank === 'uncommon' ? 2 : item.rank === 'rare' ? 3 : item.rank === 'epic' ? 4 : item.rank === 'legendary' ? 5 : 1);
    const playerTier = (law.rank || 0) + 1;

    const affinity = getTierAffinity(playerTier, itemTier);
    if (!affinity.allowed) {
      return res.status(400).json({
        error: `Dantian menolak intisari '${item.name}'! Tingkat energi item (Tier ${itemTier}) melampaui kapasitas ranahmu (setara Tier ${playerTier}). ${affinity.reason || 'Item tier tinggi baru dapat diserap setelah kamu menerobos ke ranah berikutnya!'}`
      });
    }

    const efficiency = affinity.efficiency;
    const baseEssenceGain = 25 * itemTier;
    const finalEssenceGain = Math.round(baseEssenceGain * efficiency);

    // Update Bar Esensi Elemen
    const maxEss = law.maxEssence || 100;
    law.currentEssence = Math.min(maxEss, (law.currentEssence || 0) + finalEssenceGain);

    // Bonus Spiritual Root XP
    const rootXpGain = Math.round(15 * efficiency);
    if (!player.extendedStats) player.extendedStats = {};
    if (!player.extendedStats.spiritualRoot) player.extendedStats.spiritualRoot = {};
    player.extendedStats.spiritualRoot[targetElem.key] = (player.extendedStats.spiritualRoot[targetElem.key] || 0) + rootXpGain;

    // Bonus Langsung Xiuwei Qi Kultivasi
    const directQi = Math.round(30 * efficiency);
    law.qi = Math.min(law.maxQi, (law.qi || 0) + directQi);

    // Kurangi item dari tas
    itemSlot.quantity -= 1;
    if (itemSlot.quantity <= 0) {
      player.inventory.splice(invIndex, 1);
    }
    player.markModified('inventory');
    player.markModified('extendedStats');
    player.markModified('cultivationLaw');
    await player.save();

    const effPercent = Math.round(efficiency * 100);
    const effNote = efficiency < 1.0 ? ` (Efisiensi ${effPercent}% karena Tier item di bawah ranah)` : ' (Efisiensi Optimal 100%)';

    res.json({
      success: true,
      message: `✨ Berhasil menyerap '${item.name}' ke dalam ${targetElem.reservoir}! +${finalEssenceGain} Esensi Elemen${effNote}, +${rootXpGain} Spiritual Root XP, +${directQi} Qi Kultivasi.`,
      data: {
        currentEssence: law.currentEssence,
        maxEssence: maxEss,
        qi: law.qi,
        rootXp: player.extendedStats.spiritualRoot[targetElem.key],
        efficiency: effPercent
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error absorbing element item:', error);
    res.status(500).json({ error: 'Gagal menyerap item elemen.' });
  } finally {
    releaseLock();
  }
});

router.post('/element/resonate', authenticateToken, async (req, res) => {
  const { elementKey } = req.body;
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (!law?.activeLawType || !law.activeLawType.startsWith('element_')) {
      return res.status(400).json({ error: 'Hanya praktisi 6 Elemen Kosmik yang dapat melakukan ritual resonansi elemen.' });
    }

    const { LAW_DEFINITIONS } = require('../../utils/lawCultivationEngine');
    const lawDef = LAW_DEFINITIONS[law.activeLawType];
    const targetRoot = elementKey || lawDef?.rootKey || 'fire';

    // Konsumsi 10 Esensi atau 15 Vitality
    if ((law.currentEssence || 0) >= 10) {
      law.currentEssence -= 10;
    } else {
      const currentVit = player.extendedStats?.vitality ?? player.vitality ?? 100;
      if (currentVit < 15) {
        return res.status(400).json({ error: 'Esensi dan Vitalitas tidak mencukupi untuk ritual resonansi.' });
      }
      if (!player.extendedStats) player.extendedStats = {};
      player.extendedStats.vitality = Math.max(0, currentVit - 15);
      player.vitality = player.extendedStats.vitality;
    }

    if (!player.extendedStats) player.extendedStats = {};
    if (!player.extendedStats.spiritualRoot) player.extendedStats.spiritualRoot = {};
    player.extendedStats.spiritualRoot[targetRoot] = (player.extendedStats.spiritualRoot[targetRoot] || 0) + 30;

    law.qi = Math.min(law.maxQi, (law.qi || 0) + 50);

    player.markModified('extendedStats');
    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `🌀 Ritual Resonansi Elemen ${targetRoot.toUpperCase()} Berhasil (+30 Spiritual Root XP, +50 Qi)!`,
      data: {
        qi: law.qi,
        currentEssence: law.currentEssence,
        rootXp: player.extendedStats.spiritualRoot[targetRoot]
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error resonating element:', error);
    res.status(500).json({ error: 'Gagal melakukan ritual resonansi elemen.' });
  }
});

module.exports = router;

