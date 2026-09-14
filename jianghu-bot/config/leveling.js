const POINTS_PER_LEVEL = 3;

/**
 * Calculates the required EXP for the next level.
 * Simple formula: level * 100 + (level^2 * 50)
 */
function getRequiredExpForLevel(level) {
    return Math.floor(level * 100 + Math.pow(level, 2) * 50);
}

module.exports = {
    POINTS_PER_LEVEL,
    getRequiredExpForLevel
};
