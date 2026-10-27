/**
 * scripts/checkAssetCoverage.js
 * Verification of Master Asset Coverage & Boss Sprites (Prompt I3)
 *
 * Scans:
 * - Every 3rd chunk across the active world
 * - Viewport +/- 60 tiles around all 52 anchors
 * - All 29 regional boss lairs
 * - Road network corridors
 *
 * Invariant Targets:
 * 1. Missing frames in atlas = 0 (all emitted objects exist in atlas).
 * 2. Non-excluded families (109 families): >= 95% appear >= 3 times.
 * 3. Remaining families (<= 5) documented with explicit reasons.
 */

const fs = require('fs');
const path = require('path');
const { getChunkObjects, KNOWN_FRAMES } = require('../utils/objectScatter');
const worldData = require('../utils/worldData');
const bestiaryData = require('../world-data/bestiary-v2.json');

console.log('\n=== AUDIT CAKUPAN KELUARGA ASET & SPRITE BOSS (checkAssetCoverage.js) ===\n');

// 1. Load Baseline & Asset Rules
const baselinePath = path.resolve(__dirname, '../review/asset_coverage_baseline.json');
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

const isInterior = f => f.startsWith('structure_interior_');
const isLegacy = f => ['building_pagoda_tower', 'building_sect_gate', 'building_road_inn', 'building_farm_hut', 'building_stone_torii', 'building_tea_pavilion'].includes(f);
const isMount = f => f.startsWith('mount_');

const nonExcluded = baseline.unused.filter(x => !isInterior(x.family) && !isLegacy(x.family) && !isMount(x.family));
const nonExcludedMap = new Map();
for (const item of nonExcluded) {
  nonExcludedMap.set(item.family, item);
}

const TOTAL_TARGET_FAMILIES = nonExcluded.length; // Exactly 109

// 2. Build Exhaustive Scan Chunk Set
const chunksToScan = new Set();

// 2a. Every 3rd chunk across playable bounds [10..145]
for (let cy = 10; cy <= 145; cy += 3) {
  for (let cx = 10; cx <= 145; cx += 3) {
    chunksToScan.add(`${cx},${cy}`);
  }
}

// 2b. Viewport +/- 60 tiles around all 52 anchors
const anchors = worldData.getAnchors();
for (const a of anchors) {
  const minCx = Math.floor((a.x - 60) / 32);
  const maxCx = Math.floor((a.x + 60) / 32);
  const minCy = Math.floor((a.y - 60) / 32);
  const maxCy = Math.floor((a.y + 60) / 32);
  for (let cy = minCy; cy <= maxCy; cy++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      chunksToScan.add(`${cx},${cy}`);
    }
  }
}

// 2c. All 29 Boss Lair chunks
for (const [regId, regData] of Object.entries(bestiaryData)) {
  if (regData.boss && regData.boss.lair) {
    const cx = Math.floor(regData.boss.lair.centerX / 32);
    const cy = Math.floor(regData.boss.lair.centerY / 32);
    chunksToScan.add(`${cx},${cy}`);
    chunksToScan.add(`${cx + 1},${cy}`);
    chunksToScan.add(`${cx - 1},${cy}`);
    chunksToScan.add(`${cx},${cy + 1}`);
    chunksToScan.add(`${cx},${cy - 1}`);
  }
}

// 2d. Road Corridors
const authoredPath = path.resolve(__dirname, '../world-data/authored-props.json');
if (fs.existsSync(authoredPath)) {
  const authored = JSON.parse(fs.readFileSync(authoredPath, 'utf8'));
  for (const r of authored.roads || []) {
    const minX = Math.min(r.from.x, r.to.x);
    const maxX = Math.max(r.from.x, r.to.x);
    const minY = Math.min(r.from.y, r.to.y);
    const maxY = Math.max(r.from.y, r.to.y);
    for (let y = minY; y <= maxY; y += 16) {
      for (let x = minX; x <= maxX; x += 16) {
        chunksToScan.add(`${Math.floor(x / 32)},${Math.floor(y / 32)}`);
      }
    }
  }
}

// 2e. Azure Mountain Passes
chunksToScan.add(`${Math.floor(2200 / 32)},${Math.floor(3350 / 32)}`);
chunksToScan.add(`${Math.floor(2600 / 32)},${Math.floor(3350 / 32)}`);
chunksToScan.add(`${Math.floor(3100 / 32)},${Math.floor(3200 / 32)}`);

