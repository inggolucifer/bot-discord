const POINTS_PER_LEVEL = 3;

/**
 * Calculates the required EXP for the next level.
 * Simple formula: level * 100 + (level^2 * 50)
 */
function getRequiredExpForLevel(level) {
    return Math.floor(level * 100 + Math.pow(level, 2) * 50);
}

/**
 * Calculates the maximum character level based on the realm index.
 * Formula: 20 + (20 * realmIndex)
 */
function getLevelCap(realmIndex) {
    return 20 + (20 * (Number(realmIndex) || 0));
}

module.exports = {
    POINTS_PER_LEVEL,
    getRequiredExpForLevel,
    getLevelCap
};
