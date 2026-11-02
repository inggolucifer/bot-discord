'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const outDir = path.resolve(__dirname, '../../review/v18_p3_azure');
fs.mkdirSync(outDir, { recursive: true });
// Clear old shots so captureWorld captures fresh ones from the running server
for (const f of fs.readdirSync(outDir)) {
  if (f.endsWith('.png')) {
    fs.unlinkSync(path.join(outDir, f));
  }
}

const shots = [
  { name: 'P06_azure_pass', x: 2200, y: 3340, zoom: 1.0, grid: 0, ground: 'only' },
  { name: 'P07_azure_west', x: 1500, y: 3350, zoom: 1.0, grid: 0, ground: 'only' },
  { name: 'P08_azure_far_west', x: 800, y: 3350, zoom: 1.0, grid: 0, ground: 'only' },
  { name: 'P09_azure_east', x: 3300, y: 3350, zoom: 1.0, grid: 0, ground: 'only' },
  { name: 'P10_azure_mist', x: 2600, y: 3340, zoom: 1.0, grid: 0, ground: 'only' },
];

const shotsFile = path.resolve(__dirname, '../../review/v18_p3_shots.json');
fs.writeFileSync(shotsFile, JSON.stringify(shots, null, 2), 'utf8');

console.log('[evaluateP3Azure] Capturing P06..P10 shots...');
const captureScript = path.resolve(__dirname, '../captureWorld.cjs');
const capRes = spawnSync('node', [captureScript, shotsFile, outDir], { stdio: 'inherit' });
if (capRes.status !== 0) {
  console.error(`[evaluateP3Azure] captureWorld exited with code ${capRes.status}`);
  process.exit(capRes.status || 1);
}

const verifyScript = path.resolve(__dirname, 'verify_v18.py');
const results = {};
let allPassed = true;

for (const s of shots) {
  const shotPath = path.join(outDir, `${s.name}.png`);
  if (!fs.existsSync(shotPath)) {
    console.error(`Missing shot: ${shotPath}`);
    allPassed = false;
    continue;
  }

  // 1. band
  const bandProc = spawnSync('python', [verifyScript, 'band', shotPath, String(s.zoom)], { encoding: 'utf8' });
  const bandRes = JSON.parse(bandProc.stdout.trim());

  // 2. repeat
  const repProc = spawnSync('python', [verifyScript, 'repeat', shotPath, String(s.zoom)], { encoding: 'utf8' });
  const repRes = JSON.parse(repProc.stdout.trim());

  results[s.name] = {
    band: bandRes,
    repeat: repRes
  };

  // Check gate thresholds: moirePeakRatio <= 150, maxAutocorr <= 0.35
  const moirePass = bandRes.moirePeakRatio <= 150;
  const repPass = repRes.maxAutocorr <= 0.35;
  console.log(`[${s.name}] moirePeakRatio: ${bandRes.moirePeakRatio} (<=150? ${moirePass}), maxAutocorr: ${repRes.maxAutocorr} (<=0.35? ${repPass})`);

  if (!moirePass || !repPass) allPassed = false;
}

// 3. seam check at x=857 for P07
const p07Path = path.join(outDir, 'P07_azure_west.png');
const seamProc = spawnSync('python', [verifyScript, 'seam', p07Path, '1.0', '857'], { encoding: 'utf8' });
const seamRes = JSON.parse(seamProc.stdout.trim());
results['P07_azure_west'].seam_857 = seamRes;
const seamPass = seamRes.ratio <= 1.30;
console.log(`[P07 seam x=857] ratio: ${seamRes.ratio} (<=1.30? ${seamPass}) [jump: ${seamRes.seamJump}, base: ${seamRes.baseJump}]`);
if (!seamPass) allPassed = false;

// Write report
const rawOut = path.resolve(__dirname, '../../review/v18_p3_azure_metrics.json');
fs.writeFileSync(rawOut, JSON.stringify(results, null, 2), 'utf8');
console.log(`\nWritten metrics to ${rawOut}`);
console.log(`P3 Evaluation Result: ${allPassed ? 'ALL PASS' : 'FAILED'}`);

if (!allPassed) {
  process.exit(1);
}
