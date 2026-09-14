module.exports = {
    POISON_DOT_BASE: 0.05, // e.g., 5% of max HP per severity
    INJURY_THRESHOLD_PERCENT: 0.15, // Hit big enough to cause injury
    INJURY_MAX_MP_REDUCTION_PERCENT: 0.02,
    INJURY_ATK_DEF_REDUCTION_PERCENT: 0.03,
    BLEED_DOT_BASE: 0.03, // Base bleed damage percentage
    BLEED_REDUCTION_PER_TURN: 0.5, // Severity drops by 0.5 each turn
    INTOX_MISS_RATE_PER_SEVERITY: 0.1, // 10% more miss per severity
    INTOX_REDUCTION_PER_TURN: 1, // Reduces severity each turn
    STEAL_BASE_CHANCE: 0.3,
    STEAL_PER_SKILL: 0.05,
    INJURY_REDUCTION_PER_TURN: 0.25,
    INTOX_WINE_ART_MULTIPLIER: 1.2, // +20% damage for wineArt if toxed
    PSYCHOSIS_MISS_OR_SELF_HIT_CHANCE: 0.2, // 20% chance to miss or hit self in 1v1
    BURN_DOT_BASE: 0.04,
    BURN_RAMP_PER_TURN: 0.01,
    BURN_INCINERATED_THRESHOLD: 5,
    HEALING_REDUCTION_INCINERATED: 0.5 // Healing is 50% less effective
};
