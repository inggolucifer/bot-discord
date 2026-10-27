/**
 * scripts/auditV10.js
 * MASTER BATTERY VERIFIER V10 (Prompt L1)
 *
 * Runs all 15 authoritative verification gates sequentially:
 *  1. auditGridV10.js           — Grid contract, bbox, insideChunk, footprint/canopy separation
 *  2. testRenderRect.mjs        — 2,000 objects renderRect zero bottom-edge deviation
 *  3. checkRoadsV10.js          — 1,211 road segments, zero solid overlap, width invariance
 *  4. checkRoadGrid.cjs         — Road cross-section alignment to multiples of 54px
 *  5. checkAssetCoverage.js     — >= 95% target families appearing >= 3x, 0 missing atlas frames
 *  6. checkRegionPalette.js     — 0 forbidden objects across 29 regions, >= 16 families, <= 20% dominance
 *  7. checkChallengeDressing.js — 145/145 challenge nodes surrounded by >= 3 dressing objects
 *  8. checkGroundV10.mjs        — Ground manifest integrity, autotile frames, ac54 < 0.35
 *  9. checkAuthored.js          — 576 props, 52/52 fingerprints, village connectivity
 * 10. checkFerry.js             — All 6 ferry routes valid, non-solid, synchronized
 * 11. checkLairs.js             — All 29 boss lairs 0.0% solid, canonical region match
 * 12. checkBestiaryUnique.js    — 87 commons, 29 elites, 29 boss IDs 100% unique
 * 13. testChallenge.js          — 8 gates of challenge system (determinism, density, BFS, etc.)
 * 14. testHazard.js             — Regional environmental hazard tick engine & immunity
 * 15. audit_world_v9.js         — Comprehensive 5-table overworld ecosystem audit
 *
 * Exits 0 only if ALL 15 gates PASS. Exits 1 on any failure.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('================================================================================');
console.log('       JIANGHU WORLD — IMMORTAL-X MASTER V10 BATTERY AUDIT (auditV10.js)        ');
console.log('================================================================================\n');

const GATES = [
  { id: '1. Grid Contract Engine', script: 'node scripts/auditGridV10.js' },
  { id: '2. Render Rect Precision', script: 'node scripts/testRenderRect.mjs' },
  { id: '3. Road Structure & Solid Rejection', script: 'node scripts/checkRoadsV10.js' },
  { id: '4. Road Grid Alignment (54px)', script: 'node scripts/checkRoadGrid.cjs' },
  { id: '5. Asset Coverage & Boss Sprites', script: 'node scripts/checkAssetCoverage.js' },
  { id: '6. Region Palettes & Identity', script: 'node scripts/checkRegionPalette.js' },
  { id: '7. Challenge Dressing Set-pieces', script: 'node scripts/checkChallengeDressing.js' },
  { id: '8. Ground Renderer & Autotiling', script: 'node scripts/checkGroundV10.mjs' },
  { id: '9. Authored Villages & Road Spurs', script: 'node scripts/checkAuthored.js' },
  { id: '10. Ferry Routes & Port Terminals', script: 'node scripts/checkFerry.js' },
  { id: '11. Regional Boss Lair Clearing', script: 'node scripts/checkLairs.js' },
  { id: '12. Bestiary Species Uniqueness', script: 'node scripts/checkBestiaryUnique.js' },
  { id: '13. Challenge Layer 8-Gate Battery', script: 'node scripts/testChallenge.js' },
  { id: '14. Regional Hazard Damage Engine', script: 'node scripts/testHazard.js' },
  { id: '15. Overworld Ecosystem 5-Table Audit', script: 'node scripts/audit_world_v9.js' }
];

const results = [];
let overallFailed = false;
const startTime = Date.now();

for (let i = 0; i < GATES.length; i++) {
  const g = GATES[i];
  const gateNum = i + 1;
  process.stdout.write(`[GATE ${gateNum.toString().padStart(2, '0')}/15] Menjalankan ${g.id}... `);

  const t0 = Date.now();
  try {
    const stdout = execSync(g.script, {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const durMs = Date.now() - t0;
    console.log(`[PASS] (${(durMs / 1000).toFixed(1)}s)`);
    results.push({ gateNum, id: g.id, status: 'PASS', duration: durMs });
  } catch (err) {
    const durMs = Date.now() - t0;
    console.log(`[FAIL] (${(durMs / 1000).toFixed(1)}s)`);
    console.error(`\n--- ERROR OUTPUT (${g.id}) ---`);
    console.error(err.stdout || err.stderr || err.message);
    console.error('------------------------------------\n');
    results.push({ gateNum, id: g.id, status: 'FAIL', duration: durMs });
    overallFailed = true;
  }
}

const totalDurationSec = ((Date.now() - startTime) / 1000).toFixed(1);

console.log('\n================================================================================');
console.log('                          RINGKASAN AUDIT MASTER V10                            ');
console.log('================================================================================');
console.log('| No | Nama Gerbang Verifikasi | Durasi | Status |');
console.log('|---|---|---|---|');
for (const r of results) {
  console.log(`| ${r.gateNum.toString().padStart(2, '0')} | ${r.id.padEnd(40, ' ')} | ${(r.duration / 1000).toFixed(1).padStart(5, ' ')}s | ${r.status} |`);
}
console.log('================================================================================');
console.log(`Total Durasi Audit: ${totalDurationSec} detik`);
console.log(`Hasil Keseluruhan : ${overallFailed ? 'GAGAL (EXIT 1)' : '100% LULUS (EXIT 0)'}`);
console.log('================================================================================\n');

if (overallFailed) {
  process.exit(1);
} else {
  process.exit(0);
}
