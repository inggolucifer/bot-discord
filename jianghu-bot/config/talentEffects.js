const TALENT_EFFECTS = {
    str: { atk: 5, def: 5 },
    agi: { spd: 5 },
    sta: { maxHp: 25 },
    pow: { maxMp: 25 },
    int: { expMultiplier: 0.05 }, // Example placeholder for INT, although requirement says "INT: kalikan gain practice/combat skill (multiplier di config)."
    mor: {} // Gateway logic
};

module.exports = {
    TALENT_EFFECTS
};
