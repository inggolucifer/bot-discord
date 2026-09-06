/**
 * Utility for managing player's stamina/energy system.
 */

const MAX_ENERGY = 100;
const ENERGY_PER_HOUR = 10;
const MS_PER_HOUR = 60 * 60 * 1000;

function calculateEnergy(player) {
    if (!player.energy) {
        player.energy = { current: MAX_ENERGY, lastUpdated: new Date() };
        return MAX_ENERGY;
    }

    const now = Date.now();
    const lastUpdate = player.energy.lastUpdated ? player.energy.lastUpdated.getTime() : now;

    if (player.energy.current >= MAX_ENERGY) {
        // Just keep it at max, don't update time to avoid creeping
        return MAX_ENERGY;
    }

    const elapsedMs = now - lastUpdate;
    const hoursElapsed = Math.floor(elapsedMs / MS_PER_HOUR);

    if (hoursElapsed > 0) {
        let energyRegenRate = ENERGY_PER_HOUR;
        // Check for active energy_regen buff
        if (player.activeBuffs && player.activeBuffs.length > 0) {
            const nowTime = new Date();
            const regenBuff = player.activeBuffs.find(b => b.buffType === 'energy_regen' && b.expiresAt > nowTime);
            if (regenBuff) {
                energyRegenRate += regenBuff.value;
            }
        }

        const energyGained = hoursElapsed * energyRegenRate;
        let newEnergy = player.energy.current + energyGained;

        if (newEnergy >= MAX_ENERGY) {
            newEnergy = MAX_ENERGY;
            player.energy.lastUpdated = new Date(); // Reset to now if maxed
        } else {
            // Only advance the time by the exact number of hours gained
            // to preserve sub-hour progress
            player.energy.lastUpdated = new Date(lastUpdate + (hoursElapsed * MS_PER_HOUR));
        }

        player.energy.current = newEnergy;
    }

    return player.energy.current;
}

module.exports = {
    calculateEnergy,
    MAX_ENERGY
};
