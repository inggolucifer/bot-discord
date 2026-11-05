#!/usr/bin/env node
/**
 * scripts/v23/generateZones.js
 * Generator Deterministik Zona Tetap Jianghu V23 (Ala Tale of Immortal R4, R8)
 * Seed: 1618
 *
 * Menghasilkan world-data/zones-v23.json:
 * - elite_camp: Kamp siluman elite terdaftar dari region_challenge_v9.json
 * - world_boss_lair: 1 sarang bos per wilayah tier >= 2
 * - elemental_land: 5 lokasi tanah elemen (Api, Air, Kayu, Logam, Tanah)
 * - spirit_valley: 2 per wilayah transition / danger tier >= 2
 * - land_of_spirits: 3 lokasi total di wilayah tier 1-2
 * - defense_circle: 3 per wilayah transition tier >= 3
 */

const fs = require('fs');
const path = require('path');

const BOT_ROOT = path.resolve(__dirname, '../..');
const WORLD_DATA = path.join(BOT_ROOT, 'world-data');

const regions = require('../../world-data/regions.json');
const anchors = require('../../world-data/anchors.json');
const challenges = require('../../world-data/region_challenge_v9.json');
const rolesData = require('../../world-data/region-roles-v23.json');
const ladderData = require('../../world-data/region-ladder-v23.json');
const worldRegionEngine = require('../../utils/worldRegionEngine');
const proceduralWorldEngine = require('../../utils/proceduralWorldEngine');

// Pseudo-random generator (Mulberry32) dengan seed 1618
function Mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = Mulberry32(1618);

function isImpassableWater(terrain, regId) {
  if (['eastern_sea', 'frostmoon_sea', 'mirror_lake'].includes(regId)) {
    return ['ocean', 'lake_deep'].includes(terrain);
  }
  return ['ocean', 'sea', 'sea_reef', 'lake_deep'].includes(terrain);
}

const placedZones = [];

function checkOverlap(x, y, w = 3, h = 3, minDistance = 25) {
  for (const z of placedZones) {
    const cx1 = x + Math.floor(w / 2);
    const cy1 = y + Math.floor(h / 2);
    const cx2 = z.x + Math.floor((z.w || 3) / 2);
    const cy2 = z.y + Math.floor((z.h || 3) / 2);
    const dist = Math.hypot(cx1 - cx2, cy1 - cy2);
    if (dist < minDistance) return true;

    // AABB strict check
    const overlapX = (x < z.x + (z.w || 3)) && (x + w > z.x);
    const overlapY = (y < z.y + (z.h || 3)) && (y + h > z.y);
    if (overlapX && overlapY) return true;
  }
  return false;
}

function checkSettlementExclusion(x, y, w = 3, h = 3, minExtra = 40) {
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor(h / 2);
  for (const anc of anchors) {
    const excl = anc.v20?.exclusionRadius || 10;
    const dCheb = Math.max(Math.abs(cx - anc.x), Math.abs(cy - anc.y));
    if (dCheb < excl + minExtra) return true;
  }
  return false;
}

function isWalkableNonSolid(x, y, regId) {
  if (x < 10 || x >= 4990 || y < 10 || y >= 4990) return false;
  const tile = proceduralWorldEngine.getTileAt(x, y);
  if (tile.isSolid) return false;
  if (isImpassableWater(tile.terrainType, regId)) return false;
  return true;
}

// Validasi keterjangkauan lokal (BFS kecil dari pusat zona)
function isReachable(cx, cy, regId) {
  const visited = new Set();
  const queue = [{ x: cx, y: cy, dist: 0 }];
  visited.add(`${cx}_${cy}`);

  let reachableWalkableTiles = 0;
  while (queue.length > 0) {
    const curr = queue.shift();
    reachableWalkableTiles++;
    if (reachableWalkableTiles >= 20) return true; // Cukup terbukti terhubung ke area luas

    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nx = curr.x + dx;
      const ny = curr.y + dy;
      const key = `${nx}_${ny}`;
      if (!visited.has(key) && isWalkableNonSolid(nx, ny, regId)) {
        visited.add(key);
        queue.push({ x: nx, y: ny, dist: curr.dist + 1 });
      }
    }
  }
  return reachableWalkableTiles >= 10;
}

