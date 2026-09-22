const { VITALITY_LOSS_ON_DEATH, VITALITY_LOSS_ON_HEAVY_HIT } = require('../config/fivePillars');

function applyVitalityLossOnDeath(player) {
    if (!player.extendedStats) player.extendedStats = {};
    const maxV = player.extendedStats.maxVitality || 100;
    let v = player.extendedStats.vitality != null ? player.extendedStats.vitality : maxV;
    v = Math.max(0, v - VITALITY_LOSS_ON_DEATH);
    player.extendedStats.vitality = v;
    player.markModified('extendedStats');
}

module.exports = {
    applyVitalityLossOnDeath
};
