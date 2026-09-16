/**
 * thermodynamicsEngine.js
 * Modul Termodinamika Lingkungan & Fisiologi Karakter Jianghu
 * Mengacu pada blueprint Amazing Cultivation Simulator & Tale of Immortal
 */

const REALM_THERMAL_TOLERANCES = {
    mortal: {
        realmIndex: 1,
        name: 'Fana (Mortal)',
        minTemp: 10,
        maxTemp: 38,
        coldEffect: 'Hipotermia: Kecepatan -50%, kehilangan HP bertahap',
        heatEffect: 'Heatstroke: Stamina terkuras, kehilangan HP bertahap'
    },
    qi_condensation: {
        realmIndex: 2,
        name: 'Kondensasi Qi (Qi Condensation)',
        minTemp: -5,
        maxTemp: 55,
        coldEffect: 'Stagnasi Qi: Regenerasi energi terhenti, biaya jurus +100%',
        heatEffect: 'Gejolak Yang: Sirkulasi Qi bergolak, akurasi -25%'
    },
    foundation: {
        realmIndex: 3,
        name: 'Pondasi Dasar (Foundation Establishment)',
        minTemp: -25,
        maxTemp: 85,
        coldEffect: 'Pembekuan Meridian: Efisiensi pertahanan fisik -30%',
        heatEffect: 'Pendidihan Darah: Cadangan Qi terkuras, pertahanan batin melemah'
    },
    core_formation: {
        realmIndex: 4,
        name: 'Inti Emas (Core Formation)',
        minTemp: -60,
        maxTemp: 130,
        coldEffect: 'Extreme Yin Chill: Rentan terhadap racun dingin esoterik',
        heatEffect: 'True Solar Fire: Rentan terhadap anomali api matahari murni'
    },
    nascent_soul: {
        realmIndex: 5,
        name: 'Jiwa Baru Lahir+ (Nascent Soul+)',
        minTemp: -150,
        maxTemp: 300,
        coldEffect: 'Hawa Dingin Primordial: Hanya suhu kehampaan yang dapat menembus',
        heatEffect: 'Penyerapan Termal: Mampu mengonversi anomali panas menjadi Qi murni'
    }
};

/**
 * Menghitung suhu lingkungan efektif pada suatu grid (T_env)
 */
function calculateGridTemperature({
    baseTemperature = 20,
    season = 'spring', // spring, summer, autumn, winter
    hourOfDay = 12, // 0 - 23
    weather = 'clear', // clear, rain, blizzard, volcanic_ash, miasma_fog
    spiritualVeinTier = 0 // urat spiritual (0 = netral, positif = hawa murni, dll)
}) {
    // 1. Modifikasi Musim
    const seasonDeltas = {
        spring: 0,
        summer: 12,
        autumn: -4,
        winter: -18
    };
    const deltaSeason = seasonDeltas[season] || 0;

    // 2. Modifikasi Siklus Diurnal (Jam Harian: Puncak dingin jam 04, puncak panas jam 13)
    // Gelombang sinus diurnal
    const diurnalAngle = ((hourOfDay - 9) / 24) * 2 * Math.PI;
    const deltaDiurnal = Math.round(Math.sin(diurnalAngle) * 7);

    // 3. Modifikasi Cuaca
    const weatherDeltas = {
        clear: 0,
        rain: -3,
        blizzard: -16,
        volcanic_ash: 18,
        miasma_fog: 2,
        heatwave: 14
    };
    const deltaWeather = weatherDeltas[weather] || 0;

    // 4. Modifikasi Urat Spiritual (spiritual vein)
    const deltaVein = spiritualVeinTier * 2;

    const tEnv = baseTemperature + deltaSeason + deltaDiurnal + deltaWeather + deltaVein;
    return Math.round(tEnv);
}

/**
 * Mengidentifikasi ranah kultivator berdasarkan nama atau indeks
 */
function resolveRealmTolerance(realmIdentifier) {
    if (!realmIdentifier) return REALM_THERMAL_TOLERANCES.mortal;
    const lower = String(realmIdentifier).toLowerCase();

    if (lower.includes('nascent') || lower.includes('jiwa baru') || lower.includes('soul') || lower.includes('deity')) {
        return REALM_THERMAL_TOLERANCES.nascent_soul;
    }
    if (lower.includes('core') || lower.includes('inti emas') || lower.includes('golden')) {
        return REALM_THERMAL_TOLERANCES.core_formation;
    }
    if (lower.includes('foundation') || lower.includes('pondasi dasar') || lower.includes('fondasi')) {
        return REALM_THERMAL_TOLERANCES.foundation;
    }
    if (lower.includes('qi') || lower.includes('kondensasi')) {
        return REALM_THERMAL_TOLERANCES.qi_condensation;
    }
    return REALM_THERMAL_TOLERANCES.mortal;
}

/**
 * Mengevaluasi dampak suhu terhadap kondisi fisiologis kultivator
 * HP_loss = floor( HP_max * (delta_breach / 100)^1.3 * (1 - R_thermal) ) + 1
 */
function evaluateThermalBreach({
    envTemperature = 22,
    cultivationRealm = 'mortal',
    hpMax = 100,
    thermalResistanceRatio = 0.0, // 0.0 s/d 0.8 dari jubah pelindung / pil penstabil suhu
    consecutiveBreachTicks = 0
}) {
    const realmData = resolveRealmTolerance(cultivationRealm);
    const { minTemp, maxTemp } = realmData;

    let deltaBreach = 0;
    let breachType = null; // 'cold' | 'heat' | null

    if (envTemperature < minTemp) {
        deltaBreach = minTemp - envTemperature;
        breachType = 'cold';
    } else if (envTemperature > maxTemp) {
        deltaBreach = envTemperature - maxTemp;
        breachType = 'heat';
    }

    if (deltaBreach <= 0) {
        return {
            inComfortZone: true,
            breachType: null,
            deltaBreach: 0,
            hpLoss: 0,
            activeCondition: null,
            consecutiveBreachTicks: 0,
            hasMeridianDamage: false,
            realmLimits: { minTemp, maxTemp }
        };
    }

    // Hitung damage HP
    const safeThermalRes = Math.min(0.85, Math.max(0, thermalResistanceRatio));
    const powerScale = Math.pow(deltaBreach / 100, 1.3);
    const rawDamage = hpMax * powerScale * (1 - safeThermalRes);
    const hpLoss = Math.max(1, Math.floor(rawDamage) + 1);

    const newBreachTicks = consecutiveBreachTicks + 1;
    // Jika terpapar > 10 tick berurutan (30 detik), menderita Kerusakan Meridian permanen
    const triggeredMeridianDamage = newBreachTicks >= 10;

    const conditionName = breachType === 'cold' ? realmData.coldEffect : realmData.heatEffect;

    return {
        inComfortZone: false,
        breachType,
        deltaBreach,
        hpLoss,
        activeCondition: conditionName,
        consecutiveBreachTicks: newBreachTicks,
        hasMeridianDamage: triggeredMeridianDamage,
        realmLimits: { minTemp, maxTemp }
    };
}

module.exports = {
    REALM_THERMAL_TOLERANCES,
    calculateGridTemperature,
    resolveRealmTolerance,
    evaluateThermalBreach
};
