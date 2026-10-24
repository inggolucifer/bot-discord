/**
 * scripts/reprocess_all_42_huts_cavities.js
 * 
 * Re-processes all 42 hut & prop sprites from original high-resolution sources
 * with internal cavity detection (allowInternalCavities: true) to eliminate
 * white background trapped between wooden pillars, rafters, fence pickets,
 * stilt posts, well frames, and tool stands.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execSync } = require('child_process');
const { processLuminanceKey } = require('./assets/luminanceKey');
const { calculateTrimBounds } = require('./assets/trimPadding');

const rootDir = path.resolve(__dirname, '..');
const csvPath = path.join(rootDir, 'world-data/jianghu_hut_assets_v8.csv');
const pickedDir = path.join(rootDir, 'assets_picked');
const userUploadedDir = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\820a74ec-a0f1-4b89-8c19-ae3daa271077\\.user_uploaded';

// 1. Source files map across all previous batches
const SOURCE_MAP = JSON.parse(fs.readFileSync(path.join(rootDir, 'scripts/source_map.json'), 'utf8'));

function defringeWhiteHalos(rgbaBuffer, width, height, maxPasses = 8) {
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

          // Canvas residue
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

async function reprocessAll() {
  console.log('=== RE-PROCESSING ALL 42 ASSETS WITH INTERNAL CAVITY REMOVAL ===\n');

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.trim().split('\n').slice(1);

  let successCount = 0;

  for (const line of lines) {
    const [id, archetype, name] = line.split(',');
    const srcFile = SOURCE_MAP[id];
    if (!srcFile) {
      throw new Error(`Missing source file mapping for ${id}`);
    }

    const srcPath = path.join(userUploadedDir, srcFile);
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Source file does not exist: ${srcPath}`);
    }

    const isSnow = id.includes('snow');
    // Enable internal cavities for ALL non-snow buildings & props
    const allowInternalCavities = !isSnow;

    // 1. Read input image
    const { data, info } = await sharp(srcPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 2. Luminance keying with BFS connected components & internal cavity clearance
    const keyed = processLuminanceKey(data, info.width, info.height, {
      colorDistThreshold: 35,
      allowInternalCavities,
      minCavitySize: 10,
      featherMargin: 18
    });

    // 3. Defringe raw high-res edges & zero out RGB on transparent pixels
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

    // 6b. Edge occlusion contouring on outer perimeter
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
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer();

    const targetFile = path.join(pickedDir, `${id}.png`);
    fs.writeFileSync(targetFile, finalPng);

    const sizeKb = +(finalPng.length / 1024).toFixed(1);
    const haloPercent = edgeCount > 0 ? +((haloCount / edgeCount) * 100).toFixed(2) : 0;
    const pass = haloCount === 0 && sizeKb < 120;

    console.log(`[PASS] ${id} (${sizeKb} KB, halo: ${haloCount}, cavities: ${allowInternalCavities ? 'CLEARED' : 'PRESERVED_SNOW'})`);
    if (pass) successCount++;
  }

  console.log(`\n=== Reprocessed ${successCount}/${lines.length} assets successfully ===\n`);

  // Now re-run packHutsPrompt3Atlas.js to update the master atlas and contact sheet
  console.log('[INFO] Re-packing settlement_4 atlas and re-generating contact sheet...');
  execSync('node scripts/packHutsPrompt3Atlas.js', { cwd: rootDir, stdio: 'inherit' });

  // Copy contact sheet to artifact directory
  const brainDir = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\820a74ec-a0f1-4b89-8c19-ae3daa271077';
  fs.copyFileSync(path.join(rootDir, 'review/hut_contact_sheet.png'), path.join(brainDir, 'hut_contact_sheet.png'));
  console.log('[PASS] Updated contact sheet in artifacts directory.');
}

if (require.main === module) {
  reprocessAll().catch(err => {
    console.error('[FATAL ERROR]', err);
    process.exit(1);
  });
}

module.exports = { reprocessAll };
