#!/usr/bin/env node
/**
 * scripts/v24/auditBlockers.js
 * Verifikasi Kejujuran Pesan Blokir & Deskripsi Rintangan (V24 H2)
 */

const fs = require('fs');
const path = require('path');
const proceduralWorldEngine = require('../../utils/proceduralWorldEngine');
const { describeBlocker, MOUNTAIN_TERRAINS } = require('../../utils/blockerDescriber');

const RAW_DIR = path.resolve(__dirname, '../../review/v24_raw');
if (!fs.existsSync(RAW_DIR)) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
}

// PRNG Mulberry32 dengan seed 1618
function createPRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = createPRNG(1618);

console.log('='.repeat(70));
console.log(' AUDIT KEJUJURAN PESAN BLOKIR V24 (GATE H2)');
console.log('='.repeat(70));

const TARGET_SAMPLES = 500;
const sampledTiles = [];
let tebingOnNonMountain = 0;
let emptyLabels = 0;
let flyingSwordOnNonMountain = 0;

const causeBreakdown = {
  terrain: 0,
  water: 0,
  object: 0,
  barrier: 0,
  wall: 0,
  world_edge: 0,
  custom: 0
};

let attempts = 0;
while (sampledTiles.length < TARGET_SAMPLES && attempts < 100000) {
  attempts++;
  const x = Math.floor(rand() * 5000);
  const y = Math.floor(rand() * 5000);

  const tile = proceduralWorldEngine.getTileAt(x, y);
  if (!tile.isSolid) continue;

  const desc = describeBlocker(tile, x, y);
  causeBreakdown[desc.cause] = (causeBreakdown[desc.cause] || 0) + 1;

  if (!desc.label || desc.label.trim() === '') {
    emptyLabels++;
  }

  const isMountain = MOUNTAIN_TERRAINS.has(tile.terrainType || '');
  if (!isMountain) {
    if (desc.label.toLowerCase().includes('tebing')) {
      tebingOnNonMountain++;
    }
    if (desc.hint.toLowerCase().includes('pedang terbang untuk melintasi')) {
      flyingSwordOnNonMountain++;
    }
  }

  sampledTiles.push({
    x,
    y,
    terrainType: tile.terrainType,
    cause: desc.cause,
    label: desc.label,
    hint: desc.hint,
    isMountain
  });
}

console.log(`Total Petak Solid Disampling : ${sampledTiles.length} / ${TARGET_SAMPLES}`);
console.log(`Breakdown Penyebab Rintangan :`, causeBreakdown);
console.log(`Label Kosong / Null          : ${emptyLabels}`);
console.log(`Kata 'Tebing' pada Non-Gunung: ${tebingOnNonMountain}`);
console.log(`Hint Pedang pada Non-Gunung  : ${flyingSwordOnNonMountain}`);

const pass = (sampledTiles.length >= TARGET_SAMPLES) &&
             (tebingOnNonMountain === 0) &&
             (emptyLabels === 0) &&
             (flyingSwordOnNonMountain === 0);

console.log('='.repeat(70));
console.log(`STATUS GATE H2: ${pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('='.repeat(70));

const outputData = {
  timestamp: new Date().toISOString(),
  targetSamples: TARGET_SAMPLES,
  totalSampled: sampledTiles.length,
  causeBreakdown,
  metrics: {
    emptyLabels,
    tebingOnNonMountain,
    flyingSwordOnNonMountain
  },
  pass,
  samplePreview: sampledTiles.slice(0, 15)
};

fs.writeFileSync(
  path.join(RAW_DIR, 'blockers_audit.json'),
  JSON.stringify(outputData, null, 2),
  'utf8'
);

console.log('[OUTPUT] Hasil audit disimpan ke review/v24_raw/blockers_audit.json');
if (!pass) process.exit(1);
