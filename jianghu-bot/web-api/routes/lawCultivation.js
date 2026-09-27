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
  getQiRequired,
  syncLawChanneling,
  checkAndResetDailyCap,
  claimDailyEpiphany,
  attemptMiniBreakthrough,
  attemptMajorBreakthrough,
  getMiniBreakthroughCost,
  meetsLawRankRequirements,
  getLawStatus
} = require('../../utils/lawCultivationEngine');

// ═══════════════════════════════════════════════════════════════
// Helper: Resolve player dari JWT token
// ═══════════════════════════════════════════════════════════════
async function resolvePlayer(req, session = null) {
  const userId = req.user.userId;
  const playerRef = await Player.findOne({ discordId: userId }).select('guildId').lean();
  const guildId = req.user.guildId || (playerRef ? playerRef.guildId : userId);
  const query = Player.findOne({ discordId: userId, guildId });
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

    // Sinkronisasi channeling jika sedang aktif
    if (player.cultivationLaw?.isChanneling) {
      syncLawChanneling(player);
      player.markModified('cultivationLaw');
      await player.save();
    }

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
            evolutionStage: 'Mortal',
            essence: 0,
            maxEssence: 100,
            beastCurrentHp: entityType === 'beast' ? 100 : 0,
            beastMaxHp: entityType === 'beast' ? 100 : 0,
            beastAtk: entityType === 'beast' ? 15 : 0,
            beastDef: entityType === 'beast' ? 10 : 0,
            beastSpd: entityType === 'beast' ? 12 : 0
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
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /law/channel/start — Mulai channeling meditasi
// ═══════════════════════════════════════════════════════════════
router.post('/channel/start', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;

    if (!law?.activeLawType) {
      return res.status(400).json({ error: 'Belum memilih Hukum Semesta (Law).' });
    }

    if (law.isChanneling) {
      return res.status(400).json({ error: 'Sudah dalam keadaan meditasi.' });
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
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /law/channel/stop — Hentikan channeling, sinkronisasi Qi
// ═══════════════════════════════════════════════════════════════
router.post('/channel/stop', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;

    if (!law?.activeLawType) {
      return res.status(400).json({ error: 'Belum memilih Hukum Semesta (Law).' });
    }

    if (!law.isChanneling) {
      return res.status(400).json({ error: 'Tidak sedang bermeditasi.' });
    }

    const result = syncLawChanneling(player);
    law.isChanneling = false;
    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `Meditasi dihentikan. +${result.newQi > 0 ? Math.floor(result.newQi) : 0} Qi terserap (${Math.floor(result.minutesSynced)} menit).`,
      data: {
        isChanneling: false,
        qi: Math.floor(law.qi),
        maxQi: law.maxQi,
        minutesSynced: Math.floor(result.minutesSynced),
        isCapReached: result.isCapReached
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error stopping channel:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat menghentikan meditasi.' });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /law/daily-claim — Klaim pencerahan harian & update streak
// ═══════════════════════════════════════════════════════════════
router.post('/daily-claim', authenticateToken, async (req, res) => {
  try {
    const player = await resolvePlayer(req);
    const result = claimDailyEpiphany(player);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    // Update login streak (disinkronkan dari sistem existing WIB)
    if (isClaimedYesterday(player.lastDailyClaim)) {
      player.dailyStreak = Math.min((player.dailyStreak || 0) + 1, 7);
    } else if (!isClaimedToday(player.lastDailyClaim)) {
      player.dailyStreak = 1; // Reset streak jika bolos
    }

    // Sinkronkan streak ke law dailyData
    if (player.cultivationLaw?.dailyData) {
      player.cultivationLaw.dailyData.dailyStreakDays = player.dailyStreak;
    }

    player.lastDailyClaim = new Date();
    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: result.message,
      data: {
        qiGranted: result.qiGranted,
        copperGranted: result.copperGranted,
        streak: player.dailyStreak,
        qi: Math.floor(player.cultivationLaw.qi),
        maxQi: player.cultivationLaw.maxQi
      }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error claiming daily:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengklaim pencerahan harian.' });
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

      const result = attemptMiniBreakthrough(player);

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

      // Validasi mood
      const { assertMood, applyMoodDelta } = require('../../utils/moodManager');
      assertMood(player, 25); // Mood ≥ 25 untuk major breakthrough

      const result = attemptMajorBreakthrough(player);

      if (result.isSuccess) {
        applyMoodDelta(player, -15);

        // Juga naikkan rank boundEntity jika ada
        if (law.boundEntity?.entityType) {
          law.boundEntity.rankLevel = law.rank;
          const evolStages = ['Mortal', 'Spirit', 'Earth', 'Heaven', 'Primordial', 'Celestial', 'Void', 'Chaos', 'Apex'];
          law.boundEntity.evolutionStage = evolStages[Math.min(law.rank, evolStages.length - 1)];
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
  const validation = allocateSchema.safeParse(req.body);
  if (!validation.success) return res.status(400).json({ error: 'Skill ID tidak valid.' });

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
    const playerRank = law.rank || 0;

    // Hitung perolehan esensi dengan Tier Affinity Decay
    const decay = Math.max(0.2, 1 - Math.max(0, playerRank - itemTier) * 0.35);
    const baseEssence = 30 * Math.pow(2.2, Math.max(0, itemTier - 1));
    const essenceGain = Math.max(15, Math.floor(baseEssence * decay));

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

    if (feedType === 'blood') {
      const currentVit = player.extendedStats?.vitality ?? player.vitality ?? 100;
      if (currentVit < 15) {
        return res.status(400).json({ error: 'Vitality fisik terlalu lemah untuk meneteskan darah.' });
      }
      if (!player.extendedStats) player.extendedStats = {};
      player.extendedStats.vitality = Math.max(0, currentVit - 15);
      player.vitality = player.extendedStats.vitality;

      targetGu.satiety = Math.min(100, (targetGu.satiety !== undefined ? targetGu.satiety : (targetGu.hunger || 50)) + 35);
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
    inv.quantity -= 1;
    if (inv.quantity <= 0) {
      player.inventory.splice(invIndex, 1);
    }

    targetGu.satiety = Math.min(100, (targetGu.satiety !== undefined ? targetGu.satiety : (targetGu.hunger || 50)) + 60);
    targetGu.hunger = targetGu.satiety;
    targetGu.lastFedAt = new Date();
    law.qi = Math.min(law.maxQi, (law.qi || 0) + 50);

    player.markModified('inventory');
    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `🍖 Berhasil memberi makan ${targetGu.guName} dengan ${inv.itemId.name}! Kekenyangan ${targetGu.satiety}% (+50 Qi)!`,
      data: { guSlots: law.guSlots, qi: law.qi }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error feeding Gu:', error);
    res.status(500).json({ error: 'Gagal memberi pakan serangga Gu.' });
  }
});

router.post('/gu/fuse', authenticateToken, async (req, res) => {
  const { slotA, slotB } = req.body;
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (law?.activeLawType !== 'gu_master') {
      return res.status(400).json({ error: 'Hanya praktisi Gu Master yang dapat memfusikan Gu.' });
    }

    if (slotA === undefined || slotB === undefined || slotA === slotB) {
      return res.status(400).json({ error: 'Pilih dua cacing Gu yang berbeda dari slot rongga untuk difusikan.' });
    }

    if (!law.guSlots || !law.guSlots[slotA] || !law.guSlots[slotB]) {
      return res.status(400).json({ error: 'Slot Gu yang dipilih tidak valid.' });
    }

    const gu1 = law.guSlots[slotA];
    const gu2 = law.guSlots[slotB];
    const crucibleTier = law.facilities?.guCrucibleTier || 1;

    // Peluang sukses berbasis Rank Law + Tier Kendi
    const baseSuccessRate = Math.min(95, 50 + (law.rank || 0) * 6 + (crucibleTier - 1) * 8);
    const roll = Math.random() * 100;

    if (roll <= baseSuccessRate) {
      // FUSI SUKSES: Hasilkan cacing mutasi tier lebih tinggi!
      const newTier = Math.min(5, Math.max(gu1.tier || 1, gu2.tier || 1) + 1);
      const mutatedGu = {
        guName: `Gu Mutasi ${gu1.guType.toUpperCase()}-${gu2.guType.toUpperCase()} Purba`,
        guType: gu1.guType,
        tier: newTier,
        level: 1,
        satiety: 100,
        hunger: 100,
        bonusAtk: (gu1.bonusAtk || 5) + (gu2.bonusAtk || 5) + 8,
        bonusDef: (gu1.bonusDef || 3) + (gu2.bonusDef || 3) + 5,
        specialEffect: 'dual_essence_venom',
        lastFedAt: new Date()
      };

      // Hapus kedua gu lama, gantikan dengan gu hasil mutasi
      const remaining = law.guSlots.filter((_, idx) => idx !== Number(slotA) && idx !== Number(slotB));
      remaining.push(mutatedGu);
      law.guSlots = remaining;
      law.qi = Math.min(law.maxQi, (law.qi || 0) + 150);

      player.markModified('cultivationLaw');
      await player.save();

      return res.json({
        success: true,
        message: `✨ FUSI BERHASIL! Terlahir cacing mutasi baru: ${mutatedGu.guName} (Tier ${mutatedGu.tier})! +150 Qi Dantian!`,
        data: { guSlots: law.guSlots, qi: law.qi }
      });
    } else {
      // FUSI GAGAL
      gu1.satiety = Math.max(10, (gu1.satiety || 50) - 30);
      gu1.hunger = gu1.satiety;
      law.qi = Math.min(law.maxQi, (law.qi || 0) + 40);

      player.markModified('cultivationLaw');
      await player.save();

      return res.json({
        success: false,
        message: '💥 Fusi Gu tidak stabil! Reaksi biologis gagal, namun dantian menyerap residu intisari (+40 Qi).',
        data: { guSlots: law.guSlots, qi: law.qi }
      });
    }
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    console.error('[LAW-API] Error fusing Gu:', error);
    res.status(500).json({ error: 'Gagal memfusikan Gu.' });
  }
});

// 2. BODY TEMPERING (Altar Cauldron Gated & True Qi)
router.post('/body/temper', authenticateToken, async (req, res) => {
  const { part, feedType } = req.body;
  try {
    const player = await resolvePlayer(req);
    const law = player.cultivationLaw;
    if (law?.activeLawType !== 'body_tempering') {
      return res.status(400).json({ error: 'Hanya praktisi Penempaan Raga Suci yang dapat menempa fisik.' });
    }

    const cauldronTier = law.facilities?.bodyCauldronTier || 0;
    if (cauldronTier < 1) {
      return res.status(400).json({
        error: 'Wajib menyiapkan Kuali Bak Mandi Raga terlebih dahulu sebelum melakukan mandi penempaan rempah!'
      });
    }

    if (!law.bodyTemperingParts) {
      law.bodyTemperingParts = { head: 0, torso: 0, leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0, spine: 0, dantian: 0, skin: 0 };
    }
    const targetPart = (part && law.bodyTemperingParts[part] !== undefined) ? part : 'skin';

    // Mode Vitality Internal atau Mode Bahan Rempah
    if (feedType === 'vitality') {
      const currentVit = player.extendedStats?.vitality ?? player.vitality ?? 100;
      if (currentVit < 20) {
        return res.status(400).json({ error: 'Vitalitas tubuh terlalu lemah untuk memeras True Qi (butuh 20 Vitality).' });
      }
      if (!player.extendedStats) player.extendedStats = {};
      player.extendedStats.vitality = Math.max(0, currentVit - 20);
      player.vitality = player.extendedStats.vitality;
    } else {
      await player.populate({ path: 'inventory.itemId' });
      const herbIndex = player.inventory.findIndex(inv => {
        if (!inv.itemId || inv.quantity < 1) return false;
        const name = (inv.itemId.name || '').toLowerCase();
        return name.includes('tulang besi') || name.includes('darah') || name.includes('herba');
      });

      if (herbIndex !== -1) {
        player.inventory[herbIndex].quantity -= 1;
        if (player.inventory[herbIndex].quantity <= 0) player.inventory.splice(herbIndex, 1);
        player.markModified('inventory');
      }
    }

    law.bodyTemperingParts[targetPart] = Math.min(100, (law.bodyTemperingParts[targetPart] || 0) + 12);
    law.qi = Math.min(law.maxQi, (law.qi || 0) + 60);

    player.markModified('extendedStats');
    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `💪 Mandi penempaan raga berhasil! Bagian [${targetPart}] kematangan +12% (+60 True Qi)!`,
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

    // Konsumsi item mineral / asah jika ada di tas
    await player.populate({ path: 'inventory.itemId' });
    const oreIndex = player.inventory.findIndex(inv => {
      if (!inv.itemId || inv.quantity < 1) return false;
      const name = (inv.itemId.name || '').toLowerCase();
      return name.includes('asah') || name.includes('besi') || name.includes('batu') || name.includes('mineral');
    });

    let essenceGain = 20;
    if (oreIndex !== -1) {
      player.inventory[oreIndex].quantity -= 1;
      if (player.inventory[oreIndex].quantity <= 0) player.inventory.splice(oreIndex, 1);
      player.markModified('inventory');
      essenceGain = 35;
    }

    law.boundEntity.essence = Math.min(law.boundEntity.maxEssence || 100, (law.boundEntity.essence || 0) + essenceGain);
    law.qi = Math.min(law.maxQi, (law.qi || 0) + 45);

    if (law.boundEntity.essence >= (law.boundEntity.maxEssence || 100)) {
      law.boundEntity.essence = 0;
      law.boundEntity.rankLevel = (law.boundEntity.rankLevel || 0) + 1;
      const stages = ['Fana (Mortal)', 'Rohani (Spirit)', 'Bumi (Earth)', 'Langit (Heaven)', 'Primordial Chaos'];
      law.boundEntity.evolutionStage = stages[Math.min(stages.length - 1, law.boundEntity.rankLevel)];
    }

    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `🗡️ Berhasil mengasah pusaka jiwa ${law.boundEntity.customName || law.boundEntity.originalName} (+${essenceGain} Intisari, +45 Qi)!`,
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

    await player.populate({ path: 'inventory.itemId' });
    const meatIndex = player.inventory.findIndex(inv => {
      if (!inv.itemId || inv.quantity < 1) return false;
      const name = (inv.itemId.name || '').toLowerCase();
      return name.includes('daging') || name.includes('ikan') || name.includes('jantung');
    });

    let essenceGain = 25;
    if (meatIndex !== -1) {
      player.inventory[meatIndex].quantity -= 1;
      if (player.inventory[meatIndex].quantity <= 0) player.inventory.splice(meatIndex, 1);
      player.markModified('inventory');
      essenceGain = 40;
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
      message: `🐾 ${law.boundEntity.customName || law.boundEntity.originalName} memakan pakan dengan lahap (+${essenceGain} Intisari Satwa, HP Penuh, +40 Qi)!`,
      data: { boundEntity: law.boundEntity, qi: law.qi }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal memberi pakan satwa roh.' });
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

    await player.populate({ path: 'inventory.itemId' });
    const coreIndex = player.inventory.findIndex(inv => {
      if (!inv.itemId || inv.quantity < 1) return false;
      const name = (inv.itemId.name || '').toLowerCase();
      return name.includes('inti') || name.includes('core');
    });

    if (coreIndex !== -1) {
      player.inventory[coreIndex].quantity -= 1;
      if (player.inventory[coreIndex].quantity <= 0) player.inventory.splice(coreIndex, 1);
      player.markModified('inventory');
    }

    if (!law.demonicData) law.demonicData = {};
    law.demonicData.turbidCoresConsumed = (law.demonicData.turbidCoresConsumed || 0) + 1;
    law.demonicData.corruptionIndex = Math.min(100, (law.demonicData.corruptionIndex || 0) + 3);
    law.qi = Math.min(law.maxQi, (law.qi || 0) + 80);

    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: '👹 Berhasil melahap inti siluman kotor (+80 Qi, +3 Poin Korupsi Batin)!',
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
    law.demonicData.bloodEssenceVials = (law.demonicData.bloodEssenceVials || 0) + 1;
    law.demonicData.infamy = (law.demonicData.infamy || 0) + 5;
    law.qi = Math.min(law.maxQi, (law.qi || 0) + 65);

    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: '🩸 Berhasil memanen esensi darah segar (+1 Botol Darah, +65 Qi, +5 Status Buronan)!',
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
    law.demonicData.soulBannerCaptures = (law.demonicData.soulBannerCaptures || 0) + 1;
    law.qi = Math.min(law.maxQi, (law.qi || 0) + 70);

    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: '👻 Berhasil mengikat arwah penasaran ke dalam Panji Sembilan Ruh (+70 Qi)!',
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
    if (!law.demonicData) law.demonicData = {};
    law.demonicData.venomToxinLevel = (law.demonicData.venomToxinLevel || 0) + 1;
    law.qi = Math.min(law.maxQi, (law.qi || 0) + 75);

    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: '🧪 Berhasil meminum dan menetralisir racun mematikan (+1 Toleransi Racun, +75 Qi)!',
      data: { demonicData: law.demonicData, qi: law.qi }
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

    const tributeDurationDays = altarTier === 1 ? 7 : (altarTier === 2 ? 15 : 30);
    if (!law.demonicData) law.demonicData = {};
    law.demonicData.abyssalTributeDueAt = new Date(Date.now() + tributeDurationDays * 24 * 3600 * 1000);
    law.qi = Math.min(law.maxQi, (law.qi || 0) + 90);

    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: `📜 Berhasil menyetor upeti kurban di Altar Abyss! Tenggat kontrak diperpanjang ${tributeDurationDays} hari (+90 Qi)!`,
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
    law.qi = Math.min(law.maxQi, (law.qi || 0) + 70);
    player.markModified('cultivationLaw');
    await player.save();

    res.json({
      success: true,
      message: '🌑 Berhasil menyerap hawa dingin Yin Sembilan Lapis Netherworld (+70 Qi)!',
      data: { qi: law.qi }
    });
  } catch (error) {
    if (error instanceof CustomError) return res.status(error.statusCode).json({ error: error.message });
    res.status(500).json({ error: 'Gagal menyerap hawa Yin.' });
  }
});

// 6. 6 DIVINE ELEMENTAL LAWS (Ritual Resonansi Elemen Aktif)
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

