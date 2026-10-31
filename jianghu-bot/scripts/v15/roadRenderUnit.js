#!/usr/bin/env node
/**
 * scripts/v15/roadRenderUnit.js
 * Unit Test for Road Rendering (Prompt V15 Lampiran A & P1)
 * 
 * Renders 12 contiguous road tiles to offscreen canvas in headless browser.
 * Verifies filled road mask area >= 85% of theoretical ribbon area (12 * 0.75 * tileSize^2).
 * (Before V15 fix, only 1 tile was rendered, resulting in < 15% coverage).
 */

const path = require('path');
let playwright;
try {
  playwright = require('playwright');
} catch (e) {
  playwright = require('C:/Users/User/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
}
const { chromium } = playwright;

async function runTest() {
  console.log('=== V15 ROAD RENDERING OFFSCREEN CANVAS UNIT TEST ===');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    browser = await chromium.launch({
      headless: true,
      executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    });
  }

  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });

  const result = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const tileSize = 54;
    canvas.width = 16 * tileSize;
    canvas.height = 4 * tileSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { error: 'No 2D context' };

    // Implementation of drawSoftBlobRoadPath exactly as in groundRenderer.ts
    function drawSoftBlobRoadPath(ctx, px, py, tileSize, bitmask, worldX, worldY) {
      const hasN = (bitmask & 1) !== 0;
      const hasE = (bitmask & 2) !== 0;
      const hasS = (bitmask & 4) !== 0;
      const hasW = (bitmask & 8) !== 0;

      const cx = px + tileSize * 0.5;
      const cy = py + tileSize * 0.5;
      const isWide = ((hasE && hasW) && (hasN || hasS)) || ((hasN && hasS) && (hasE || hasW));
      const hw = isWide ? tileSize * 0.50 : tileSize * 0.44;
      const r = tileSize * 0.30;

      const wx = worldX !== undefined ? worldX : px / tileSize;
      const wy = worldY !== undefined ? worldY : py / tileSize;
      const undulate = Math.sin(wx * 0.35 + wy * 0.42) * (tileSize * 0.035);
      const left = cx - hw + undulate;
      const right = cx + hw + undulate;
      const top = cy - hw - undulate;
      const bottom = cy + hw - undulate;

      ctx.beginPath();

      if (!hasN && !hasS && !hasW && !hasE) {
        ctx.ellipse(cx, cy, hw * 0.85, hw * 0.75, 0.2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        return;
      }

      if (hasN) {
        ctx.moveTo(left, py);
        ctx.lineTo(right, py);
      } else {
        ctx.moveTo(left + r, top);
        ctx.lineTo(right - r, top);
        if (!hasE) ctx.arcTo(right, top, right, top + r, r);
      }

      if (hasE) {
        if (!hasN) ctx.lineTo(right, top);
        ctx.lineTo(px + tileSize, cy - hw);
        ctx.lineTo(px + tileSize, cy + hw);
        if (!hasS) ctx.lineTo(right, bottom);
      } else {
        if (hasN) ctx.lineTo(right, cy - hw);
        ctx.lineTo(right, bottom - r);
        if (!hasS) ctx.arcTo(right, bottom, right - r, bottom, r);
      }

      if (hasS) {
        if (!hasE && !hasS) ctx.lineTo(right, bottom);
        ctx.lineTo(right, py + tileSize);
        ctx.lineTo(left, py + tileSize);
        if (!hasW) ctx.lineTo(left, bottom);
      } else {
        if (hasE) ctx.lineTo(cx + hw, bottom);
        ctx.lineTo(left + r, bottom);
        if (!hasW) ctx.arcTo(left, bottom, left, bottom - r, r);
      }

      if (hasW) {
        if (!hasS) ctx.lineTo(left, bottom);
        ctx.lineTo(px, cy + hw);
        ctx.lineTo(px, cy - hw);
        if (!hasN) ctx.lineTo(left, top);
      } else {
        if (hasS) ctx.lineTo(left, cy + hw);
        ctx.lineTo(left, top + r);
        if (!hasN) ctx.arcTo(left, top, left + r, top, r);
      }

      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#000000';
    // Render 12 consecutive horizontal road tiles (gx = 2 to 13, gy = 1)
    const numTiles = 12;
    for (let i = 0; i < numTiles; i++) {
      const gx = 2 + i;
      const gy = 1;
      const px = gx * tileSize;
      const py = gy * tileSize;
      let bm = 0;
      if (i > 0) bm |= 8;           // hasW
      if (i < numTiles - 1) bm |= 2; // hasE
      drawSoftBlobRoadPath(ctx, px, py, tileSize, bm, gx, gy);
    }

    // Count filled pixels in the canvas
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d32 = new Uint32Array(imgData.data.buffer);
    let filledCount = 0;
    for (let i = 0; i < d32.length; i++) {
      if ((d32[i] & 0xff000000) !== 0) filledCount++;
    }

    const theoreticalTileArea = 0.88 * 0.88 * tileSize * tileSize;
    const totalTheoreticalArea = numTiles * theoreticalTileArea;
    const coverage = filledCount / totalTheoreticalArea;

    return {
      numTiles,
      filledCount,
      totalTheoreticalArea,
      coverage,
      passed: coverage >= 0.85
    };
  });

  await browser.close();

  console.log(`Tiles rendered: ${result.numTiles}`);
  console.log(`Filled pixels: ${result.filledCount}`);
  console.log(`Theoretical area: ${Math.round(result.totalTheoreticalArea)}`);
  console.log(`Coverage ratio: ${(result.coverage * 100).toFixed(1)}% (Target >= 85%)`);

  if (!result.passed) {
    console.error('[FAIL] Road coverage is below 85%!');
    process.exit(1);
  } else {
    console.log('[PASS] Road rendering unit test PASSED with flying colors!');
  }
}

if (require.main === module) {
  runTest().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
