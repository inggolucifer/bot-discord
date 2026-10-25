const fs = require('fs');
const path = require('path');

const bestiaryPath = path.join(__dirname, '../world-data/bestiary-v2.json');
const challengePath = path.join(__dirname, '../world-data/region_challenge_v9.json');

const bestiary = JSON.parse(fs.readFileSync(bestiaryPath, 'utf8'));
const challenge = JSON.parse(fs.readFileSync(challengePath, 'utf8'));

const tierLevelBase = { 1: 4, 2: 12, 3: 24, 4: 40, 5: 60, 6: 80 };

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function getMonsterIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('rusa') || n.includes('bison') || n.includes('unta') || n.includes('kuda')) return '🦌';
  if (n.includes('bangau') || n.includes('burung') || n.includes('elang') || n.includes('rajawali') || n.includes('camar') || n.includes('layang')) return '🦅';
  if (n.includes('rubah')) return '🦊';
  if (n.includes('serigala') || n.includes('anjing') || n.includes('hyena')) return '🐺';
  if (n.includes('katak')) return '🐸';
  if (n.includes('lintah') || n.includes('cacing')) return '🪱';
  if (n.includes('ikan') || n.includes('hiu') || n.includes('paus') || n.includes('naga')) return '🐉';
  if (n.includes('kura') || n.includes('penyu') || n.includes('kepiting')) return '🐢';
  if (n.includes('kambing')) return '🐐';
  if (n.includes('beruang') || n.includes('mammoth')) return '🐻';
  if (n.includes('harimau') || n.includes('singa')) return '🐅';
  if (n.includes('ular')) return '🐍';
  if (n.includes('golem') || n.includes('patung') || n.includes('batu')) return '🗿';
  if (n.includes('iblis') || n.includes('asura') || n.includes('neraka')) return '👹';
  if (n.includes('hantu') || n.includes('mayat') || n.includes('tengkorak') || n.includes('kerangka')) return '💀';
  if (n.includes('kalajengking')) return '🦂';
  if (n.includes('kelelawar') || n.includes('mata')) return '🦇';
  if (n.includes('semut') || n.includes('kumbang') || n.includes('laba') || n.includes('lebah') || n.includes('lalat')) return '🕷️';
  if (n.includes('tikus')) return '🐀';
  if (n.includes('jamur') || n.includes('spora')) return '🍄';
  if (n.includes('pohon') || n.includes('banyan') || n.includes('akar')) return '🌳';
  if (n.includes('pendekar') || n.includes('prajurit') || n.includes('kapten') || n.includes('jenderal') || n.includes('pertapa') || n.includes('hakim') || n.includes('penjaga')) return '👤';
  return '🐾';
}

const bossNames = {
  central_plains: "Penguasa Siluman Central Plains",
  nine_springs_delta: "Penguasa Siluman Nine Springs Delta",
  azure_mountain_range: "Pendekar Pedang Mist Pass",
  northern_desolate: "Raja Es Kutub Abadi",
  thundersteppe: "Raja Badai Kilat Padang",
  godthunder_peaks: "Hakim Petir Langit Kesembilan",
  mirror_lake: "Raja Cermin Ilusi Air",
  beast_prairies: "Raja Rimba Padang Savana",
  western_sacred_desert: "Penguasa Cacing Pasir Purba",
  western_gorge_labyrinth: "Raja Minotaur Labirin Karst",
  hermit_highlands: "Pertapa Gila Puncak Kabut",
  border_march: "Jenderal Pasukan Besi Gurun",
  lava_spine: "Raja Naga Magma Vulkanik",
  venom_mire: "Hydra Rawa Sembilan Racun",
  southern_demon_domain: "Panglima Iblis Tanduk Neraka",
  crimson_battlefield: "Jenderal Hantu Medan Perang",
  abyssal_scar: "Penjaga Rantai Hampa Purba",
  southern_plague_woods: "Raja Lalat Pembusuk Abadi",
  bone_sea_coast: "Kerangka Leviathan Laut Tulang",
  spirit_wood_sea: "Banyan Kuno Penjaga Roh",
  mist_insect_valley: "Ratu Lebah Sarang Kitin",
  formation_barrens: "Penjaga Formasi Delapan Trigram",
  sword_gorge: "Hantu Pendekar Pedang Surgawi",
  ore_teeth_range: "Raja Kerdil Tambang Gunung",
  eastern_sea: "Hiu Naga Pusaran Samudra",
  frostmoon_sea: "Naga Beku Bulan Es",
  floating_wind_isles: "Penjaga Citadel Daois Awan",
  immortal_ruins_valley: "Penjaga Gerbang Surgawi Kuno",
  void_rift: "Pemakan Dimensi Kosmis"
};

