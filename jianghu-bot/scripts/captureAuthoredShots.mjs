import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const chunkStreamingEngine = require('../utils/chunkStreamingEngine');

const outDir = path.resolve(__dirname, '../review/shots/v8_authored');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function ensureApiServer() {
  return new Promise((resolve) => {
    const testReq = http.request({ host: '127.0.0.1', port: 3001, path: '/api/health', method: 'GET', timeout: 800 }, (res) => {
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

const targets = [
  { name: 'desa_xingcun', title: 'Desa Xingcun', x: 2050, y: 2650, zoom: 1.0 },
  { name: 'tianjing', title: 'Tianjing (Ibu Kota)', x: 2700, y: 2800, zoom: 1.0 },
  { name: 'oase_shadi', title: 'Oase Shadi', x: 820, y: 2220, zoom: 1.0 },
  { name: 'kota_yunxi', title: 'Kota Yunxi', x: 2200, y: 2500, zoom: 1.0 },
  { name: 'desa_heiyan', title: 'Desa Heiyan', x: 1900, y: 1400, zoom: 1.0 }
];

async function main() {
  console.log('=== CAPTURE AUTHORED VILLAGES REVIEW (PROMPT 2.9) ===\n');
  const apiServer = await ensureApiServer();

  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    const cachedPath = 'C:/Users/User/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright';
    playwright = require(cachedPath);
  }

  const browser = await playwright.chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--enable-precise-memory-info', '--js-flags=--expose-gc']
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  for (const t of targets) {
    const url = `http://localhost:3000/world?debugCam=${t.x},${t.y},${t.zoom}`;
    console.log(`Navigating to ${t.title} at (${t.x}, ${t.y})...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });

    // Wait for canvas to load and render chunks
    await page.waitForTimeout(4000);

    const outPath = path.join(outDir, `${t.name}.png`);
    await page.screenshot({ path: outPath, fullPage: false });
    const stat = fs.statSync(outPath);
    console.log(`- Saved ${outPath} (${Math.round(stat.size / 1024)} KB)`);
  }

  await browser.close();
  if (apiServer) {
    apiServer.close();
  }

  console.log('\n[PASS] 5 Tangkapan layar desa bertata v8 berhasil disimpan di review/shots/v8_authored/.');
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
