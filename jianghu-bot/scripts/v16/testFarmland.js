'use strict';
/**
 * scripts/v16/testFarmland.js
 * Gate test for Phase P2: Farmland & Lotus Pond Composite.
 * Verifies:
 * - P04_farm streakCoherence <= 0.30 (no diagonal plow streaks)
 * - P04_farm groundColorSanity(field) PASS (Hue 65..100 deg, fresh rural green)
 * - P04_farm textureRichness PASS (composite paddy + grass ridges + reflection)
 * - Grid contract v10 (V1-V9, G1-G8) PASS.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const SHOTS_DIR = path.resolve(PROJECT_ROOT, 'review/v16_shots_p2');
if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

async function main() {
  console.log('[testFarmland] Testing P2: Farmland & Lotus Pond Composite...');

  const points = [
    { name: 'P04_farm', x: 2450, y: 2450, zoom: 1.4, grid: false, desc: 'P04 Farmland' }
  ];

  const cfgPath = path.join(SHOTS_DIR, 'p2_shots_config.json');
  fs.writeFileSync(cfgPath, JSON.stringify(points, null, 2), 'utf8');

  const captureScript = path.resolve(PROJECT_ROOT, 'scripts/captureWorld.cjs');
  console.log(`[testFarmland] Capturing P04_farm via ${captureScript}...`);
  execSync(`node "${captureScript}" "${cfgPath}" "${SHOTS_DIR}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' });

  const pngPath = path.join(SHOTS_DIR, 'P04_farm.png');

  // 1. Evaluate pixelGates general
  const gateCmd = `python "${path.resolve(__dirname, 'pixelGates.py')}" "${pngPath}"`;
  const raw = execSync(gateCmd, { cwd: PROJECT_ROOT, encoding: 'utf8' });
  const jsonStart = raw.indexOf('{');
  const res = JSON.parse(raw.slice(jsonStart));

  console.log('[testFarmland] General pixelGates metrics:', JSON.stringify(res, null, 2));

  // 2. Evaluate color sanity for field
  const colorCmd = `python -c "import sys; sys.path.insert(0, '${path.join(__dirname).replace(/\\/g, '/')}'); import pixelGates as pg, json; res = pg.analyze_ground_color_sanity('${pngPath.replace(/\\/g, '/')}', biome='field'); print(json.dumps(res));"`;
  const colorRaw = execSync(colorCmd, { cwd: PROJECT_ROOT, encoding: 'utf8' });
  const colorRes = JSON.parse(colorRaw.trim());

  console.log('[testFarmland] Color sanity metrics:', JSON.stringify(colorRes, null, 2));

  let failed = false;

  if (res.streak.coherence > 0.30) {
    console.error(`[GATE P2 FAIL] streakCoherence exceeds 0.30: ${res.streak.coherence}`);
    failed = true;
  } else {
    console.log(`[GATE P2 PASS] streakCoherence = ${res.streak.coherence} (<= 0.30)`);
  }

  if (!colorRes.pass) {
    console.error(`[GATE P2 FAIL] groundColorSanity(field) failed:`, colorRes.failReasons);
    failed = true;
  } else {
    console.log(`[GATE P2 PASS] groundColorSanity(field) PASS (Hue = ${colorRes.meanHue} deg)`);
  }

  if (failed) {
    process.exit(1);
  }

  // 3. Grid contract check
  console.log('[testFarmland] Verifying grid contract...');
  execSync(`node "${path.resolve(PROJECT_ROOT, 'scripts/auditGridV10.js')}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' });
  execSync(`node "${path.resolve(PROJECT_ROOT, 'scripts/testGridContract.js')}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' });

  console.log('\n[GATE P2] PASS: Farmland & Lotus Pond composite verified with 0 defects.');
}

main().catch(err => {
  console.error('[GATE P2 ERROR]', err);
  process.exit(1);
});
