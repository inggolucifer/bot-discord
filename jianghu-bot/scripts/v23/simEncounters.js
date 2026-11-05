#!/usr/bin/env node
/**
 * scripts/v23/simEncounters.js
 * Simulasi Pertemuan Monster Padang Terbuka (Gate E1)
 * 20.000 langkah acak per tier dengan PRNG deterministik (Mulberry32 seed 1618)
 * Toleransi: +- 15% dari nilai tabel G3.1
 */

const fs = require('fs');
const path = require('path');

const BOT_ROOT = path.resolve(__dirname, '../..');
const REVIEW_RAW = path.join(BOT_ROOT, 'review', 'v23_raw');

const worldRegionEngine = require('../../utils/worldRegionEngine');
const monsterSpawnEngine = require('../../utils/monsterSpawnEngine');
const regions = require('../../world-data/regions.json');

// PRNG Mulberry32
function Mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = Mulberry32(1618);
const STEPS_PER_TIER = 20000;

// Tabel target G3.1
const TARGET_RATES = {
  1: { target: 0.00, min: 0.00, max: 0.00 },
  2: { target: 0.04, min: 0.034, max: 0.046 },
  3: { target: 0.08, min: 0.068, max: 0.092 },
  4: { target: 0.15, min: 0.1275, max: 0.1725 },
  5: { target: 0.25, min: 0.2125, max: 0.2875 },
  6: { target: 0.35, min: 0.2975, max: 0.4025 }
};

const results = {
  gate: 'E1',
  description: 'Simulasi encounter 20.000 langkah per tier dalam toleransi +- 15%',
  seed: 1618,
  stepsPerTier: STEPS_PER_TIER,
  tiers: {},
  charms: {},
  passed: true
};

console.log('='.repeat(70));
console.log(' SIMULASI PERTEMUAN MONSTER V23 (GATE E1 — 20.000 LANGKAH/TIER)');
console.log('='.repeat(70));

for (let tier = 1; tier <= 6; tier++) {
  const targetSpec = TARGET_RATES[tier];
  const region = regions.find(r => r.dangerTier === tier);
  const cx = Math.round((region.bounds.minX + region.bounds.maxX) / 2);
  const cy = Math.round((region.bounds.minY + region.bounds.maxY) / 2);

  // Periksa base risk rate untuk plains di wilayah ini
  const tInfo = worldRegionEngine.getTerritoryInfo(cx, cy, 'plains', false);
  const baseRate = tInfo.ambushRiskRate;

  let encounters = 0;
  for (let s = 0; s < STEPS_PER_TIER; s++) {
    const roll = rng();
    if (roll < baseRate) {
      encounters++;
    }
  }

  const actualRate = encounters / STEPS_PER_TIER;
  let tierPassed = false;
  if (targetSpec.target === 0) {
    tierPassed = (actualRate === 0);
  } else {
    tierPassed = (actualRate >= targetSpec.min && actualRate <= targetSpec.max);
  }

  if (!tierPassed) {
    results.passed = false;
  }

  const deviationPct = targetSpec.target === 0
    ? 0
    : Math.round(((actualRate - targetSpec.target) / targetSpec.target) * 1000) / 10;

  results.tiers[tier] = {
    target: targetSpec.target,
    actual: Math.round(actualRate * 10000) / 10000,
    encounters,
    totalSteps: STEPS_PER_TIER,
    allowedMin: targetSpec.min,
    allowedMax: targetSpec.max,
    deviationPct,
    passed: tierPassed
  };

  const status = tierPassed ? '✅ PASS' : '❌ FAIL';
  console.log(`Tier ${tier}: Target = ${(targetSpec.target * 100).toFixed(1)}% | Aktual = ${(actualRate * 100).toFixed(2)}% (${encounters}/${STEPS_PER_TIER}) | Dev = ${deviationPct > 0 ? '+' : ''}${deviationPct}% | ${status}`);
}

// Simulasi Efek Jimat pada Tier 4 (Base 0.15)
console.log('-'.repeat(70));
console.log(' SIMULASI JIMAT MITIGASI & PENARIK MONSTER (TIER 4)');
console.log('-'.repeat(70));

const charmScenarios = [
  { name: 'repellent', label: 'Jimat Pengusir (-50%)', charms: { repellentActive: true }, expected: 0.075 },
  { name: 'attraction', label: 'Jimat Penarik (+75%)', charms: { attractionActive: true }, expected: 0.2625 }
];

for (const sc of charmScenarios) {
  const baseRate = 0.15;
  const effectiveRate = monsterSpawnEngine.calculateEffectiveAmbushRisk(baseRate, sc.charms);
  let encounters = 0;
  for (let s = 0; s < STEPS_PER_TIER; s++) {
    if (rng() < effectiveRate) {
      encounters++;
    }
  }
  const actualRate = encounters / STEPS_PER_TIER;
  const minAllowed = sc.expected * 0.85;
  const maxAllowed = sc.expected * 1.15;
  const charmPassed = actualRate >= minAllowed && actualRate <= maxAllowed;
  const devPct = Math.round(((actualRate - sc.expected) / sc.expected) * 1000) / 10;

  if (!charmPassed) results.passed = false;

  results.charms[sc.name] = {
    expected: sc.expected,
    actual: Math.round(actualRate * 10000) / 10000,
    encounters,
    allowedMin: Math.round(minAllowed * 10000) / 10000,
    allowedMax: Math.round(maxAllowed * 10000) / 10000,
    deviationPct: devPct,
    passed: charmPassed
  };

  const status = charmPassed ? '✅ PASS' : '❌ FAIL';
  console.log(`${sc.label}: Expected = ${(sc.expected * 100).toFixed(2)}% | Aktual = ${(actualRate * 100).toFixed(2)}% | Dev = ${devPct > 0 ? '+' : ''}${devPct}% | ${status}`);
}

console.log('='.repeat(70));
console.log(`STATUS GERBANG E1: ${results.passed ? '🎉 PASS SEMUA UJI' : '❌ GAGAL'}`);
console.log('='.repeat(70));

// Simpan output ke review/v23_raw/encounters.json
if (!fs.existsSync(REVIEW_RAW)) {
  fs.mkdirSync(REVIEW_RAW, { recursive: true });
}
const outFile = path.join(REVIEW_RAW, 'encounters.json');
fs.writeFileSync(outFile, JSON.stringify(results, null, 2), 'utf8');
console.log(`[OUTPUT] Hasil simulasi disimpan ke: ${outFile}`);

if (require.main === module && !results.passed) {
  process.exit(1);
}
