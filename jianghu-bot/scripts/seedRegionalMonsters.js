/**
 * seedRegionalMonsters.js
 * Menghasilkan konfigurasi zona monster per region untuk seluruh 29 wilayah canonical
 * disimpan ke dalam world-data/monsters/<regionId>.json sesuai spesifikasi Map V4.
 */

const fs = require('fs');
const path = require('path');
const regionsData = require('../world-data/regions.json');

const targetDir = path.join(__dirname, '../world-data/monsters');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Katalog spesies monster berdasarkan tier
const MONSTER_PROFILES = {
  tier1: [
    { id: 'deer_wild', name: 'Rusa Bintik Fana', icon: '🦌', tier: 1, level: 3, isAggressive: false },
    { id: 'boar_plain', name: 'Babi Hutan Liar', icon: '🐗', tier: 1, level: 5, isAggressive: false },
    { id: 'crane_white', name: 'Bangau Bulu Salju', icon: '🦅', tier: 1, level: 6, isAggressive: false },
    { id: 'fox_red', name: 'Rubah Ekor Cokelat', icon: '🦊', tier: 1, level: 7, isAggressive: false },
    { id: 'wolf_plain', name: 'Serigala Liar Padang', icon: '🐺', tier: 1, level: 9, isAggressive: true }
  ],
  tier2: [
    { id: 'wolf_azure', name: 'Serigala Roh Darah', icon: '🐺', tier: 2, level: 15, isAggressive: true },
    { id: 'viper_shadow', name: 'Ular Sanca Hitam', icon: '🐍', tier: 2, level: 20, isAggressive: true },
    { id: 'bear_iron', name: 'Beruang Besi Dingin', icon: '🐻', tier: 2, level: 25, isAggressive: true },
    { id: 'spider_cave', name: 'Laba-laba Gua Berbisa', icon: '🕷️', tier: 2, level: 30, isAggressive: true }
  ],
  tier3: [
    { id: 'tiger_elder', name: 'Harimau Belang Kuno', icon: '🐯', tier: 3, level: 45, isAggressive: true },
    { id: 'eagle_storm', name: 'Rajawali Sayap Badai', icon: '🦅', tier: 3, level: 55, isAggressive: true },
    { id: 'snake_jade', name: 'Ular Sanca Giok Roh', icon: '🐍', tier: 3, level: 60, isAggressive: true },
    { id: 'ghost_wailing', name: 'Arwah Gentayangan Medan Perang', icon: '👻', tier: 3, level: 65, isAggressive: true }
  ],
  tier4: [
    { id: 'demon_cave', name: 'Siluman Iblis Gua Miasma', icon: '👹', tier: 4, level: 75, isAggressive: true },
    { id: 'wyrm_flame', name: 'Cacing Lahar Basalt', icon: '🐉', tier: 4, level: 80, isAggressive: true },
    { id: 'asura_blood', name: 'Pendekar Kafir Asura', icon: '👹', tier: 4, level: 88, isAggressive: true }
  ],
  tier5: [
    { id: 'dragon_celestial', name: 'Naga Langit Sembilan Hampa', icon: '🐉', tier: 5, level: 95, isAggressive: true },
    { id: 'abyss_behemoth', name: 'Raksasa Jurang Hampa Kegelapan', icon: '👹', tier: 5, level: 100, isAggressive: true }
  ]
};

const BOSS_PROFILES = {
  tier1: null,
  tier2: {
    id: 'boss_alpha_wolf',
    name: 'Raja Serigala Roh Darah',
    icon: '🐺',
    tier: 2,
    level: 35,
    footprint: { w: 2, h: 2 },
    spawnHours: [6, 12, 18, 24]
  },
  tier3: {
    id: 'boss_iron_tiger',
    name: 'Raja Harimau Belang Kuno',
    icon: '🐯',
    tier: 3,
    level: 70,
    footprint: { w: 3, h: 3 },
    spawnHours: [12, 20]
  },
  tier4: {
    id: 'boss_demon_lord',
    name: 'Pangeran Iblis Asura Miasma',
    icon: '👹',
    tier: 4,
    level: 90,
    footprint: { w: 4, h: 4 },
    spawnHours: [0, 18]
  },
  tier5: {
    id: 'boss_celestial_wyrm',
    name: 'Naga Purba Kehampaan Langit',
    icon: '🐉',
    tier: 5,
    level: 100,
    footprint: { w: 5, h: 5 },
    spawnHours: [20]
  }
};

let generatedCount = 0;

for (const region of regionsData) {
  const dt = region.dangerTier !== undefined ? region.dangerTier : 1;
  const clampedTier = Math.min(5, Math.max(1, dt));

  // Kepadatan spawn per 100 tile
  const density = clampedTier === 1 ? 1.5 : (clampedTier === 2 ? 3.0 : (clampedTier === 3 ? 4.5 : 6.0));

  // Level range
  const minLvl = clampedTier === 1 ? 1 : (clampedTier === 2 ? 15 : (clampedTier === 3 ? 40 : (clampedTier === 4 ? 70 : 90)));
  const maxLvl = clampedTier === 1 ? 10 : (clampedTier === 2 ? 35 : (clampedTier === 3 ? 65 : (clampedTier === 4 ? 88 : 100)));

  // Ambil spesies sesuai tier
  const species = [
    ...(MONSTER_PROFILES[`tier${clampedTier}`] || MONSTER_PROFILES.tier1)
  ];

  const boss = BOSS_PROFILES[`tier${clampedTier}`] || null;

  const payload = {
    regionId: region.id,
    regionName: region.name,
    dangerTier: clampedTier,
    requiresDangerOverlay: clampedTier >= 2,
    levelRange: { min: minLvl, max: maxLvl },
    spawnDensityPer100Tiles: density,
    species,
    boss,
    spawnHours: clampedTier >= 3 ? [6, 12, 18, 24] : [0, 24]
  };

  const filePath = path.join(targetDir, `${region.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  generatedCount++;
}

console.log(`[OK] Berhasil menghasilkan ${generatedCount} file zona monster regional di world-data/monsters/`);
