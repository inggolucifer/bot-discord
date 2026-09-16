/**
 * utils/kungfuMastery.js
 * Modul sentral perhitungan Penguasaan Kungfu (Kungfu Mastery)
 * Menangani kurva XP jangka panjang, efisiensi senjata/alat, syarat equipment, dan anti-eksploitasi.
 */

const KUNGFU_SKILLS = {
    sword: {
        id: 'sword',
        name: 'Pedang (Sword)',
        category: 'weapon',
        icon: '🗡️',
        description: 'Kemahiran menggunakan pedang tajam dalam pertempuran.',
        trainHint: 'Gunakan pedang dalam pertempuran atau latihan tanding di sasana.'
    },
    saber: {
        id: 'saber',
        name: 'Golok (Saber)',
        category: 'weapon',
        icon: '⚔️',
        description: 'Kemahiran menggunakan golok atau pedang lengkung berdaya tebas tinggi.',
        trainHint: 'Gunakan golok dalam pertempuran atau latihan tanding di sasana.'
    },
    staff: {
        id: 'staff',
        name: 'Tongkat & Tombak (Staff)',
        category: 'weapon',
        icon: '🥢',
        description: 'Kemahiran menggunakan senjata bertangkai panjang seperti tombak, tongkat, dan gada.',
        trainHint: 'Gunakan tongkat atau tombak dalam pertempuran atau latihan tanding.'
    },
    fist: {
        id: 'fist',
        name: 'Tinju Tangan Kosong (Fist)',
        category: 'weapon',
        icon: '👊',
        description: 'Kemahiran bertarung tanpa senjata atau menggunakan sarung tangan beladiri.',
        trainHint: 'Bertarunglah tanpa memakai senjata (tangan kosong) dalam pertempuran.'
    },
    finger: {
        id: 'finger',
        name: 'Totokan Jari (Finger)',
        category: 'unarmed',
        icon: '👆',
        description: 'Kemahiran totokan meridian jari yang menusuk titik saraf lawan.',
        trainHint: 'Gunakan jurus manual bertipe Finger dalam pertempuran.'
    },
    hiddenWeapon: {
        id: 'hiddenWeapon',
        name: 'Senjata Rahasia (Hidden Weapon)',
        category: 'weapon',
        icon: '🎯',
        description: 'Kemahiran melempar jarum beracun, belati terbang, dan senjata rahasia.',
        trainHint: 'Gunakan senjata rahasia atau panah lempar dalam pertempuran.'
    },
    forging: {
        id: 'forging',
        name: 'Penempaan (Forging)',
        category: 'profession',
        icon: '🔨',
        description: 'Kemahiran mengolah logam, menjaga keawetan alat tempa, dan meracik senjata legendaris.',
        trainHint: 'Lakukan penempaan dan peleburan logam di tungku tempa.'
    },
    stealing: {
        id: 'stealing',
        name: 'Pencurian & Tipu Muslihat (Stealing)',
        category: 'subterfuge',
        icon: '🕵️',
        description: 'Kemahiran menyelinap, mencuri kantong harta musuh, dan membaca kelengahan.',
        trainHint: 'Lakukan aksi mencuri pada musuh yang lengah dalam pertempuran atau eksplorasi.'
    },
    qimen: {
        id: 'qimen',
        name: 'Qimen Dunjia (Formasi)',
        category: 'special',
        icon: '🔮',
        description: 'Pemahaman formasi gaib, penataan energi bumi, dan taktik medan.',
        trainHint: 'Pelajari manual formasi dan eksplorasi situs-situs kuno.'
    },
    melody: {
        id: 'melody',
        name: 'Seni Musik (Melody)',
        category: 'special',
        icon: '🎵',
        description: 'Penguasaan melodi guqin dan suling spiritual yang mengguncang batin.',
        trainHint: 'Mainkan instrumen musik dan gunakan jurus berbasis suara.'
    },
    healing: {
        id: 'healing',
        name: 'Pengobatan (Healing)',
        category: 'special',
        icon: '🌿',
        description: 'Pengetahuan meridian, akupunktur, dan pemulihan luka dalam.',
        trainHint: 'Pulihkan diri sendiri atau sekutu dengan teknik penyembuhan.'
    },
    wineArt: {
        id: 'wineArt',
        name: 'Seni Arak (Wine Art)',
        category: 'special',
        icon: '🍶',
        description: 'Teknik mabuk mabuk dewa dan peningkatan kekuatan saat meneguk arak spiritual.',
        trainHint: 'Gunakan jurus jurus arak dewa saat kondisi mabuk (intox).'
    },
    special: {
        id: 'special',
        name: 'Keahlian Khusus (Special)',
        category: 'special',
        icon: '✨',
        description: 'Kemahiran jurus-jurus eksotis di luar kategori umum.',
        trainHint: 'Kembangkan jurus-jurus langka di dunia persilatan.'
    },
    core: {
        id: 'core',
        name: 'Fondasi Inti (Core)',
        category: 'cultivation',
        icon: '🧘',
        description: 'Kekuatan pondasi meridian inti dan daya tahan energi batin.',
        trainHint: 'Meningkat seiring pematangan meridian dan pertarungan sengit.'
    }
};

