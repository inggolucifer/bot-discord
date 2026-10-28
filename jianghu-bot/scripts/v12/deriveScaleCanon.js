'use strict';
/**
 * scripts/v12/deriveScaleCanon.js
 * Derives scale-canon.json strictly from grid-canon-v10.json (Single Source of Truth).
 * Formulas:
 *   - visualW = vw
 *   - visualH = vh
 *   - collision.w = fw
 *   - collision.h = fh
 *   - collision.mode = mode
 *   - collision.offsetX = 0
 *   - anchor.x = 0.5
 *   - anchor.y = Number(((vh - (fh * 0.5)) / vh).toFixed(4))
 * 
 * Also syncs gridCanon.json and scaleCanon.json to web-dashboard/src/config/
 */

const fs = require('fs');
const path = require('path');

const gridCanonPath = path.resolve(__dirname, '../../world-data/grid-canon-v10.json');
const scaleCanonPath = path.resolve(__dirname, '../../world-data/scale-canon.json');

const dashboardDir = path.resolve(__dirname, '../../web-dashboard/src/config');
const dashGridPath = path.join(dashboardDir, 'gridCanon.json');
const dashScalePath = path.join(dashboardDir, 'scaleCanon.json');

function deriveScaleCanon() {
  if (!fs.existsSync(gridCanonPath)) {
    console.error(`[ERROR] grid-canon-v10.json not found: ${gridCanonPath}`);
    process.exit(1);
  }

  const gridData = JSON.parse(fs.readFileSync(gridCanonPath, 'utf8'));
  const frames = gridData.frames || {};

  let existingScale = {};
  if (fs.existsSync(scaleCanonPath)) {
    try {
      existingScale = JSON.parse(fs.readFileSync(scaleCanonPath, 'utf8'));
    } catch (e) {
      existingScale = {};
    }
  }

  const derived = {};
  let updatedCount = 0;

  for (const [defId, g] of Object.entries(frames)) {
    const prev = existingScale[defId] || {};
    
    const vw = Number(g.vw);
    const vh = Number(g.vh);
    const fw = Number(g.fw);
    const fh = Number(g.fh);
    const mode = g.mode || 'soft';

    // Anchor calculation per Tale of Immortal ground alignment:
    // Footprint is centered horizontally, anchor Y is at the center of the bottom footprint cell
    const anchorY = vh > 0 ? Number(((vh - (fh * 0.5)) / vh).toFixed(4)) : 0.95;

    derived[defId] = {
      id: defId,
      page: prev.page || 'core_0',
      category: g.category || prev.category || 'prop',
      class: g.class || prev.class || 'M',
      srcW: g.srcW || prev.srcW || 128,
      srcH: g.srcH || prev.srcH || 128,
      visualW: vw,
      visualH: vh,
      ratio: Number((vh / (vw || 1)).toFixed(4)),
      collision: {
        w: fw,
        h: fh,
        mode: mode,
        offsetX: 0
      },
      pxPerTile: prev.pxPerTile || Math.round((g.srcW || 128) / (vw || 1)),
      anchor: {
        x: 0.5,
        y: anchorY
      },
      light: prev.light || null
    };
    updatedCount++;
  }

  // Write world-data/scale-canon.json
  fs.writeFileSync(scaleCanonPath, JSON.stringify(derived, null, 2), 'utf8');
  console.log(`[deriveScaleCanon] Successfully derived ${updatedCount} entries to world-data/scale-canon.json`);

  // Sync to dashboard
  if (fs.existsSync(dashboardDir)) {
    fs.copyFileSync(gridCanonPath, dashGridPath);
    fs.copyFileSync(scaleCanonPath, dashScalePath);
    console.log(`[deriveScaleCanon] Synced gridCanon.json and scaleCanon.json to web-dashboard/src/config/`);
  }

  return derived;
}

if (require.main === module) {
  deriveScaleCanon();
}

module.exports = { deriveScaleCanon };
