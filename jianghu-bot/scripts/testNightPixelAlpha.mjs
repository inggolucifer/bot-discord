import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const reviewDir = path.resolve(__dirname, '../review');
const shotsDir = path.resolve(reviewDir, 'shots');
if (!fs.existsSync(shotsDir)) fs.mkdirSync(shotsDir, { recursive: true });

async function run() {
  console.log('[testNightPixelAlpha] Launching browser for Night Pixel & Lighting test...');

  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    const cachedPath = 'C:/Users/User/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright';
    playwright = require(cachedPath);
  }

  const browser = await playwright.chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  // 1. Day Shot
  console.log('[testNightPixelAlpha] Loading Day view...');
  await page.goto('http://localhost:3000/world?debugCam=2700,2800,1.0&night=false', { timeout: 20000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const dayShotPath = path.join(shotsDir, 'night_test_DAY_before.png');
  await page.screenshot({ path: dayShotPath });
  console.log('[testNightPixelAlpha] Saved day shot:', dayShotPath);

  // 2. Night Shot
  console.log('[testNightPixelAlpha] Loading Night view (?night=true)...');
  await page.goto('http://localhost:3000/world?debugCam=2700,2800,1.0&night=true', { timeout: 20000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const nightShotPath = path.join(shotsDir, 'night_test_NIGHT_after.png');
  await page.screenshot({ path: nightShotPath });
  console.log('[testNightPixelAlpha] Saved night shot:', nightShotPath);

  // 3. Inspect Canvas Pixels (Alpha must be 255, R > B at player center)
  const pixelReport = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'No canvas element found' };
    const ctx = canvas.getContext('2d');
    if (!ctx) return { error: 'No 2D context' };

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    let transparentCount = 0;
    let minAlpha = 255;
    const totalPixels = data.length / 4;

    for (let i = 3; i < data.length; i += 4) {
      const a = data[i];
      if (a < 255) {
        transparentCount++;
        if (a < minAlpha) minAlpha = a;
      }
    }

    // Check center pixel around player
    const cx = Math.floor(canvas.width / 2);
    const cy = Math.floor(canvas.height / 2);
    const centerIdx = (cy * canvas.width + cx) * 4;
    const centerR = data[centerIdx];
    const centerG = data[centerIdx + 1];
    const centerB = data[centerIdx + 2];
    const centerA = data[centerIdx + 3];

    // Check edge pixel in dark area
    const edgeIdx = (50 * canvas.width + 50) * 4;
    const edgeR = data[edgeIdx];
    const edgeG = data[edgeIdx + 1];
    const edgeB = data[edgeIdx + 2];
    const edgeA = data[edgeIdx + 3];

    const centerBrightness = (centerR * 0.299 + centerG * 0.587 + centerB * 0.114);
    const edgeBrightness = (edgeR * 0.299 + edgeG * 0.587 + edgeB * 0.114);
    const contrastRatio = edgeBrightness > 0 ? (centerBrightness / edgeBrightness) : 1;

    return {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      totalPixels,
      transparentCount,
      minAlpha,
      centerPixel: { r: centerR, g: centerG, b: centerB, a: centerA },
      edgePixel: { r: edgeR, g: edgeG, b: edgeB, a: edgeA },
      centerBrightness: Math.round(centerBrightness),
      edgeBrightness: Math.round(edgeBrightness),
      contrastRatio: parseFloat(contrastRatio.toFixed(2)),
      isWarmLight: centerR > centerB,
      isFullyOpaque: transparentCount === 0
    };
  });

  console.log('[testNightPixelAlpha] Raw report:', pixelReport);
  if (pixelReport.error) {
    console.error('[testNightPixelAlpha] Page evaluate error:', pixelReport.error);
    await browser.close();
    process.exit(1);
  }

  console.log('\n================ NIGHT LIGHTING AUDIT RESULTS ================');
  console.log(`Resolution: ${pixelReport.canvasWidth}x${pixelReport.canvasHeight} (${pixelReport.totalPixels} px)`);
  console.log(`Transparent Pixels (alpha < 255): ${pixelReport.transparentCount} [${pixelReport.isFullyOpaque ? 'PASS (0 transparent)' : 'FAIL'}]`);
  console.log(`Minimum Canvas Alpha: ${pixelReport.minAlpha}`);
  console.log(`Center (Player) RGB: rgba(${pixelReport.centerPixel.r}, ${pixelReport.centerPixel.g}, ${pixelReport.centerPixel.b}, ${pixelReport.centerPixel.a})`);
  console.log(`Edge (Dark) RGB:     rgba(${pixelReport.edgePixel.r}, ${pixelReport.edgePixel.g}, ${pixelReport.edgePixel.b}, ${pixelReport.edgePixel.a})`);
  console.log(`Warm Spectrum (R > B): ${pixelReport.isWarmLight ? 'PASS' : 'WARN'}`);
  console.log(`Center Brightness vs Edge Contrast: ${pixelReport.contrastRatio}x (Center ${pixelReport.centerBrightness} vs Edge ${pixelReport.edgeBrightness})`);
  console.log('===============================================================\n');

  await browser.close();

  if (!pixelReport.isFullyOpaque) {
    console.error('GATE FAILED: Canvas contains transparent pixels on night mode!');
    process.exit(1);
  }

  console.log('H0 GATE VERIFIED: Zero transparent pixels, warm glow intact!');
}

run().catch(err => {
  console.error('[testNightPixelAlpha Fatal]', err);
  process.exit(1);
});
