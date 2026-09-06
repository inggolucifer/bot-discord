const { getRealmIndex } = require('./cultivation');

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

  // 2-Eq. Equipment Stats from Equipped Items (Quality Multiplier applied)
  if (player.inventory && player.inventory.length > 0) {
    for (const invItem of player.inventory) {
      if (invItem.isEquipped) {
        const item = invItem.itemId;
        if (item) {
          const quality = invItem.qualityMultiplier || 1.0;
          flat.hp += Math.floor((item.baseHp || 0) * quality);
          flat.atk += Math.floor((item.baseAtk || 0) * quality);
          flat.def += Math.floor((item.baseDef || 0) * quality);
          flat.spd += Math.floor((item.baseSpd || 0) * quality);
        }
      }
    }
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

  // 3. Final Calculation: (Base + Flat) * Multiplier
  totals.hp = Math.floor((totals.hp + flat.hp) * mult.hp);
  totals.atk = Math.floor((totals.atk + flat.atk) * mult.atk);
  totals.def = Math.floor((totals.def + flat.def) * mult.def);
  totals.spd = Math.floor((totals.spd + flat.spd) * mult.spd);

  return totals;
}

module.exports = {
  calculatePlayerStats
};
