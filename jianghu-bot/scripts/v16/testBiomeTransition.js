'use strict';
/**
 * scripts/v16/testBiomeTransition.js
 * Gate test for Phase P3: Organic Biome Transition.
 * Verifies:
 * - P21_boundary_t1 (1500, 3350) transitionWidthCells >= 1.0
 * - P22_boundary_t1 (2200, 3340) transitionWidthCells >= 1.0
 * - straightEdgeCount <= 1 on both points
 * - Grid contract v10 (V1-V9, G1-G8) PASS.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const SHOTS_DIR = path.resolve(PROJECT_ROOT, 'review/v16_shots_p3');
if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

async function main() {
  console.log('[testBiomeTransition] Testing P3: Organic Biome Transition...');

  const points = [
    { name: 'P21_boundary_t1', x: 1500, y: 3350, zoom: 1.0, grid: false, desc: 'P21 Boundary T1' },
    { name: 'P22_boundary_t1', x: 2200, y: 3340, zoom: 1.0, grid: false, desc: 'P22 Boundary T1' }
  ];

  const cfgPath = path.join(SHOTS_DIR, 'p3_shots_config.json');
  fs.writeFileSync(cfgPath, JSON.stringify(points, null, 2), 'utf8');

  const captureScript = path.resolve(PROJECT_ROOT, 'scripts/captureWorld.cjs');
  console.log(`[testBiomeTransition] Capturing boundary points via ${captureScript}...`);
  execSync(`node "${captureScript}" "${cfgPath}" "${SHOTS_DIR}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' });

  let failed = false;

  for (const pt of points) {
    const pngPath = path.join(SHOTS_DIR, `${pt.name}.png`);
    const gateCmd = `python "${path.resolve(__dirname, 'pixelGates.py')}" "${pngPath}"`;
    const raw = execSync(gateCmd, { cwd: PROJECT_ROOT, encoding: 'utf8' });
    const jsonStart = raw.indexOf('{');
    const res = JSON.parse(raw.slice(jsonStart));

    console.log(`\n[testBiomeTransition] Metrics for ${pt.name}:`, JSON.stringify(res.transition, null, 2));
    console.log(`[testBiomeTransition] StraightEdge for ${pt.name}: straightEdgeCount=${res.edge.straightEdgeCount}`);

    if (res.transition.transitionWidthCells < 1.0) {
      console.error(`[GATE P3 FAIL] ${pt.name} transitionWidthCells < 1.0: ${res.transition.transitionWidthCells}`);
      failed = true;
    } else {
      console.log(`[GATE P3 PASS] ${pt.name} transitionWidthCells = ${res.transition.transitionWidthCells} (>= 1.0)`);
    }

    if (res.edge.straightEdgeCount > 1) {
      console.error(`[GATE P3 FAIL] ${pt.name} straightEdgeCount > 1: ${res.edge.straightEdgeCount}`);
      failed = true;
    } else {
      console.log(`[GATE P3 PASS] ${pt.name} straightEdgeCount = ${res.edge.straightEdgeCount} (<= 1)`);
    }
  }

  if (failed) process.exit(1);

  // Grid contract check
  console.log('\n[testBiomeTransition] Verifying grid contract...');
  execSync(`node "${path.resolve(PROJECT_ROOT, 'scripts/auditGridV10.js')}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' });
  execSync(`node "${path.resolve(PROJECT_ROOT, 'scripts/testGridContract.js')}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' });

  console.log('\n[GATE P3] PASS: Organic Biome Transition verified with 0 defects.');
}

main().catch(err => {
  console.error('[GATE P3 ERROR]', err);
  process.exit(1);
});
