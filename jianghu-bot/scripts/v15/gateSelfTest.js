#!/usr/bin/env node
/**
 * scripts/v15/gateSelfTest.js
 * Negative & Positive Self-Test Suite for Visual & Texture Gates (Prompt V15 P0.3)
 * 
 * Verifies all 9 negative and positive tests:
 * 1. NEG_ROAD_ABSENT: shot v14 Xingcun (road missing) + hook JSON with road cells -> roadCoverage MUST FAIL (< 0.85)
 * 2. NEG_ROAD_LADDER: synthetic ladder road -> roadLadder MUST FAIL
 * 3. POS_ROAD_OK: synthetic smooth road -> roadCoverage >= 0.85 and roadLadder MUST PASS
 * 4. NEG_BAKED_PATH: plains_m1.webp -> bakedPath MUST FAIL (hasBakedPath = true)
 * 5. POS_NO_PATH: meadow_m1.webp -> bakedPath MUST PASS (hasBakedPath = false)
 * 6. NEG_COLOR_AZURE: RGB (72,87,110) -> groundColorSanity(stone) MUST FAIL
 * 7. POS_COLOR_AZURE: RGB (118,121,122) -> groundColorSanity(stone) MUST PASS
 * 8. NEG_COLOR_PLAINS: RGB (146,130,84) -> groundColorSanity(grass) MUST FAIL
 * 9. POS_COLOR_PLAINS: RGB (139,166,94) -> groundColorSanity(grass) MUST PASS
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT_DIR = __dirname;
const PROJECT_DIR = path.resolve(SCRIPT_DIR, '../..');
const PIXEL_GATES_PY = path.resolve(SCRIPT_DIR, 'pixelGates.py');
const REVIEW_DIR = path.resolve(PROJECT_DIR, 'review');
const SYNTH_DIR = path.resolve(SCRIPT_DIR, '../v14/synth');
const GROUND_DIR = path.resolve(PROJECT_DIR, 'web-dashboard/public/assets/ground/v11');

function runPythonCmd(args) {
  const cmd = `python "${PIXEL_GATES_PY}" ${args}`;
  try {
    const out = execSync(cmd, { cwd: PROJECT_DIR, encoding: 'utf-8' });
    const start = out.indexOf('{');
    const end = out.lastIndexOf('}');
    if (start === -1 || end === -1) {
      throw new Error(`No JSON found in python output:\n${out}`);
    }
    return JSON.parse(out.substring(start, end + 1));
  } catch (err) {
    throw new Error(`Python execution failed: ${err.message}`);
  }
}

function runSelfTest() {
  console.log('=== V15 AUTHORITATIVE GATE SELF-TEST SUITE (9 TESTS) ===');
  const results = [];
  let allPass = true;

  // 1. NEG_ROAD_ABSENT
  const xingcunShot = path.join(REVIEW_DIR, 'shots_v14/shot_v12_audit_a_xingcun_z10.png');
  const synthHookPath = path.join(SCRIPT_DIR, 'synth_xingcun_road_hook.json');
  const synthHook = {
    roadCells: [
      { gx: 2048, gy: 2650, px: 200, py: 320, widthPx: 54, heightPx: 54 },
      { gx: 2049, gy: 2650, px: 254, py: 320, widthPx: 54, heightPx: 54 },
      { gx: 2050, gy: 2650, px: 308, py: 320, widthPx: 54, heightPx: 54 },
      { gx: 2051, gy: 2650, px: 362, py: 320, widthPx: 54, heightPx: 54 },
      { gx: 2052, gy: 2650, px: 416, py: 320, widthPx: 54, heightPx: 54 }
    ]
  };
  fs.writeFileSync(synthHookPath, JSON.stringify(synthHook, null, 2));

  let t1Pass = false;
  let t1Data = null;
  if (fs.existsSync(xingcunShot)) {
    const res = runPythonCmd(`"${xingcunShot}" "${synthHookPath}"`);
    t1Data = res.roadCoverage;
    // Expected: roadCoverage < 0.85
    t1Pass = (res.roadCoverage.roadCoverage < 0.85) && (res.roadCoverage.passed === false);
  } else {
    console.warn(`[WARN] xingcunShot not found at ${xingcunShot}`);
  }
  results.push({
    id: 'NEG_ROAD_ABSENT',
    target: 'roadCoverage < 0.85 and passed == false',
    actual: t1Data ? `coverage=${t1Data.roadCoverage}, passed=${t1Data.passed}` : 'SHOT_MISSING',
    passed: t1Pass
  });
  if (!t1Pass) allPass = false;

  // 2. NEG_ROAD_LADDER
  const ladderPath = path.join(SYNTH_DIR, 'ladder_road.png');
  const res2 = runPythonCmd(`"${ladderPath}"`);
  const t2Pass = res2.roadLadder.roadLadderDetected === true && res2.roadLadder.pass === false;
  results.push({
    id: 'NEG_ROAD_LADDER',
    target: 'roadLadderDetected == true',
    actual: `detected=${res2.roadLadder.roadLadderDetected}, pass=${res2.roadLadder.pass}`,
    passed: t2Pass
  });
  if (!t2Pass) allPass = false;

  // 3. POS_ROAD_OK
  const cleanRoadPath = path.join(SYNTH_DIR, 'clean_road.png');
  const cleanRoadHookPath = path.join(SCRIPT_DIR, 'synth_clean_road_hook.json');
  const cleanHook = {
    roadCells: [
      { gx: 0, gy: 0, px: 40, py: 170, widthPx: 54, heightPx: 54 },
      { gx: 1, gy: 0, px: 94, py: 170, widthPx: 54, heightPx: 54 },
      { gx: 2, gy: 0, px: 148, py: 170, widthPx: 54, heightPx: 54 },
      { gx: 3, gy: 0, px: 202, py: 170, widthPx: 54, heightPx: 54 },
      { gx: 4, gy: 0, px: 256, py: 170, widthPx: 54, heightPx: 54 }
    ]
  };
  fs.writeFileSync(cleanRoadHookPath, JSON.stringify(cleanHook, null, 2));

  const res3 = runPythonCmd(`"${cleanRoadPath}" "${cleanRoadHookPath}"`);
  const t3Pass = res3.roadCoverage.roadCoverage >= 0.85 && res3.roadLadder.roadLadderDetected === false;
  results.push({
    id: 'POS_ROAD_OK',
    target: 'roadCoverage >= 0.85 and roadLadderDetected == false',
    actual: `coverage=${res3.roadCoverage.roadCoverage}, ladderDetected=${res3.roadLadder.roadLadderDetected}`,
    passed: t3Pass
  });
  if (!t3Pass) allPass = false;

  // 4. NEG_BAKED_PATH (plains_m1.webp)
  const plainsM1Path = path.join(GROUND_DIR, 'plains_m1.webp');
  const res4 = runPythonCmd(`--baked "${plainsM1Path}"`);
  const t4Pass = res4.hasBakedPath === true;
  results.push({
    id: 'NEG_BAKED_PATH',
    target: 'hasBakedPath == true',
    actual: `hasBakedPath=${res4.hasBakedPath}, flaggedCount=${res4.flaggedComponents?.length || 0}`,
    passed: t4Pass
  });
  if (!t4Pass) allPass = false;

  // 5. POS_NO_PATH (meadow_m1.webp)
  const meadowM1Path = path.join(GROUND_DIR, 'meadow_m1.webp');
  const res5 = runPythonCmd(`--baked "${meadowM1Path}"`);
  const t5Pass = res5.hasBakedPath === false;
  results.push({
    id: 'POS_NO_PATH',
    target: 'hasBakedPath == false',
    actual: `hasBakedPath=${res5.hasBakedPath}`,
    passed: t5Pass
  });
  if (!t5Pass) allPass = false;

  // 6. NEG_COLOR_AZURE (RGB 72, 87, 110)
  const res6 = runPythonCmd(`--sanity stone "72,87,110"`);
  const t6Pass = res6.passed === false;
  results.push({
    id: 'NEG_COLOR_AZURE',
    target: 'groundColorSanity(stone) == false',
    actual: `passed=${res6.passed}, reasons=${res6.reasons.join('; ')}`,
    passed: t6Pass
  });
  if (!t6Pass) allPass = false;

  // 7. POS_COLOR_AZURE (RGB 118, 121, 122)
  const res7 = runPythonCmd(`--sanity stone "118,121,122"`);
  const t7Pass = res7.passed === true;
  results.push({
    id: 'POS_COLOR_AZURE',
    target: 'groundColorSanity(stone) == true',
    actual: `passed=${res7.passed}, sat=${res7.meanSat}, diff=${res7.bMinusR}`,
    passed: t7Pass
  });
  if (!t7Pass) allPass = false;

  // 8. NEG_COLOR_PLAINS (RGB 146, 130, 84)
  const res8 = runPythonCmd(`--sanity grass "146,130,84"`);
  const t8Pass = res8.passed === false;
  results.push({
    id: 'NEG_COLOR_PLAINS',
    target: 'groundColorSanity(grass) == false',
    actual: `passed=${res8.passed}, reasons=${res8.reasons.join('; ')}`,
    passed: t8Pass
  });
  if (!t8Pass) allPass = false;

  // 9. POS_COLOR_PLAINS (RGB 139, 166, 94)
  const res9 = runPythonCmd(`--sanity grass "139,166,94"`);
  const t9Pass = res9.passed === true;
  results.push({
    id: 'POS_COLOR_PLAINS',
    target: 'groundColorSanity(grass) == true',
    actual: `passed=${res9.passed}, hue=${res9.meanHue}, sat=${res9.meanSat}`,
    passed: t9Pass
  });
  if (!t9Pass) allPass = false;

  // Cleanup temporary hooks
  [synthHookPath, cleanRoadHookPath].forEach(p => {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  // Print results summary
  console.log('\n--- SELF-TEST RESULTS ---');
  results.forEach(r => {
    const status = r.passed ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${r.id}: ${r.actual} (Target: ${r.target})`);
  });

  const outJsonPath = path.join(REVIEW_DIR, 'v15_selftest.json');
  fs.mkdirSync(REVIEW_DIR, { recursive: true });
  fs.writeFileSync(outJsonPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedCount: results.filter(r => r.passed).length,
    allPassed: allPass,
    tests: results
  }, null, 2));

  console.log(`\nSelf-test report written to ${outJsonPath}`);
  if (!allPass) {
    console.error('[ERROR] One or more self-tests failed! Check review/v15_selftest.json');
    process.exit(1);
  } else {
    console.log('[SUCCESS] All 9/9 Self-Tests PASSED!');
  }
}

if (require.main === module) {
  runSelfTest();
}
