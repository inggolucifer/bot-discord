import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const outDir = path.resolve(__dirname, '../review/shots/scale_12shots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { id: 'scale_01_desa_xingcun', name: 'Desa Xingcun (Desa Awal Petani)', x: 2050, y: 2650, zoom: 1.0 },
  { id: 'scale_02_kota_xitong', name: 'XiTong City (Kota Metropolitan)', x: 2350, y: 2900, zoom: 1.0 },
  { id: 'scale_03_kota_jinling', name: 'Kota Jinling (Kota Tepi Sungai Delta)', x: 2750, y: 2350, zoom: 1.0 },
  { id: 'scale_04_tianjing_capital', name: 'Tianjing (Ibukota Kekaisaran Agung)', x: 2700, y: 2800, zoom: 1.0 },
  { id: 'scale_05_sekte_pedang_langit', name: 'Sekte Pedang Langit (Gerbang Sekte & Akademi)', x: 2150, y: 2800, zoom: 1.0 },
  { id: 'scale_06_hermit_highlands', name: 'Dataran Tinggi Petapa (Kemah & Paviliun Awan)', x: 1200, y: 4200, zoom: 1.0 },
  { id: 'scale_07_kaki_gunung_azure', name: 'Kaki Gunung Azure (Pos Lereng Cadas)', x: 2200, y: 3340, zoom: 1.0 },
  { id: 'scale_08_dusun_mata_air_jernih', name: 'Dusun Mata Air Jernih (Delta & Kolam Lotus)', x: 2400, y: 2450, zoom: 1.0 },
  { id: 'scale_09_oase_shadi', name: 'Oase Shadi (Gurun Pasir Suci)', x: 820, y: 2220, zoom: 1.0 },
  { id: 'scale_10_pos_tundra_salju', name: 'Pos Tundra Salju (Dataran Beku Utara)', x: 2120, y: 4180, zoom: 1.0 },
  { id: 'scale_11_dermaga_donghai', name: 'Dermaga Donghai (Pelabuhan Laut Timur)', x: 3920, y: 2700, zoom: 1.0 },
  { id: 'scale_12_istana_giok_laut_timur', name: 'Istana Giok Laut Timur (Kompleks Sekte Pesisir)', x: 3900, y: 2850, zoom: 1.0 }
];

async function main() {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    const cachedPath = 'C:/Users/User/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright';
    playwright = require(cachedPath);
  }

  console.log('[Capture12ScaleShots] Launching Chrome...');
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

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const url = `http://localhost:3000/world?debugCam=${t.x},${t.y},${t.zoom}`;
    const filePath = path.join(outDir, `${t.id}.png`);

    console.log(`\n[${i + 1}/12] Capturing ${t.name} at (${t.x}, ${t.y})...`);
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
    await page.waitForTimeout(600);

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
    console.log(`-> Captured ${record.file}: Sprites=${record.spriteCount}, Defs=${record.uniqueDefIds}, Fallback=${record.spritesFallback}, Heap=${record.heapMb}MB, Latency=${record.renderTimeMs}ms`);
  }

  await browser.close();
  console.log('\n[Capture12ScaleShots] All 12 scale review shots captured successfully!');
  console.table(results);
}

main().catch(err => {
  console.error('[Capture12ScaleShots] Error:', err);
  process.exit(1);
});
