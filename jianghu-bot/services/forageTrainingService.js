const Player = require('../models/Player');
const ZoneTile = require('../models/ZoneTile');
const Item = require('../models/Item');
const PropertyStructure = require('../models/PropertyStructure');
const ActivityLog = require('../models/ActivityLog');
const { getCurrentStamina } = require('../utils/stamina');

const KUNGFU_SKILLS = ['sword', 'saber', 'staff', 'fist', 'finger', 'special', 'forging', 'qimen'];

class ForageTrainingService {
  /**
   * Mengumpulkan sumber daya alam (Kayu, Herba, Bijih) dari node terdekat (jarak <= 1)
   */
  async gatherResource(discordId, guildId, options = {}) {
    const player = await Player.findOne({ discordId, guildId });
    if (!player) return { ok: false, error: 'Karakter belum terdaftar.' };

    const zoneId = player.gridPosition?.zoneId || 'xingcun_village';
    const px = player.gridPosition?.tileX ?? 16;
    const py = player.gridPosition?.tileY ?? 16;

    // Cari resource node dalam radius Chebyshev 1 tile
    const node = await ZoneTile.findOne({
      guildId,
      zoneId,
      resourceType: { $in: ['wood', 'herb', 'ore'] },
      tileX: { $gte: px - 1, $lte: px + 1 },
      tileY: { $gte: py - 1, $lte: py + 1 }
    });

    if (!node) {
      return { 
        ok: false, 
        error: 'Tidak ada sumber daya alam di sekitarmu. Dekatilah rumpun pohon, batu bijih, atau kebun herbal (jarak maks 1 petak).' 
      };
    }

    const now = new Date();
    if (node.nodeRespawnAt && now < node.nodeRespawnAt) {
      const waitSec = Math.ceil((node.nodeRespawnAt.getTime() - now.getTime()) / 1000);
      return { 
        ok: false, 
        error: `Sumber daya ${node.resourceType} di petak ini baru saja dipanen. Tunggu ${waitSec} detik untuk tumbuh/muncul kembali.` 
      };
    }

    const currentStamina = getCurrentStamina(player);
    if (currentStamina < 3) {
      return { ok: false, error: 'Stamina tidak mencukupi untuk meramu/menebang (Butuh 3 Stamina).' };
    }

    // Tentukan item hasil sesuai tipe node (Kanonikal Jianghu Era 1)
    let itemName = 'Kayu Mentah';
    if (node.resourceType === 'herb') itemName = 'Serat Tumbuhan';
    if (node.resourceType === 'ore') itemName = 'Bijih Besi';

    let itemDoc = await Item.findOne({ name: itemName });
    if (!itemDoc) {
      itemDoc = await Item.findOne({ guildId, name: itemName });
    }
    if (!itemDoc) {
      itemDoc = await Item.create({
        guildId,
        name: itemName,
        type: 'material',
        rarity: 'common',
        description: `Bahan baku alami dari alam Jianghu (${node.resourceType}).`
      });
    }

    const yieldQty = 2;
    const invSlot = player.inventory.find(i => i.itemId && i.itemId.toString() === itemDoc._id.toString());
    if (invSlot) {
      invSlot.quantity += yieldQty;
    } else {
      player.inventory.push({ itemId: itemDoc._id, quantity: yieldQty });
    }

    player.currentStamina = Math.max(0, currentStamina - 3);

    // Pasang cooldown respawn (30 detik)
    const cooldownSec = options.overrideCooldownSeconds != null ? options.overrideCooldownSeconds : 30;
    node.nodeRespawnAt = new Date(now.getTime() + cooldownSec * 1000);
    await node.save();

    // EXP Profesi Gathering
    if (!player.professions) player.professions = {};
    const profKey = node.resourceType === 'wood' ? 'woodcutting' : (node.resourceType === 'ore' ? 'mining' : 'alchemy');
    if (!player.professions[profKey]) {
      player.professions[profKey] = { level: 1, exp: 0, isUnlocked: true };
    }
    player.professions[profKey].exp += 15;
    await player.save();

    await ActivityLog.create({
      guildId,
      discordId,
      actionType: 'forage_gather',
      details: { zoneId, tileX: node.tileX, tileY: node.tileY, resourceType: node.resourceType, itemName, quantity: yieldQty },
      serverValidated: true,
      itemOriginLogged: true
    });

    return {
      ok: true,
      resourceType: node.resourceType,
      itemName,
      quantity: yieldQty,
      remainingStamina: player.currentStamina,
      cooldownSeconds: cooldownSec
    };
  }

