const fs = require('fs');
const path = require('path');
const sharp = require('../node_modules/sharp');

const ATLAS_DIR = path.join(__dirname, '../web-dashboard/public/assets/atlas');
const index = JSON.parse(fs.readFileSync(path.join(ATLAS_DIR, 'atlas_index.json'), 'utf8'));
const frames = index.frames || {};

async function audit() {
  console.log(`Auditing ${Object.keys(frames).length} frames across atlas pages...`);
  
  const pageCache = {};
  const issues = [];

  for (const [frameId, def] of Object.entries(frames)) {
    const pageName = def.page;
    if (!pageCache[pageName]) {
      const pagePath = path.join(ATLAS_DIR, pageName + '.webp');
      if (!fs.existsSync(pagePath)) {
        issues.push({ frameId, pageName, reason: `Page file not found: ${pageName}.webp` });
        continue;
      }
      // Load raw buffer of the whole page once
      const { data, info } = await sharp(pagePath).raw().toBuffer({ resolveWithObject: true });
      pageCache[pageName] = { data, info };
    }

    const { data: pageData, info: pageInfo } = pageCache[pageName];
    const { x, y, w, h } = def.frame;
    if (w <= 0 || h <= 0) {
      issues.push({ frameId, pageName, reason: `Invalid frame size: w=${w} h=${h}` });
      continue;
    }

    let visiblePixels = 0;
    let minX = w, maxX = 0, minY = h, maxY = 0;
    let rSum = 0, gSum = 0, bSum = 0;

    for (let py = 0; py < h; py++) {
      const pageY = y + py;
      if (pageY >= pageInfo.height) continue;
      for (let px = 0; px < w; px++) {
        const pageX = x + px;
        if (pageX >= pageInfo.width) continue;

        const idx = (pageY * pageInfo.width + pageX) * pageInfo.channels;
        const a = pageData[idx + 3];
        if (a > 20) {
          visiblePixels++;
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
          rSum += pageData[idx];
          gSum += pageData[idx + 1];
          bSum += pageData[idx + 2];
        }
      }
    }

    const totalPixels = w * h;
    const coveragePct = Number(((visiblePixels / totalPixels) * 100).toFixed(1));
    const bboxW = visiblePixels > 0 ? (maxX - minX + 1) : 0;
    const bboxH = visiblePixels > 0 ? (maxY - minY + 1) : 0;

    // Anomalies detection:
    // 1. Almost empty (< 100 pixels)
    if (visiblePixels < 100) {
      issues.push({
        frameId,
        pageName,
        type: 'EMPTY_OR_GHOST',
        visiblePixels,
        coveragePct: `${coveragePct}%`,
        bbox: `${bboxW}x${bboxH}`,
        frameSize: `${w}x${h}`
      });
    }
    // 2. Extreme sliver / tiny bounding box on large object frame (w >= 96 or h >= 96)
    else if ((w >= 96 || h >= 96) && (bboxW < 30 || bboxH < 30 || coveragePct < 5.0)) {
      const avgR = Math.round(rSum / visiblePixels);
      const avgG = Math.round(gSum / visiblePixels);
      const avgB = Math.round(bSum / visiblePixels);
      issues.push({
        frameId,
        pageName,
        type: 'SLIVER_CLIPPED',
        visiblePixels,
        coveragePct: `${coveragePct}%`,
        bbox: `${bboxW}x${bboxH}`,
        frameSize: `${w}x${h}`,
        avgColor: `rgb(${avgR},${avgG},${avgB})`
      });
    }
    // 3. Severely hollow nature / tree / landmark
    else if ((frameId.startsWith('tree_') || frameId.startsWith('nature_') || frameId.startsWith('mt_') || frameId.startsWith('bamboo_')) && coveragePct < 8.0) {
      issues.push({
        frameId,
        pageName,
        type: 'LOW_COVERAGE_NATURE',
        visiblePixels,
        coveragePct: `${coveragePct}%`,
        bbox: `${bboxW}x${bboxH}`,
        frameSize: `${w}x${h}`
      });
    }
  }

  console.log(`\n=== AUDIT RESULTS: Found ${issues.length} problematic assets ===`);
  console.log(JSON.stringify(issues, null, 2));

  fs.writeFileSync(path.join(__dirname, 'audit_atlas_issues.json'), JSON.stringify(issues, null, 2), 'utf8');
  console.log('\nSaved full report to scripts/audit_atlas_issues.json');
}

audit().catch(console.error);
