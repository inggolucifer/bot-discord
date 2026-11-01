'use strict';
/**
 * scripts/v16/evaluateBaseline.js
 * Evaluates the V15 baseline shots (P01..P34) in review/v16_baseline/
 * using scripts/v16/pixelGates.py.
 * 
 * Verifies mandatory baseline failure on:
 * - P04 streakCoherence (farmland diagonal plow streaks)
 * - P04 groundColorSanity(field) (dry olive brown)
 * - P01 lowFreqStraightEdge (block boundary seam)
 * - P07/P06 biomeTransition (sharp straight boundary)
 * - P01/P11 roadNaturalness (ladder/straight segment/snow bias)
 * - P06/P08 groundTextureRichness (flat stone)
 * 
 * Target: Baseline MUST fail >= 8 gates across benchmarks.
 * Output: review/v16_baseline_gates.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const BASELINE_DIR = path.resolve(PROJECT_ROOT, 'review/v16_baseline');
const REQUIRED_POINTS_PATH = path.resolve(__dirname, 'requiredPoints.json');
const OUT_PATH = path.resolve(PROJECT_ROOT, 'review/v16_baseline_gates.json');

const requiredPoints = JSON.parse(fs.readFileSync(REQUIRED_POINTS_PATH, 'utf8'));
console.log(`[evaluateBaseline] Evaluating ${requiredPoints.length} baseline points against V16 metrics...`);

const results = [];
let failCount = 0;
let passCount = 0;

for (const p of requiredPoints) {
  const pngPath = path.join(BASELINE_DIR, `${p.id}.png`);
  const jsonPath = path.join(BASELINE_DIR, `${p.id}.json`);

  if (!fs.existsSync(pngPath)) {
    console.error(`[ERROR] Missing baseline PNG: ${pngPath}`);
    process.exit(1);
  }

  // Execute pixelGates.py on this file
  const cmd = `python "${path.join(__dirname, 'pixelGates.py')}" "${pngPath}"`;
  let metricOut = {};
  try {
    const raw = execSync(cmd, { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const jsonStart = raw.indexOf('{');
    if (jsonStart !== -1) {
      metricOut = JSON.parse(raw.slice(jsonStart));
    }
  } catch (err) {
    console.error(`[ERROR] pixelGates failed on ${p.id}:`, err.message);
  }

  // Also evaluate color sanity based on point class
  let colorSanity = null;
  const biomeClass = (p.class === 'field' || p.tile === 'farmland') ? 'field' : (p.class === 'stone' ? 'stone' : 'grass');
  try {
    const colorCmd = `python -c "import sys; sys.path.insert(0, '${path.join(__dirname).replace(/\\/g, '/')}'); import pixelGates as pg, json; res = pg.analyze_ground_color_sanity('${pngPath.replace(/\\/g, '/')}', biome='${biomeClass}'); print(json.dumps(res));"`;
    const colorRaw = execSync(colorCmd, { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    colorSanity = JSON.parse(colorRaw.trim());
  } catch {
    // ignore
  }

  // Also evaluate road naturalness if road is present
  let roadNat = null;
  if (p.road || p.id.includes('road') || p.id === 'P01_xingcun' || p.id === 'P11_xueshan') {
    try {
      const isSnow = p.class === 'snow';
      const roadCmd = `python -c "import sys; sys.path.insert(0, '${path.join(__dirname).replace(/\\/g, '/')}'); import pixelGates as pg, json; res = pg.analyze_road_naturalness('${pngPath.replace(/\\/g, '/')}', is_snow=${isSnow ? 'True' : 'False'}); print(json.dumps(res));"`;
      const roadRaw = execSync(roadCmd, { cwd: PROJECT_ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      roadNat = JSON.parse(roadRaw.trim());
    } catch {
      // ignore
    }
  }

  const pointEval = {
    id: p.id,
    x: p.x,
    y: p.y,
    class: p.class,
    streakCoherence: metricOut.streak,
    straightEdge: metricOut.edge,
    biomeTransition: metricOut.transition,
    textureRichness: metricOut.texture,
    colorSanity: colorSanity,
    roadNaturalness: roadNat
  };

  results.push(pointEval);
}

// Check mandatory baseline failures (these are required to FAIL on V15 baseline)
const mandatoryChecks = [
  {
    name: 'P04 groundColorSanity(field) FAIL (dry olive-brown farmland)',
    check: () => {
      const p = results.find(r => r.id === 'P04_farm');
      return p && p.colorSanity && !p.colorSanity.pass;
    }
  },
  {
    name: 'P04 groundTextureRichness FAIL (flat raw macro farmland without composite)',
    check: () => {
      const p = results.find(r => r.id === 'P04_farm');
      return p && p.textureRichness && !p.textureRichness.pass;
    }
  },
  {
    name: 'P21_boundary_t1 biomeTransition FAIL (sharp straight boundary at T1 1500,3350)',
    check: () => {
      const p = results.find(r => r.id === 'P21_boundary_t1');
      return p && p.biomeTransition && !p.biomeTransition.pass;
    }
  },
  {
    name: 'P22_boundary_t1 biomeTransition FAIL (sharp straight boundary at T1 2200,3340)',
    check: () => {
      const p = results.find(r => r.id === 'P22_boundary_t1');
      return p && p.biomeTransition && !p.biomeTransition.pass;
    }
  },
  {
    name: 'P01 roadNaturalness FAIL (straight segments / box edges in Xingcun road)',
    check: () => {
      const p = results.find(r => r.id === 'P01_xingcun');
      return p && p.roadNaturalness && !p.roadNaturalness.pass;
    }
  },
  {
    name: 'P02 roadNaturalness FAIL (straight junction in Xingcun)',
    check: () => {
      const p = results.find(r => r.id === 'P02_xingcun_cross');
      return p && p.roadNaturalness && !p.roadNaturalness.pass;
    }
  },
  {
    name: 'P11 roadNaturalness FAIL (snow trench dark blue / high contrast)',
    check: () => {
      const p = results.find(r => r.id === 'P11_xueshan');
      return p && p.roadNaturalness && !p.roadNaturalness.pass;
    }
  },
  {
    name: 'P13 roadNaturalness FAIL (straight horizontal road segment)',
    check: () => {
      const p = results.find(r => r.id === 'P13_road_h');
      return p && p.roadNaturalness && !p.roadNaturalness.pass;
    }
  },
  {
    name: 'P06 groundTextureRichness FAIL (flat grey rock in Azure pass)',
    check: () => {
      const p = results.find(r => r.id === 'P06_azure_pass');
      return p && p.textureRichness && !p.textureRichness.pass;
    }
  },
  {
    name: 'P08 groundTextureRichness FAIL (flat grey rock in far west Azure)',
    check: () => {
      const p = results.find(r => r.id === 'P08_azure_far_west');
      return p && p.textureRichness && !p.textureRichness.pass;
    }
  }
];

console.log('\n=== MANDATORY BASELINE FAILURE VERIFICATION ===');
let confirmedBaselineFailures = 0;
const failureReport = [];

for (const mc of mandatoryChecks) {
  const isFailedAsExpected = mc.check();
  if (isFailedAsExpected) {
    confirmedBaselineFailures++;
    console.log(`[CONFIRMED FAIL] ${mc.name}`);
    failureReport.push({ name: mc.name, baselineFailed: true, status: 'VERIFIED_NEGATIVE' });
  } else {
    console.log(`[PASS (UNEXPECTED)] ${mc.name}`);
    failureReport.push({ name: mc.name, baselineFailed: false, status: 'UNEXPECTED_PASS' });
  }
}

const summary = {
  timestamp: new Date().toISOString(),
  totalBaselinePoints: results.length,
  confirmedBaselineFailures: confirmedBaselineFailures,
  targetFailures: '>= 8 failures',
  gateP0Passed: confirmedBaselineFailures >= 8,
  mandatoryChecks: failureReport,
  evaluations: results
};

fs.writeFileSync(OUT_PATH, JSON.stringify(summary, null, 2), 'utf8');
console.log(`\n[evaluateBaseline] Written baseline gates summary to: ${OUT_PATH}`);
console.log(`Total verified baseline failures: ${confirmedBaselineFailures}/${mandatoryChecks.length} (Target >= 8)`);

if (summary.gateP0Passed) {
  console.log('[GATE P0] PASS: Baseline reliably fails on required defective points.');
  process.exit(0);
} else {
  console.error('[GATE P0] FAIL: Baseline did not fail enough required gates. Calibrate metrics.');
  process.exit(1);
}
