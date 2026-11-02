'use strict';
/**
 * scripts/v19/testFarmlandF3.js
 * Captures farmland benchmarks and executes:
 * 1. scripts/v18/verify_v18.py farm (green >= 0.80, brown <= 0.08, water <= 0.10)
 * 2. scripts/v19/checkTexture.py (stddev >= 4.0, dark_components_over_1cell == 0)
 * Saves full verification output to review/v19_raw/f3_texture.json
 */
const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

const outDir = path.resolve(__dirname, '../../review/shots_v19');
fs.mkdirSync(outDir, { recursive: true });
const rawDir = path.resolve(__dirname, '../../review/v19_raw');
fs.mkdirSync(rawDir, { recursive: true });

const points = [
  { name: 'P04_farm', x: 2450, y: 2450, zoom: 1.4 },
  { name: 'farm_rand_1', x: 2477, y: 2505, zoom: 1.4 },
  { name: 'farm_rand_2', x: 1779, y: 2321, zoom: 1.4 },
  { name: 'farm_rand_3', x: 2341, y: 2445, zoom: 1.4 },
  { name: 'farm_rand_4', x: 2215, y: 2444, zoom: 1.4 }, // P16
  { name: 'farm_rand_5', x: 2223, y: 2509, zoom: 1.4 },
];

function captureAll() {
  const shots = points.map(pt => ({
    name: pt.name,
    x: pt.x,
    y: pt.y,
    zoom: pt.zoom,
    grid: 0,
    ground: 'only',
    allowDuplicate: true
  }));

  const manifestPath = path.join(rawDir, 'f3_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(shots, null, 2), 'utf8');

  const captureScript = path.resolve(__dirname, '../captureWorld.cjs');
  console.log(`[Capture] Running captureWorld.cjs for ${shots.length} shots...`);
  const res = spawnSync('node', [captureScript, manifestPath, outDir], { stdio: 'inherit' });
  if (res.status !== 0) {
    throw new Error(`captureWorld exited with code ${res.status}`);
  }
}

function evaluateAll() {
  const results = {};
  let allPass = true;

  for (const pt of points) {
    const shotPath = path.join(outDir, `${pt.name}.png`);
    
    // 1. verify_v18.py farm
    const farmCmd = `python scripts/v18/verify_v18.py farm "${shotPath}"`;
    const farmOut = execSync(farmCmd, { cwd: path.resolve(__dirname, '../..') }).toString();
    const farmMetrics = JSON.parse(farmOut.trim());

    // 2. checkTexture.py
    const texCmd = `python scripts/v19/checkTexture.py "${shotPath}" ${pt.zoom}`;
    const texOut = execSync(texCmd, { cwd: path.resolve(__dirname, '../..') }).toString();
    const texMetrics = JSON.parse(texOut.trim());

    const passGreen = farmMetrics.green >= 0.80;
    const passBrown = farmMetrics.brown <= 0.08;
    const passWater = farmMetrics.water <= 0.10;
    const passStddev = texMetrics.stddev >= 4.0;
    const passDark = texMetrics.dark_components_over_1cell === 0;

    const pointPass = passGreen && passBrown && passWater && passStddev && passDark;
    if (!pointPass) allPass = false;

    results[pt.name] = {
      coords: { x: pt.x, y: pt.y },
      farm: {
        green: farmMetrics.green,
        brown: farmMetrics.brown,
        water: farmMetrics.water,
        passGreen,
        passBrown,
        passWater,
      },
      texture: {
        stddev: texMetrics.stddev,
        median_luminance: texMetrics.median_luminance,
        dark_components_over_1cell: texMetrics.dark_components_over_1cell,
        max_dark_area_cells: texMetrics.max_dark_area_cells,
        passStddev,
        passDark,
      },
      pointPass
    };

    console.log(`[Result] ${pt.name}: green=${farmMetrics.green} (>=0.80: ${passGreen}), brown=${farmMetrics.brown} (<=0.08: ${passBrown}), water=${farmMetrics.water} (<=0.10: ${passWater}), stddev=${texMetrics.stddev} (>=4.0: ${passStddev}), dark_components=${texMetrics.dark_components_over_1cell} (==0: ${passDark}) -> ${pointPass ? 'PASS' : 'FAIL'}`);
  }

  const finalOutput = {
    timestamp: new Date().toISOString(),
    allPass,
    results
  };

  const outFile = path.join(rawDir, 'f3_texture.json');
  fs.writeFileSync(outFile, JSON.stringify(finalOutput, null, 2), 'utf-8');
  console.log(`\nWritten results to ${outFile}. All pass: ${allPass}`);

  if (!allPass) {
    process.exit(1);
  }
}

function main() {
  captureAll();
  evaluateAll();
}

main();
