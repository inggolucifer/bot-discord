const CustomError = require('../web-api/utils/CustomError');
const { MOOD_ITEM_DECAY, MOOD_WINDOW_HOURS } = require('../config/fivePillars');

/**
 * Asserts if a player has enough mood for an action.
 * @param {Object} player - The Mongoose player document
 * @param {Number} cost - The mood cost required
 * @returns {Boolean} true if valid, throws Error if not
 */
function assertMood(player, cost) {
    if (!player.extendedStats) player.extendedStats = {};
    const currentMood = player.extendedStats.mood !== undefined ? player.extendedStats.mood : 100;
    if (currentMood < cost) {
        throw new CustomError('Mood tidak cukup.', 403);
    }
    return true;
}

/**
 * Applies a mood delta to the player. Handles diminishing returns for consumables.
 * @param {Object} player - The Mongoose player document
 * @param {Number} delta - The amount of mood to add (can be negative for costs)
 * @param {Object} options - { itemKey: string }
 */
function applyMoodDelta(player, delta, options = {}) {
    if (!player.extendedStats) player.extendedStats = {};
    let currentMood = player.extendedStats.mood !== undefined ? player.extendedStats.mood : 100;

    if (delta > 0 && options.itemKey) {
        if (!player.extendedStats.moodConsumables) player.extendedStats.moodConsumables = [];

        let consumeRecord = player.extendedStats.moodConsumables.find(c => c.itemKey === options.itemKey);
        const now = new Date();

        if (!consumeRecord) {
            consumeRecord = { itemKey: options.itemKey, windowStartedAt: now, consumeCount: 0 };
            player.extendedStats.moodConsumables.push(consumeRecord);
        } else {
            // Check if 72 hours have passed
            const hoursPassed = (now.getTime() - new Date(consumeRecord.windowStartedAt).getTime()) / (1000 * 60 * 60);
            if (hoursPassed >= MOOD_WINDOW_HOURS) {
                consumeRecord.windowStartedAt = now;
                consumeRecord.consumeCount = 0;
            }
        }

        // Calculate decay
        const n = consumeRecord.consumeCount;
        let actualGain = Math.floor(delta * Math.pow(MOOD_ITEM_DECAY, n));
        actualGain = Math.max(1, actualGain); // Minimum 1 unless base delta was 0

        delta = actualGain;
        consumeRecord.consumeCount += 1;
    }

    currentMood += delta;
    currentMood = Math.min(Math.max(0, currentMood), 100);
    player.extendedStats.mood = currentMood;
}

module.exports = {
    assertMood,
    applyMoodDelta
};