function findValidLocationInRegion(regDef, minCenterDistance = 35) {
  const b = regDef.bounds;
  const pad = 30;
  const minX = Math.min(b.minX, b.maxX);
  const maxX = Math.max(b.minX, b.maxX);
  const minY = Math.min(b.minY, b.maxY);
  const maxY = Math.max(b.minY, b.maxY);

  for (let attempt = 0; attempt < 3000; attempt++) {
    const cx = Math.floor(minX + pad + rng() * Math.max(10, maxX - minX - pad * 2));
    const cy = Math.floor(minY + pad + rng() * Math.max(10, maxY - minY - pad * 2));

    // Validasi region raster SSOT
    const actualReg = worldRegionEngine.getRegionAt(cx, cy);
    if (actualReg.id !== regDef.id) continue;

    // Validasi terrain dan non-solid
    if (!isWalkableNonSolid(cx, cy, regDef.id)) continue;

    const x = cx - 1;
    const y = cy - 1;

    // Validasi eksklusi pemukiman
    if (checkSettlementExclusion(x, y, 3, 3, 40)) continue;

    // Validasi tumpang tindih
    if (checkOverlap(x, y, 3, 3, minCenterDistance)) continue;

    // Validasi keterjangkauan
    if (!isReachable(cx, cy, regDef.id)) continue;

    return { x, y, cx, cy, terrain: proceduralWorldEngine.getTileAt(cx, cy).terrainType };
  }
  throw new Error(`Gagal menemukan lokasi valid untuk zona di wilayah ${regDef.id}`);
}

// ----------------------------------------------------------------------------
// 1. ELITE CAMPS (Dari region_challenge_v9.json valid)
// ----------------------------------------------------------------------------
for (const reg of regions) {
  const ch = challenges[reg.id];
  if (!ch || !ch.eliteCamps) continue;

  ch.eliteCamps.forEach((camp, idx) => {
    const zone = {
      id: `elite_${reg.id}_${idx + 1}`,
      name: `Kamp Siluman Elite ${reg.name} #${idx + 1}`,
      type: 'elite_camp',
      regionId: reg.id,
      dangerTier: reg.dangerTier,
      x: camp.x - 1,
      y: camp.y - 1,
      w: 3,
      h: 3,
      entryCost: { stamina: 5 },
      terrain: camp.terrain || 'hunting_ground'
    };
    placedZones.push(zone);
  });
}

// ----------------------------------------------------------------------------
// 2. WORLD BOSS LAIRS (1 per wilayah tier >= 2)
// ----------------------------------------------------------------------------
for (const reg of regions) {
  if (reg.dangerTier < 2) continue;
  const ch = challenges[reg.id];
  if (!ch || !ch.lair) continue;

  const zone = {
    id: `boss_lair_${reg.id}`,
    name: `Sarang Siluman Raja ${reg.name}`,
    type: 'world_boss_lair',
    regionId: reg.id,
    dangerTier: reg.dangerTier,
    requiredRealmIndex: ladderData.regions[reg.id]?.requiredRealmIndex || 1,
    x: ch.lair.x - 1,
    y: ch.lair.y - 1,
    w: 3,
    h: 3,
    entryCost: { stamina: 10 },
    terrain: ch.lair.terrain || 'mountain_pass'
  };
  placedZones.push(zone);
}

// ----------------------------------------------------------------------------
// 3. ELEMENTAL LANDS (5 Elemen di wilayah tier 2-4 selaras hukum alam)
// ----------------------------------------------------------------------------
const elementalConfigs = [
  { element: 'api', name: 'Tanah Api Berkobar (Forge Fire Land)', regionId: 'ore_teeth_range', law: 'natal_artifact' },
  { element: 'air', name: 'Danau Cermin Suci (Azure Water Land)', regionId: 'mirror_lake', law: 'element_azure_water' },
  { element: 'kayu', name: 'Rimba Roh Hayat (Qingdi Wood Land)', regionId: 'spirit_wood_sea', law: 'element_qingdi_wood' },
  { element: 'logam', name: 'Lembah Pedang Logam (Sword Metal Land)', regionId: 'sword_gorge', law: 'righteous_sword_heart' },
  { element: 'tanah', name: 'Gurun Formasi Runic (Array Earth Land)', regionId: 'formation_barrens', law: 'righteous_formation_array' }
];

