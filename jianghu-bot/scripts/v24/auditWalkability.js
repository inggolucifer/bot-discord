#!/usr/bin/env node
/**
 * scripts/v24/auditWalkability.js
 * Verifikasi Kebijakan Keterjangkauan Medan & De-solidifikasi Danau/Gletser (V24 H4)
 */

const fs = require('fs');
const path = require('path');
const proceduralWorldEngine = require('../../utils/proceduralWorldEngine');
const policyDoc = require('../../world-data/walkability-policy-v24.json');

const RAW_DIR = path.resolve(__dirname, '../../review/v24_raw');
if (!fs.existsSync(RAW_DIR)) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
}

console.log('='.repeat(70));
console.log(' AUDIT KETERJANGKAUAN MEDAN V24 (GATE H4)');
console.log('='.repeat(70));

const STEP = 25;
let totalSampled = 0;
let lakeTotal = 0;
let solidLakeTotal = 0;
let glacierTotal = 0;
let solidGlacierTotal = 0;

const solidTerrainsDistribution = {};

for (let y = 0; y < 5000; y += STEP) {
  for (let x = 0; x < 5000; x += STEP) {
    totalSampled++;
    const tile = proceduralWorldEngine.getTileAt(x, y);

    if (tile.isSolid) {
      const tt = tile.terrainType || 'unknown';
      solidTerrainsDistribution[tt] = (solidTerrainsDistribution[tt] || 0) + 1;
    }

    if (tile.terrainType === 'lake') {
      lakeTotal++;
      if (tile.isSolid) solidLakeTotal++;
    }

    if (tile.terrainType === 'glacier') {
      glacierTotal++;
      if (tile.isSolid) solidGlacierTotal++;
    }
  }
}

// Verifikasi 4 Celah Gunung (Mountain Passes)
const passSamples = [
  { name: 'Celah Lembah Barat', x: 1800, y: 2500 },
  { name: 'Celah Kabut Azure', x: 2600, y: 3350 },
  { name: 'Celah Jurang Pedang', x: 2201, y: 3354 },
  { name: 'Celah Perbatasan Utara', x: 2300, y: 1948 }
];

let passesWalkable = 0;
const passDetails = [];
for (const p of passSamples) {
  const tile = proceduralWorldEngine.getTileAt(p.x, p.y);
  const isWalkable = !tile.isSolid;
  if (isWalkable) passesWalkable++;
  passDetails.push({ ...p, terrain: tile.terrainType, isSolid: tile.isSolid, isWalkable });
}

console.log(`Total Grid Sampled (step=${STEP})    : ${totalSampled}`);
console.log(`Total Petak Danau (Lake) Ditemukan   : ${lakeTotal}`);
console.log(`Petak Danau Solid                    : ${solidLakeTotal} / ${lakeTotal}`);
console.log(`Total Petak Gletser Ditemukan        : ${glacierTotal}`);
console.log(`Petak Gletser Solid                  : ${solidGlacierTotal} / ${glacierTotal}`);
console.log(`Celah Gunung Walkable                : ${passesWalkable} / ${passSamples.length}`);
console.log(`Distribusi Medan Solid Sampled       :`, solidTerrainsDistribution);

const pass = (solidLakeTotal === 0) &&
             (solidGlacierTotal === 0) &&
             (passesWalkable === passSamples.length);

console.log('='.repeat(70));
console.log(`STATUS GATE H4: ${pass ? '✅ PASS' : '❌ FAIL'}`);
console.log('='.repeat(70));

const auditResult = {
  timestamp: new Date().toISOString(),
  step: STEP,
  totalSampled,
  metrics: {
    lakeTotal,
    solidLakeTotal,
    glacierTotal,
    solidGlacierTotal,
    passesWalkable,
    totalPasses: passSamples.length
  },
  passDetails,
  solidTerrainsDistribution,
  pass
};

fs.writeFileSync(
  path.join(RAW_DIR, 'walkability_audit.json'),
  JSON.stringify(auditResult, null, 2),
  'utf8'
);

console.log('[OUTPUT] Hasil audit disimpan ke review/v24_raw/walkability_audit.json');
if (!pass) process.exit(1);