const MAX_KUNGFU_LEVEL = 250;

/**
 * Formula XP kumulatif untuk mencapai Level L (Level 0 hingga 250).
 * Menggunakan kurva eksponensial jangka panjang: 14 * (L^2.25) + 35 * L
 * Level 10: ~2.8k XP | Level 30: ~30k XP | Level 50: ~95k XP | Level 100: ~446k XP
 * Level 150: ~1.1M XP | Level 200: ~2.1M XP | Level 250: ~3.5M XP (Tahun-tahun grinding konsisten)
 */
function getXpRequiredForLevel(level) {
    if (level <= 0) return 0;
    return Math.floor(14 * Math.pow(level, 2.25) + (35 * level));
}

/**
 * Mendapatkan detail tingkat kemahiran berdasarkan total XP akumulasi.
 */
function getKungfuLevel(rawExp = 0) {
    const exp = Math.max(0, Math.floor(Number(rawExp) || 0));

    let level = 0;
    while (level < MAX_KUNGFU_LEVEL && exp >= getXpRequiredForLevel(level + 1)) {
        level++;
    }

    const currentLevelBaseXp = getXpRequiredForLevel(level);
    const nextLevelTargetXp = level >= MAX_KUNGFU_LEVEL ? currentLevelBaseXp : getXpRequiredForLevel(level + 1);

    const expIntoCurrentLevel = exp - currentLevelBaseXp;
    const expNeededForNextLevel = Math.max(1, nextLevelTargetXp - currentLevelBaseXp);

    const progressPercent = level >= MAX_KUNGFU_LEVEL 
        ? 100 
        : Math.min(100, Math.max(0, Math.floor((expIntoCurrentLevel / expNeededForNextLevel) * 100)));

    // Tentukan Gelar Kemahiran (8 Tingkat Rangking Kemahiran)
    let rankTitle = 'Pemula (Novice)';
    let rankBadgeColor = '#94a3b8'; // slate

    if (level >= 231) {
        rankTitle = 'Leluhur Surgawi (Mythic Saint)';
        rankBadgeColor = '#eab308'; // gold
    } else if (level >= 201) {
        rankTitle = 'Dewa Beladiri (Transcendent)';
        rankBadgeColor = '#f43f5e'; // rose
    } else if (level >= 171) {
        rankTitle = 'Pendekar Besar (Grandmaster)';
        rankBadgeColor = '#ef4444'; // red
    } else if (level >= 131) {
        rankTitle = 'Master (Ahli Beladiri)';
        rankBadgeColor = '#f59e0b'; // amber
    } else if (level >= 91) {
        rankTitle = 'Ahli (Expert)';
        rankBadgeColor = '#a855f7'; // purple
    } else if (level >= 51) {
        rankTitle = 'Mahir (Adept)';
        rankBadgeColor = '#3b82f6'; // blue
    } else if (level >= 21) {
        rankTitle = 'Menengah (Apprentice)';
        rankBadgeColor = '#10b981'; // emerald
    }

    return {
        level,
        maxLevel: MAX_KUNGFU_LEVEL,
        exp,
        currentLevelBaseXp,
        nextLevelTargetXp,
        expIntoCurrentLevel,
        expNeededForNextLevel,
        progressPercent,
        rankTitle,
        rankBadgeColor
    };
}

/**
 * Menghitung Pengali Efisiensi Senjata (Weapon Mastery Multiplier)
 * Menggunakan kurva sublinear asimtotik seimbang:
 * Lv 0 = 75%, Lv 30 = ~96%, Lv 50 = ~105%, Lv 100 = ~120%, Lv 200 = ~134%, Lv 250 = ~138% - 140%
 */
