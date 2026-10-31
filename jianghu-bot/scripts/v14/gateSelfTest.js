#!/usr/bin/env node
/**
 * scripts/v14/gateSelfTest.js
 * Negative & Positive Testing for Pixel & Texture Gates (Prompt V14 P0)
 * 
 * Verifies that detection gates cannot FALSE PASS on flawed visual patterns:
 * 1. ladder_road.png -> MUST FAIL roadLadder (roadLadderDetected == true)
 * 2. clean_road.png -> MUST PASS roadLadder (roadLadderDetected == false)
 * 3. diamond_lattice_mosaic.png -> MUST FAIL lattice (isLattice == true)
 * 4. clean_ground.png -> MUST PASS groundContentAudit (isClean == true, isLattice == false)
 * 5. pale_flat_floor.png -> MUST FAIL paleFlat (paleFlatDetected == true)
 * 6. straight_seam.png -> MUST FAIL straightSeam (straightSeamDetected == true)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT_DIR = __dirname;
const SYNTH_DIR = path.join(SCRIPT_DIR, 'synth');
const PROJECT_DIR = path.resolve(SCRIPT_DIR, '../../');

function runJsonCmd(cmd) {
  const output = execSync(cmd, { cwd: PROJECT_DIR, encoding: 'utf-8' });
  // Find JSON substring
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error(`Failed to find JSON in output:\n${output}`);
  }
  return JSON.parse(output.substring(start, end + 1));
}

function runSelfTest() {
  console.log('=== V14 GATE NEGATIVE & POSITIVE SELF-TEST ===');
  const results = [];
  let allPass = true;

  // 1. Ladder Road (Negative test: must detect ladder artifact)
  const ladderPath = path.join(SYNTH_DIR, 'ladder_road.png');
  const ladderRes = runJsonCmd(`python scripts/v14/pixelMetrics.py "${ladderPath}"`);
  const ladderDetected = ladderRes.roadLadder && ladderRes.roadLadder.roadLadderDetected === true;
  results.push({
    testId: 'NEG_ROAD_LADDER',
    file: 'ladder_road.png',
    type: 'negative (flawed input must be detected)',
    detected: ladderDetected,
    expected: true,
    pass: ladderDetected === true
  });
  if (!ladderDetected) allPass = false;

  // 2. Clean Road (Positive test: smooth organic road must not trigger ladder)
  const cleanRoadPath = path.join(SYNTH_DIR, 'clean_road.png');
  const cleanRoadRes = runJsonCmd(`python scripts/v14/pixelMetrics.py "${cleanRoadPath}"`);
  const cleanRoadLadder = cleanRoadRes.roadLadder && cleanRoadRes.roadLadder.roadLadderDetected === true;
  results.push({
    testId: 'POS_CLEAN_ROAD',
    file: 'clean_road.png',
    type: 'positive (clean input must pass)',
    detected: cleanRoadLadder,
    expected: false,
    pass: cleanRoadLadder === false
  });
  if (cleanRoadLadder) allPass = false;

  // 3. Diamond Lattice Mosaic (Negative test: lattice must be detected and rejected)
  const latticePath = path.join(SYNTH_DIR, 'diamond_lattice_mosaic.png');
  const latticeRes = runJsonCmd(`python scripts/v14/groundContentAudit.py "${latticePath}"`);
  const latticeDetected = latticeRes.isLattice === true || latticeRes.isClean === false;
  results.push({
    testId: 'NEG_PLAINS_LATTICE',
    file: 'diamond_lattice_mosaic.png',
    type: 'negative (lattice mosaic must be rejected)',
    detected: latticeDetected,
    expected: true,
    pass: latticeDetected === true
  });
  if (!latticeDetected) allPass = false;

  // 4. Clean Ground (Positive test: clean texture must pass)
  const cleanGroundPath = path.join(SYNTH_DIR, 'clean_ground.png');
  const cleanGroundRes = runJsonCmd(`python scripts/v14/groundContentAudit.py "${cleanGroundPath}"`);
  const cleanGroundPass = cleanGroundRes.isClean === true && cleanGroundRes.isLattice === false;
  results.push({
    testId: 'POS_CLEAN_GROUND',
    file: 'clean_ground.png',
    type: 'positive (clean texture must pass audit)',
    detected: cleanGroundPass,
    expected: true,
    pass: cleanGroundPass === true
  });
  if (!cleanGroundPass) allPass = false;

  // 5. Pale Flat Floor (Negative test: flat pale area must be detected)
  const paleFloorPath = path.join(SYNTH_DIR, 'pale_flat_floor.png');
  const paleRes = runJsonCmd(`python scripts/v14/pixelMetrics.py "${paleFloorPath}"`);
  const paleDetected = paleRes.paleFlat && paleRes.paleFlat.paleFlatDetected === true;
  results.push({
    testId: 'NEG_PALE_FLAT_FLOOR',
    file: 'pale_flat_floor.png',
    type: 'negative (flat pale floor must be detected)',
    detected: paleDetected,
    expected: true,
    pass: paleDetected === true
  });
  if (!paleDetected) allPass = false;

  // 6. Straight Seam (Negative test: vertical straight seam >= 150px must be detected)
  const seamPath = path.join(SYNTH_DIR, 'straight_seam.png');
  const seamRes = runJsonCmd(`python scripts/v14/pixelMetrics.py "${seamPath}"`);
  const seamDetected = seamRes.straightSeam && seamRes.straightSeam.straightSeamDetected === true;
  results.push({
    testId: 'NEG_STRAIGHT_SEAM',
    file: 'straight_seam.png',
    type: 'negative (sharp straight seam >=150px must be detected)',
    detected: seamDetected,
    expected: true,
    pass: seamDetected === true
  });
  if (!seamDetected) allPass = false;

  // Print results
  for (const r of results) {
    const mark = r.pass ? 'PASS' : 'FAIL';
    console.log(`[${mark}] ${r.testId.padEnd(22)}: file=${r.file}, detected=${r.detected}, expected=${r.expected}`);
  }

  const outData = {
    timestamp: new Date().toISOString(),
    allPass,
    totalTests: results.length,
    passedCount: results.filter(r => r.pass).length,
    tests: results
  };

  const outJson = path.join(PROJECT_DIR, 'review/v14_selftest_results.json');
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outJson, JSON.stringify(outData, null, 2), 'utf-8');
  console.log(`Self-test results written to ${outJson}`);

  if (!allPass) {
    console.error('ERROR: Gate self-test failed! Some gates are vulnerable to false PASS.');
    process.exit(1);
  } else {
    console.log('SUCCESS: All gate self-tests passed 100%! Gates are robust against false PASS.');
    process.exit(0);
  }
}

if (require.main === module) {
  runSelfTest();
}

module.exports = { runSelfTest };
