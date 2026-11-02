'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

const outDir = path.resolve(__dirname, '../../review/v18_p4_road');
fs.mkdirSync(outDir, { recursive: true });

// Remove any existing png files in outDir to prevent captureWorld skip
const existingFiles = fs.readdirSync(outDir);
for (const f of existingFiles) {
  if (f.endsWith('.png') || f.endsWith('.json')) {
    try { fs.unlinkSync(path.join(outDir, f)); } catch {}
  }
}

const roadPoints = [
  { id: 'P01_xingcun', x: 2050, y: 2650, zoom: 1.4 },
  { id: 'P02_xingcun_cross', x: 2062, y: 2648, zoom: 1.4 },
  { id: 'P13_road_h', x: 2040, y: 2651, zoom: 1.4 },
  { id: 'P14_road_v', x: 2053, y: 2648, zoom: 1.4 },
  { id: 'road_rand_1', x: 2057, y: 2649, zoom: 1.4 },
  { id: 'road_rand_2', x: 2000, y: 4254, zoom: 1.4 },
  { id: 'road_rand_3', x: 3100, y: 3094, zoom: 1.4 },
  { id: 'road_rand_4', x: 2350, y: 2891, zoom: 1.4 },
  { id: 'road_rand_5', x: 2053, y: 2645, zoom: 1.4 }
];

const shots = [];
for (const rp of roadPoints) {
  shots.push({
    name: rp.id,
    x: rp.x,
    y: rp.y,
    zoom: rp.zoom,
    grid: 0,
    ground: 'only'
  });
  shots.push({
    name: `${rp.id}_noroad`,
    x: rp.x,
    y: rp.y,
    zoom: rp.zoom,
    grid: 0,
    ground: 'only',
    noroad: 1,
    allowDuplicate: true
  });
}

const shotsFile = path.resolve(__dirname, '../../review/v18_p4_road_shots.json');
fs.writeFileSync(shotsFile, JSON.stringify(shots, null, 2), 'utf8');
console.log(`[evaluateP4Road] Capturing ${shots.length} shots (${roadPoints.length} pairs)...`);

const captureScript = path.resolve(__dirname, '../captureWorld.cjs');
const capRes = spawnSync('node', [captureScript, shotsFile, outDir], { stdio: 'inherit' });
if (capRes.status !== 0) {
  console.error(`[evaluateP4Road] captureWorld failed with code ${capRes.status}`);
  process.exit(capRes.status || 1);
}

console.log(`[evaluateP4Road] Evaluating with locked verify_v18.py road mode...`);
const verifyPy = path.resolve(__dirname, 'verify_v18.py');
let allPass = true;
const results = {};

for (const rp of roadPoints) {
  const withRoad = path.join(outDir, `${rp.id}.png`);
  const noRoad = path.join(outDir, `${rp.id}_noroad.png`);
  if (!fs.existsSync(withRoad) || !fs.existsSync(noRoad)) {
    console.error(`Missing shot pair for ${rp.id}`);
    allPass = false;
    continue;
  }
  const cmd = `python "${verifyPy}" road "${withRoad}" "${noRoad}" ${rp.zoom}`;
  const out = execSync(cmd, { encoding: 'utf8' }).trim();
  const m = JSON.parse(out);
  results[rp.id] = m;

  if (m.error) {
    console.error(`- ${rp.id}: ERROR: ${m.error}`);
    allPass = false;
    continue;
  }

  const holesPass = (m.holes === 0);
  const lobePass = (m.lobeRatio <= 1.35);
  const cvPass = (m.widthCV <= 0.18);
  const dlPass = (Math.abs(m.dL) >= 6.0);
  const pass = holesPass && lobePass && cvPass && dlPass;
  if (!pass) allPass = false;

  console.log(`- ${rp.id}: holes=${m.holes} (req:0), widthCV=${m.widthCV} (<=0.18), lobeRatio=${m.lobeRatio} (<=1.35), dL=${m.dL} (|dL|>=6.0) => ${pass ? 'PASS' : 'FAIL'}`);
}

const metricsOut = path.resolve(__dirname, '../../review/v18_p4_road_metrics.json');
fs.writeFileSync(metricsOut, JSON.stringify(results, null, 2), 'utf8');

console.log(`\n======================================================`);
console.log(`P4 Road Evaluation: ${allPass ? 'ALL PASS' : 'SOME CHECKS FAILED'}`);
console.log(`======================================================`);

if (!allPass) process.exit(1);
