export interface KungfuSkillMeta {
    id: string;
    name: string;
    category: 'weapon' | 'profession' | 'subterfuge' | 'special' | 'cultivation' | 'unarmed';
    icon: string;
    description: string;
    trainHint: string;
}

export const KUNGFU_SKILLS_META: Record<string, KungfuSkillMeta> = {
    sword: {
        id: 'sword',
        name: 'Pedang (Sword)',
        category: 'weapon',
        icon: '🗡️',
        description: 'Kemahiran menggunakan pedang tajam dalam pertempuran.',
        trainHint: 'Gunakan pedang dalam pertempuran nyata atau sparring di sasana.'
    },
    saber: {
        id: 'saber',
        name: 'Golok (Saber)',
        category: 'weapon',
        icon: '⚔️',
        description: 'Kemahiran menggunakan golok berdaya tebas tinggi.',
        trainHint: 'Gunakan golok dalam pertempuran nyata atau sparring di sasana.'
    },
    staff: {
        id: 'staff',
        name: 'Tongkat & Tombak (Staff)',
        category: 'weapon',
        icon: '🥢',
        description: 'Kemahiran senjata bertangkai panjang seperti tombak dan tongkat.',
        trainHint: 'Gunakan tongkat atau tombak dalam pertempuran nyata.'
    },
    fist: {
        id: 'fist',
        name: 'Tinju Tangan Kosong (Fist)',
        category: 'weapon',
        icon: '👊',
        description: 'Kemahiran bertarung tanpa senjata atau sarung tangan beladiri.',
        trainHint: 'Bertarunglah dengan tangan kosong (lepas senjata) dalam pertempuran.'
    },
    finger: {
        id: 'finger',
        name: 'Totokan Jari (Finger)',
        category: 'unarmed',
        icon: '👆',
        description: 'Kemahiran totokan meridian yang menusuk titik vital lawan.',
        trainHint: 'Gunakan jurus manual bertipe Finger dalam pertempuran.'
    },
    hiddenWeapon: {
        id: 'hiddenWeapon',
        name: 'Senjata Rahasia (Hidden)',
        category: 'weapon',
        icon: '🎯',
        description: 'Kemahiran melempar jarum beracun dan belati terbang.',
        trainHint: 'Gunakan senjata rahasia atau panah lempar dalam pertempuran.'
    },
    forging: {
        id: 'forging',
        name: 'Penempaan (Forging)',
        category: 'profession',
        icon: '🔨',
        description: 'Kemahiran mengolah logam dan menjaga keawetan alat tempa.',
        trainHint: 'Lakukan penempaan dan peleburan logam di tungku pandai besi.'
    },
    stealing: {
        id: 'stealing',
        name: 'Pencurian & Tipu Muslihat (Steal)',
        category: 'subterfuge',
        icon: '🕵️',
        description: 'Kemahiran menyelinap dan mencuri kantong harta musuh.',
        trainHint: 'Lakukan aksi mencuri pada musuh yang lengah dalam pertempuran.'
    },
    qimen: {
        id: 'qimen',
        name: 'Qimen Dunjia (Formasi)',
        category: 'special',
        icon: '🔮',
        description: 'Pemahaman formasi gaib dan penataan energi bumi.',
        trainHint: 'Pelajari manual formasi dan taktik medan pertempuran.'
    },
    melody: {
        id: 'melody',
        name: 'Seni Musik (Melody)',
        category: 'special',
        icon: '🎵',
        description: 'Penguasaan instrumen spiritual yang mengguncang batin.',
        trainHint: 'Mainkan instrumen musik dan gunakan jurus berbasis melodi.'
    },
    healing: {
        id: 'healing',
        name: 'Pengobatan (Healing)',
        category: 'special',
        icon: '🌿',
        description: 'Pengetahuan meridian, akupunktur, dan pemulihan luka dalam.',
        trainHint: 'Pulihkan diri sendiri atau kawan dengan teknik penyembuhan.'
    },
    wineArt: {
        id: 'wineArt',
        name: 'Seni Arak (Wine Art)',
        category: 'special',
        icon: '🍶',
        description: 'Teknik mabuk dewa dan penguatan tenaga batin saat meneguk arak.',
        trainHint: 'Gunakan jurus arak dewa saat kondisi mabuk (intox).'
    },
    special: {
        id: 'special',
        name: 'Keahlian Khusus (Special)',
        category: 'special',
        icon: '✨',
        description: 'Kemahiran jurus-jurus eksotis di luar kategori umum.',
        trainHint: 'Kembangkan jurus langka dunia persilatan.'
    },
    core: {
        id: 'core',
        name: 'Fondasi Inti (Core)',
        category: 'cultivation',
        icon: '🧘',
        description: 'Kekuatan pondasi meridian inti dan daya tahan batin.',
        trainHint: 'Meningkat seiring latihan konsisten dan pertarungan sengit.'
    }
};

