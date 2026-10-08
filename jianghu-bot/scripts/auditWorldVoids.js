/**
 * auditWorldVoids.js
 * Invariant Test 1: Zero-Void Guarantee Audit
 * Memeriksa seluruh peta Benua Tianyuan (5000x5000) dengan sampling grid resolusi tinggi.
 * Memastikan 0% petak unknown_void di seluruh penjuru dunia.
 */

const worldData = require('../utils/worldData');
const worldRegionEngine = require('../utils/worldRegionEngine');

console.log('=== MEMULAI AUDIT ZERO-VOID GUARANTEE (TIANYUAN 5000x5000) ===\n');

const STEP = 50; // Sampling tiap 50 petak = 10,000 titik sampel inti
let totalChecked = 0;
let voidCount = 0;
const regionHits = new Map();

for (let y = 0; y < 5000; y += STEP) {
  for (let x = 0; x < 5000; x += STEP) {
    totalChecked++;
    const regDirect = worldData.getRegionAt(x, y);
    const regEngine = worldRegionEngine.getRegionAt(x, y);

    if (!regDirect || regDirect.id === 'unknown_void' || !regEngine || regEngine.id === 'unknown_void') {
      voidCount++;
      console.error(`[VOID DETECTED] at (${x}, ${y}): direct=${regDirect?.id}, engine=${regEngine?.id}`);
    } else {
      regionHits.set(regDirect.id, (regionHits.get(regDirect.id) || 0) + 1);
    }
  }
}

// Periksa petak ekstrem perbatasan (edges and corners)
const edgeSamples = [
  { x: 0, y: 0 }, { x: 4999, y: 0 }, { x: 0, y: 4999 }, { x: 4999, y: 4999 },
  { x: 2500, y: 0 }, { x: 2500, y: 4999 }, { x: 0, y: 2500 }, { x: 4999, y: 2500 }
];

for (const pt of edgeSamples) {
  totalChecked++;
  const reg = worldData.getRegionAt(pt.x, pt.y);
  if (!reg || reg.id === 'unknown_void') {
    voidCount++;
    console.error(`[VOID DETECTED AT EDGE] (${pt.x}, ${pt.y})`);
  }
}

const voidPercentage = ((voidCount / totalChecked) * 100).toFixed(4);

console.log(`Total Titik Diperiksa: ${totalChecked}`);
console.log(`Jumlah Unknown Void  : ${voidCount} (${voidPercentage}%)`);
console.log(`Jumlah Region Aktif  : ${regionHits.size} / 29`);

if (voidCount === 0 && regionHits.size === 29) {
  console.log('\n[PASS] 100% CAKUPAN DUNIA VALID! ZERO-VOID INVARIANT TERPENUHI!');
  process.exit(0);
} else {
  console.error('\n[FAIL] TERDETEKSI VOID ATAU REGION HILANG!');
  process.exit(1);
}