function getWeaponMasteryMultiplier(kungfuLevel = 0) {
    const safeLevel = Math.min(MAX_KUNGFU_LEVEL, Math.max(0, Number(kungfuLevel) || 0));
    const multiplier = 0.75 + (0.85 * (safeLevel / (safeLevel + 90)));
    return Number(multiplier.toFixed(4));
}

/**
 * Menghitung Bonus Tinju Tangan Kosong (Unarmed Combat)
 * Memberikan bonus ATK flat dan bonus peluang Combo dengan cap seimbang:
 * - ATK: +1.5 per level (hingga +375 di Lv 250)
 * - Combo Rate: +0.1% per level, cap maksimal 25%
 * - Crit Rate: +0.05% per level, cap maksimal 12.5%
 */
function getUnarmedBonus(fistLevel = 0) {
    const safeLevel = Math.min(MAX_KUNGFU_LEVEL, Math.max(0, Number(fistLevel) || 0));
    const bonusAtk = Math.floor(safeLevel * 1.5);
    const bonusComboRate = Number(Math.min(0.25, safeLevel * 0.001).toFixed(4));
    const bonusCritRate = Number(Math.min(0.125, safeLevel * 0.0005).toFixed(4));
    return {
        bonusAtk,
        bonusComboRate,
        bonusCritRate
    };
}

/**
 * Menghitung Peluang Penghematan Durabilitas Alat Tempa (Durability Preservation)
 * Cap maksimal 65% di Lv 250 (alat tidak pernah 100% kebal aus, menjaga ekonomi alat tetap seimbang).
 */
function getToolDurabilityPreserveChance(forgingLevel = 0) {
    const safeLevel = Math.min(MAX_KUNGFU_LEVEL, Math.max(0, Number(forgingLevel) || 0));
    const chance = Math.min(0.65, safeLevel * 0.0026);
    return Number(chance.toFixed(4));
}

/**
 * Menghitung Bonus Peluang Mencuri (Stealing Success Rate Bonus)
 * Cap maksimal 35% di Lv 250 agar tidak 100% auto-steal.
 */
function getStealingSuccessBonus(stealingLevel = 0) {
    const safeLevel = Math.min(MAX_KUNGFU_LEVEL, Math.max(0, Number(stealingLevel) || 0));
    const bonus = Math.min(0.35, safeLevel * 0.0014);
    return Number(bonus.toFixed(4));
}

/**
 * Mendeteksi disiplin kungfu dari senjata (Pedang, Golok, Tongkat, Tinju, Senjata Rahasia).
 */
function resolveWeaponDiscipline(item) {
    if (!item) return 'fist'; // Tanpa senjata = Tangan kosong (fist)

    // Jika item tidak valid atau tidak memiliki informasi nama/tipe
    if (typeof item !== 'object') return 'fist';

    if (item.weaponType && KUNGFU_SKILLS[item.weaponType]) {
        return item.weaponType;
    }

    const nameLower = (item.name || '').toLowerCase();
    if (nameLower.includes('pedang') || nameLower.includes('sword') || nameLower.includes('blade')) return 'sword';
    if (nameLower.includes('golok') || nameLower.includes('saber') || nameLower.includes('katana') || nameLower.includes('pisau besar')) return 'saber';
    if (nameLower.includes('tongkat') || nameLower.includes('tombak') || nameLower.includes('gada') || nameLower.includes('staff') || nameLower.includes('spear')) return 'staff';
    if (nameLower.includes('sarung tangan') || nameLower.includes('tinju') || nameLower.includes('cakar') || nameLower.includes('fist') || nameLower.includes('gauntlet')) return 'fist';
    if (nameLower.includes('jarum') || nameLower.includes('panah') || nameLower.includes('belati terbang') || nameLower.includes('shuriken') || nameLower.includes('hidden')) return 'hiddenWeapon';

    return 'fist'; // Default fallback aman untuk pertarungan tanpa senjata spesifik adalah fist (tinju/unarmed)
}

/**
 * Memeriksa apakah pemain memenuhi syarat level kungfu dari suatu alat atau senjata.
 * @param {Object} player Dokumen player
 * @param {Object} item Dokumen item
 * @returns {Object} { allowed: boolean, reason?: string, requiredSkill, requiredLevel, playerLevel }
 */
