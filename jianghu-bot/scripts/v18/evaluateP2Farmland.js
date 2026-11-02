'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const OUT_DIR = path.resolve(PROJECT_ROOT, 'review/v18_p2_farmland');
fs.mkdirSync(OUT_DIR, { recursive: true });

const shots = [
  { name: 'P04_farm', x: 2450, y: 2450, zoom: 1.4, grid: 0, ground: 'only' },
  { name: 'P16_west_farm', x: 1800, y: 2400, zoom: 1.4, grid: 0, ground: 'only' },
  { name: 'farm_rand_1', x: 2477, y: 2505, zoom: 1.4, grid: 0, ground: 'only' },
  { name: 'farm_rand_2', x: 1779, y: 2321, zoom: 1.4, grid: 0, ground: 'only' },
  { name: 'farm_rand_3', x: 2341, y: 2445, zoom: 1.4, grid: 0, ground: 'only' },
  { name: 'farm_rand_4', x: 2215, y: 2444, zoom: 1.4, grid: 0, ground: 'only' },
  { name: 'farm_rand_5', x: 2223, y: 2509, zoom: 1.4, grid: 0, ground: 'only' }
];

const shotsFile = path.resolve(OUT_DIR, 'farmland_shots.json');
fs.writeFileSync(shotsFile, JSON.stringify(shots, null, 2), 'utf8');

console.log('[evaluateP2Farmland] Capturing 7 farmland shots...');
const captureScript = path.resolve(__dirname, '../captureWorld.cjs');
const capRes = spawnSync('node', [captureScript, shotsFile, OUT_DIR], { stdio: 'inherit' });
if (capRes.status !== 0) {
  console.error('[evaluateP2Farmland] captureWorld failed with status:', capRes.status);
  process.exit(1);
}

console.log('[evaluateP2Farmland] Evaluating with locked verify_v18.py farm...');
const VERIFY_PY = path.resolve(__dirname, 'verify_v18.py');
const results = {};
let allPassed = true;

for (const s of shots) {
  const p = path.join(OUT_DIR, `${s.name}.png`);
  const vRes = spawnSync('python', [VERIFY_PY, 'farm', p], { cwd: PROJECT_ROOT, encoding: 'utf8' });
  if (vRes.status !== 0) {
    console.error(`[evaluateP2Farmland] Error evaluating ${s.name}:`, vRes.stderr);
    results[s.name] = { error: vRes.stderr };
    allPassed = false;
    continue;
  }
  const m = JSON.parse(vRes.stdout.trim());
  const passGreen = m.green >= 0.80;
  const passBrown = m.brown <= 0.08;
  const passWater = m.water <= 0.10;
  const passed = passGreen && passBrown && passWater;
  if (!passed) allPassed = false;

  results[s.name] = {
    ...m,
    passGreen,
    passBrown,
    passWater,
    passed
  };
  console.log(`  ${s.name}: green=${m.green} (>=0.80:${passGreen}), brown=${m.brown} (<=0.08:${passBrown}), water=${m.water} (<=0.10:${passWater}) -> ${passed ? 'PASS' : 'FAIL'}`);
}

const outFile = path.resolve(PROJECT_ROOT, 'review/v18_p2_farmland_metrics.json');
fs.writeFileSync(outFile, JSON.stringify({ timestamp: new Date().toISOString(), allPassed, results }, null, 2), 'utf8');
console.log(`[evaluateP2Farmland] Results written to ${outFile}`);

if (!allPassed) {
  console.error('[GATE P2 FAILED] One or more farmland points failed Gate P2!');
  process.exit(1);
} else {
  console.log('[GATE P2 PASS] All 7 farmland points passed Gate P2!');
}
