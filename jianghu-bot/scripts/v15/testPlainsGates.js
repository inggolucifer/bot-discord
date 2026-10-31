#!/usr/bin/env node
/**
 * scripts/v15/testPlainsGates.js
 * Evaluates Gate P3: Plains Composite Fresh Green Grass (J3, J4)
 * 6 Points across Central Plains & surrounding grasslands
 */

const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

const SCRIPT_DIR = __dirname;
const PROJECT_DIR = path.resolve(SCRIPT_DIR, '../..');
const PIXEL_GATES_PY = path.resolve(SCRIPT_DIR, 'pixelGates.py');
const SHOTS_DIR = path.resolve(PROJECT_DIR, 'review/shots_v15_plains');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const plainsPoints = [
  { name: 'plains_01_xingcun', x: 2050, y: 2650, zoom: 1.4, grid: 0 },
  { name: 'plains_02_xingcun_east', x: 2062, y: 2648, zoom: 1.4, grid: 0 },
  { name: 'plains_03_wilderness', x: 2300, y: 3000, zoom: 1.4, grid: 0 },
  { name: 'plains_04_west_farm', x: 1800, y: 2400, zoom: 1.4, grid: 0 },
  { name: 'plains_05_central', x: 2500, y: 2800, zoom: 1.4, grid: 0 },
  { name: 'plains_06_delta', x: 1600, y: 2200, zoom: 1.4, grid: 0 }
];

const shotsJsonPath = path.resolve(SCRIPT_DIR, 'plains_shots.json');
fs.writeFileSync(shotsJsonPath, JSON.stringify(plainsPoints, null, 2));

console.log(`[testPlainsGates] Capturing ${plainsPoints.length} Plains shots...`);

const captureProc = spawn('node', [
  path.resolve(PROJECT_DIR, 'scripts/captureWorld.cjs'),
  shotsJsonPath,
  SHOTS_DIR
], { stdio: 'inherit' });

captureProc.on('close', (code) => {
  if (code !== 0) {
    console.error(`[testPlainsGates] Screenshot capture failed with code ${code}`);
    process.exit(code || 1);
  }

  console.log(`\n[testPlainsGates] All ${plainsPoints.length} shots captured. Evaluating color sanity (grass)...`);
  const results = [];
  let allPass = true;

  for (const pt of plainsPoints) {
    const pngPath = path.join(SHOTS_DIR, `${pt.name}.png`);

    try {
      const output = execSync(`python "${PIXEL_GATES_PY}" --sanity grass "${pngPath}"`, { encoding: 'utf8' });
      const sanity = JSON.parse(output);

      const pass = sanity.passed === true;
      if (!pass) allPass = false;

      results.push({
        name: pt.name,
        coord: `(${pt.x},${pt.y})`,
        meanRgb: sanity.meanRgb,
        meanHue: sanity.meanHue,
        meanSat: sanity.meanSat,
        meanVal: sanity.meanVal,
        colorPass: sanity.passed,
        reasons: sanity.reasons || [],
        passed: pass
      });

      console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${pt.name}: hue=${sanity.meanHue}°, sat=${sanity.meanSat}, V=${sanity.meanVal}`);
      if (!pass && sanity.reasons) {
        for (const r of sanity.reasons) console.log(`      -> Reason: ${r}`);
      }
    } catch (e) {
      console.error(`  [ERROR] Evaluating ${pt.name}:`, e.message);
      results.push({ name: pt.name, passed: false, error: e.message });
      allPass = false;
    }
  }

  // Also verify that plains_m1 is NOT in any active plains variant
  const manifestPath = path.resolve(PROJECT_DIR, 'web-dashboard/public/assets/ground/ground-manifest.json');
  let plainsM1Excluded = true;
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const plainsVariants = manifest?.terrains?.plains?.variants || [];
    if (plainsVariants.some(v => v.includes('plains_m1'))) {
      console.error(`  [FAIL] plains_m1 is present in active plains variants:`, plainsVariants);
      plainsM1Excluded = false;
      allPass = false;
    } else {
      console.log(`  [PASS] plains_m1 is 100% excluded from active plains variants.`);
    }
  }

  const outReport = {
    timestamp: new Date().toISOString(),
    totalPoints: plainsPoints.length,
    passedCount: results.filter(r => r.passed).length,
    plainsM1Excluded,
    allPassed: allPass,
    points: results
  };

  const reportPath = path.resolve(PROJECT_DIR, 'review/v15_plains_evaluation.json');
  fs.writeFileSync(reportPath, JSON.stringify(outReport, null, 2));
  console.log(`\nPlains evaluation report written to ${reportPath}`);

  if (allPass) {
    console.log(`[SUCCESS] All 6/6 Plains points PASSED GATE P3 (fresh green grass, zero baked trail)!`);
    process.exit(0);
  } else {
    console.error(`[FAIL] Gate P3 failed: ${outReport.passedCount}/${plainsPoints.length} passed`);
    process.exit(1);
  }
});
