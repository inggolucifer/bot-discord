import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const chunkStreamingEngine = require('../utils/chunkStreamingEngine');
const playwright = require('C:/Users/User/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');

const reviewDir = path.resolve(__dirname, '../review/shots/fresh_100');
const artifactDir = 'C:/Users/User/.gemini/antigravity/brain/327e5123-5a4f-4aa9-9710-f1f5bd92465d';

if (!fs.existsSync(reviewDir)) fs.mkdirSync(reviewDir, { recursive: true });
if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });

function ensureApiServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const origin = req.headers.origin || 'http://localhost:3000';
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
      }

      if (req.url === '/api/auth/me') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ authenticated: true, user: { id: 'test_user', name: 'Pendekar Jianghu' } }));
      }

      if (req.method === 'POST' && req.url === '/api/world/chunks') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const chunks = data.chunks || [];
            const batch = chunkStreamingEngine.getStaticChunksBatch(chunks);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(batch));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      if (req.method === 'GET' && req.url.startsWith('/api/world/chunk/')) {
        const parts = req.url.split('/');
        const cx = parseInt(parts[parts.length - 2], 10);
        const cy = parseInt(parts[parts.length - 1], 10);
        const chunk = chunkStreamingEngine.getStaticChunk(cx, cy);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(chunk));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, status: 'online' }));
    });

    server.listen(3001, () => {
      console.log('[API Server] Standalone Mock API listening on http://localhost:3001');
      resolve(server);
    });
  });
}

const zones = [
  {
    name: 'zona_01_desa_xingcun',
    title: 'Desa Xingcun (Central Plains) - Pemukiman, Pondok Jerami & Grid Wuxia',
    x: 2050,
    y: 2650,
    zoom: 1.3
  },
  {
    name: 'zona_02_dermaga_donghai',
    title: 'Dermaga Donghai (Eastern Sea) - Jalur Pesisir Karang & Biru Samudra',
    x: 3920,
    y: 2697,
    zoom: 1.2
  },
  {
    name: 'zona_03_pegunungan_azure',
    title: 'Puncak Karst Azure Pass - Formasi Tebing Cadas & Jurang Pegunungan',
    x: 2605,
    y: 3336,
    zoom: 1.2
  },
  {
    name: 'zona_04_danau_cermin',
    title: 'Danau Cermin (Mirror Lake) - Danau Giok Tenang & Jembatan Kuno',
    x: 3688,
    y: 3688,
    zoom: 1.3
  },
  {
    name: 'zona_05_laut_frostmoon',
    title: 'Pulau Es Frostmoon Sea - Dataran Salju & Glasier Es Abadi',
    x: 4328,
    y: 4166,
    zoom: 1.2
  },
  {
    name: 'zona_06_gurun_pasir_sutra',
    title: 'Gurun Pasir Sutra (Western Desert) - Hamparan Bukit Pasir Emas & Monolit',
    x: 1200,
    y: 2500,
    zoom: 1.2
  },
  {
    name: 'zona_07_gerbang_iblis_volkanik',
    title: 'Gerbang Iblis Volkanik (Lava Spine) - Aliran Magma & Kerak Basal Hitam',
    x: 1350,
    y: 950,
    zoom: 1.2
  },
  {
    name: 'zona_08_rawa_racun_iblis',
    title: 'Rawa Beracun Iblis (Venom Mire) - Genangan Ungu & Kabut Miasma',
    x: 2500,
    y: 800,
    zoom: 1.2
  }
];

async function main() {
  console.log('=== MENGAMBIL TANGKAPAN LAYAR FRESH 100% REAL AI GROUND ZONES ===\n');
  const apiServer = await ensureApiServer();

  console.log('[Chrome] Meluncurkan peramban Chromium...');
  const browser = await playwright.chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });

  console.log('[Setup] Memuat canvas awal...');
  await page.goto('http://localhost:3000/world?debugCam=2050,2650,1.3', { timeout: 60000, waitUntil: 'domcontentloaded' });

  console.log('[Setup] Mengunduh aset AI Ground Textures dan Sprite Atlas...');
  await page.evaluate(async () => {
    while (!window.groundTextures || !window.chunkManager) {
      await new Promise(r => setTimeout(r, 100));
    }
    await window.groundTextures.load();
    if (window.atlasLoader) await window.atlasLoader.preloadCoreAtlases();
    window.chunkManager.clearCache();
  });

  // Tunggu 3 detik agar texture pattern terbentuk sempurna
  await page.waitForTimeout(3000);

  const capturedFiles = [];

  for (const z of zones) {
    const artifactPath = path.join(artifactDir, `${z.name}.png`);
    const outPath = path.join(reviewDir, `${z.name}.png`);

    console.log(`Mengambil tangkapan layar: ${z.title}...`);

    // Pan camera to zone coordinates without reloading page
    await page.evaluate((z) => {
      if (window.__panCameraTo) {
        window.__panCameraTo(z.x, z.y, z.zoom);
      }
      if (window.chunkManager) {
        window.chunkManager.updateCamera(z.x, z.y, z.zoom);
      }
    }, z);

    // Wait 3.5 seconds for chunks to fetch and bitmap to render
    await page.waitForTimeout(3500);

    // Inspect canvas colors
    const stats = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) {
        r += d[i]; g += d[i+1]; b += d[i+2];
      }
      const count = d.length / 4;
      return {
        meanR: (r / count).toFixed(1),
        meanG: (g / count).toFixed(1),
        meanB: (b / count).toFixed(1)
      };
    });

    await page.screenshot({ path: outPath, fullPage: false });

    // Copy to artifact directory
    fs.copyFileSync(outPath, artifactPath);

    const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(0);
    capturedFiles.push({
      name: z.name,
      title: z.title,
      coord: `(${z.x}, ${z.y})`,
      zoom: `${z.zoom}x`,
      meanRGB: stats ? `[${stats.meanR}, ${stats.meanG}, ${stats.meanB}]` : 'N/A',
      size: `${sizeKb} KB`,
      artifactPath: artifactPath
    });

    console.log(`-> Berhasil: ${z.name}.png (${sizeKb} KB, meanRGB=${stats ? `[${stats.meanR}, ${stats.meanG}, ${stats.meanB}]` : 'N/A'})`);
  }

  await browser.close();
  if (apiServer) apiServer.close();

  console.log('\n[SELESAI] Seluruh 8 zona berhasil ditangkap secara fresh dengan 100% Real AI Ground Textures!');
  console.log(JSON.stringify(capturedFiles, null, 2));
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
