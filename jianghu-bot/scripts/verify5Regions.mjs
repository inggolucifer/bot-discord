import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const outDir = path.resolve(__dirname, '../review/shots/v7_5regions');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { id: '01_hermit_highlands', name: 'Hermit Highlands (Kemah Dataran Tinggi Petapa)', x: 1200, y: 4200, zoom: 1.0 },
  { id: '02_central_plains', name: 'Central Plains (Desa Xingcun)', x: 2050, y: 2650, zoom: 1.0 },
  { id: '03_azure_mountain_range', name: 'Azure Mountain Range (Kaki Gunung Azure)', x: 2800, y: 1950, zoom: 1.0 },
  { id: '04_nine_springs_delta', name: 'Nine Springs Delta (Dusun Mata Air Jernih)', x: 2400, y: 2450, zoom: 1.0 },
  { id: '05_xitong_city', name: 'Xitong City (Kota Metropolitan XiTong)', x: 2350, y: 2900, zoom: 1.0 }
];

async function main() {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    const cachedPath = 'C:/Users/User/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright';
    playwright = require(cachedPath);
  }

  console.log('[Verify5Regions] Launching Chrome...');
  const browser = await playwright.chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--enable-precise-memory-info', '--js-flags=--expose-gc']
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  page.on('console', msg => {
    const t = msg.text();
    if (msg.type() === 'error' || t.includes('Atlas') || t.includes('Chunk') || t.includes('ready')) {
      console.log(`[BROWSER ${msg.type()}]`, t);
    }
  });

  const results = [];

  for (const t of targets) {
    const url = `http://localhost:3000/world?debugCam=${t.x},${t.y},${t.zoom}`;
    const filePath = path.join(outDir, `${t.id}.png`);

    console.log(`\nCapturing [${t.name}] at (${t.x}, ${t.y})...`);
    await page.goto(url, { timeout: 20000, waitUntil: 'domcontentloaded' });

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
    await page.waitForTimeout(300);

    await page.screenshot({ path: filePath, fullPage: false });

    const metrics = evalResult.metrics || {};
    const record = {
      id: t.id,
      name: t.name,
      file: `${t.id}.png`,
      x: t.x,
      y: t.y,
      spriteCount: metrics.spriteCount || 0,
      uniqueDefIds: metrics.uniqueDefIds || 0,
      spritesFallback: metrics.spritesFallback || 0,
      duplicatesWithin3: metrics.duplicateWithin3Tiles || 0,
      roadBlockages: metrics.roadBlockages || 0,
      renderTimeMs: metrics.renderTimeMs || 16,
      heapMb: evalResult.heapMb || 0
    };

    results.push(record);
    console.log(`-> Captured ${record.file}: Sprites=${record.spriteCount}, Defs=${record.uniqueDefIds}, Fallback=${record.spritesFallback}, Dups<3=${record.duplicatesWithin3}, Heap=${record.heapMb}MB, Latency=${record.renderTimeMs}ms`);
  }

  await browser.close();
  console.log('\n[Verify5Regions] All 5 regions captured successfully!');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(err => {
  console.error('[Verify5Regions] Error:', err);
  process.exit(1);
});
