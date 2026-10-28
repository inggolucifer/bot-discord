'use strict';
/**
 * scripts/v12/checkSingleSource.js
 * Verifies that for ALL frames in grid-canon-v10.json and scale-canon.json:
 * 1. Both files contain identical keys (or all frames in grid are in scale).
 * 2. vw vs visualW difference <= 1% (or absolute <= 0.01).
 * 3. vh vs visualH difference <= 1% (or absolute <= 0.01).
 * 4. fw vs collision.w and fh vs collision.h match exactly.
 */

const fs = require('fs');
const path = require('path');

const gridCanonPath = path.resolve(__dirname, '../../world-data/grid-canon-v10.json');
const scaleCanonPath = path.resolve(__dirname, '../../world-data/scale-canon.json');

function checkSingleSource() {
  if (!fs.existsSync(gridCanonPath) || !fs.existsSync(scaleCanonPath)) {
    console.error('[FAIL] One or both canon files missing!');
    process.exit(1);
  }

  const gridData = JSON.parse(fs.readFileSync(gridCanonPath, 'utf8'));
  const scaleData = JSON.parse(fs.readFileSync(scaleCanonPath, 'utf8'));

  const gridFrames = gridData.frames || {};
  let totalChecked = 0;
  let mismatches = [];

  for (const [id, g] of Object.entries(gridFrames)) {
    totalChecked++;
    const s = scaleData[id];
    if (!s) {
      mismatches.push({ id, error: 'Missing in scale-canon.json' });
      continue;
    }

    const vwDiff = Math.abs(g.vw - s.visualW);
    const vhDiff = Math.abs(g.vh - s.visualH);

    const vwTol = Math.max(0.01, g.vw * 0.01);
    const vhTol = Math.max(0.01, g.vh * 0.01);

    if (vwDiff > vwTol) {
      mismatches.push({ id, field: 'visualW', grid: g.vw, scale: s.visualW, diff: vwDiff });
    }
    if (vhDiff > vhTol) {
      mismatches.push({ id, field: 'visualH', grid: g.vh, scale: s.visualH, diff: vhDiff });
    }

    const fw = g.fw;
    const fh = g.fh;
    const sw = s.collision ? s.collision.w : undefined;
    const sh = s.collision ? s.collision.h : undefined;

    if (fw !== sw) {
      mismatches.push({ id, field: 'collision.w', grid: fw, scale: sw });
    }
    if (fh !== sh) {
      mismatches.push({ id, field: 'collision.h', grid: fh, scale: sh });
    }
  }

  console.log(`[checkSingleSource] Checked ${totalChecked} frames.`);

  if (mismatches.length > 0) {
    console.error(`[FAIL] Found ${mismatches.length} mismatches:`);
    console.error(JSON.stringify(mismatches.slice(0, 10), null, 2));
    process.exit(1);
  }

  console.log(`[PASS] 100% match! All ${totalChecked} frames have consistent visual & collision scale between grid-canon-v10.json and scale-canon.json.`);
}

if (require.main === module) {
  checkSingleSource();
}

module.exports = { checkSingleSource };