  /**
   * Berlatih jurus kungfu di Dojo dengan kurva Diminishing Returns harian
   */
  async trainKungfu(discordId, guildId, skillKey, options = {}) {
    const player = await Player.findOne({ discordId, guildId });
    if (!player) return { ok: false, error: 'Karakter belum terdaftar.' };

    const cleanSkill = (skillKey || 'fist').toLowerCase().trim();
    if (!KUNGFU_SKILLS.includes(cleanSkill)) {
      return { 
        ok: false, 
        error: `Jurus '${skillKey}' tidak valid. Pilihan: ${KUNGFU_SKILLS.join(', ')}.` 
      };
    }

    // 1. Validasi Lokasi: Harus di dojo / sasana bela diri
    const interiorId = player.gridPosition?.interiorInstanceId;
    let inDojo = false;
    if (interiorId) {
      const structure = await PropertyStructure.findById(interiorId);
      if (structure && (structure.structureType === 'dojo' || structure.structureName.toLowerCase().includes('dojo'))) {
        inDojo = true;
      }
    }

    if (!inDojo && !options.bypassLocationCheck) {
      const tile = await ZoneTile.findOne({
        guildId,
        zoneId: player.gridPosition?.zoneId,
        tileX: player.gridPosition?.tileX,
        tileY: player.gridPosition?.tileY
      });
      if (tile && (tile.buildingType === 'dojo' || tile.label?.toLowerCase().includes('dojo'))) {
        inDojo = true;
      }
    }

    if (!inDojo && !options.bypassLocationCheck) {
      return { 
        ok: false, 
        error: 'Kamu harus berada di dalam Dojo Bela Diri untuk memusatkan Qi dan melatih jurus!' 
      };
    }

    const currentStamina = getCurrentStamina(player);
    if (currentStamina < 10) {
      return { ok: false, error: 'Stamina tidak mencukupi untuk berlatih kungfu (Butuh 10 Stamina).' };
    }

    // 2. Hitung Sesi Latihan Hari Ini dari ActivityLog (Formula Diminishing Returns)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const trainingCountToday = await ActivityLog.countDocuments({
      guildId,
      discordId,
      actionType: 'training_session',
      createdAt: { $gte: todayStart }
    });

    let baseExpGain = 25;
    let efficiencyRate = 1.0;
    let returnTier = 'Efisiensi Penuh (100%)';

    if (trainingCountToday >= 10) {
      // Sesi ke-11 ke atas: Penurunan drastis 90% (Hanya sisa 10% efisiensi)
      efficiencyRate = 0.1;
      returnTier = 'Kelelahan Ekstrem (10%) — Diminishing Returns Aktif';
    } else if (trainingCountToday >= 5) {
      // Sesi ke-6 sampai 10: Efisiensi turun 50%
      efficiencyRate = 0.5;
      returnTier = 'Kelelahan Sedang (50%)';
    }

    const finalExpGain = Math.max(2, Math.round(baseExpGain * efficiencyRate));

    // Konsumsi Stamina
    player.currentStamina = Math.max(0, currentStamina - 10);

    // Tambahkan Skill Mastery Kungfu via awardKungfuExp
    const { awardKungfuExp, getKungfuLevel } = require('../utils/kungfuMastery');
    const resultExp = awardKungfuExp(player, cleanSkill, finalExpGain);
    await player.save();

    await ActivityLog.create({
      guildId,
      discordId,
      actionType: 'training_session',
      details: { skill: cleanSkill, sessionNumber: trainingCountToday + 1, expGained: finalExpGain, returnTier },
      serverValidated: true
    });

    const masteryInfo = getKungfuLevel(player.kungfuSkills[cleanSkill]);

    return {
      ok: true,
      skill: cleanSkill,
      expGained: finalExpGain,
      newSkillExp: player.kungfuSkills[cleanSkill],
      newSkillLevel: masteryInfo.level,
      rankTitle: masteryInfo.rankTitle,
      progressPercent: masteryInfo.progressPercent,
      levelUp: resultExp.levelUp,
      sessionToday: trainingCountToday + 1,
      returnTier,
      remainingStamina: player.currentStamina
    };
  }
}

module.exports = new ForageTrainingService();
