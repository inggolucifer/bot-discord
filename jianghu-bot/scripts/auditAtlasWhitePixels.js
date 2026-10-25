const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function scanAtlases() {
  const atlasDir = path.resolve(__dirname, '../web-dashboard/public/assets/atlas');
  const idx = JSON.parse(fs.readFileSync(path.join(atlasDir, 'index.json')));
  const pages = idx.pages;
  console.log('=== AUDIT WHITE PIXELS DALAM SELURUH ATLAS ===');
  console.log('Total atlas pages to scan:', pages.length);

  const report = {};

  for (const p of pages) {
    const filePath = path.join(atlasDir, p.file);
    if (!fs.existsSync(filePath)) continue;
    const img = sharp(filePath);
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    
    const pageFrames = Object.entries(idx.frames).filter(([k, v]) => v.page === p.name);
    let suspicious = [];
    
    for (const [fId, fObj] of pageFrames) {
      const { x, y, w, h } = fObj.frame;
      let whiteCount = 0;
      let opaqueCount = 0;
      
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          const pIdx = ((y + r) * info.width + (x + c)) * info.channels;
          const red = data[pIdx];
          const green = data[pIdx + 1];
          const blue = data[pIdx + 2];
          const alpha = info.channels === 4 ? data[pIdx + 3] : 255;
          
          if (alpha > 200) {
            opaqueCount++;
            if (red > 235 && green > 235 && blue > 235) {
              whiteCount++;
            }
          }
        }
      }
      
      const pct = opaqueCount > 0 ? (whiteCount / opaqueCount) * 100 : 0;
      if (pct > 4.0 && whiteCount > 300) {
        suspicious.push({ fId, whiteCount, pct: parseFloat(pct.toFixed(2)) });
      }
    }
    
    if (suspicious.length > 0) {
      report[p.name] = suspicious;
      console.log(`\nPage [${p.name}] — ${suspicious.length} frame terdeteksi memiliki area putih:`);
      for (const s of suspicious) {
        console.log(`  * ${s.fId.padEnd(45)}: ${s.whiteCount.toString().padStart(6)} px (${s.pct}%)`);
      }
    }
  }

  fs.writeFileSync(path.resolve(__dirname, '../review/white_pixels_audit.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log('\n[PASS] Laporan tersimpan di review/white_pixels_audit.json');
}

scanAtlases().catch(console.error);
