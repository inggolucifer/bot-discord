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
    },
    azure_mountain: {
        id: 'azure_mountain',
        name: 'Dinding Tebing Azure',
        baseEnergyCost: 9999,
        ambushRate: 0.0,
        terrainMultiplier: 3.0,
        isSolid: true,
        baseTemperature: 5,
        spiritualDensity: 35,
        travelSpeedMs: 9999
    },
    ocean: {
        id: 'ocean',
        name: 'Samudra Lepas',
        baseEnergyCost: 9999,
        ambushRate: 0.15,
        terrainMultiplier: 2.0,
        isSolid: true,
        baseTemperature: 20,
        spiritualDensity: 20,
        travelSpeedMs: 9999
    },
    river: {
        id: 'river',
        name: 'Aliran Sungai',
        baseEnergyCost: 4,
        ambushRate: 0.08,
        terrainMultiplier: 1.2,
        isSolid: false,
        baseTemperature: 20,
        spiritualDensity: 18,
        travelSpeedMs: 1400
    },
    bamboo_forest: {
        id: 'bamboo_forest',
        name: 'Hutan Bambu Roh',
        baseEnergyCost: 4,
        ambushRate: 0.18,
        terrainMultiplier: 1.2,
        isSolid: false,
        baseTemperature: 19,
        spiritualDensity: 22,
        travelSpeedMs: 1300
    },
    northern_glacial: {
        id: 'northern_glacial',
        name: 'Tundra Gletser Utara',
        baseEnergyCost: 6,
        ambushRate: 0.20,
        terrainMultiplier: 1.3,
        isSolid: false,
        baseTemperature: -20,
        spiritualDensity: 30,
        travelSpeedMs: 1500
    },
    demonic_swamp: {
        id: 'demonic_swamp',
        name: 'Rawa Iblis',
        baseEnergyCost: 7,
        ambushRate: 0.32,
        terrainMultiplier: 1.5,
        isSolid: false,
        baseTemperature: 28,
        spiritualDensity: 25,
        travelSpeedMs: 1700
    },
    venom_mire: {
        id: 'venom_mire',
        name: 'Rawa Racun Miasma',
        baseEnergyCost: 8,
        ambushRate: 0.35,
        terrainMultiplier: 1.6,
        isSolid: false,
        baseTemperature: 30,
        spiritualDensity: 24,
        travelSpeedMs: 1800
    },
    western_desert: {
        id: 'western_desert',
        name: 'Gurun Pasir Suci',
        baseEnergyCost: 5,
        ambushRate: 0.22,
        terrainMultiplier: 1.3,
        isSolid: false,
        baseTemperature: 42,
        spiritualDensity: 14,
        travelSpeedMs: 1500
    },
    mountain_pass: {
        id: 'mountain_pass',
        name: 'Celah Gerbang Gunung',
        baseEnergyCost: 3,
        ambushRate: 0.05,
        terrainMultiplier: 1.0,
        isSolid: false,
        baseTemperature: 16,
        spiritualDensity: 28,
        travelSpeedMs: 1100
    },
    sword_gorge_pass: {
        id: 'sword_gorge_pass',
        name: 'Celah Pedang Terbelah',
        baseEnergyCost: 3,
        ambushRate: 0.08,
        terrainMultiplier: 1.1,
        isSolid: false,
        baseTemperature: 14,
        spiritualDensity: 40,
        travelSpeedMs: 1100
    },
    island_reef: {
        id: 'island_reef',
        name: 'Gugusan Karang Roh',
        baseEnergyCost: 4,
        ambushRate: 0.12,
        terrainMultiplier: 1.2,
        isSolid: false,
        baseTemperature: 22,
        spiritualDensity: 26,
        travelSpeedMs: 1300
    },
    road: {
        id: 'road',
        name: 'Jalan Raya Resmi',
        baseEnergyCost: 1,
        ambushRate: 0.0,
        terrainMultiplier: 0.8,
        isSolid: false,
        baseTemperature: 22,
        spiritualDensity: 12,
        travelSpeedMs: 800
    }
};

