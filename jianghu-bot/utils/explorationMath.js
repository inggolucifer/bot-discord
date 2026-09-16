/**
 * explorationMath.js
 * Modul Authoritative Server untuk Kalkulasi Spasial, Stamina, Tunggangan, dan Ambush
 * Sesuai Cetak Biru Game Online Jianghu Terdistribusi
 */

const TERRAIN_PROPERTIES = {
    plains: {
        id: 'plains',
        name: 'Dataran Rumput',
        baseEnergyCost: 2,
        ambushRate: 0.05,
        terrainMultiplier: 1.0,
        isSolid: false,
        baseTemperature: 22,
        spiritualDensity: 12,
        travelSpeedMs: 1200
    },
    forest: {
        id: 'forest',
        name: 'Hutan Kuno',
        baseEnergyCost: 5,
        ambushRate: 0.25,
        terrainMultiplier: 1.3,
        isSolid: false,
        baseTemperature: 18,
        spiritualDensity: 25,
        travelSpeedMs: 1500
    },
    mountain: {
        id: 'mountain',
        name: 'Tebing Batu',
        baseEnergyCost: 9999,
        ambushRate: 0.0,
        terrainMultiplier: 3.0,
        isSolid: true,
        baseTemperature: 8,
        spiritualDensity: 30,
        travelSpeedMs: 9999
    },
    swamp: {
        id: 'swamp',
        name: 'Rawa Miasma',
        baseEnergyCost: 8,
        ambushRate: 0.35,
        terrainMultiplier: 1.6,
        isSolid: false,
        baseTemperature: 26,
        spiritualDensity: 18,
        travelSpeedMs: 1800
    },
    glacial: {
        id: 'glacial',
        name: 'Plato Es',
        baseEnergyCost: 6,
        ambushRate: 0.15,
        terrainMultiplier: 1.2,
        isSolid: false,
        baseTemperature: -18,
        spiritualDensity: 28,
        travelSpeedMs: 1400
    },
    volcanic: {
        id: 'volcanic',
        name: 'Kawah Vulkanik',
        baseEnergyCost: 7,
        ambushRate: 0.20,
        terrainMultiplier: 1.4,
        isSolid: false,
        baseTemperature: 52,
        spiritualDensity: 35,
        travelSpeedMs: 1600
    },
    settlement: {
        id: 'settlement',
        name: 'Pemukiman',
        baseEnergyCost: 1,
        ambushRate: 0.0,
        terrainMultiplier: 1.0,
        isSolid: false,
        baseTemperature: 22,
        spiritualDensity: 15,
        travelSpeedMs: 900
    },
    sect: {
        id: 'sect',
        name: 'Kawasan Sekte',
        baseEnergyCost: 1,
        ambushRate: 0.0,
        terrainMultiplier: 1.0,
        isSolid: false,
        baseTemperature: 20,
        spiritualDensity: 40,
        travelSpeedMs: 1000
    },
    claimable: {
        id: 'claimable',
        name: 'Plot Bebas',
        baseEnergyCost: 2,
        ambushRate: 0.02,
        terrainMultiplier: 1.0,
        isSolid: false,
        baseTemperature: 21,
        spiritualDensity: 20,
        travelSpeedMs: 1100
    }
};

const MOUNT_CONFIGS = {
    ferghana_horse: {
        name: 'Kuda Ferghana',
        staminaReduction: 1,
        travelSpeedMs: 700,
        stealthBonus: 0.05,
        canCrossSolid: false
    },
    spirit_horned_horse: {
        name: 'Kuda Roh Bertanduk',
        staminaReduction: 2,
        travelSpeedMs: 550,
        stealthBonus: 0.10,
        canCrossSolid: false
    },
    shadow_tiger: {
        name: 'Macan Bayangan',
        staminaReduction: 3,
        travelSpeedMs: 450,
        stealthBonus: 0.35,
        canCrossSolid: false
    },
    flying_sword: {
        name: 'Pedang Terbang Spiritual',
        staminaReduction: 4,
        travelSpeedMs: 400,
        stealthBonus: 0.20,
        canCrossSolid: true
    }
};

