'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

const outDir = path.resolve(__dirname, '../../review/v18_p5_snow');
fs.mkdirSync(outDir, { recursive: true });

// Clear existing files
fs.readdirSync(outDir).forEach(f => {
  if (f.endsWith('.png') || f.endsWith('.json')) {
    try { fs.unlinkSync(path.join(outDir, f)); } catch {}
  }
});

const snowPoints = [
  { id: 'P11_xueshan', x: 2350, y: 4300, zoom: 1.4, road: true },
  { id: 'snow_rand_1', x: 2288, y: 4240, zoom: 1.0, road: false },
  { id: 'snow_rand_2', x: 2384, y: 4240, zoom: 1.0, road: false },
  { id: 'snow_rand_3', x: 2288, y: 4336, zoom: 1.0, road: false },
  { id: 'snow_rand_4', x: 2416, y: 4336, zoom: 1.0, road: false },
  { id: 'snow_rand_5', x: 2320, y: 4368, zoom: 1.0, road: false }
];

const shots = [];
for (const sp of snowPoints) {
  shots.push({
    name: sp.id,
    x: sp.x,
    y: sp.y,
    zoom: sp.zoom,
    grid: 0,
    ground: 'only'
  });
  if (sp.road) {
    shots.push({
      name: `${sp.id}_noroad`,
      x: sp.x,
      y: sp.y,
      zoom: sp.zoom,
      grid: 0,
      ground: 'only',
      noroad: 1,
      allowDuplicate: true
    });
  }
}

const shotsFile = path.resolve(__dirname, '../../review/v18_p5_snow_shots.json');
fs.writeFileSync(shotsFile, JSON.stringify(shots, null, 2), 'utf8');
console.log(`[evaluateP5Snow] Capturing ${shots.length} shots...`);

const captureScript = path.resolve(__dirname, '../captureWorld.cjs');
const capRes = spawnSync('node', [captureScript, shotsFile, outDir], { stdio: 'inherit' });
if (capRes.status !== 0) {
  console.error(`[evaluateP5Snow] captureWorld failed with code ${capRes.status}`);
  process.exit(capRes.status || 1);
}

console.log(`\n[evaluateP5Snow] Evaluating with locked verify_v18.py...`);
const verifyPy = path.resolve(__dirname, 'verify_v18.py');
let allPass = true;
const results = { road: {}, repeat: {}, seam: {} };

// 1. Evaluate P11 road
const p11With = path.join(outDir, 'P11_xueshan.png');
const p11No = path.join(outDir, 'P11_xueshan_noroad.png');
const roadOut = execSync(`python "${verifyPy}" road "${p11With}" "${p11No}" 1.4`, { encoding: 'utf8' }).trim();
const roadMetrics = JSON.parse(roadOut);
results.road['P11_xueshan'] = roadMetrics;

const holesPass = (roadMetrics.holes === 0);
const cvPass = (roadMetrics.widthCV <= 0.18);
const lobePass = (roadMetrics.lobeRatio <= 1.35);
const dlPass = (roadMetrics.dL >= -20.0 && roadMetrics.dL <= -10.0);
const satPass = (roadMetrics.sat <= 0.12);
const bmrPass = (roadMetrics.BminusR <= 18);
const roadPass = holesPass && cvPass && lobePass && dlPass && satPass && bmrPass;
if (!roadPass) allPass = false;

console.log(`\n--- Snow Road Evaluation (P11) ---`);
console.log(`holes=${roadMetrics.holes} (req:0) -> ${holesPass ? 'PASS' : 'FAIL'}`);
console.log(`widthCV=${roadMetrics.widthCV} (<=0.18) -> ${cvPass ? 'PASS' : 'FAIL'}`);
console.log(`lobeRatio=${roadMetrics.lobeRatio} (<=1.35) -> ${lobePass ? 'PASS' : 'FAIL'}`);
console.log(`dL=${roadMetrics.dL} ([-20, -10]) -> ${dlPass ? 'PASS' : 'FAIL'}`);
console.log(`sat=${roadMetrics.sat} (<=0.12) -> ${satPass ? 'PASS' : 'FAIL'}`);
console.log(`BminusR=${roadMetrics.BminusR} (<=18) -> ${bmrPass ? 'PASS' : 'FAIL'}`);
console.log(`Overall Snow Road: ${roadPass ? 'PASS' : 'FAIL'}`);

// 2. Evaluate repeat and seam on all snow points
console.log(`\n--- Snow Texture Repeat & Seam Evaluation ---`);
for (const sp of snowPoints) {
  const shotPath = path.join(outDir, `${sp.id}.png`);
  const repOut = execSync(`python "${verifyPy}" repeat "${shotPath}" ${sp.zoom}`, { encoding: 'utf8' }).trim();
  const repMetrics = JSON.parse(repOut);
  results.repeat[sp.id] = repMetrics;

  const repPass = (repMetrics.maxAutocorr <= 0.35);
  if (!repPass) allPass = false;

  // Seam test at chunk boundary x=857 (for 1280 wide canvas, boundary at x=857 when camX % 32 == 16)
  const seamOut = execSync(`python "${verifyPy}" seam "${shotPath}" ${sp.zoom} 857`, { encoding: 'utf8' }).trim();
  const seamMetrics = JSON.parse(seamOut);
  results.seam[sp.id] = seamMetrics;

  const seamPass = (seamMetrics.ratio <= 1.30);
  if (!seamPass) allPass = false;

  console.log(`- ${sp.id}: maxAutocorr=${repMetrics.maxAutocorr} (<=0.35) [${repPass ? 'PASS' : 'FAIL'}], seamRatio=${seamMetrics.ratio} (<=1.30) [${seamPass ? 'PASS' : 'FAIL'}]`);
}

const metricsFile = path.resolve(__dirname, '../../review/v18_p5_snow_metrics.json');
fs.writeFileSync(metricsFile, JSON.stringify(results, null, 2), 'utf8');

console.log(`\n======================================================`);
console.log(`Phase P5 Snow Evaluation: ${allPass ? 'ALL PASS (100%)' : 'SOME CHECKS FAILED'}`);
process.exit(allPass ? 0 : 1);
