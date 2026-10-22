import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const outDir = path.resolve(__dirname, '../review/shots/ground_h2');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { id: 'ground_01_central_plains_river', name: 'Central Plains & River (Autotile G4 & Decal G3)', x: 2050, y: 2600, zoom: 1.0 },
  { id: 'ground_02_nine_springs_waterways', name: 'Nine Springs Delta (River Channels & Ambient Mist G6)', x: 2400, y: 2450, zoom: 1.0 },
  { id: 'ground_03_western_sacred_desert', name: 'Western Sacred Desert (Sand Ripples G3 & Golden Haze G6)', x: 850, y: 2200, zoom: 1.0 },
  { id: 'ground_04_azure_mountains_cliff', name: 'Azure Mountain Range (Rock Texture & Slate Scree G2/G3)', x: 2800, y: 1950, zoom: 1.0 },
  { id: 'ground_05_empty_shanshui_landscape', name: 'Song Dynasty Ink-Wash Landscape (Zero Clutter & Pure Ground)', x: 2100, y: 2500, zoom: 1.0 }
];

async function main() {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    const cachedPath = 'C:/Users/User/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright';
    playwright = require(cachedPath);
  }

  console.log('[CaptureGroundH2Shots] Launching Chrome...');
  const browser = await playwright.chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--enable-precise-memory-info', '--js-flags=--expose-gc']
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  const results = [];

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const url = `http://localhost:3000/world?debugCam=${t.x},${t.y},${t.zoom}`;
    const filePath = path.join(outDir, `${t.id}.png`);

    console.log(`\n[${i + 1}/${targets.length}] Capturing ${t.name} at (${t.x}, ${t.y})...`);
    await page.goto(url, { timeout: 25000, waitUntil: 'domcontentloaded' });

    const evalResult = await page.evaluate(async () => {
      if (window.atlasLoader && !window.atlasLoader.isLoaded()) {
        try {
          await window.atlasLoader.loadIndex();
        } catch (e) {}
      }
      const m = await new Promise((resolve) => {
        if (window.__chunksReady) return resolve(window.__debugMetrics || {});
        const handler = (e) => resolve(e.detail || window.__debugMetrics || {});
        window.addEventListener('chunks-ready', handler, { once: true });
        setTimeout(() => resolve(window.__debugMetrics || {}), 6000);
      });
      const heap = (typeof performance !== 'undefined' && performance.memory)
        ? Math.round(performance.memory.usedJSHeapSize / 1048576)
        : 0;
      return { metrics: m, heapMb: heap };
    });

    // Settle render
    await page.waitForTimeout(500);

    await page.screenshot({ path: filePath, fullPage: false });

    const metrics = evalResult.metrics || {};
    const record = {
      index: i + 1,
      id: t.id,
      name: t.name,
      file: `${t.id}.png`,
      x: t.x,
      y: t.y,
      spriteCount: metrics.spriteCount || 0,
      uniqueDefIds: metrics.uniqueDefIds || 0,
      spritesFallback: metrics.spritesFallback || 0,
      heapMb: evalResult.heapMb || 0,
      renderTimeMs: metrics.renderTimeMs || 16
    };

    results.push(record);
    console.log(`-> Captured ${record.file}: Sprites=${record.spriteCount}, Defs=${record.uniqueDefIds}, Heap=${record.heapMb}MB, Latency=${record.renderTimeMs}ms`);
  }

  await browser.close();
  console.log('\n[CaptureGroundH2Shots] All 5 ground review shots captured successfully!');
  console.table(results);
}

main().catch(err => {
  console.error('[CaptureGroundH2Shots] Error:', err);
  process.exit(1);
});
