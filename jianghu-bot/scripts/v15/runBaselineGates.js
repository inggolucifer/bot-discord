#!/usr/bin/env node
/**
 * scripts/v15/runBaselineGates.js
 * Evaluates all V15 baseline gates on HEAD 319ddc6 to prove detection of existing defects:
 * - roadCoverage (Xingcun, Xueshan): MUST FAIL
 * - groundColorSanity(stone) (Azure): MUST FAIL
 * - groundColorSanity(grass) (Plains 2450,2450): MUST FAIL
 * - bakedPath (plains_m1.webp): MUST FAIL
 * Output: review/v15_baseline_gates.json
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT_DIR = __dirname;
const PROJECT_DIR = path.resolve(SCRIPT_DIR, '../..');
const PIXEL_GATES_PY = path.resolve(SCRIPT_DIR, 'pixelGates.py');
const REVIEW_DIR = path.resolve(PROJECT_DIR, 'review');
const GROUND_DIR = path.resolve(PROJECT_DIR, 'web-dashboard/public/assets/ground/v11');

function runPython(args) {
  const cmd = `python "${PIXEL_GATES_PY}" ${args}`;
  const out = execSync(cmd, { cwd: PROJECT_DIR, encoding: 'utf-8' });
  const start = out.indexOf('{');
  const end = out.lastIndexOf('}');
  return JSON.parse(out.substring(start, end + 1));
}

function runBaseline() {
  console.log('=== RUNNING V15 BASELINE GATES EVALUATION ===');
  const gates = [];

  // 1. roadCoverage Xingcun
  const xingcunShot = path.join(REVIEW_DIR, 'shots_v14/shot_v12_audit_a_xingcun_z10.png');
  const hookXingcun = path.join(SCRIPT_DIR, 'baseline_hook_xingcun.json');
  fs.writeFileSync(hookXingcun, JSON.stringify({
    roadCells: [
      { gx: 2048, gy: 2650, px: 200, py: 320, widthPx: 54, heightPx: 54 },
      { gx: 2049, gy: 2650, px: 254, py: 320, widthPx: 54, heightPx: 54 },
      { gx: 2050, gy: 2650, px: 308, py: 320, widthPx: 54, heightPx: 54 },
      { gx: 2051, gy: 2650, px: 362, py: 320, widthPx: 54, heightPx: 54 },
      { gx: 2052, gy: 2650, px: 416, py: 320, widthPx: 54, heightPx: 54 }
    ]
  }));
  const resXingcun = runPython(`"${xingcunShot}" "${hookXingcun}"`);
  gates.push({
    id: 'GATE_BASELINE_ROAD_COVERAGE_XINGCUN',
    name: 'Road Coverage Xingcun (2050,2650)',
    target: '>= 0.85',
    actual: resXingcun.roadCoverage.roadCoverage,
    status: resXingcun.roadCoverage.roadCoverage >= 0.85 ? 'PASS' : 'FAIL',
    expectedBaseline: 'FAIL'
  });

  // 2. roadCoverage Xueshan
  const xueshanShot = path.join(REVIEW_DIR, 'shots_v14/shot_v12_audit_f_frost_z10.png');
  const hookXueshan = path.join(SCRIPT_DIR, 'baseline_hook_xueshan.json');
  fs.writeFileSync(hookXueshan, JSON.stringify({
    roadCells: [
      { gx: 2498, gy: 4400, px: 300, py: 340, widthPx: 54, heightPx: 54 },
      { gx: 2499, gy: 4400, px: 354, py: 340, widthPx: 54, heightPx: 54 },
      { gx: 2500, gy: 4400, px: 408, py: 340, widthPx: 54, heightPx: 54 },
      { gx: 2501, gy: 4400, px: 462, py: 340, widthPx: 54, heightPx: 54 }
    ]
  }));
  const resXueshan = runPython(`"${xueshanShot}" "${hookXueshan}"`);
  gates.push({
    id: 'GATE_BASELINE_ROAD_COVERAGE_XUESHAN',
    name: 'Road Coverage Xueshan (2500,4400)',
    target: '>= 0.85',
    actual: resXueshan.roadCoverage.roadCoverage,
    status: resXueshan.roadCoverage.roadCoverage >= 0.85 ? 'PASS' : 'FAIL',
    expectedBaseline: 'FAIL'
  });

  // 3. groundColorSanity(stone) Azure
  const azureShot = path.join(REVIEW_DIR, 'shots_v14/shot_v12_audit_e_azure_z10.png');
  const resAzure = runPython(`--sanity stone "${azureShot}"`);
  gates.push({
    id: 'GATE_BASELINE_AZURE_STONE_COLOR',
    name: 'Azure Mountain Stone Ground Sanity',
    target: 'sat <= 0.22, |B-R| <= 25, V in [0.38..0.65]',
    actual: `sat=${resAzure.meanSat}, diff=${resAzure.bMinusR}, V=${resAzure.meanVal}`,
    status: resAzure.passed ? 'PASS' : 'FAIL',
    reasons: resAzure.reasons,
    expectedBaseline: 'FAIL'
  });

  // 4. groundColorSanity(grass) Plains
  const plainsShot = path.join(REVIEW_DIR, 'shots_v14/shot_v12_audit_c_plain_z10.png');
  const resPlains = runPython(`--sanity grass "${plainsShot}"`);
  gates.push({
    id: 'GATE_BASELINE_PLAINS_GRASS_COLOR',
    name: 'Plains Ground Grass Sanity (2450,2450)',
    target: 'hue in [65..125], sat in [0.25..0.60], brown/olive <= 0.40',
    actual: `hue=${resPlains.meanHue}, sat=${resPlains.meanSat}, V=${resPlains.meanVal}`,
    status: resPlains.passed ? 'PASS' : 'FAIL',
    reasons: resPlains.reasons,
    expectedBaseline: 'FAIL'
  });

  // 5. bakedPath plains_m1.webp
  const plainsM1 = path.join(GROUND_DIR, 'plains_m1.webp');
  const resBaked = runPython(`--baked "${plainsM1}"`);
  gates.push({
    id: 'GATE_BASELINE_BAKED_PATH_PLAINS_M1',
    name: 'Baked Path on plains_m1.webp',
    target: 'hasBakedPath == false',
    actual: `hasBakedPath=${resBaked.hasBakedPath}, flagged=${resBaked.flaggedComponents?.length || 0}`,
    status: resBaked.hasBakedPath ? 'FAIL' : 'PASS',
    expectedBaseline: 'FAIL'
  });

  // Cleanup
  [hookXingcun, hookXueshan].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });

  console.log('\n--- BASELINE EVALUATION RESULTS ---');
  let baselineAccurate = true;
  gates.forEach(g => {
    const isExpected = g.status === g.expectedBaseline;
    if (!isExpected) baselineAccurate = false;
    console.log(`[${g.status}] ${g.name}: ${g.actual} (Expected Baseline: ${g.expectedBaseline})`);
  });

  const outPath = path.join(REVIEW_DIR, 'v15_baseline_gates.json');
  fs.writeFileSync(outPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    commit: '319ddc6',
    allDefectsDetected: baselineAccurate,
    gates: gates
  }, null, 2));

  console.log(`\nBaseline report written to ${outPath}`);
  if (!baselineAccurate) {
    console.error('[ERROR] Baseline failed to accurately detect one or more expected defects!');
    process.exit(1);
  } else {
    console.log('[SUCCESS] Baseline accurately detected all existing defects!');
  }
}

if (require.main === module) {
  runBaseline();
}
