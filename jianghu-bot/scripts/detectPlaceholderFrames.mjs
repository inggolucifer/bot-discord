import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const atlasDir = path.resolve(__dirname, '../web-dashboard/public/assets/atlas');
const reviewDir = path.resolve(__dirname, '../review');
if (!fs.existsSync(reviewDir)) fs.mkdirSync(reviewDir, { recursive: true });

async function run() {
  console.log('[detectPlaceholderFrames] Scanning atlas pages in:', atlasDir);
  const files = fs.readdirSync(atlasDir).filter(f => f.endsWith('.json') && !f.includes('index') && !f.includes('icons_ui'));

  const reportRows = [
    ['frameId', 'page', 'w', 'h', 'cw', 'pxPerTile', 'avgGradient', 'uniqueColors', 'bboxFill', 'status', 'reason']
  ];

  const suspectFrames = [];

  for (const jsonFile of files) {
    const pageName = jsonFile.replace('.json', '');
    const webpFile = path.join(atlasDir, `${pageName}.webp`);
    if (!fs.existsSync(webpFile)) continue;

    console.log(`[detectPlaceholderFrames] Processing ${pageName}...`);
    const manifest = JSON.parse(fs.readFileSync(path.join(atlasDir, jsonFile), 'utf8'));

    const { data: rawBuffer, info } = await sharp(webpFile)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const atlasW = info.width;
    const atlasH = info.height;
    const channels = info.channels;

    for (const [frameId, frameData] of Object.entries(manifest.frames || {})) {
      if (frameId.startsWith('icon_') || frameId.startsWith('autotile_')) continue;

      const rect = frameData.frame;
      if (!rect || rect.w <= 0 || rect.h <= 0) continue;

      const cw = frameData.metadata?.footprint?.cw || 1;
      const pxPerTile = rect.w / cw;

      let nonTransparentCount = 0;
      let totalGradient = 0;
      let gradSampleCount = 0;
      const uniqueColors = new Set();

      const fx = rect.x;
      const fy = rect.y;
      const fw = rect.w;
      const fh = rect.h;

      for (let y = 0; y < fh; y++) {
        const py = fy + y;
        if (py >= atlasH) break;

        for (let x = 0; x < fw; x++) {
          const px = fx + x;
          if (px >= atlasW) break;

          const idx = (py * atlasW + px) * channels;
          const a = rawBuffer[idx + 3];

          if (a > 20) {
            nonTransparentCount++;
            const r = rawBuffer[idx];
            const g = rawBuffer[idx + 1];
            const b = rawBuffer[idx + 2];

            // Quantize to 16 levels per channel (4096 color space)
            const qColor = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
            uniqueColors.add(qColor);

            // Compute local horizontal & vertical intensity gradient
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            if (x < fw - 1 && px < atlasW - 1) {
              const nidx = (py * atlasW + px + 1) * channels;
              if (rawBuffer[nidx + 3] > 20) {
                const nlum = 0.299 * rawBuffer[nidx] + 0.587 * rawBuffer[nidx + 1] + 0.114 * rawBuffer[nidx + 2];
                totalGradient += Math.abs(nlum - lum);
                gradSampleCount++;
              }
            }

            if (y < fh - 1 && py < atlasH - 1) {
              const bidx = ((py + 1) * atlasW + px) * channels;
              if (rawBuffer[bidx + 3] > 20) {
                const blum = 0.299 * rawBuffer[bidx] + 0.587 * rawBuffer[bidx + 1] + 0.114 * rawBuffer[bidx + 2];
                totalGradient += Math.abs(blum - lum);
                gradSampleCount++;
              }
            }
          }
        }
      }

      const totalPixels = fw * fh;
      const bboxFill = nonTransparentCount / totalPixels;
      const avgGradient = gradSampleCount > 0 ? (totalGradient / gradSampleCount) : 0;
      const uniqueCount = uniqueColors.size;

      // Detection criteria per Plan V7 Phase HA:
      // SUSPECT if: pxPerTile < 96, OR avgGradient < 2.0 (flat gradient fill), OR (grad < 8 && uniqueColors < 130), OR (bboxFill between 0.45-0.55 OR > 0.95) with uniqueColors < 40
      const reasons = [];
      if (pxPerTile < 96) reasons.push('low_res_px_per_tile');
      if (avgGradient < 2.0) reasons.push('flat_procedural_gradient');
      else if (avgGradient < 8 && uniqueCount < 130) reasons.push('flat_vector_gradient');
      if ((bboxFill >= 0.45 && bboxFill <= 0.55 || bboxFill > 0.95) && uniqueCount < 40) reasons.push('geometric_shape_silhouette');

      const isSuspect = reasons.length > 0;
      const status = isSuspect ? 'SUSPECT' : 'OK';

      reportRows.push([
        frameId,
        pageName,
        fw,
        fh,
        cw,
        pxPerTile.toFixed(1),
        avgGradient.toFixed(2),
        uniqueCount,
        bboxFill.toFixed(3),
        status,
        reasons.join('|')
      ]);

      if (isSuspect) {
        suspectFrames.push({
          frameId,
          pageName,
          webpFile,
          rect,
          reasons: reasons.join(', ')
        });
      }
    }
  }

  // 1. Output CSV report
  const csvContent = reportRows.map(r => r.join(',')).join('\n');
  const csvPath = path.join(reviewDir, 'placeholder_report.csv');
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log(`[detectPlaceholderFrames] Wrote report with ${reportRows.length - 1} frames to ${csvPath}`);
  console.log(`[detectPlaceholderFrames] Total SUSPECT placeholder frames found: ${suspectFrames.length}`);

  // 2. Output Contact Sheet of Suspect Frames (review/placeholder_sheet.png)
  if (suspectFrames.length > 0) {
    console.log('[detectPlaceholderFrames] Building contact sheet review/placeholder_sheet.png...');
    const cols = 8;
    const thumbW = 160;
    const thumbH = 160;
    const pad = 12;
    const rows = Math.ceil(suspectFrames.length / cols);

    const sheetW = cols * (thumbW + pad) + pad;
    const sheetH = rows * (thumbH + pad) + pad;

    const composites = [];

    for (let i = 0; i < suspectFrames.length; i++) {
      const sf = suspectFrames[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const destX = pad + col * (thumbW + pad);
      const destY = pad + row * (thumbH + pad);

      try {
        // Extract frame and resize to fit within thumbW x (thumbH - 24)
        const frameBuf = await sharp(sf.webpFile)
          .extract({
            left: Math.max(0, sf.rect.x),
            top: Math.max(0, sf.rect.y),
            width: sf.rect.w,
            height: sf.rect.h
          })
          .resize(thumbW - 16, thumbH - 36, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .toBuffer();

        // Create thumbnail card with label SVG
        const cardSvg = Buffer.from(`
          <svg width="${thumbW}" height="${thumbH}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${thumbW}" height="${thumbH}" rx="6" fill="#151A24" stroke="#EF4444" stroke-width="1.5"/>
            <text x="${thumbW / 2}" y="${thumbH - 18}" font-family="sans-serif" font-size="9" font-weight="bold" fill="#F87171" text-anchor="middle">
              ${sf.frameId.length > 22 ? sf.frameId.substring(0, 20) + '..' : sf.frameId}
            </text>
            <text x="${thumbW / 2}" y="${thumbH - 6}" font-family="sans-serif" font-size="8" fill="#9CA3AF" text-anchor="middle">
              ${sf.reasons}
            </text>
          </svg>
        `);

        const compositeCard = await sharp(cardSvg)
          .composite([
            {
              input: frameBuf,
              gravity: 'north',
              top: 8,
              left: 8
            }
          ])
          .png()
          .toBuffer();

        composites.push({
          input: compositeCard,
          left: destX,
          top: destY
        });
      } catch (err) {
        console.warn(`Failed to render thumb for ${sf.frameId}:`, err.message);
      }
    }

    const baseSheet = await sharp({
      create: {
        width: sheetW,
        height: sheetH,
        channels: 4,
        background: { r: 7, g: 10, b: 20, alpha: 1 }
      }
    })
      .composite(composites)
      .png()
      .toFile(path.join(reviewDir, 'placeholder_sheet.png'));

    console.log('[detectPlaceholderFrames] Contact sheet successfully generated at review/placeholder_sheet.png');
  }
}

run().catch(err => {
  console.error('[detectPlaceholderFrames Fatal]', err);
  process.exit(1);
});
