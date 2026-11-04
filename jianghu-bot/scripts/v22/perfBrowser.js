#!/usr/bin/env node
/**
 * JIANGHU BOT V22 — BROWSER BENCHMARK RUNNER (scripts/v22/perfBrowser.js)
 * Mengukur frame time rAF, p50, p95, p99, FPS nyata, dan JS heap memory di Chromium nyata
 * dengan CDP Emulation.setCPUThrottlingRate = 4 (simulasi CPU 2-core i5-2520M).
 *
 * Skenario Wajib (S1-S5) x {LIGHT_WORLD=0 (Lama), LIGHT_WORLD=1 (Baru)}:
 * S1: Kota diam di dalam area baked (Jinling)
 * S2: Pan cepat di dataran DI DALAM area baked
 * S3: Pan cepat di dataran DI LUAR area baked (3 titik seed 1618)
 * S4: Zoom jauh 25 chunk di dalam area baked
 * S5: Zoom jauh 25 chunk di luar area baked
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');
const { chromium } = require('playwright');

const BOT_DIR = path.resolve(__dirname, '../..');
const ROOT_DIR = path.resolve(BOT_DIR, '..');
const DASHBOARD_DIR = path.join(BOT_DIR, 'web-dashboard');
const RAW_DIR = path.join(BOT_DIR, 'review/v22_raw');

// Pastikan direktori review/v22_raw ada
if (!fs.existsSync(RAW_DIR)) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
}

// Parse Argumen CLI
const args = process.argv.slice(2);
const modeArgIdx = args.indexOf('--mode');
const mode = (modeArgIdx !== -1 && args[modeArgIdx + 1]) ? args[modeArgIdx + 1] : 'before';
const runsArgIdx = args.indexOf('--runs');
const RUNS_PER_SCENARIO = (runsArgIdx !== -1 && args[runsArgIdx + 1]) ? parseInt(args[runsArgIdx + 1], 10) : 3;
const durationArgIdx = args.indexOf('--duration');
const DURATION_SEC = (durationArgIdx !== -1 && args[durationArgIdx + 1]) ? parseInt(args[durationArgIdx + 1], 10) : 15;
const portArgIdx = args.indexOf('--port');
const BENCH_PORT = (portArgIdx !== -1 && args[portArgIdx + 1]) ? parseInt(args[portArgIdx + 1], 10) : 3002;
const scenArgIdx = args.indexOf('--scenarios');
const SCENARIOS = (scenArgIdx !== -1 && args[scenArgIdx + 1]) ? args[scenArgIdx + 1].split(',').map(s => s.trim().toUpperCase()) : ['S1', 'S2', 'S3', 'S4', 'S5'];
const OUT_FILE = path.join(RAW_DIR, `perf_${mode}.json`);

function getGitHead() {
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
  } catch (_) {
    return 'unknown';
  }
}

function calculateStats(deltas) {
  if (!deltas || deltas.length === 0) return null;
  const sorted = [...deltas].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = sum / sorted.length;
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const over33 = sorted.filter(v => v > 33).length;
  const over50 = sorted.filter(v => v > 50).length;
  const fps = avg > 0 ? 1000 / avg : 0;
  return {
    sampleCount: sorted.length,
    avg: Number(avg.toFixed(2)),
    p50: Number(p50.toFixed(2)),
    p95: Number(p95.toFixed(2)),
    p99: Number(p99.toFixed(2)),
    framesOver33ms: over33,
    framesOver50ms: over50,
    fps: Number(fps.toFixed(2))
  };
}

async function waitForServer(url, timeoutMs = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status === 200 || res.status === 404) return true;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

function killProcessOnPort(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const lines = out.trim().split(/\r?\n/);
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') {
        try { execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }); } catch (_) {}
      }
    }
  } catch (_) {}
}

function startNextDevServer(lightWorldFlag) {
  killProcessOnPort(BENCH_PORT);
  console.log(`[PERF-BENCH] Menjalankan Next.js server (NEXT_PUBLIC_LIGHT_WORLD=${lightWorldFlag}) pada port ${BENCH_PORT}...`);
  const env = {
    ...process.env,
    PORT: String(BENCH_PORT),
    NEXT_PUBLIC_LIGHT_WORLD: String(lightWorldFlag),
    NODE_ENV: 'development'
  };

  const nextProcess = spawn('npx', ['next', 'dev', '-p', String(BENCH_PORT)], {
    cwd: DASHBOARD_DIR,
    env,
    shell: true,
    stdio: 'ignore'
  });

  return nextProcess;
}

async function runScenarioBench(browser, scenario, durationSec) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });
  const page = await context.newPage();

  // Aktifkan CDP CPU Throttling Rate x4
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  const url = `http://localhost:${BENCH_PORT}/dev/perf?scenario=${scenario}&duration=${durationSec}&autostart=1`;
  await page.goto(url, { waitUntil: 'load', timeout: 45000 });

  // Tunggu hingga benchmark selesai mencatat frame (timeout 90s memberi ruang aman bagi renderer lama)
  const waitTimeout = Math.max(90000, (durationSec * 3 + 30) * 1000);
  await page.waitForFunction(() => window.__perfBenchmarkDone === true, null, { timeout: waitTimeout });

  const results = await page.evaluate(() => window.__perfBenchmarkResults);

  await cdp.detach().catch(() => {});
  await page.close().catch(() => {});
  await context.close().catch(() => {});

  return results;
}

async function main() {
  console.log('======================================================================');
  console.log(` JIANGHU V22 — REAL BROWSER BENCHMARK (Mode: ${mode.toUpperCase()})`);
  console.log(` Output: ${OUT_FILE}`);
  console.log(` Durasi per run: ${DURATION_SEC}s | Jumlah run per skenario: ${RUNS_PER_SCENARIO}`);
  console.log('======================================================================');

  const gitHead = getGitHead();
  const cpus = os.cpus();
  const machineSpecs = {
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    cpuModel: cpus[0]?.model || 'Unknown CPU',
    cpuCores: cpus.length,
    totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
    freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
    cdpCpuThrottlingRate: 4,
    viewport: { width: 1366, height: 768 }
  };

  console.log(`[SPEC] Mesin: ${machineSpecs.cpuModel} (${machineSpecs.cpuCores} cores), OS: ${machineSpecs.os}`);

  // Luncurkan Chrome sistem headless dengan flags presisi memori
  const launchOptions = {
    headless: true,
    channel: 'chrome',
    args: [
      '--enable-precise-memory-info',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  };

  const browser = await chromium.launch(launchOptions);

  const chromiumVersion = browser.version();
  console.log(`[BROWSER] Chromium version: ${chromiumVersion}`);

  const scenarioResults = {};

  const lightFlags = [
    { flag: '0', label: 'old', desc: 'LIGHT_WORLD=0 (Renderer Lama)' },
    { flag: '1', label: 'new', desc: 'LIGHT_WORLD=1 (Jalur Baked Baru)' }
  ];

  for (const { flag, label, desc } of lightFlags) {
    console.log('\n----------------------------------------------------------------------');
    console.log(`[PHASE] Menguji Variasi: ${desc}`);
    console.log('----------------------------------------------------------------------');

    let serverProcess = null;
    try {
      serverProcess = startNextDevServer(flag);
      const isUp = await waitForServer(`http://localhost:${BENCH_PORT}/dev/perf`, 60000);
      if (!isUp) {
        throw new Error(`Gagal menghubungi benchmark server pada http://localhost:${BENCH_PORT}/dev/perf setelah 60s`);
      }
      console.log(`[SERVER] Next.js dev server aktif di http://localhost:${BENCH_PORT}`);

      // Pre-warm Next.js compilation & cache aset kanvas
      console.log(`[SERVER] Melakukan pre-warm rute benchmark...`);
      const warmContext = await browser.newContext({ viewport: { width: 1366, height: 768 } });
      const warmPage = await warmContext.newPage();
      try {
        await warmPage.goto(`http://localhost:${BENCH_PORT}/dev/perf?scenario=S1&duration=3&autostart=1`, { waitUntil: 'load', timeout: 60000 });
        await warmPage.waitForFunction(() => window.__perfBenchmarkDone === true, null, { timeout: 60000 });
      } catch (_) {}
      await warmPage.close().catch(() => {});
      await warmContext.close().catch(() => {});
      console.log(`[SERVER] Pre-warm selesai. Memulai pengukuran terstruktur.`);

      for (const scen of SCENARIOS) {
        console.log(`\n  >> Memulai Pengujian Skenario ${scen} [${label}]...`);
        const runs = [];

        let r = 0;
        let accumulatedSamples = 0;
        // Jalankan minimal RUNS_PER_SCENARIO (3 putaran) dan pastikan akumulasi sampel >= 800 per skenario
        while (r < RUNS_PER_SCENARIO || accumulatedSamples < 800) {
          r++;
          const targetRunsText = accumulatedSamples < 800 && r > RUNS_PER_SCENARIO ? ` (ekstra agar sampel >= 800, saat ini: ${accumulatedSamples})` : `/${RUNS_PER_SCENARIO}`;
          process.stdout.write(`     Putaran ${r}${targetRunsText} (${DURATION_SEC}s)... `);

          let rawRun = null;
          let retries = 0;
          while (retries < 2) {
            try {
              const t0 = Date.now();
              rawRun = await runScenarioBench(browser, scen, DURATION_SEC);
              const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

              const stats = calculateStats(rawRun.frameDeltas);
              const memDiffMB = Number(((rawRun.memoryEnd - rawRun.memoryStart) / 1024 / 1024).toFixed(2));
              console.log(`Selesai (${elapsed}s) -> ${stats.sampleCount} frame, avg: ${stats.avg}ms, p95: ${stats.p95}ms, FPS: ${stats.fps}, dHeap: ${memDiffMB}MB`);

              accumulatedSamples += stats.sampleCount;
              runs.push({
                runIndex: r,
                stats,
                memory: {
                  startBytes: rawRun.memoryStart,
                  endBytes: rawRun.memoryEnd,
                  diffMB: memDiffMB
                },
                frameDeltas: rawRun.frameDeltas
              });
              break;
            } catch (runErr) {
              retries++;
              console.warn(`\n     [RETRY ${retries}/2] Galat pada putaran ${r}: ${runErr.message}. Mencoba ulang...`);
              if (retries >= 2) throw runErr;
              await new Promise(res => setTimeout(res, 2000));
            }
          }
        }

        // Ambil run median berdasarkan p95
        runs.sort((a, b) => a.stats.p95 - b.stats.p95);
        const medianRun = runs[Math.floor(runs.length / 2)];

        if (!scenarioResults[scen]) {
          scenarioResults[scen] = {};
        }

        // Gabungkan seluruh sampel frame dari seluruh putaran (runs)
        const allRunsDeltas = runs.flatMap(r => r.frameDeltas);
        const totalSamples = allRunsDeltas.length;

        scenarioResults[scen][label] = {
          label: desc,
          scenario: scen,
          totalSamples,
          rawDeltas: allRunsDeltas, // Seluruh sampel frame mentah dari 3 putaran (>= 800 sampel)
          medianStats: medianRun.stats,
          medianMemory: medianRun.memory,
          runsCount: runs.length,
          allRunsStats: runs.map(r => ({ run: r.runIndex, ...r.stats })),
          medianRunDeltas: medianRun.frameDeltas
        };

        console.log(`     [MEDIAN ${scen} ${label}] FPS: ${medianRun.stats.fps} | p95: ${medianRun.stats.p95}ms | p99: ${medianRun.stats.p99}ms | Median Samples: ${medianRun.stats.sampleCount} | Total Samples: ${totalSamples}`);
      }

    } finally {
      if (serverProcess) {
        console.log('[PERF-BENCH] Menghentikan Next.js server...');
        try {
          if (process.platform === 'win32') {
            execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: 'ignore' });
          } else {
            serverProcess.kill('SIGTERM');
          }
        } catch (_) {}
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  await browser.close().catch(() => {});

  const outputPayload = {
    meta: {
      mode,
      gitHead,
      timestamp: new Date().toISOString(),
      machineSpecs,
      nodeVersion: process.version,
      chromiumVersion,
      durationPerRunSec: DURATION_SEC,
      runsPerScenario: RUNS_PER_SCENARIO,
      scenariosCount: SCENARIOS.length,
      note: 'Empirical rAF frame intervals recorded with CDP CPU throttling x4. Zero estimatedFps.'
    },
    scenarios: scenarioResults
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(outputPayload, null, 2), 'utf8');
  console.log('\n======================================================================');
  console.log(`✅ [SELESAI] Data mentah tersimpan di: ${OUT_FILE}`);
  console.log('======================================================================\n');
}

main().catch(err => {
  console.error('[PERF-BENCH FATAL ERROR]', err);
  process.exit(1);
});
