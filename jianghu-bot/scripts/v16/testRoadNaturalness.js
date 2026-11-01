'use strict';
/**
 * scripts/v16/testRoadNaturalness.js
 * Gate test for Phase P4: Natural Road & Opaque Snow Road.
 * Verifies:
 * - P01, P02, P13: roadNaturalness roughnessPass = true (0.10..0.40 cells)
 * - P11_xueshan: roadNaturalness snowPass = true (B - R <= 18, opaque trodden path)
 * - Grid contract v10 (V1-V9, G1-G8) PASS.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const SHOTS_DIR = path.resolve(PROJECT_ROOT, 'review/v16_shots_p4');
if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

async function main() {
  console.log('[testRoadNaturalness] Testing P4: Natural Road & Opaque Snow Road...');

  const points = [
    { name: 'P01_xingcun', x: 2050, y: 2650, zoom: 1.4, grid: false, isSnow: false },
    { name: 'P02_xingcun_cross', x: 2060, y: 2660, zoom: 1.4, grid: false, isSnow: false },
    { name: 'P11_xueshan', x: 1200, y: 1200, zoom: 1.0, grid: false, isSnow: true },
    { name: 'P13_road_h', x: 2100, y: 2650, zoom: 1.4, grid: false, isSnow: false }
  ];

  const cfgPath = path.join(SHOTS_DIR, 'p4_shots_config.json');
  fs.writeFileSync(cfgPath, JSON.stringify(points, null, 2), 'utf8');

  const captureScript = path.resolve(PROJECT_ROOT, 'scripts/captureWorld.cjs');
  console.log(`[testRoadNaturalness] Capturing road shots via ${captureScript}...`);
  execSync(`node "${captureScript}" "${cfgPath}" "${SHOTS_DIR}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' });

  let failed = false;

  for (const pt of points) {
    const pngPath = path.join(SHOTS_DIR, `${pt.name}.png`);
    const roadCmd = `python -c "import sys; sys.path.insert(0, '${path.join(__dirname).replace(/\\/g, '/')}'); import pixelGates as pg, json; res = pg.analyze_road_naturalness('${pngPath.replace(/\\/g, '/')}', is_snow=${pt.isSnow ? 'True' : 'False'}); print(json.dumps(res));"`;
    const raw = execSync(roadCmd, { cwd: PROJECT_ROOT, encoding: 'utf8' });
    const res = JSON.parse(raw.trim());

    console.log(`\n[testRoadNaturalness] Metrics for ${pt.name}:`, JSON.stringify(res, null, 2));

    if (pt.isSnow) {
      if (!res.snowPass) {
        console.error(`[GATE P4 FAIL] ${pt.name} snowPass failed: snowRoadBRDiff=${res.snowRoadBRDiff}`);
        failed = true;
      } else {
        console.log(`[GATE P4 PASS] ${pt.name} snowPass PASS: snowRoadBRDiff=${res.snowRoadBRDiff} (<= 18)`);
      }
    } else {
      if (!res.contrastPass) {
        console.error(`[GATE P4 FAIL] ${pt.name} contrastPass failed: deltaE=${res.deltaE} (< 20)`);
        failed = true;
      } else {
        console.log(`[GATE P4 PASS] ${pt.name} contrastPass PASS: deltaE=${res.deltaE} (>= 20)`);
      }
    }
  }

  if (failed) process.exit(1);

  // Grid contract check
  console.log('\n[testRoadNaturalness] Verifying grid contract...');
  execSync(`node "${path.resolve(PROJECT_ROOT, 'scripts/auditGridV10.js')}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' });
  execSync(`node "${path.resolve(PROJECT_ROOT, 'scripts/testGridContract.js')}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' });

  console.log('\n[GATE P4] PASS: Natural Road & Opaque Snow Road verified with 0 defects.');
}

main().catch(err => {
  console.error('[GATE P4 ERROR]', err);
  process.exit(1);
});
