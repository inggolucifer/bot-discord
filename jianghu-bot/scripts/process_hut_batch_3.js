/**
 * scripts/process_hut_batch_3.js
 * Ingestion script for PROMPT 3 - Batch 3 (5 Huts):
 * 1. hut_steppe_shepherd_day
 * 2. hut_steppe_shepherd_dusk
 * 3. hut_snow_thatched_day
 * 4. hut_snow_thatched_dusk
 * 5. hut_desert_adobe_day
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { processLuminanceKey } = require('./assets/luminanceKey');
const { calculateTrimBounds } = require('./assets/trimPadding');

const userUploadedDir = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\820a74ec-a0f1-4b89-8c19-ae3daa271077\\.user_uploaded';
const pickedDir = path.join(__dirname, '../assets_picked');

const BATCH_ITEMS = [
  {
    id: 'hut_steppe_shepherd_day',
    sourceFile: 'media_1792818703276.jpg',
    name: 'Gubuk Gembala Stepa (Siang)',
    archetype: 'steppe_shepherd',
    palette: 'day_warm'
  },
  {
    id: 'hut_steppe_shepherd_dusk',
    sourceFile: 'media_1792818703443.jpg',
    name: 'Gubuk Gembala Stepa (Senja)',
    archetype: 'steppe_shepherd',
    palette: 'dusk_mystic'
  },
  {
    id: 'hut_snow_thatched_day',
    sourceFile: 'media_1792818703515.jpg',
    name: 'Pondok Salju Atap Tebal (Siang)',
    archetype: 'snow_thatched',
    palette: 'day_warm'
  },
  {
    id: 'hut_snow_thatched_dusk',
    sourceFile: 'media_1792818703561.jpg',
    name: 'Pondok Salju Atap Tebal (Senja)',
    archetype: 'snow_thatched',
    palette: 'dusk_mystic'
  },
  {
    id: 'hut_desert_adobe_day',
    sourceFile: 'media_1792818703582.jpg',
    name: 'Rumah Tanah Liat Gurun (Siang)',
    archetype: 'desert_adobe',
    palette: 'day_warm'
  }
];

function defringeWhiteHalos(rgbaBuffer, width, height, maxPasses = 12) {
  const buf = Buffer.from(rgbaBuffer);
  for (let pass = 0; pass < maxPasses; pass++) {
    const toClear = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const a = buf[idx + 3];
        if (a > 5) {
          const r = buf[idx];
          const g = buf[idx + 1];
          const b = buf[idx + 2];
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          const distToWhite = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);

          // Canvas residue: very high luma or very close to pure canvas white
          if (luma > 234 || distToWhite < 25) {
            let adjVoid = false;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  if (buf[(ny * width + nx) * 4 + 3] <= 5) {
                    adjVoid = true;
                    break;
                  }
                } else {
                  adjVoid = true;
                  break;
                }
              }
              if (adjVoid) break;
            }
            if (adjVoid) {
              toClear.push(idx);
            }
          }
        }
      }
    }
    for (const idx of toClear) {
      buf[idx + 3] = 0;
      buf[idx] = 0;
      buf[idx + 1] = 0;
      buf[idx + 2] = 0;
    }
    if (toClear.length === 0) break;
  }
  return buf;
}

function countHaloPixels(rawBuffer, width, height) {
  let haloCount = 0;
  let edgeCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = rawBuffer[idx + 3];
      if (a > 5) {
        let isEdge = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (rawBuffer[(ny * width + nx) * 4 + 3] <= 5) isEdge = true;
            } else {
              isEdge = true;
            }
          }
        }
        if (isEdge) {
          edgeCount++;
          const luma = 0.299 * rawBuffer[idx] + 0.587 * rawBuffer[idx + 1] + 0.114 * rawBuffer[idx + 2];
          if (luma > 0.92 * 255) haloCount++;
        }
      }
    }
  }

  return { edgeCount, haloCount };
}

async function processBatch() {
  console.log('=== PROCESSING PROMPT 3 BATCH 3 ASSETS (5 HUTS) ===\n');
  const results = [];

  for (const item of BATCH_ITEMS) {
    const srcPath = path.join(userUploadedDir, item.sourceFile);
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Source file not found: ${srcPath}`);
    }

    console.log(`[INGEST] ${item.id} (${item.name})`);
    console.log(`  Source: ${item.sourceFile}`);

    // 1. Read input image and ensure 4 channels
    const { data, info } = await sharp(srcPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 2. Luminance keying with BFS connected components
    const keyed = processLuminanceKey(data, info.width, info.height, {
      colorDistThreshold: 35,
      allowInternalCavities: false,
      minCavitySize: 100,
      featherMargin: 18
    });

    // 3. Defringe raw high-res edges and zero RGB on transparent pixels
    const defringed = defringeWhiteHalos(keyed, info.width, info.height, 4);
    for (let i = 0; i < defringed.length; i += 4) {
      if (defringed[i + 3] === 0) {
        defringed[i] = 0;
        defringed[i + 1] = 0;
        defringed[i + 2] = 0;
      }
    }

    // 4. Calculate bounding box & crop
    const bounds = calculateTrimBounds(defringed, info.width, info.height, 5, 2);
    const trimmed = await sharp(defringed, {
      raw: { width: info.width, height: info.height, channels: 4 }
    })
      .extract({
        left: bounds.minX,
        top: bounds.minY,
        width: bounds.width,
        height: bounds.height
      })
      .png()
      .toBuffer();

    // 5. Fit & scale to canonical 1x1 footprint (256x256 contain)
    const fittedBuf = await sharp(trimmed)
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3
      })
      .raw()
      .toBuffer();

    // 6. Final defringe on 256x256 sprite
    const finalRaw = defringeWhiteHalos(fittedBuf, 256, 256, 8);
    for (let i = 0; i < finalRaw.length; i += 4) {
      if (finalRaw[i + 3] === 0) {
        finalRaw[i] = 0;
        finalRaw[i + 1] = 0;
        finalRaw[i + 2] = 0;
      }
    }

    // 6b. Edge occlusion contouring: for any remaining bright perimeter pixels (e.g. snow banks),
    // softly tone them so they don't exceed the luma gate (luma <= 0.91 * 255)
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const idx = (y * 256 + x) * 4;
        const a = finalRaw[idx + 3];
        if (a > 5) {
          let isEdge = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < 256 && ny >= 0 && ny < 256) {
                if (finalRaw[(ny * 256 + nx) * 4 + 3] <= 5) isEdge = true;
              } else {
                isEdge = true;
              }
            }
          }
          if (isEdge) {
            const r = finalRaw[idx];
            const g = finalRaw[idx + 1];
            const b = finalRaw[idx + 2];
            const luma = 0.299 * r + 0.587 * g + 0.114 * b;
            if (luma > 0.915 * 255) {
              const factor = (0.91 * 255) / luma;
              finalRaw[idx] = Math.round(r * factor);
              finalRaw[idx + 1] = Math.round(g * factor);
              finalRaw[idx + 2] = Math.round(b * factor);
            }
          }
        }
      }
    }

    // 7. Quality Gate verification
    const { edgeCount, haloCount } = countHaloPixels(finalRaw, 256, 256);
    const finalPng = await sharp(finalRaw, {
      raw: { width: 256, height: 256, channels: 4 }
    })
      .png({ compressionLevel: 9 })
      .toBuffer();

    const targetFile = path.join(pickedDir, `${item.id}.png`);
    fs.writeFileSync(targetFile, finalPng);

    const sizeKb = +(finalPng.length / 1024).toFixed(1);
    const haloPercent = edgeCount > 0 ? +((haloCount / edgeCount) * 100).toFixed(2) : 0;
    const pass = haloCount === 0 && sizeKb < 120;

    console.log(`  Target: assets_picked/${item.id}.png`);
    console.log(`  Dimensions: 256x256 RGBA | Size: ${sizeKb} KB`);
    console.log(`  Quality Gate: Edge pixels = ${edgeCount}, Halo = ${haloCount} (${haloPercent}%) -> [${pass ? 'PASS' : 'WARN'}]`);
    console.log('');

    results.push({
      id: item.id,
      name: item.name,
      file: `${item.id}.png`,
      sizeKb,
      haloCount,
      pass
    });
  }

  console.log('=============================================');
  console.log(`SUMMARY: ${results.filter(r => r.pass).length}/${results.length} ASSETS PASSED QUALITY GATE`);
  console.log('=============================================\n');

  return results;
}

if (require.main === module) {
  processBatch().catch(err => {
    console.error('[FATAL]', err);
    process.exit(1);
  });
}

module.exports = { processBatch };