console.log(`Total Chunk yang Dipindai : ${chunksToScan.size} chunk`);
console.log(`Total Keluarga Target     : ${TOTAL_TARGET_FAMILIES} keluarga (109 non-eksklusi)\n`);

// 3. Scan & Count Occurrences
const familyCounts = new Map();
const familyContexts = new Map();
let missingFramesCount = 0;
const missingFramesList = [];

let scanned = 0;
for (const key of chunksToScan) {
  scanned++;
  if (scanned % 500 === 0 || scanned === chunksToScan.size) {
    process.stdout.write(`  [Progress] Memindai ${scanned} / ${chunksToScan.size} chunk...\r`);
  }
  const [cx, cy] = key.split(',').map(Number);
  const objs = getChunkObjects(cx, cy);

  for (const obj of objs) {
    // Verify atlas frame existence
    if (!KNOWN_FRAMES.has(obj.defId)) {
      missingFramesCount++;
      missingFramesList.push({ defId: obj.defId, chunk: key });
    }

    // Match family
    if (nonExcludedMap.has(obj.defId)) {
      const cur = familyCounts.get(obj.defId) || 0;
      familyCounts.set(obj.defId, cur + 1);

      if (!familyContexts.has(obj.defId)) {
        familyContexts.set(obj.defId, (obj.tags || []).join(', ') || 'world_scatter');
      }
    }
  }
}

// 4. Evaluate Threshold (>= 3 occurrences)
let passedCount = 0;
const underTarget = [];

for (const [family, info] of nonExcludedMap.entries()) {
  const count = familyCounts.get(family) || 0;
  if (count >= 3) {
    passedCount++;
  } else {
    let reason = 'Under-represented in scan domain';
    if (family === 'xitong_city_landmark') reason = 'Hanya ada 1 di anchor Xitong City (Grand Landmark)';
    else if (family.includes('archway')) reason = 'Tepat 3 celah pegunungan Azure';
    underTarget.push({ family, category: info.category, count, reason });
  }
}

const coveragePct = ((passedCount / TOTAL_TARGET_FAMILIES) * 100).toFixed(1);

// 5. Print Results Table
console.log('| Family | Kategori | Jumlah | Konteks / Status |');
console.log('|---|---|---|---|');

for (const [family, info] of nonExcludedMap.entries()) {
  const count = familyCounts.get(family) || 0;
  const ctx = familyContexts.get(family) || (count < 3 ? 'Kekurangan kemunculan' : 'Aktif');
  const status = count >= 3 ? `PASS (${count})` : `UNDER (${count})`;
  console.log(`| ${family} | ${info.category} | ${count} | ${status} — ${ctx} |`);
}

console.log('\n----------------------------------------------------------------');
console.log(`Ringkasan Audit Cakupan Aset:`);
console.log(`Target Keluarga Non-Eksklusi: ${TOTAL_TARGET_FAMILIES}`);
console.log(`Keluarga Muncul >= 3 Kali   : ${passedCount} (${coveragePct}%) (Target >= 95.0%)`);
console.log(`Keluarga < 3 Kali           : ${underTarget.length} (Maks <= 5)`);
console.log(`Missing Atlas Frames        : ${missingFramesCount} (Target = 0)`);
console.log('----------------------------------------------------------------\n');

if (underTarget.length > 0) {
  console.log('Daftar Keluarga < 3 Kemunculan Beserta Alasan:');
  for (const u of underTarget) {
    console.log(` - ${u.family} (${u.count}x): ${u.reason}`);
  }
  console.log('');
}

let failed = false;
if (missingFramesCount > 0) {
  console.error(`[FAIL] Ditemukan ${missingFramesCount} frame objek yang hilang dari atlas!`);
  failed = true;
}

if (parseFloat(coveragePct) < 95.0) {
  console.error(`[FAIL] Cakupan aset ${coveragePct}% di bawah target 95.0%!`);
  failed = true;
}

if (underTarget.length > 5) {
  console.error(`[FAIL] Terlalu banyak keluarga di bawah 3 kemunculan (${underTarget.length} > 5)!`);
  failed = true;
}

if (failed) {
  console.error('\nAUDIT CAKUPAN ASET GAGAL (EXIT 1)\n');
  process.exit(1);
} else {
  console.log(`\n[PASS] Cakupan aset ${coveragePct}% memenuhi target >= 95% dan 0 missing frames! (EXIT 0)\n`);
  process.exit(0);
}