for (const el of elementalConfigs) {
  const regDef = regions.find(r => r.id === el.regionId);
  const loc = findValidLocationInRegion(regDef, 40);
  const zone = {
    id: `elemental_${el.element}_${el.regionId}`,
    name: el.name,
    type: 'elemental_land',
    element: el.element,
    lawAffinity: el.law,
    regionId: el.regionId,
    dangerTier: regDef.dangerTier,
    x: loc.x,
    y: loc.y,
    w: 3,
    h: 3,
    entryCost: { stamina: 8 },
    terrain: loc.terrain
  };
  placedZones.push(zone);
}

// ----------------------------------------------------------------------------
// 4. SPIRIT VALLEYS (2 per wilayah transition / danger dengan tier >= 2)
// ----------------------------------------------------------------------------
for (const [regId, rInfo] of Object.entries(rolesData.roles)) {
  const regDef = regions.find(r => r.id === regId);
  if (regDef.dangerTier < 2) continue;
  if (!['transition', 'danger'].includes(rInfo.role)) continue;

  for (let v = 1; v <= 2; v++) {
    const loc = findValidLocationInRegion(regDef, 35);
    const zone = {
      id: `spirit_valley_${regId}_${v}`,
      name: `Lembah Intisari Roh ${regDef.name} #${v}`,
      type: 'spirit_valley',
      regionId: regId,
      dangerTier: regDef.dangerTier,
      x: loc.x,
      y: loc.y,
      w: 3,
      h: 3,
      entryCost: { item: 'item_spirit_key', stamina: 10, cooldownDays: 5 },
      terrain: loc.terrain
    };
    placedZones.push(zone);
  }
}

// ----------------------------------------------------------------------------
// 5. LAND OF SPIRITS (3 lokasi total di wilayah tier 1-2)
// ----------------------------------------------------------------------------
const spiritLocations = ['central_plains', 'nine_springs_delta', 'hermit_highlands'];
spiritLocations.forEach((regId, idx) => {
  const regDef = regions.find(r => r.id === regId);
  const loc = findValidLocationInRegion(regDef, 40);
  const zone = {
    id: `land_of_spirits_${regId}`,
    name: `Tanah Warisan Roh Leluhur #${idx + 1} (${regDef.name})`,
    type: 'land_of_spirits',
    regionId: regId,
    dangerTier: regDef.dangerTier,
    x: loc.x,
    y: loc.y,
    w: 3,
    h: 3,
    entryCost: { spiritStones: 500, stamina: 10 },
    terrain: loc.terrain
  };
  placedZones.push(zone);
});

// ----------------------------------------------------------------------------
// 6. DEFENSE CIRCLE (3 per wilayah transition tier >= 3)
// ----------------------------------------------------------------------------
for (const [regId, rInfo] of Object.entries(rolesData.roles)) {
  const regDef = regions.find(r => r.id === regId);
  if (regDef.dangerTier < 3) continue;
  if (rInfo.role !== 'transition') continue;

  for (let c = 1; c <= 3; c++) {
    const loc = findValidLocationInRegion(regDef, 35);
    const zone = {
      id: `defense_circle_${regId}_${c}`,
      name: `Lingkaran Segel Bertahan ${regDef.name} #${c}`,
      type: 'defense_circle',
      regionId: regId,
      dangerTier: regDef.dangerTier,
      x: loc.x,
      y: loc.y,
      w: 3,
      h: 3,
      entryCost: { spiritFruits: 3, stamina: 10 },
      terrain: loc.terrain
    };
    placedZones.push(zone);
  }
}

// Susun ringkasan dan tulis berkas zones-v23.json
const summary = {
  elite_camp: placedZones.filter(z => z.type === 'elite_camp').length,
  world_boss_lair: placedZones.filter(z => z.type === 'world_boss_lair').length,
  elemental_land: placedZones.filter(z => z.type === 'elemental_land').length,
  spirit_valley: placedZones.filter(z => z.type === 'spirit_valley').length,
  land_of_spirits: placedZones.filter(z => z.type === 'land_of_spirits').length,
  defense_circle: placedZones.filter(z => z.type === 'defense_circle').length,
  total: placedZones.length
};

const output = {
  version: 'v23',
  seed: 1618,
  summary,
  zones: placedZones
};

const outFile = path.join(WORLD_DATA, 'zones-v23.json');
fs.writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8');

console.log('='.repeat(70));
console.log(' GENERATOR ZONA TETAP V23 SELESAI');
console.log('='.repeat(70));
console.log(JSON.stringify(summary, null, 2));
console.log(`[OUTPUT] Disimpan ke: ${outFile}`);