/**
 * Menghitung konsumsi stamina total untuk melangkah ke tile tujuan
 * C_total = max(1, floor( (C_b * M_terrain * (1 + W_current/W_max) - R_mount) * (1 - B_physique) ))
 */
function calculateEnergyCost({
    terrainType = 'plains',
    currentWeight = 10,
    maxWeight = 50,
    mountType = null,
    bodyTemperingLevel = 0
}) {
    const terrain = TERRAIN_PROPERTIES[terrainType] || TERRAIN_PROPERTIES.plains;
    const C_b = terrain.baseEnergyCost;
    const M_terrain = terrain.terrainMultiplier;

    // Weight ratio: jika over encumbered (currentWeight > maxWeight), rasio > 1
    const safeMaxWeight = Math.max(1, maxWeight);
    const weightRatio = Math.max(0, currentWeight / safeMaxWeight);

    // Mount reduction
    const mount = mountType && MOUNT_CONFIGS[mountType] ? MOUNT_CONFIGS[mountType] : null;
    const R_mount = mount ? mount.staminaReduction : 0;

    // Body Tempering (Ranah Pemurnian Jasmani: tiap level mengurangi 2% stamina cost, max 30%)
    const B_physique = Math.min(0.30, Math.max(0, bodyTemperingLevel * 0.02));

    const rawCost = (C_b * M_terrain * (1 + weightRatio) - R_mount) * (1 - B_physique);
    return Math.max(1, Math.floor(rawCost));
}

/**
 * Menghitung durasi perjalanan per tile (dalam ms)
 */
function calculateTravelSpeed({
    terrainType = 'plains',
    mountType = null
}) {
    const terrain = TERRAIN_PROPERTIES[terrainType] || TERRAIN_PROPERTIES.plains;
    const mount = mountType && MOUNT_CONFIGS[mountType] ? MOUNT_CONFIGS[mountType] : null;

    if (mount) {
        return mount.travelSpeedMs;
    }
    return terrain.travelSpeedMs;
}

/**
 * Mengecek apakah koordinat tujuan terhalang rintangan mutlak
 */
function isTileObstructed({
    terrainType = 'plains',
    mountType = null
}) {
    const terrain = TERRAIN_PROPERTIES[terrainType] || TERRAIN_PROPERTIES.plains;
    const mount = mountType && MOUNT_CONFIGS[mountType] ? MOUNT_CONFIGS[mountType] : null;

    if (terrain.isSolid) {
        // Artefak pedang terbang tingkat tinggi dapat melintasi tebing
        if (mount && mount.canCrossSolid) {
            return false;
        }
        return true;
    }
    return false;
}

/**
 * Menghitung probabilitas ambush aktual
 * P_actual = P_a * (1 - S_stealth) * M_weather * M_danger
 */
function evaluateAmbush({
    terrainType = 'plains',
    stealthRating = 0, // 0.0 s/d 1.0 (dari Qinggong)
    mountType = null,
    weatherMultiplier = 1.0, // kabut tebal = 1.4, cerah = 1.0
    dangerLevel = 1.0 // indeks bahaya zona
}) {
    const terrain = TERRAIN_PROPERTIES[terrainType] || TERRAIN_PROPERTIES.plains;
    const P_a = terrain.ambushRate;

    const mount = mountType && MOUNT_CONFIGS[mountType] ? MOUNT_CONFIGS[mountType] : null;
    const mountStealth = mount ? mount.stealthBonus : 0;

    const totalStealth = Math.min(0.85, Math.max(0, stealthRating + mountStealth));
    const P_actual = P_a * (1 - totalStealth) * weatherMultiplier * dangerLevel;

    const roll = Math.random();
    return {
        triggered: roll < P_actual,
        actualProbability: Math.min(1.0, P_actual),
        roll
    };
}

module.exports = {
    TERRAIN_PROPERTIES,
    MOUNT_CONFIGS,
    calculateEnergyCost,
    calculateTravelSpeed,
    isTileObstructed,
    evaluateAmbush
};