for (const [regionId, cData] of Object.entries(challenge)) {
  if (!bestiary[regionId]) {
    bestiary[regionId] = {
      regionId,
      regionName: regionId,
      dangerTier: 1,
      safeCorridorsEnforced: true,
      safeBufferRoads: 10,
      safeBufferSettlements: 20
    };
  }

  const bRegion = bestiary[regionId];
  const dangerTier = bRegion.dangerTier || 1;
  const baseLevel = tierLevelBase[dangerTier] || (80 + 10 * (dangerTier - 6));

  // 1. Unique Commons (exactly 3)
  const commons = (cData.uniqueCommons || []).map((name, idx) => {
    const level = Math.max(1, baseLevel + (idx - 1)); // -1, 0, +1
    return {
      id: `${regionId}__${slug(name)}`,
      name,
      icon: getMonsterIcon(name),
      tier: dangerTier,
      level,
      hp: Math.floor(40 + level * 18),
      maxHp: Math.floor(40 + level * 18),
      atk: Math.floor(8 + level * 3),
      def: Math.floor(4 + level * 1.5),
      spd: Math.floor(8 + level * 0.6),
      isAggressive: dangerTier >= 2 && idx === 2,
      spawnWeight: 70
    };
  });
  bRegion.common = commons;

  // 2. Unique Elite (1 unique elite)
  const eliteName = cData.uniqueElite || `Elit ${regionId}`;
  const eliteLevel = baseLevel + 4;
  bRegion.elite = [
    {
      id: `${regionId}__${slug(eliteName)}`,
      name: eliteName,
      icon: getMonsterIcon(eliteName),
      tier: dangerTier,
      level: eliteLevel,
      hp: Math.floor((40 + eliteLevel * 18) * 2.2),
      maxHp: Math.floor((40 + eliteLevel * 18) * 2.2),
      atk: Math.floor((8 + eliteLevel * 3) * 1.5),
      def: Math.floor(4 + eliteLevel * 1.5),
      spd: Math.floor(8 + eliteLevel * 0.6),
      isAggressive: true,
      spawnWeight: 25,
      isElite: true
    }
  ];

  // 3. Boss
  if (!bRegion.boss) {
    bRegion.boss = {
      id: `boss_${regionId}`,
      name: bossNames[regionId] || `Penguasa ${regionId}`,
      tier: dangerTier,
      footprint: { w: 4, h: 4 },
      spawnHours: [20],
      lair: {
        centerX: cData.lair?.x || 2500,
        centerY: cData.lair?.y || 2500,
        width: 12,
        height: 12,
        lairName: `Sarang Kuno ${regionId}`
      }
    };
  }
  bRegion.boss.id = `boss_${regionId}`;
  if (bossNames[regionId]) {
    bRegion.boss.name = bossNames[regionId];
  }
  const bossLevel = baseLevel + 10;
  bRegion.boss.level = bossLevel;
  bRegion.boss.hp = Math.floor((40 + bossLevel * 18) * 8);
  bRegion.boss.maxHp = bRegion.boss.hp;
  bRegion.boss.atk = Math.floor((8 + bossLevel * 3) * 2);
  bRegion.boss.def = Math.floor((4 + bossLevel * 1.5) * 2);
  bRegion.boss.spd = Math.floor(8 + bossLevel * 0.6);
  bRegion.boss.isBoss = true;
  bRegion.boss.mechanic = cData.bossMechanic || '-';

  if (regionId === 'abyssal_scar') {
    bRegion.boss.drops = ['item_void_key'];
  }
}

fs.writeFileSync(bestiaryPath, JSON.stringify(bestiary, null, 2), 'utf8');
console.log(`[PASS] bestiary-v2.json successfully updated for all 29 regions.`);
