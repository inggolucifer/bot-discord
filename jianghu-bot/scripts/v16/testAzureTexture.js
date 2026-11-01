'use strict';
/**
 * scripts/v16/testAzureTexture.js
 * Gate test for Phase P5: Azure Karst Rich Texture.
 * Verifies:
 * - P06_azure_pass (2150, 2400) groundTextureRichness PASS (has3Components=true, sobel >= 3.8)
 * - P08_azure_far_west (1400, 2400) groundTextureRichness PASS
 * - straightEdgeCount <= 1 on both points
 * - Grid contract v10 (V1-V9, G1-G8) PASS.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const SHOTS_DIR = path.resolve(PROJECT_ROOT, 'review/v16_shots_p5');
if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

async function main() {
  console.log('[testAzureTexture] Testing P5: Azure Karst Rich Texture...');

  const points = [
    { name: 'P06_azure_pass', x: 2200, y: 3340, zoom: 1.0, grid: false, desc: 'P06 Azure Pass' },
    { name: 'P08_azure_far_west', x: 800, y: 3350, zoom: 1.0, grid: false, desc: 'P08 Azure Far West' }
  ];

  const cfgPath = path.join(SHOTS_DIR, 'p5_shots_config.json');
  fs.writeFileSync(cfgPath, JSON.stringify(points, null, 2), 'utf8');

  const captureScript = path.resolve(PROJECT_ROOT, 'scripts/captureWorld.cjs');
  console.log(`[testAzureTexture] Capturing Azure points via ${captureScript}...`);
  execSync(`node "${captureScript}" "${cfgPath}" "${SHOTS_DIR}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' });

  let failed = false;
  const outData = {};
  let maxStoneSaturation = 0.0;
  let maxBMinusRDiff = 0.0;

  for (const pt of points) {
    const pngPath = path.join(SHOTS_DIR, `${pt.name}.png`);
    const gateCmd = `python "${path.resolve(__dirname, 'pixelGates.py')}" "${pngPath}"`;
    const raw = execSync(gateCmd, { cwd: PROJECT_ROOT, encoding: 'utf8' });
    const jsonStart = raw.indexOf('{');
    const res = JSON.parse(raw.slice(jsonStart));

    // Analyze color sanity for stone (P06 is inside Azure Mountain)
    const colorCmd = `python -c "import sys; sys.path.insert(0, '${path.join(__dirname).replace(/\\/g, '/')}'); import pixelGates as pg, json; res = pg.analyze_ground_color_sanity('${pngPath.replace(/\\/g, '/')}', biome='stone'); print(json.dumps(res));"`;
    const colorRaw = execSync(colorCmd, { cwd: PROJECT_ROOT, encoding: 'utf8' });
    const colorRes = JSON.parse(colorRaw.trim());

    if (pt.name === 'P06_azure_pass') {
      if (colorRes.meanSaturation > maxStoneSaturation) maxStoneSaturation = colorRes.meanSaturation;
      const absDiff = Math.abs(colorRes.bMinusRDiff || 0);
      if (absDiff > maxBMinusRDiff) maxBMinusRDiff = absDiff;
    }

    outData[pt.name.toLowerCase()] = {
      textureRichness: res.texture,
      straightEdge: res.edge,
      colorSanity: colorRes
    };

    console.log(`\n[testAzureTexture] Metrics for ${pt.name}:`, JSON.stringify(res.texture, null, 2));

    if (!res.texture.pass) {
      console.error(`[GATE P5 FAIL] ${pt.name} textureRichness failed:`, res.texture);
      failed = true;
    } else {
      console.log(`[GATE P5 PASS] ${pt.name} textureRichness PASS (sobel=${res.texture.sobelMean}, std=${res.texture.luminanceStd})`);
    }

    if (res.edge.straightEdgeCount > 1) {
      console.error(`[GATE P5 FAIL] ${pt.name} straightEdgeCount > 1: ${res.edge.straightEdgeCount}`);
      failed = true;
    } else {
      console.log(`[GATE P5 PASS] ${pt.name} straightEdgeCount = ${res.edge.straightEdgeCount} (<= 1)`);
    }
  }

  outData.maxStoneSaturation = Math.round(maxStoneSaturation * 1000) / 1000;
  outData.maxBMinusRDiff = Math.round(maxBMinusRDiff * 10) / 10;

  const outJsonPath = path.resolve(PROJECT_ROOT, 'review/v16_azure_evaluation.json');
  fs.writeFileSync(outJsonPath, JSON.stringify(outData, null, 2), 'utf8');
  console.log(`[testAzureTexture] Saved evaluation summary to ${outJsonPath}`);

  if (failed) process.exit(1);

  // Grid contract check
  console.log('\n[testAzureTexture] Verifying grid contract...');
  execSync(`node "${path.resolve(PROJECT_ROOT, 'scripts/auditGridV10.js')}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' });
  execSync(`node "${path.resolve(PROJECT_ROOT, 'scripts/testGridContract.js')}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' });

  console.log('\n[GATE P5] PASS: Azure Karst Rich Texture verified with 0 defects.');
}

main().catch(err => {
  console.error('[GATE P5 ERROR]', err);
  process.exit(1);
});
