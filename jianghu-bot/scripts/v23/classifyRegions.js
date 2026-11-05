#!/usr/bin/env node
/**
 * scripts/v23/classifyRegions.js
 * Klasifikasi Otomatis Peran 29 Wilayah Jianghu V23 (Ala Tale of Immortal R3-R6)
 *
 * Mengelompokkan setiap wilayah ke dalam salah satu peran:
 * - hub: >= 3 pemukiman DAN ada town/capital/major_city/sect
 * - frontier: 1 - 2 pemukiman
 * - transition: 0 pemukiman, berbatasan langsung dengan >= 2 wilayah hub/frontier
 * - danger: 0 pemukiman, dangerTier >= 4, bukan transition
 * - sealed: jika sealed === true pada region_challenge
 */

const fs = require('fs');
const path = require('path');

const BOT_ROOT = path.resolve(__dirname, '../..');
const WORLD_DATA = path.join(BOT_ROOT, 'world-data');

const regions = require('../../world-data/regions.json');
const anchors = require('../../world-data/anchors.json');
const challenges = require('../../world-data/region_challenge_v9.json');
const worldRegionEngine = require('../../utils/worldRegionEngine');

// 1. Hitung tetangga riil menggunakan getRegionAt (Sampling batas raster)
const adjacency = {};
regions.forEach(r => { adjacency[r.id] = new Set(); });

for (let x = 25; x < 5000; x += 50) {
  for (let y = 25; y < 5000; y += 50) {
    const r1 = worldRegionEngine.getRegionAt(x, y).id;
    const rRight = worldRegionEngine.getRegionAt(Math.min(4999, x + 50), y).id;
    const rDown = worldRegionEngine.getRegionAt(x, Math.min(4999, y + 50)).id;
    if (r1 !== rRight) {
      if (adjacency[r1]) adjacency[r1].add(rRight);
      if (adjacency[rRight]) adjacency[rRight].add(r1);
    }
    if (r1 !== rDown) {
      if (adjacency[r1]) adjacency[r1].add(rDown);
      if (adjacency[rDown]) adjacency[rDown].add(r1);
    }
  }
}

// 2. Petakan pemukiman per wilayah
const anchorsByRegion = {};
regions.forEach(r => { anchorsByRegion[r.id] = []; });
anchors.forEach(a => {
  if (anchorsByRegion[a.region]) anchorsByRegion[a.region].push(a);
});

// 3. Klasifikasi awal (Hub & Frontier)
const classifiedRoles = {};

for (const reg of regions) {
  const regAnchors = anchorsByRegion[reg.id] || [];
  const count = regAnchors.length;
  const isSealed = challenges[reg.id]?.sealed === true;

  if (isSealed) {
    classifiedRoles[reg.id] = 'sealed';
    continue;
  }

  const hasMajorFacility = regAnchors.some(a =>
    ['capital_city', 'major_city', 'town', 'sect'].includes(a.type)
  );

  if (count >= 3 && hasMajorFacility) {
    classifiedRoles[reg.id] = 'hub';
  } else if (count >= 1) {
    classifiedRoles[reg.id] = 'frontier';
  }
}

// 4. Klasifikasi wilayah tanpa pemukiman (Transition vs Danger)
for (const reg of regions) {
  if (classifiedRoles[reg.id]) continue; // Sudah hub / frontier

  const neighbors = Array.from(adjacency[reg.id] || []);
  const hubOrFrontierNeighbors = neighbors.filter(nb =>
    classifiedRoles[nb] === 'hub' || classifiedRoles[nb] === 'frontier'
  );

  // Aturan R4: Wilayah transisi berbatasan dengan >= 2 wilayah hub/frontier
  if (hubOrFrontierNeighbors.length >= 2) {
    classifiedRoles[reg.id] = 'transition';
  } else {
    classifiedRoles[reg.id] = 'danger';
  }
}

