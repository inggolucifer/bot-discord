/**
 * scripts/v25/simCharms.js
 * Simulasi Efektivitas Jimat Pengusir & Penarik Monster (20.000 Langkah, PRNG Mulberry32 Seed 1618)
 * Menghasilkan review/v25_raw/charms_sim.json
 */

const fs = require('fs');
const path = require('path');
const { calculateEffectiveAmbushRisk } = require('../../utils/monsterSpawnEngine');

// PRNG Mulberry32 deterministik
function Mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function runSimulation() {
  const steps = 20000;
  const baseRisk = 0.08; // 8%

  // 1. Baseline (Tanpa Jimat)
  const rngBase = Mulberry32(1618);
  let baseEncounters = 0;
  const baseRate = calculateEffectiveAmbushRisk(baseRisk, {});
  for (let i = 0; i < steps; i++) {
    if (rngBase() < baseRate) baseEncounters++;
  }
  const actualBaseRate = baseEncounters / steps;

  // 2. Jimat Pengusir (Repellent: -50%)
  const rngRep = Mulberry32(1618);
  let repEncounters = 0;
  const repRate = calculateEffectiveAmbushRisk(baseRisk, { repellentActive: true, repellentRate: 0.50 });
  for (let i = 0; i < steps; i++) {
    if (rngRep() < repRate) repEncounters++;
  }
  const actualRepRate = repEncounters / steps;

  // 3. Jimat Penarik (Attraction: +75%)
  const rngAtt = Mulberry32(1618);
  let attEncounters = 0;
  const attRate = calculateEffectiveAmbushRisk(baseRisk, { attractionActive: true, attractionRate: 0.75 });
  for (let i = 0; i < steps; i++) {
    if (rngAtt() < attRate) attEncounters++;
  }
  const actualAttRate = attEncounters / steps;

  // Validasi toleransi ± 15% dari ekspektasi teoritis
  const repExpected = 0.04;
  const attExpected = 0.14;
  const repErrorPct = Math.abs(actualRepRate - repExpected) / repExpected * 100;
  const attErrorPct = Math.abs(actualAttRate - attExpected) / attExpected * 100;

  const pass = repErrorPct <= 15 && attErrorPct <= 15;

  const result = {
    steps,
    seed: 1618,
    base: {
      theoreticalRate: baseRisk,
      effectiveRate: baseRate,
      encounters: baseEncounters,
      actualRate: Number(actualBaseRate.toFixed(4))
    },
    repellent: {
      theoreticalRate: repExpected,
      effectiveRate: repRate,
      encounters: repEncounters,
      actualRate: Number(actualRepRate.toFixed(4)),
      errorPct: Number(repErrorPct.toFixed(2)),
      toleranceMet: repErrorPct <= 15
    },
    attraction: {
      theoreticalRate: attExpected,
      effectiveRate: attRate,
      encounters: attEncounters,
      actualRate: Number(actualAttRate.toFixed(4)),
      errorPct: Number(attErrorPct.toFixed(2)),
      toleranceMet: attErrorPct <= 15
    },
    allPass: pass,
    timestamp: new Date().toISOString()
  };

  const outDir = path.resolve(__dirname, '../../review/v25_raw');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, 'charms_sim.json');
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf8');

  console.log(`[V25 K4] Simulasi Jimat (20.000 langkah):`);
  console.log(`  Baseline   : ${(actualBaseRate * 100).toFixed(2)}% (${baseEncounters} pertemuan)`);
  console.log(`  Repellent  : ${(actualRepRate * 100).toFixed(2)}% (${repEncounters} pertemuan, deviasi: ${repErrorPct.toFixed(2)}%)`);
  console.log(`  Attraction : ${(actualAttRate * 100).toFixed(2)}% (${attEncounters} pertemuan, deviasi: ${attErrorPct.toFixed(2)}%)`);
  console.log(`  Status     : ${pass ? 'PASS (Dalam toleransi ±15%)' : 'FAIL'}`);

  return result;
}

if (require.main === module) {
  runSimulation();
}

module.exports = { runSimulation };
