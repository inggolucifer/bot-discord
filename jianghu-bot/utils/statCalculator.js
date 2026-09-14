const { calculatePlayerStats } = require('./playerCombat');
const { TALENT_EFFECTS } = require('../config/talentEffects');
const { BASE_CRIT_RATE, BASE_CRIT_DMG, BASE_COMBO_RATE } = require('../config/combatRates');

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
    let maxMp = 50; // Base max MP placeholder if none from baseStats
    let atk = baseStats.atk;
    let def = baseStats.def;
    let spd = baseStats.spd;

    // Apply Talent Bonuses
    if (player.talents) {
        maxHp += (player.talents.sta || 0) * TALENT_EFFECTS.sta.maxHp;
        maxMp += (player.talents.pow || 0) * TALENT_EFFECTS.pow.maxMp;
        atk += (player.talents.str || 0) * TALENT_EFFECTS.str.atk;
        def += (player.talents.str || 0) * TALENT_EFFECTS.str.def;
        spd += (player.talents.agi || 0) * TALENT_EFFECTS.agi.spd;
    }

    // Determine current HP and MP (clamp to max)
    let currentHp = player.currentHp !== null && player.currentHp !== undefined ? player.currentHp : maxHp;
    let currentMp = player.currentMp !== null && player.currentMp !== undefined ? player.currentMp : maxMp;

    currentHp = Math.min(Math.max(0, currentHp), maxHp);
    currentMp = Math.min(Math.max(0, currentMp), maxMp);

    // Apply Kungfu Skill flat bonuses (if any are defined later, keeping it 0 for now as per instructions)
    // if (player.kungfuSkills) { ... }

    return {
        maxHp,
        maxMp,
        currentHp,
        currentMp,
        atk,
        def,
        spd,
        critHitRate: BASE_CRIT_RATE,
        critDmgRate: BASE_CRIT_DMG,
        comboRate: BASE_COMBO_RATE,
        _base: baseStats._base,
        _equip: baseStats._equip
    };
}

module.exports = {
    getComputedStats
};
