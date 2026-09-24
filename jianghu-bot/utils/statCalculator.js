const { calculatePlayerStats } = require('./playerCombat');
const { TALENT_EFFECTS } = require('../config/talentEffects');
const { BASE_CRIT_RATE, BASE_CRIT_DMG, BASE_COMBO_RATE, BASE_MAX_MP } = require('../config/combatRates');

/**
 * Computes all the core stats for a player, combining realm stats, equipment, laws, manuals, and talents.
 * @param {Object} player - The Mongoose player document
 * @param {Array} populatedLaws - Optional array of Law documents
 * @param {Array} populatedManuals - Optional array of playerManual objects with populated `manualId`
 * @returns {Object} Full computed stats
 */
function getComputedStats(player, populatedLaws = [], populatedManuals = []) {
    // Start with the base combat stats which include realm and equipment bonuses
    const baseStats = calculatePlayerStats(player, populatedLaws, populatedManuals);

    let maxHp = baseStats.hp;
    let maxMp = BASE_MAX_MP; // Base max MP placeholder if none from baseStats
    let atk = baseStats.atk;
    let def = baseStats.def;
    let spd = baseStats.spd;

    // Apply Talent Bonuses
    // STR: +5 ATK, +5 DEF
    // AGI: +5 SPD
    // STA: +25 maxHP
    // POW: +25 maxMP
    if (player.talents) {
        maxHp += (player.talents.sta || 0) * 25;
        maxMp += (player.talents.pow || 0) * 25;
        atk += (player.talents.str || 0) * 5;
        def += (player.talents.str || 0) * 5;
        spd += (player.talents.agi || 0) * 5;
    }

    // Apply Injury Condition penalty:
    // Semakin tinggi injury, semakin rendah Max MP / Qi, serta mereduksi ATK dan DEF secara drastis
    const injury = Math.max(0, Math.floor(Number(player.conditions?.injury) || 0));
    if (injury > 0) {
        const penaltyRatio = Math.min(0.80, injury * 0.0045);
        atk = Math.max(1, Math.floor(atk * (1 - penaltyRatio)));
        def = Math.max(1, Math.floor(def * (1 - penaltyRatio)));

        const mpPenaltyRatio = Math.min(0.80, injury * 0.005);
        maxMp = Math.max(5, Math.floor(maxMp * (1 - mpPenaltyRatio)));
    }

    // Apply Ordinary Cultivator (Kultivator Biasa) 0.95x modifier
    // Players who refuse cosmic laws receive a 5% stat penalty on core combat attributes
    if (player.isNormalCultivator === true) {
        maxHp = Math.max(10, Math.floor(maxHp * 0.95));
        maxMp = Math.max(5,  Math.floor(maxMp * 0.95));
        atk   = Math.max(1,  Math.floor(atk * 0.95));
        def   = Math.max(1,  Math.floor(def * 0.95));
        spd   = Math.max(1,  Math.floor(spd * 0.95));
    }

    // Determine current HP and MP (clamp to max)
    let currentHp = player.currentHp !== null && player.currentHp !== undefined ? player.currentHp : maxHp;
    let currentMp = player.currentMp !== null && player.currentMp !== undefined ? player.currentMp : maxMp;

    currentHp = Math.min(Math.max(0, currentHp), maxHp);
    currentMp = Math.min(Math.max(0, currentMp), maxMp);

    // Apply Kungfu Skill flat bonuses (if any are defined later, keeping it 0 for now as per instructions)
    // if (player.kungfuSkills) { ... }

    let critHitRate = BASE_CRIT_RATE;
    let comboRate = BASE_COMBO_RATE;

    if (baseStats._unarmedBonus) {
        critHitRate = Number((critHitRate + (baseStats._unarmedBonus.bonusCritRate || 0)).toFixed(4));
        comboRate = Number((comboRate + (baseStats._unarmedBonus.bonusComboRate || 0)).toFixed(4));
    }

    return {
        maxHp,
        maxMp,
        currentHp,
        currentMp,
        atk,
        def,
        spd,
        critHitRate,
        critDmgRate: BASE_CRIT_DMG,
        comboRate: player.extendedStats?.comboRate !== undefined ? player.extendedStats.comboRate : Math.round(comboRate * 100),
        // Extended Combat Stats
        critRate: player.extendedStats?.critRate !== undefined ? player.extendedStats.critRate : Math.round(critHitRate * 100),
        critRes: player.extendedStats?.critResist || 0,
        critDmg: player.extendedStats?.critDmg || Math.round(BASE_CRIT_DMG * 100),
        critDr: player.extendedStats?.critDmgReduce || 0,
        martialRes: player.extendedStats?.martialRes || 0,
        spiritualRes: player.extendedStats?.spiritualRes || 0,
        _base: baseStats._base,
        _equip: baseStats._equip,
        _unarmedBonus: baseStats._unarmedBonus,
        _hasEquippedWeapon: baseStats._hasEquippedWeapon
    };
}

module.exports = {
    getComputedStats
};