function checkItemKungfuRequirement(player, item) {
    if (!item) return { allowed: true };

    const reqSkill = item.requiredKungfuSkill;
    const reqLevel = Number(item.requiredKungfuLevel) || 0;

    if (!reqSkill || reqLevel <= 0) {
        return { allowed: true };
    }

    const playerRawExp = player.kungfuSkills ? (player.kungfuSkills[reqSkill] || 0) : 0;
    const playerKungfuInfo = getKungfuLevel(playerRawExp);

    if (playerKungfuInfo.level < reqLevel) {
        const skillName = KUNGFU_SKILLS[reqSkill]?.name || reqSkill.toUpperCase();
        return {
            allowed: false,
            requiredSkill: reqSkill,
            requiredLevel: reqLevel,
            playerLevel: playerKungfuInfo.level,
            reason: `${item.name} membutuhkan kemahiran ${skillName} minimal Tingkat ${reqLevel}. (Tingkat kemahiranmu: Tingkat ${playerKungfuInfo.level}).`
        };
    }

    return {
        allowed: true,
        requiredSkill: reqSkill,
        requiredLevel: reqLevel,
        playerLevel: playerKungfuInfo.level
    };
}

/**
 * Menambahkan Kungfu XP pada pemain secara organik dengan aturan anti-eksploitasi.
 * @param {Object} player Dokumen player
 * @param {String} skill Tipe skill kungfu
 * @param {Number} baseExp Jumlah XP dasar yang akan diberikan
 * @param {Object} options Opsi { playerRealmIdx, opponentRealmIdx, isPvE, isSparring }
 * @returns {Object} { expGained, oldLevel, newLevel, levelUp }
 */
function awardKungfuExp(player, skill, baseExp, options = {}) {
    if (!player) return { expGained: 0, oldLevel: 0, newLevel: 0, levelUp: false };
    if (!skill || !KUNGFU_SKILLS[skill]) return { expGained: 0, oldLevel: 0, newLevel: 0, levelUp: false };

    let expToAward = Math.max(0, Math.floor(Number(baseExp) || 0));
    if (expToAward <= 0) return { expGained: 0, oldLevel: 0, newLevel: 0, levelUp: false };

    // Proteksi Anti-Eksploitasi: Cek selisih ranah kultivasi
    // Jika lawan 2 ranah atau lebih di bawah pemain, pemain tidak mendapatkan Kungfu XP (musuh sepele)
    if (options.opponentRealmIdx !== undefined && options.playerRealmIdx !== undefined) {
        const realmDiff = options.playerRealmIdx - options.opponentRealmIdx;
        if (realmDiff >= 2) {
            return {
                expGained: 0,
                oldLevel: getKungfuLevel(player.kungfuSkills?.[skill] || 0).level,
                newLevel: getKungfuLevel(player.kungfuSkills?.[skill] || 0).level,
                levelUp: false,
                reason: 'Musuh terlalu lemah untuk mengasah kemahiran beladiri.'
            };
        } else if (realmDiff === 1) {
            // Penurunan 50% jika 1 ranah di bawah
            expToAward = Math.max(1, Math.floor(expToAward * 0.5));
        } else if (realmDiff < 0) {
            // Bonus 20% jika melawan musuh yang ranahnya lebih tinggi
            expToAward = Math.floor(expToAward * 1.2);
        }
    }

    if (!player.kungfuSkills) player.kungfuSkills = {};
    const oldExp = player.kungfuSkills[skill] || 0;
    const oldLevel = getKungfuLevel(oldExp).level;

    const newExp = oldExp + expToAward;
    player.kungfuSkills[skill] = newExp;
    if (typeof player.markModified === 'function') {
        player.markModified('kungfuSkills');
    }

    const newLevel = getKungfuLevel(newExp).level;
    const levelUp = newLevel > oldLevel;

    return {
        skill,
        expGained: expToAward,
        oldExp,
        newExp,
        oldLevel,
        newLevel,
        levelUp
    };
}

module.exports = {
    KUNGFU_SKILLS,
    getXpRequiredForLevel,
    getKungfuLevel,
    getWeaponMasteryMultiplier,
    getUnarmedBonus,
    getToolDurabilityPreserveChance,
    getStealingSuccessBonus,
    resolveWeaponDiscipline,
    checkItemKungfuRequirement,
    awardKungfuExp
};
