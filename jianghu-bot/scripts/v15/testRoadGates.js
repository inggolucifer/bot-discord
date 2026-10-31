#!/usr/bin/env node
/**
 * scripts/v15/testRoadGates.js
 * Captures and Evaluates the 12 Road Points for Gate P1
 * 
 * Points:
 * 1. road_xingcun_horiz (2040, 2651, z=1.4)
 * 2. road_xingcun_cross (2062, 2648, z=1.4)
 * 3. road_xingcun_vert (2056, 2640, z=1.4)
 * 4. road_xueshan_pass (2349, 4296, z=1.4)
 * 5. road_azure_pass (2200, 3340, z=1.4)
 * 6. road_donghai (2600, 2700, z=1.4)
 * 7. road_nine_springs (2200, 2400, z=1.4)
 * 8. road_desert (3400, 1500, z=1.4)
 * 9. road_hermit (1800, 3200, z=1.4)
 * 10. road_central_gate (2050, 2600, z=1.4)
 * 11. road_swamp_edge (1500, 2200, z=1.4)
 * 12. road_south_pass (2060, 2680, z=1.4)
 */

const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

const SCRIPT_DIR = __dirname;
const PROJECT_DIR = path.resolve(SCRIPT_DIR, '../..');
const PIXEL_GATES_PY = path.resolve(SCRIPT_DIR, 'pixelGates.py');
const SHOTS_DIR = path.resolve(PROJECT_DIR, 'review/shots_v15_road');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const roadPoints = [
  { name: 'road_01_xingcun_horiz', x: 2040, y: 2651, zoom: 1.4, grid: 0 },
  { name: 'road_02_xingcun_cross', x: 2062, y: 2648, zoom: 1.4, grid: 0 },
  { name: 'road_03_xingcun_vert', x: 2053, y: 2648, zoom: 1.4, grid: 0 },
  { name: 'road_04_xueshan_pass', x: 2349, y: 4296, zoom: 1.4, grid: 0 },
  { name: 'road_05_azure_pass', x: 2200, y: 3340, zoom: 1.4, grid: 0 },
  { name: 'road_06_central_plains', x: 2399, y: 2449, zoom: 1.4, grid: 0 },
  { name: 'road_07_jiangnan', x: 2550, y: 2538, zoom: 1.4, grid: 0 },
  { name: 'road_08_nine_springs', x: 2740, y: 2350, zoom: 1.4, grid: 0 },
  { name: 'road_09_northern_road', x: 2138, y: 1250, zoom: 1.4, grid: 0 },
  { name: 'road_10_donghai_causeway', x: 3880, y: 2739, zoom: 1.4, grid: 0 },
  { name: 'road_11_western_gorge', x: 638, y: 2400, zoom: 1.4, grid: 0 },
  { name: 'road_12_south_frost', x: 1940, y: 4700, zoom: 1.4, grid: 0 }
];

const shotsJsonPath = path.resolve(SCRIPT_DIR, 'road_shots.json');
fs.writeFileSync(shotsJsonPath, JSON.stringify(roadPoints, null, 2));

console.log(`[testRoadGates] Capturing ${roadPoints.length} road shots...`);

const captureProc = spawn('node', [
  path.resolve(PROJECT_DIR, 'scripts/captureWorld.cjs'),
  shotsJsonPath,
  SHOTS_DIR
], { stdio: 'inherit' });

captureProc.on('close', (code) => {
  if (code !== 0) {
    console.error(`[testRoadGates] Screenshot capture failed with code ${code}`);
    process.exit(code || 1);
  }

  console.log('\n[testRoadGates] All 12 shots captured. Evaluating with pixelGates.py...');
  const evaluations = [];
  let allPass = true;

  for (const pt of roadPoints) {
    const pngPath = path.join(SHOTS_DIR, `${pt.name}.png`);
    const jsonPath = path.join(SHOTS_DIR, `${pt.name}.json`);

    try {
      const cmd = `python "${PIXEL_GATES_PY}" "${pngPath}" "${jsonPath}"`;
      const out = execSync(cmd, { cwd: PROJECT_DIR, encoding: 'utf-8' });
      const start = out.indexOf('{');
      const end = out.lastIndexOf('}');
      const res = JSON.parse(out.substring(start, end + 1));

      const cov = res.roadCoverage?.roadCoverage ?? 0;
      const falsePos = res.roadCoverage?.roadFalsePositive ?? 0;
      const ladderPass = res.roadLadder?.pass ?? false;
      const covPass = cov >= 0.85 && falsePos <= 0.05;
      const pointPass = covPass && ladderPass;

      evaluations.push({
        name: pt.name,
        coord: `(${pt.x},${pt.y})`,
        coverage: cov,
        falsePositive: falsePos,
        ladderPass: ladderPass,
        passed: pointPass
      });

      if (!pointPass) allPass = false;
      console.log(`  [${pointPass ? 'PASS' : 'FAIL'}] ${pt.name}: coverage=${cov}, falsePos=${falsePos}, ladderPass=${ladderPass}`);
    } catch (err) {
      console.error(`  [ERROR] Evaluating ${pt.name}:`, err.message);
      evaluations.push({ name: pt.name, error: err.message, passed: false });
      allPass = false;
    }
  }

  const outReportPath = path.resolve(PROJECT_DIR, 'review/v15_road_evaluation.json');
  fs.writeFileSync(outReportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalPoints: evaluations.length,
    passedCount: evaluations.filter(e => e.passed).length,
    allPassed: allPass,
    points: evaluations
  }, null, 2));

  console.log(`\nRoad evaluation report written to ${outReportPath}`);
  if (!allPass) {
    console.error('[ERROR] One or more road points failed GATE P1!');
    process.exit(1);
  } else {
    console.log('[SUCCESS] All 12/12 road points PASSED GATE P1 (coverage >= 0.85 & zero ladder)!');
  }
});
