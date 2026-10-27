import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const chunkStreamingEngine = require('../utils/chunkStreamingEngine');

const reviewDir = path.resolve(__dirname, '../review/shots/user_check');
const artifactDir = 'C:/Users/User/.gemini/antigravity-ide/brain/0f265647-32a9-467b-9815-99c251a190e0';

if (!fs.existsSync(reviewDir)) fs.mkdirSync(reviewDir, { recursive: true });
if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });

function ensureApiServer() {
  return new Promise((resolve) => {
    const testReq = http.request({ host: '127.0.0.1', port: 3001, path: '/api/health', method: 'GET', timeout: 800 }, () => {
      console.log('[API Server] API already running on port 3001');
      resolve(null);
    });
    testReq.on('error', () => {
      console.log('[API Server] Starting standalone Chunk Streaming API on port 3001...');
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
          return res.end(JSON.stringify({ authenticated: false, user: null }));
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

      server.listen(3001, '127.0.0.1', () => {
        console.log('[API Server] Standalone Mock API listening on http://127.0.0.1:3001');
        resolve(server);
      });
    });
    testReq.end();
  });
}

const zones = [
  {
    name: 'zona_01_desa_xingcun',
    title: 'Desa Xingcun (Central Plains) - Pemukiman, Pondok 1x1, Pohon Roh & Garis Grid',
    x: 2050,
    y: 2650,
    zoom: 1.4
  },
  {
    name: 'zona_02_dermaga_donghai',
    title: 'Dermaga Donghai (Eastern Sea) - Jalur Air, Dermaga & Bangkai Kapal',
    x: 3920,
    y: 2697,
    zoom: 1.2
  },
  {
    name: 'zona_03_pegunungan_azure',
    title: 'Puncak Karst Azure Pass - Formasi Batu Gunung & Celah Jurang',
    x: 2605,
    y: 3336,
    zoom: 1.2
  },
  {
    name: 'zona_04_danau_cermin',
    title: 'Danau Cermin (Mirror Lake) - Air Tenang, Jembatan & Rumpun Bambu',
    x: 3688,
    y: 3688,
    zoom: 1.3
  },
  {
    name: 'zona_05_laut_frostmoon',
    title: 'Pulau Es Frostmoon Sea (Northern Glacial) - Dataran Salju & Pinus Kuno',
    x: 4328,
    y: 4166,
    zoom: 1.2
  },
  {
    name: 'zona_06_gurun_pasir_sutra',
    title: 'Gurun Pasir Sutra (Western Desert) - Hamparan Pasir Emas & Puing Purba',
    x: 1200,
    y: 2500,
    zoom: 1.2
  }
];

async function main() {
  console.log('=== MENGAMBIL TANGKAPAN LAYAR ZONA DUNIA JIANGHU ===\n');
  const apiServer = await ensureApiServer();

  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    const cachedPath = 'C:/Users/User/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright';
    playwright = require(cachedPath);
  }

  console.log('[Chrome] Meluncurkan peramban Chromium...');
  const browser = await playwright.chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--enable-precise-memory-info', '--js-flags=--expose-gc']
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });

  console.log('[Setup] Memuat canvas awal...');
  await page.goto('http://localhost:3000/world?debugCam=2050,2650,1.4', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    if (window.atlasLoader) await window.atlasLoader.preloadCoreAtlases();
    if (window.groundTextures) await window.groundTextures.load();
  });
  await page.waitForTimeout(3000);

  const capturedFiles = [];

  for (const z of zones) {
    const artifactPath = path.join(artifactDir, `${z.name}.png`);
    const outPath = path.join(reviewDir, `${z.name}.png`);
    if (fs.existsSync(artifactPath) && fs.statSync(artifactPath).size > 100000) {
      console.log(`[SKIP] Sudah ada di disk: ${z.name}.png (${(fs.statSync(artifactPath).size / 1024).toFixed(0)} KB)`);
      continue;
    }
    console.log(`Mengambil tangkapan layar: ${z.title}...`);
    const url = `http://localhost:3000/world?debugCam=${z.x},${z.y},${z.zoom}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    try {
      await page.waitForFunction(() => window.__chunksReady === true, { timeout: 10000 });
    } catch (_) {}

    await page.evaluate(async (z) => {
      if (window.chunkManager) {
        window.chunkManager.updateCamera(z.x, z.y, z.zoom);
      }
      if (window.atlasLoader) {
        await window.atlasLoader.preloadCoreAtlases();
      }
      if (window.groundTextures && !window.groundTextures.ready) {
        await window.groundTextures.load();
      }
    }, z);

    await page.waitForTimeout(3000);

    await page.screenshot({ path: outPath, fullPage: false });

    // Copy to artifact directory
    fs.copyFileSync(outPath, artifactPath);

    capturedFiles.push({
      name: z.name,
      title: z.title,
      coord: `(${z.x}, ${z.y})`,
      zoom: `${z.zoom}x`,
      localPath: outPath,
      artifactPath: artifactPath
    });

    console.log(`-> Berhasil: ${z.name}.png`);
  }

  await browser.close();
  if (apiServer) apiServer.close();

  console.log('\n[SELESAI] Seluruh 6 zona berhasil ditangkap!');
  console.log(JSON.stringify(capturedFiles, null, 2));
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