// 5. Susun format region-roles-v23.json
const outputRoles = {
  version: 'v23',
  needs_owner_review: true,
  summary: {
    hub: Object.values(classifiedRoles).filter(r => r === 'hub').length,
    frontier: Object.values(classifiedRoles).filter(r => r === 'frontier').length,
    transition: Object.values(classifiedRoles).filter(r => r === 'transition').length,
    danger: Object.values(classifiedRoles).filter(r => r === 'danger').length,
    sealed: Object.values(classifiedRoles).filter(r => r === 'sealed').length,
    total: regions.length
  },
  roles: {}
};

for (const reg of regions) {
  const role = classifiedRoles[reg.id];
  const regAnchors = anchorsByRegion[reg.id] || [];
  const neighbors = Array.from(adjacency[reg.id] || []);

  outputRoles.roles[reg.id] = {
    id: reg.id,
    name: reg.name,
    dangerTier: reg.dangerTier,
    role,
    settlementCount: regAnchors.length,
    settlementTypes: regAnchors.map(a => a.type),
    neighbors,
    adjacentHubFrontierCount: neighbors.filter(nb => ['hub', 'frontier'].includes(classifiedRoles[nb])).length
  };
}

const outRolesPath = path.join(WORLD_DATA, 'region-roles-v23.json');
fs.writeFileSync(outRolesPath, JSON.stringify(outputRoles, null, 2), 'utf8');
console.log(`[SUKSES] Berkas region-roles-v23.json berhasil dibuat:`);
console.log(JSON.stringify(outputRoles.summary, null, 2));

// 6. Susun tangga ranah kultivasi (region-ladder-v23.json)
const realmStages = [
  { stage: 'Fondasi Fana', requiredRealmIndex: 0, materialGrade: 4 },
  { stage: 'Penyempurnaan Qi', requiredRealmIndex: 1, materialGrade: 3 },
  { stage: 'Pondasi Spiritual', requiredRealmIndex: 2, materialGrade: 2 },
  { stage: 'Inti Emas', requiredRealmIndex: 3, materialGrade: 1 },
  { stage: 'Jiwa Baru Lahir', requiredRealmIndex: 4, materialGrade: 1 },
  { stage: 'Peleburan Hampa', requiredRealmIndex: 5, materialGrade: 0 }
];

const ladder = {
  version: 'v23',
  regions: {}
};

for (const reg of regions) {
  const t = Math.max(1, Math.min(6, reg.dangerTier));
  const stageInfo = realmStages[t - 1];
  ladder.regions[reg.id] = {
    regionId: reg.id,
    name: reg.name,
    tier: t,
    stage: stageInfo.stage,
    requiredRealmIndex: stageInfo.requiredRealmIndex,
    tierMaterialGrade: stageInfo.materialGrade,
    role: classifiedRoles[reg.id]
  };
}

const outLadderPath = path.join(WORLD_DATA, 'region-ladder-v23.json');
fs.writeFileSync(outLadderPath, JSON.stringify(ladder, null, 2), 'utf8');
console.log(`[SUKSES] Berkas region-ladder-v23.json berhasil dibuat (29 wilayah).`);

// 7. Susun zone-config-v23.json
const zoneConfig = {
  version: 'v23',
  OPEN_DECISION_rest_camp: {
    enabled: false,
    description: 'Kemah persinggahan aman kecil (3x3) di wilayah transition/danger'
  },
  encounterCharms: {
    repellentBonus: 0.50,
    attractionBonus: 0.75,
    durationSeconds: 1800
  },
  worldBossChaos: {
    hpMultiplier: 1.35,
    dmgMultiplier: 1.25
  },
  bufferZone: {
    width: 12,
    maxTierOffset: 1
  },
  borderGradation: {
    bandWidth: 24,
    maxStepPer12Tiles: 1.0
  },
  tilesPerLi: 5
};

const outConfigPath = path.join(WORLD_DATA, 'zone-config-v23.json');
fs.writeFileSync(outConfigPath, JSON.stringify(zoneConfig, null, 2), 'utf8');
console.log(`[SUKSES] Berkas zone-config-v23.json berhasil dibuat.`);
