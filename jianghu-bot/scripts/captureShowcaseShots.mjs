import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const chunkStreamingEngine = require('../utils/chunkStreamingEngine');

const reviewDir = path.resolve(__dirname, '../review/shots/showcase');
const artifactDir = 'C:/Users/User/.gemini/antigravity-ide/brain/820a74ec-a0f1-4b89-8c19-ae3daa271077';

if (!fs.existsSync(reviewDir)) fs.mkdirSync(reviewDir, { recursive: true });

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

const showcases = [
  { name: 'showcase_xingcun_village', title: 'Desa Xingcun (Arketipe Desa & Jalan Lengkung)', x: 2050, y: 2650, zoom: 1.0 },
  { name: 'showcase_donghai_port', title: 'Dermaga Donghai (Eastern Sea & Bangkai Kapal / Naga Laut)', x: 3920, y: 2697, zoom: 1.0 },
  { name: 'showcase_floating_wind_isles', title: 'Pulau Penyu & Kuil Angin (Floating Wind Isles & Pagoda Melayang)', x: 4330, y: 2696, zoom: 1.0 },
  { name: 'showcase_mirror_lake', title: 'Danau Cermin (Mirror Lake & Jembatan Kuno Terendam)', x: 3688, y: 3688, zoom: 1.0 },
  { name: 'showcase_azure_pass', title: 'Pegunungan Azure (Azure Pass & Puncak Karst)', x: 2605, y: 3336, zoom: 0.9 },
  { name: 'showcase_frostmoon_sea', title: 'Pulau Naga Beku (Frostmoon Sea & Kapal Hantu Es)', x: 4328, y: 4166, zoom: 1.0 }
];

async function main() {
  console.log('=== CAPTURING LATEST SHOWCASE SCREENSHOTS ===\n');
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
    viewport: { width: 1280, height: 720 }
  });

  console.log('[Setup] Memuat canvas dan groundTextures...');
  await page.goto('http://127.0.0.1:3000/world?debugCam=2050,2650,1.0', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    if (window.atlasLoader) await window.atlasLoader.preloadCoreAtlases();
    if (window.groundTextures) await window.groundTextures.load();
  });
  await page.waitForTimeout(2000);

  for (const s of showcases) {
    console.log(`Mengambil tangkapan layar: ${s.title}...`);
    const url = `http://127.0.0.1:3000/world?debugCam=${s.x},${s.y},${s.zoom}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    try {
      await page.waitForFunction(() => window.__chunksReady === true, { timeout: 10000 });
    } catch (_) {}

    await page.evaluate(async (s) => {
      if (window.chunkManager) {
        window.chunkManager.updateCamera(s.x, s.y, s.zoom);
      }
      if (window.atlasLoader) {
        await window.atlasLoader.preloadCoreAtlases();
      }
      if (window.groundTextures && !window.groundTextures.ready) {
        await window.groundTextures.load();
      }
    }, s);

    await page.waitForTimeout(3000);

    const outPath = path.join(reviewDir, `${s.name}.png`);
    await page.screenshot({ path: outPath, fullPage: false });

    // Also copy to artifact dir for direct embedding
    const artifactPath = path.join(artifactDir, `${s.name}.png`);
    fs.copyFileSync(outPath, artifactPath);

    console.log(`-> Tersimpan di review dan artifact: ${s.name}.png`);
  }

  await browser.close();
  if (apiServer) apiServer.close();

  console.log('\n[SELESAI] Seluruh 6 tangkapan layar zona berhasil diambil!');
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
