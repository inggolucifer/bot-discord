#!/usr/bin/env node
/**
 * scripts/v15/testAzureGates.js
 * Evaluates Gate P2: Azure Neutral Stone Grey (J2)
 * 8 Points across Azure mountain range
 */

const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

const SCRIPT_DIR = __dirname;
const PROJECT_DIR = path.resolve(SCRIPT_DIR, '../..');
const PIXEL_GATES_PY = path.resolve(SCRIPT_DIR, 'pixelGates.py');
const SHOTS_DIR = path.resolve(PROJECT_DIR, 'review/shots_v15_azure');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const azurePoints = [
  { name: 'azure_01_pass_north', x: 2200, y: 3340, zoom: 1.4, grid: 0 },
  { name: 'azure_02_ridge_west', x: 1500, y: 3350, zoom: 1.4, grid: 0 },
  { name: 'azure_03_high_peak', x: 1800, y: 3350, zoom: 1.4, grid: 0 },
  { name: 'azure_04_pass_south', x: 2600, y: 3340, zoom: 1.4, grid: 0 },
  { name: 'azure_05_mid_ridge', x: 2800, y: 3350, zoom: 1.4, grid: 0 },
  { name: 'azure_06_inner_valley', x: 3000, y: 3350, zoom: 1.4, grid: 0 },
  { name: 'azure_07_east_bastion', x: 3300, y: 3350, zoom: 1.4, grid: 0 },
  { name: 'azure_08_cliff_edge', x: 3500, y: 3350, zoom: 1.4, grid: 0 }
];

const shotsJsonPath = path.resolve(SCRIPT_DIR, 'azure_shots.json');
fs.writeFileSync(shotsJsonPath, JSON.stringify(azurePoints, null, 2));

console.log(`[testAzureGates] Capturing ${azurePoints.length} Azure shots...`);

const captureProc = spawn('node', [
  path.resolve(PROJECT_DIR, 'scripts/captureWorld.cjs'),
  shotsJsonPath,
  SHOTS_DIR
], { stdio: 'inherit' });

captureProc.on('close', (code) => {
  if (code !== 0) {
    console.error(`[testAzureGates] Screenshot capture failed with code ${code}`);
    process.exit(code || 1);
  }

  console.log(`\n[testAzureGates] All ${azurePoints.length} shots captured. Evaluating color sanity & seams...`);
  const results = [];
  let allPass = true;

  for (const pt of azurePoints) {
    const pngPath = path.join(SHOTS_DIR, `${pt.name}.png`);

    try {
      const output = execSync(`python "${PIXEL_GATES_PY}" --sanity stone "${pngPath}"`, { encoding: 'utf8' });
      const sanity = JSON.parse(output);

      const pass = sanity.passed === true;
      if (!pass) allPass = false;

      results.push({
        name: pt.name,
        coord: `(${pt.x},${pt.y})`,
        meanRgb: sanity.meanRgb,
        bMinusR: sanity.bMinusR,
        meanSat: sanity.meanSat,
        meanVal: sanity.meanVal,
        colorPass: sanity.passed,
        reasons: sanity.reasons || [],
        passed: pass
      });

      console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${pt.name}: sat=${sanity.meanSat}, diff=${sanity.bMinusR}, V=${sanity.meanVal}`);
    } catch (e) {
      console.error(`  [ERROR] Evaluating ${pt.name}:`, e.message);
      results.push({ name: pt.name, passed: false, error: e.message });
      allPass = false;
    }
  }

  const outReport = {
    timestamp: new Date().toISOString(),
    totalPoints: azurePoints.length,
    passedCount: results.filter(r => r.passed).length,
    allPassed: allPass,
    points: results
  };

  const reportPath = path.resolve(PROJECT_DIR, 'review/v15_azure_evaluation.json');
  fs.writeFileSync(reportPath, JSON.stringify(outReport, null, 2));
  console.log(`\nAzure evaluation report written to ${reportPath}`);

  if (allPass) {
    console.log(`[SUCCESS] All 8/8 Azure points PASSED GATE P2 (neutral stone grey & zero seams)!`);
    process.exit(0);
  } else {
    console.error(`[FAIL] Gate P2 failed: ${outReport.passedCount}/${azurePoints.length} passed`);
    process.exit(1);
  }
});
