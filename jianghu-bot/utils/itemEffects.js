const { getComputedStats } = require('./statCalculator');
const { applyMoodDelta } = require('./moodManager');

/**
 * Applies survival restorative effects of an item to a player.
 * @param {Object} player - The Mongoose player document
 * @param {Object} item - The populated item document from inventory
 * @returns {String} A message string describing the buffs applied
 */
function applyConsumableEffects(player, item) {
    let buffMessage = '';

    if (item.restoresHp) {
        const computed = getComputedStats(player, player.laws || [], player.manuals || []);
        const maxHp = computed.maxHp;
        player.currentHp = Math.min(maxHp, (player.currentHp || 0) + item.restoresHp);
        buffMessage += ` Memulihkan ${item.restoresHp} HP.`;
    }
    if (item.restoresStamina) {
        player.currentStamina = Math.min(player.maxStamina || 100, (player.currentStamina || 0) + item.restoresStamina);
        buffMessage += ` Memulihkan ${item.restoresStamina} Stamina.`;
    }
    if (item.restoresVitality) {
        player.extendedStats.vitality = Math.min(100, (player.extendedStats.vitality || 0) + item.restoresVitality);
        player.markModified('extendedStats');
        buffMessage += ` Memulihkan ${item.restoresVitality} Vitalitas.`;
    }
    if (item.restoresMood) {
        applyMoodDelta(player, item.restoresMood, { itemKey: item.key });
        buffMessage += ` Meningkatkan ${item.restoresMood} Mood.`;
    }

    return buffMessage;
}

module.exports = {
    applyConsumableEffects
};