export const MAX_KUNGFU_LEVEL = 250;

export function getXpRequiredForLevel(level: number): number {
    if (level <= 0) return 0;
    return Math.floor(14 * Math.pow(level, 2.25) + (35 * level));
}

export function getKungfuLevel(rawExp: number = 0) {
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

    let rankTitle = 'Pemula (Novice)';
    let rankColor = 'text-slate-400 border-slate-500/30 bg-slate-500/10';

    if (level >= 231) {
        rankTitle = 'Leluhur Surgawi (Mythic Saint)';
        rankColor = 'text-yellow-400 border-yellow-500/40 bg-yellow-500/15';
    } else if (level >= 201) {
        rankTitle = 'Dewa Beladiri (Transcendent)';
        rankColor = 'text-rose-400 border-rose-500/30 bg-rose-500/15';
    } else if (level >= 171) {
        rankTitle = 'Pendekar Besar (Grandmaster)';
        rankColor = 'text-red-400 border-red-500/30 bg-red-500/10';
    } else if (level >= 131) {
        rankTitle = 'Master (Ahli Beladiri)';
        rankColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    } else if (level >= 91) {
        rankTitle = 'Ahli (Expert)';
        rankColor = 'text-purple-400 border-purple-500/30 bg-purple-500/10';
    } else if (level >= 51) {
        rankTitle = 'Mahir (Adept)';
        rankColor = 'text-blue-400 border-blue-500/30 bg-blue-500/10';
    } else if (level >= 21) {
        rankTitle = 'Menengah (Apprentice)';
        rankColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
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
        rankColor
    };
}

export function getKungfuBonusSummary(skillKey: string, level: number): string {
    if (['sword', 'saber', 'staff', 'hiddenWeapon'].includes(skillKey)) {
        const mult = (0.75 + (0.85 * (level / (level + 90)))) * 100;
        return `Efisiensi Senjata: ${mult.toFixed(1)}% ATK`;
    }
    if (skillKey === 'fist') {
        const bonusAtk = Math.floor(level * 1.5);
        const bonusCombo = (Math.min(0.25, level * 0.001) * 100).toFixed(1);
        return `Tinju: +${bonusAtk} ATK, +${bonusCombo}% Combo`;
    }
    if (skillKey === 'forging') {
        const preserve = (Math.min(0.65, level * 0.0026) * 100).toFixed(1);
        return `Peluang Hemat Alat Tempa: +${preserve}%`;
    }
    if (skillKey === 'stealing') {
        const stealBonus = (Math.min(0.35, level * 0.0014) * 100).toFixed(1);
        return `Akurasi Mencuri: +${stealBonus}%`;
    }
    if (skillKey === 'core') {
        return `Ketahanan Inti: +${level * 6} Max HP`;
    }
    return `Penguasaan Tingkat ${level}`;
}

export function checkClientKungfuRequirement(kungfuSkills: any, item: any) {
    if (!item) return { allowed: true };

    const reqSkill = item.requiredKungfuSkill;
    const reqLevel = Number(item.requiredKungfuLevel) || 0;

    if (!reqSkill || reqLevel <= 0) {
        return { allowed: true };
    }

    const playerExp = kungfuSkills ? (kungfuSkills[reqSkill] || 0) : 0;
    const playerLevel = getKungfuLevel(playerExp).level;

    if (playerLevel < reqLevel) {
        const meta = KUNGFU_SKILLS_META[reqSkill];
        const skillName = meta?.name || reqSkill.toUpperCase();
        return {
            allowed: false,
            requiredSkill: reqSkill,
            requiredLevel: reqLevel,
            playerLevel,
            skillName,
            reason: `Butuh ${skillName} Tingkat ${reqLevel} (Milikmu: Tingkat ${playerLevel})`
        };
    }

    return {
        allowed: true,
        requiredSkill: reqSkill,
        requiredLevel: reqLevel,
        playerLevel
    };
}