const MOUNT_CONFIGS = {
    wooden_boat: {
        name: 'Perahu Kayu',
        staminaReduction: 1,
        travelSpeedMs: 850,
        stealthBonus: 0.0,
        canCrossWater: true,
        canCrossSolid: false
    },
    ship: {
        name: 'Kapal Layar Cepat',
        staminaReduction: 2,
        travelSpeedMs: 650,
        stealthBonus: 0.05,
        canCrossWater: true,
        canCrossSolid: false
    },
    ferghana_horse: {
        name: 'Kuda Ferghana',
        staminaReduction: 1,
        travelSpeedMs: 700,
        stealthBonus: 0.05,
        canCrossWater: false,
        canCrossSolid: false
    },
    spirit_horned_horse: {
        name: 'Kuda Roh Bertanduk',
        staminaReduction: 2,
        travelSpeedMs: 550,
        stealthBonus: 0.10,
        canCrossWater: false,
        canCrossSolid: false
    },
    shadow_tiger: {
        name: 'Macan Bayangan',
        staminaReduction: 3,
        travelSpeedMs: 450,
        stealthBonus: 0.35,
        canCrossWater: false,
        canCrossSolid: false
    },
    flying_sword: {
        name: 'Pedang Terbang Spiritual',
        staminaReduction: 4,
        travelSpeedMs: 400,
        stealthBonus: 0.20,
        canCrossWater: true,
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
    staminaReduction = 0,
    bodyTemperingLevel = 0
}) {
    const terrain = TERRAIN_PROPERTIES[terrainType] || TERRAIN_PROPERTIES.plains;
    const C_b = terrain.baseEnergyCost;
    const M_terrain = terrain.terrainMultiplier;

    // Weight ratio: jika over encumbered (currentWeight > maxWeight), rasio > 1
    const safeMaxWeight = Math.max(1, maxWeight);
    const weightRatio = Math.max(0, currentWeight / safeMaxWeight);

    // Mount reduction: mendukung staminaReduction langsung dari Item mount atau konfigurasi preset
    const mount = mountType && MOUNT_CONFIGS[mountType] ? MOUNT_CONFIGS[mountType] : null;
    const R_mount = Number(staminaReduction) > 0 ? Number(staminaReduction) : (mount ? mount.staminaReduction : 0);

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
    mountType = null,
    isSolid = false
}) {
    const terrain = TERRAIN_PROPERTIES[terrainType] || TERRAIN_PROPERTIES.plains;
    const mount = mountType && MOUNT_CONFIGS[mountType] ? MOUNT_CONFIGS[mountType] : null;

    if (terrainType === 'ocean' || terrainType === 'water') {
        if (mount && (mount.canCrossWater || mount.canCrossSolid)) {
            return false;
        }
        return true;
    }

    if (terrain.isSolid || isSolid) {
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
    dangerLevel = 1.0, // indeks bahaya zona
    infamy = 0 // Reputasi jahat/buronan iblis (meningkatkan peluang disergap)
}) {
    const terrain = TERRAIN_PROPERTIES[terrainType] || TERRAIN_PROPERTIES.plains;
    const P_a = terrain.ambushRate;

    const mount = mountType && MOUNT_CONFIGS[mountType] ? MOUNT_CONFIGS[mountType] : null;
    const mountStealth = mount ? mount.stealthBonus : 0;

    const totalStealth = Math.min(0.85, Math.max(0, stealthRating + mountStealth));
    const infamyBonus = Math.min(0.40, Math.max(0, (infamy || 0) * 0.005));
    const P_actual = (P_a * (1 - totalStealth) * weatherMultiplier * dangerLevel) + infamyBonus;

    const roll = Math.random();
    return {
        triggered: roll < P_actual,
        actualProbability: Math.min(1.0, Math.max(0, P_actual)),
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
