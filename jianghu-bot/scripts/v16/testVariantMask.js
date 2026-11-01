'use strict';
/**
 * scripts/v16/testVariantMask.js
 * Gate test for Phase P1: Weighted Variant Selection & Continuous World Noise Mask.
 * Verifies:
 * - Straight seam edge count <= 1 in P01 (Xingcun) & P03 (Wilderness).
 * - Grid contract v10 (V1-V9, G1-G8) PASS.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const SHOTS_DIR = path.resolve(PROJECT_ROOT, 'review/v16_shots_p1');
if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

async function main() {
  console.log('[testVariantMask] Testing P1: Continuous World Noise Mask & Variant Weights...');

  // 1. Capture P01 and P03
  const points = [
    { name: 'P01_xingcun', x: 2050, y: 2650, zoom: 1.4, grid: false, desc: 'P01 Xingcun' },
    { name: 'P03_wild', x: 2300, y: 3000, zoom: 1.0, grid: false, desc: 'P03 Wild' }
  ];

  const cfgPath = path.join(SHOTS_DIR, 'p1_shots_config.json');
  fs.writeFileSync(cfgPath, JSON.stringify(points, null, 2), 'utf8');

  const captureScript = path.resolve(PROJECT_ROOT, 'scripts/captureWorld.cjs');
  console.log(`[testVariantMask] Capturing P01 and P03 via ${captureScript}...`);
  execSync(`node "${captureScript}" "${cfgPath}" "${SHOTS_DIR}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' });

  const outData = {};

  for (const pt of points) {
    const pngPath = path.join(SHOTS_DIR, `${pt.name}.png`);
    // Analyze with pixelGates.py
    const gateCmd = `python "${path.resolve(__dirname, 'pixelGates.py')}" "${pngPath}"`;
    const raw = execSync(gateCmd, { cwd: PROJECT_ROOT, encoding: 'utf8' });
    const jsonStart = raw.indexOf('{');
    const res = JSON.parse(raw.slice(jsonStart));

    // Analyze color sanity for grass
    const colorCmd = `python -c "import sys; sys.path.insert(0, '${path.join(__dirname).replace(/\\/g, '/')}'); import pixelGates as pg, json; res = pg.analyze_ground_color_sanity('${pngPath.replace(/\\/g, '/')}', biome='grass'); print(json.dumps(res));"`;
    const colorRaw = execSync(colorCmd, { cwd: PROJECT_ROOT, encoding: 'utf8' });
    const colorRes = JSON.parse(colorRaw.trim());

    outData[pt.name.toLowerCase()] = {
      straightEdge: res.edge,
      brownOliveRatio: colorRes.brownOliveRatio,
      colorSanity: colorRes
    };

    console.log(`[testVariantMask] ${pt.name} straightEdgeCount: ${res.edge.straightEdgeCount} (pass: ${res.edge.pass}), brownOliveRatio: ${colorRes.brownOliveRatio}`);
    if (res.edge.straightEdgeCount > 1) {
      console.error(`[GATE P1 FAIL] ${pt.name} straightEdgeCount exceeds 1: ${res.edge.straightEdgeCount}`);
      process.exit(1);
    }
  }

  const outJsonPath = path.resolve(PROJECT_ROOT, 'review/v16_plains_evaluation.json');
  fs.writeFileSync(outJsonPath, JSON.stringify(outData, null, 2), 'utf8');
  console.log(`[testVariantMask] Saved evaluation summary to ${outJsonPath}`);

  // 2. Run Grid Contract audits
  console.log('[testVariantMask] Running auditGridV10 & testGridContract...');
  execSync(`node "${path.resolve(PROJECT_ROOT, 'scripts/auditGridV10.js')}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' });
  execSync(`node "${path.resolve(PROJECT_ROOT, 'scripts/testGridContract.js')}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' });

  console.log('\n[GATE P1] PASS: Continuous World Noise Mask & Grid Contract verified.');
}

main().catch(err => {
  console.error('[GATE P1 ERROR]', err);
  process.exit(1);
});
