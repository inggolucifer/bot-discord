const { getRealmIndex } = require('./cultivation');
const { getClimatePenalties } = require('./climate');

/**
 * Calculates the total combat stats of a player.
 * @param {Object} player - The Mongoose player document.
 * @param {Array} populatedLaws - Array of Law documents (can be player.laws if populated).
 * @param {Array} populatedManuals - Array of playerManual objects with populated `manualId`.
 * @returns {Object} { hp, atk, def, spd }
 */
function calculatePlayerStats(player, populatedLaws = [], populatedManuals = []) {
  // 1. Base Stats
  const base = {
    hp: player.stats?.baseHp || 100,
    atk: player.stats?.baseAtk || 15,
    def: player.stats?.baseDef || 10,
    spd: player.stats?.baseSpd || 10
  };

  let totals = { ...base };

  // 2. Multipliers and Flat Bonuses
  let mult = { hp: 1, atk: 1, def: 1, spd: 1 };
  let flat = { hp: 0, atk: 0, def: 0, spd: 0 };

  // 2-Eq. Equipment Stats from Equipped Items (Quality Multiplier & Kungfu Mastery applied)
  const { resolveWeaponDiscipline, getKungfuLevel, getWeaponMasteryMultiplier, getUnarmedBonus } = require('./kungfuMastery');
  let hasEquippedWeapon = false;

  if (player.inventory && player.inventory.length > 0) {
    // Check equipped items robustly (by isEquipped flag OR if it exists in the equipment slots)
    const equipmentSlotValues = player.equipment
      ? Object.values(player.equipment).filter(v => v !== null).map(v => v.toString())
      : [];

    for (const invItem of player.inventory) {
      const isActuallyEquipped = invItem.isEquipped || (invItem._id && equipmentSlotValues.includes(invItem._id.toString()));

      if (isActuallyEquipped) {
        const item = invItem.itemId;
        if (item) {
          const quality = invItem.qualityMultiplier || 1.0;
          let masteryMult = 1.0;

          if (item.category === 'weapon') {
            hasEquippedWeapon = true;
            const discipline = resolveWeaponDiscipline(item);
            const kungfuExp = player.kungfuSkills ? (player.kungfuSkills[discipline] || 0) : 0;
            const kungfuLevel = getKungfuLevel(kungfuExp).level;
            masteryMult = getWeaponMasteryMultiplier(kungfuLevel);
          }

          flat.hp += Math.floor((Number(item.baseHp) || 0) * quality);
          flat.atk += Math.floor((Number(item.baseAtk) || 0) * quality * masteryMult);
          flat.def += Math.floor((Number(item.baseDef) || 0) * quality * masteryMult);
          flat.spd += Math.floor((Number(item.baseSpd) || 0) * quality);
        }
      }
    }
  }

  // Jika bertarung tangan kosong (tanpa senjata), terapkan bonus kemahiran tinju (fist)
  let unarmedBonus = { bonusAtk: 0, bonusComboRate: 0, bonusCritRate: 0 };
  if (!hasEquippedWeapon) {
    const fistExp = player.kungfuSkills ? (player.kungfuSkills.fist || 0) : 0;
    const fistLevel = getKungfuLevel(fistExp).level;
    unarmedBonus = getUnarmedBonus(fistLevel);
    flat.atk += unarmedBonus.bonusAtk;
  }

  // 2a. System Cultivation Multiplier (if not a normal cultivator)
  if (!player.isNormalCultivator && player.systemCultivation) {
    const realmIdx = getRealmIndex(player.systemCultivation.realm);
    const stage = player.systemCultivation.stage || 0;

    // Example: +2% per realm and +0.5% per stage (or similar).
    // The instructions said "+2% per realm/stage".
    // Let's grant 2% per overall level.
    // E.g., Mortal 0 = 0.
    // Qi Refining 1 = Realm 1, Stage 1 = 2 steps.
    const steps = (realmIdx * 10) + stage; // 9 stages per realm roughly
    const cultBonus = steps * 0.02;

    mult.hp += cultBonus;
    mult.atk += cultBonus;
    mult.def += cultBonus;
    mult.spd += cultBonus;
  }

  // 2b. Laws Bonuses
  for (const law of populatedLaws) {
    if (!law) continue;
    if (law.flatBonus) {
      flat.hp += law.flatBonus.hp || 0;
      flat.atk += law.flatBonus.atk || 0;
      flat.def += law.flatBonus.def || 0;
      flat.spd += law.flatBonus.spd || 0;
    }
    if (law.multiplierBonus) {
      mult.hp += law.multiplierBonus.hp || 0;
      mult.atk += law.multiplierBonus.atk || 0;
      mult.def += law.multiplierBonus.def || 0;
      mult.spd += law.multiplierBonus.spd || 0;
    }
  }

  // 2c. Manuals Bonuses
  for (const pm of populatedManuals) {
    if (!pm || !pm.manualId) continue;
    const level = pm.level || 0;
    const manual = pm.manualId;

    if (level > 0) {
      if (manual.flatBonusPerLevel) {
        flat.hp += (manual.flatBonusPerLevel.hp || 0) * level;
        flat.atk += (manual.flatBonusPerLevel.atk || 0) * level;
        flat.def += (manual.flatBonusPerLevel.def || 0) * level;
        flat.spd += (manual.flatBonusPerLevel.spd || 0) * level;
      }
      if (manual.multiplierBonusPerLevel) {
        mult.hp += (manual.multiplierBonusPerLevel.hp || 0) * level;
        mult.atk += (manual.multiplierBonusPerLevel.atk || 0) * level;
        mult.def += (manual.multiplierBonusPerLevel.def || 0) * level;
        mult.spd += (manual.multiplierBonusPerLevel.spd || 0) * level;
      }
    }
  }

  // 2d. Active Buffs
  if (player.activeBuffs && player.activeBuffs.length > 0) {
    const now = new Date();
    let buffsUpdated = false;

    for (let i = player.activeBuffs.length - 1; i >= 0; i--) {
      const buff = player.activeBuffs[i];
      if (buff.expiresAt > now) {
        if (buff.buffType === 'hp_boost') flat.hp += buff.value;
        else if (buff.buffType === 'atk_boost') flat.atk += buff.value;
        else if (buff.buffType === 'def_boost') flat.def += buff.value;
      } else {
        // Option to splice here if we wanted to mutate, but usually we just ignore expired ones during calculation
        // and let a separate process or the save hook clean them up.
      }
    }
  }

  // 2e. Cultivation Law Stat Multipliers & Bonuses (15 Law Framework)
  if (player.cultivationLaw && player.cultivationLaw.activeLawType) {
    const law = player.cultivationLaw;
    const rank = law.rank || 0;
    const stage = law.stage || 0;
    const totalStages = (rank * 10) + stage;

    // Universal stage progression (+0.6% HP/ATK/DEF, +0.3% SPD per stage)
    const lawProgressionMult = totalStages * LAW_BALANCE.STAT_MULT_PER_STAGE;
    mult.hp += lawProgressionMult;
    mult.atk += lawProgressionMult;
    mult.def += lawProgressionMult;
    mult.spd += lawProgressionMult * LAW_BALANCE.SPD_MULT_PER_STAGE_FACTOR;

    // Law Skill Tree Investment Bonus (+0.3% per skill level invested)
    if (law.skillLevels) {
      let totalSpInvested = 0;
      const entries = law.skillLevels instanceof Map ? Array.from(law.skillLevels.entries()) : Object.entries(law.skillLevels);
      for (const [, lvl] of entries) {
        if (typeof lvl === 'number' && lvl > 0) totalSpInvested += lvl;
      }
      if (totalSpInvested > 0) {
        mult.hp += totalSpInvested * LAW_BALANCE.SKILL_TREE_MULT_PER_LEVEL;
        mult.atk += totalSpInvested * LAW_BALANCE.SKILL_TREE_MULT_PER_LEVEL;
        mult.def += totalSpInvested * LAW_BALANCE.SKILL_TREE_MULT_PER_LEVEL;
      }
    }

    // Law Specialization Bonuses
    switch (law.activeLawType) {
      case 'element_phoenix_fire':
        mult.atk += rank * LAW_BALANCE.FIRE_RANK_ATK_MULT;
        break;
      case 'element_azure_water':
        mult.hp += rank * LAW_BALANCE.WATER_RANK_HP_MULT;
        mult.def += rank * LAW_BALANCE.WATER_RANK_DEF_MULT;
        break;
      case 'element_xuanwu_earth':
        mult.def += rank * LAW_BALANCE.EARTH_RANK_DEF_MULT;
        flat.def += rank * LAW_BALANCE.EARTH_RANK_FLAT_DEF;
        break;
      case 'element_qingdi_wood':
        mult.hp += rank * LAW_BALANCE.WOOD_RANK_HP_MULT;
        flat.hp += rank * LAW_BALANCE.WOOD_RANK_FLAT_HP;
        if (player.extendedStats) {
          player.extendedStats.vitality = (player.extendedStats.vitality || 100) + (rank * LAW_BALANCE.WOOD_RANK_VITALITY_FLAT);
        }
        break;
      case 'element_roc_wind':
        mult.spd += rank * LAW_BALANCE.WIND_RANK_SPD_MULT;
        break;
      case 'element_godthunder_light':
        mult.atk += rank * LAW_BALANCE.THUNDER_RANK_ATK_MULT;
        mult.spd += rank * LAW_BALANCE.THUNDER_RANK_SPD_MULT;
        break;
      case 'body_tempering':
        // Raga Suci: tanky & resilient without breaking balance (Master Plan §5.4)
        mult.hp += rank * LAW_BALANCE.BODY_RANK_HP_MULT;
        mult.def += rank * LAW_BALANCE.BODY_RANK_DEF_MULT;
        flat.hp += rank * LAW_BALANCE.BODY_RANK_FLAT_HP;
        break;
      case 'natal_artifact':
        if (law.boundEntity?.entityType === 'artifact') {
          const artRank = law.boundEntity.rankLevel || rank;
          flat.atk += (law.boundEntity.artifactAtk || (artRank * LAW_BALANCE.NATAL_FALLBACK_ATK_PER_RANK));
          flat.def += (law.boundEntity.artifactDef || (artRank * LAW_BALANCE.NATAL_FALLBACK_DEF_PER_RANK));
        }
        break;
      case 'natal_beast':
        if (law.boundEntity?.entityType === 'beast') {
          const beastRank = law.boundEntity.rankLevel || rank;
          flat.hp += (law.boundEntity.beastMaxHp ? Math.floor(law.boundEntity.beastMaxHp * LAW_BALANCE.NATAL_BEAST_HP_SHARE) : (beastRank * 40));
          flat.atk += (law.boundEntity.beastAtk || (beastRank * LAW_BALANCE.NATAL_BEAST_FALLBACK_ATK_PER_RANK));
          flat.def += (law.boundEntity.beastDef || (beastRank * LAW_BALANCE.NATAL_BEAST_FALLBACK_DEF_PER_RANK));
        }
        break;
      case 'gu_master':
        if (Array.isArray(law.guSlots)) {
          // Sort Gu by combat effectiveness and take only top GU_COMBAT_MAX_ACTIVE_SLOTS (3)
          const activeGu = [...law.guSlots]
            .map(g => {
              const baseSatiety = g.satiety !== undefined ? g.satiety : (g.hunger || 0);
              const hoursSinceFed = g.lastFedAt ? (Date.now() - new Date(g.lastFedAt).getTime()) / 3600000 : 0;
              const effectiveSatiety = Math.max(0, Math.min(100, baseSatiety - Math.floor(hoursSinceFed * 2)));
              const bAtk = g.bonusAtk || (rank * 8 + 5);
              const bDef = g.bonusDef || (rank * 5 + 3);
              const score = (bAtk + bDef) + ((g.tier || 1) * (g.level || 1));
              return { ...g, effectiveSatiety, bAtk, bDef, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, LAW_BALANCE.GU_COMBAT_MAX_ACTIVE_SLOTS);

          for (const g of activeGu) {
            if (g.effectiveSatiety > 0) {
              const satietyRatio = Math.min(1.0, g.effectiveSatiety / 50);
              const effectiveAtk = Math.floor(g.bAtk * LAW_BALANCE.GU_ATK_SCALE_PER_TIER);
              flat.atk += Math.floor(effectiveAtk * satietyRatio);
              flat.def += Math.floor(g.bDef * satietyRatio);
            }
          }
        }
        break;
      case 'demonic_turbid_core':
      case 'demonic_blood_soul':
      case 'demonic_myriad_venom':
      case 'demonic_abyssal_pact':
      case 'demonic_nether_darkness':
        // Demonic shared offensive scaling
        mult.atk += rank * LAW_BALANCE.DEMONIC_RANK_ATK_MULT;
        const corruption = law.demonicData?.corruptionIndex || 0;
        const corrPct = Math.min(
          LAW_BALANCE.CORRUPTION_ATK_PERCENT_CAP,
          Math.floor(corruption / 10) * LAW_BALANCE.CORRUPTION_ATK_PERCENT_PER_10
        );
        mult.atk += corrPct;

        if (law.activeLawType === 'demonic_blood_soul' && law.demonicData?.soulBannerCaptures) {
          const cap = LAW_BALANCE.SOUL_BANNER_ATK_CAP_BASE + (rank * LAW_BALANCE.SOUL_BANNER_ATK_CAP_PER_RANK);
          flat.atk += Math.min(cap, (law.demonicData.soulBannerCaptures || 0) * LAW_BALANCE.SOUL_BANNER_ATK_PER_CAPTURE);
        }
        if (law.activeLawType === 'demonic_myriad_venom' && law.demonicData?.venomToxinLevel) {
          const venomCap = LAW_BALANCE.VENOM_ATK_CAP_BASE + (rank * LAW_BALANCE.VENOM_ATK_CAP_PER_RANK);
          flat.atk += Math.min(venomCap, (law.demonicData.venomToxinLevel || 0) * LAW_BALANCE.VENOM_ATK_PER_LEVEL);
        }

        // Sanksi Keterlambatan Upeti Altar Kurban Darah Abyss (Master Plan §3.7)
        if (law.activeLawType === 'demonic_abyssal_pact' && law.demonicData?.abyssalTributeDueAt) {
          const now = Date.now();
          const dueTime = new Date(law.demonicData.abyssalTributeDueAt).getTime();
          if (now > dueTime) {
            const overdueDays = (now - dueTime) / (24 * 3600 * 1000);
            const curseLevel = overdueDays >= 7 ? 2 : 1;
            if (law.demonicData) law.demonicData.abyssalCurseLevel = curseLevel;
            const penaltyMult = curseLevel === 2 ? LAW_BALANCE.ABYSS_CURSE_MULT_L2 : LAW_BALANCE.ABYSS_CURSE_MULT_L1;
            mult.hp *= penaltyMult;
            mult.atk *= penaltyMult;
            mult.def *= penaltyMult;
            mult.spd *= penaltyMult;
          } else {
            if (law.demonicData) law.demonicData.abyssalCurseLevel = 0;
          }
        }

        // Sanksi Terbakar Cahaya Yang di Luar Wilayah Kegelapan (Nether Debuff) (Master Plan §3.8)
        if (law.activeLawType === 'demonic_nether_darkness' && law.demonicData?.hasNetherDebuff) {
          mult.hp *= LAW_BALANCE.NETHER_DEBUFF_MULT;
          mult.atk *= LAW_BALANCE.NETHER_DEBUFF_MULT;
          mult.def *= LAW_BALANCE.NETHER_DEBUFF_MULT;
          mult.spd *= LAW_BALANCE.NETHER_DEBUFF_MULT;
        }
        break;
    }

    // Infamy Combat Penalty: Kultivator iblis dengan infamy tinggi menderita tekanan batin / perburuan
    const infamy = player.infamy || law.demonicData?.infamy || 0;
    if (infamy > LAW_BALANCE.INFAMY_STAT_PENALTY_START) {
      const steps = Math.floor((infamy - LAW_BALANCE.INFAMY_STAT_PENALTY_START) / LAW_BALANCE.INFAMY_STAT_PENALTY_STEP);
      const pen = Math.min(LAW_BALANCE.INFAMY_STAT_PENALTY_CAP, steps * LAW_BALANCE.INFAMY_STAT_PENALTY_PER_STEP);
      mult.atk *= (1 - pen);
      mult.def *= (1 - pen);
    }
  }

  // 3. Final Calculation: (Base + Flat) * Multiplier
  totals.hp = Math.floor((totals.hp + flat.hp) * mult.hp);
  totals.atk = Math.floor((totals.atk + flat.atk) * mult.atk);
  totals.def = Math.floor((totals.def + flat.def) * mult.def);
  totals.spd = Math.floor((totals.spd + flat.spd) * mult.spd);

  // 4. Flawed Foundation Penalty (-5%)
  if (player.systemCultivation && player.systemCultivation.isFlawedFoundation) {
    totals.hp = Math.floor(totals.hp * 0.95);
    totals.atk = Math.floor(totals.atk * 0.95);
    totals.def = Math.floor(totals.def * 0.95);
    totals.spd = Math.floor(totals.spd * 0.95);
  }

  // 5. Climate / Comfort Penalty
  // Karena playerCombat.js ini mungkin dipanggil sinkron di berbagai tempat,
  // dan kita tidak bisa memanggil fungsi async `getPlayerClimateResistance`,
  // kita akan hitung resistance secara sinkron seadanya (tanpa populate dari DB jika belum ter-populate)
  let coldResistance = 0;
  let heatResistance = 0;

  if (player.inventory && player.equipment) {
    const equipmentSlotValues = Object.values(player.equipment).filter(v => v !== null).map(v => v.toString());
    for (const invItem of player.inventory) {
      const isActuallyEquipped = invItem.isEquipped || (invItem._id && equipmentSlotValues.includes(invItem._id.toString()));
      if (isActuallyEquipped && invItem.itemId) {
        // Jika sudah di-populate
        if (invItem.itemId.coldResistance) coldResistance += invItem.itemId.coldResistance;
        if (invItem.itemId.heatResistance) heatResistance += invItem.itemId.heatResistance;
      }
    }
  }

  const regionSlug = player.currentLocation?.regionSlug || 'central_plains';
  // Untuk synchronous call, weather config kita skip (dianggap base weather/cerah)
  const penalties = getClimatePenalties(regionSlug, { coldResistance, heatResistance });

  if (penalties.combatStatMultiplier !== 1.0) {
     totals.atk = Math.floor(totals.atk * penalties.combatStatMultiplier);
     totals.def = Math.floor(totals.def * penalties.combatStatMultiplier);
  }

  // Note: we can return base, equip/flat, and totals if needed, but since it's used across the bot
  // and expects { hp, atk, def, spd }, we'll attach `_base` and `_equip` as hidden properties
  // so the frontend can access them, without breaking legacy bot logic that expects numbers.
  totals._base = base;
  totals._equip = flat; // Only flat equipment/items bonuses for now
  totals._unarmedBonus = unarmedBonus;
  totals._hasEquippedWeapon = hasEquippedWeapon;

  return totals;
}

module.exports = {
  calculatePlayerStats,
  calculatePlayerCombatStats: calculatePlayerStats
};
