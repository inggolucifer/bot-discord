const staminaConfig = require('../config/stamina');

function getMaxStamina(player) {
    const sta = player.talents?.sta || 0;
    return staminaConfig.BASE_MAX_STAMINA + (sta * staminaConfig.STA_STAMINA_PER_POINT);
}

function clampStamina(player) {
    const calculatedMax = getMaxStamina(player);
    const maxS = Math.max(1, Number(player.maxStamina) || calculatedMax);
    player.maxStamina = maxS;

    let cur = player.currentStamina;
    if (cur == null || Number.isNaN(Number(cur))) cur = maxS;

    cur = Math.min(Math.max(0, Number(cur)), maxS);
    player.currentStamina = cur;
    return { current: cur, max: maxS };
}

function getCurrentStamina(player) {
    return clampStamina(player).current;
}

function applyTravelDrain(player, travelDoc, now) {
    if (!now) now = new Date();

    if (!travelDoc.staminaLastAppliedAt) {
        travelDoc.staminaLastAppliedAt = travelDoc.startTime;
    }

    if (travelDoc.status !== 'traveling') {
         return;
    }

    const lastApplied = travelDoc.staminaLastAppliedAt.getTime();
    const currentTime = travelDoc.status === 'traveling' ? Math.min(now.getTime(), travelDoc.arrivalTime.getTime()) : now.getTime();

    if (currentTime <= lastApplied) return;

    let hours = (currentTime - lastApplied) / 3600000;

    const staminaLoss = hours * staminaConfig.STAMINA_DRAIN_PER_TRAVEL_HOUR;

    let currStamina = getCurrentStamina(player);
    currStamina -= staminaLoss;

    if (currStamina <= 0) {
        const extraHours = Math.abs(currStamina) / staminaConfig.STAMINA_DRAIN_PER_TRAVEL_HOUR;
        currStamina = 0;

        if (player.currentHp !== null && player.currentHp !== undefined) {
            const hpLoss = extraHours * staminaConfig.HP_DRAIN_PER_TRAVEL_HOUR_WHEN_STAMINA_ZERO;
            player.currentHp = Math.max(1, Math.floor(player.currentHp - hpLoss));
        }

        if (!travelDoc.exhausted) {
             travelDoc.exhausted = true;
        }
    }

    player.currentStamina = currStamina;
    travelDoc.staminaLastAppliedAt = new Date(currentTime);
}

module.exports = {
    getMaxStamina,
    getCurrentStamina,
    applyTravelDrain,
    clampStamina
};
