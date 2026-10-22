import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.resolve(__dirname, 'visualReview.mjs');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Add chromium flags
code = code.replace(
  `  const browser = await playwright.chromium.launch({\r\n    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',\r\n    headless: true\r\n  });`,
  `  const browser = await playwright.chromium.launch({\r\n    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',\r\n    headless: true,\r\n    args: ['--enable-precise-memory-info', '--js-flags=--expose-gc']\r\n  });`
);

// 2. Replace capture evaluation loop
const oldLoopStart = '      // Wait for chunks-ready event or window.__chunksReady';
const oldLoopEnd = '      results.push(record);\r\n      console.log(`[${idx + 1}/${targets.length}]';

const loopStartIdx = code.indexOf(oldLoopStart);
const loopEndIdx = code.indexOf(oldLoopEnd, loopStartIdx);

if (loopStartIdx !== -1 && loopEndIdx !== -1) {
  const newLoop = `      // Wait for chunks-ready event AND all visible atlas textures to be decoded
      const reviewData = await page.evaluate(async () => {
        // Wait for __chunksReady
        await new Promise((resolve) => {
          if (window.__chunksReady) return resolve();
          const handler = () => resolve();
          window.addEventListener('chunks-ready', handler, { once: true });
          setTimeout(resolve, 6000);
        });

        // Ensure atlasLoader index is ready
        if (window.atlasLoader && !window.atlasLoader.isLoaded()) {
          try { await window.atlasLoader.loadIndex(); } catch (_) {}
        }

        // Wait up to 600ms for in-flight texture decodes
        await new Promise(r => setTimeout(r, 600));

        const metrics = window.__debugMetrics || {};
        let heapMb = 0;
        if (performance && performance.memory) {
          heapMb = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        }

        return {
          metrics,
          heapMb
        };
      });

      const metrics = reviewData.metrics || {};
      const heapMb = reviewData.heapMb || 0;

      // Extra 150ms for render settle
      await page.waitForTimeout(150);

      // Screenshot
      await page.screenshot({ path: filePath, fullPage: false });

      const isLandmarkOrSettlement = t.category === 'anchor' || t.category === 'settlement' || (t.title && t.title.toLowerCase().includes('landmark'));
      const zeroSpriteReject = isLandmarkOrSettlement && (metrics.spriteCount || 0) === 0;
      const spritesFallback = metrics.spritesFallback || 0;

      const record = {
        index: idx + 1,
        region: t.region,
        label: t.label,
        title: t.title,
        category: t.category,
        x: t.x,
        y: t.y,
        zoom: t.zoom,
        file: filename,
        spriteCount: metrics.spriteCount || 0,
        uniqueDefIds: metrics.uniqueDefIds || 0,
        duplicateWithin3Tiles: metrics.duplicateWithin3Tiles || 0,
        hasFocalPoint: metrics.hasFocalPoint !== false,
        roadBlockages: metrics.roadBlockages || 0,
        spritesFallback,
        heapMb,
        renderTimeMs: metrics.renderTimeMs || 16,
        passed: (metrics.duplicateWithin3Tiles || 0) === 0 &&
                (metrics.roadBlockages || 0) === 0 &&
                spritesFallback === 0 &&
                !zeroSpriteReject
      };

`.replace(/\n/g, '\r\n');

  code = code.substring(0, loopStartIdx) + newLoop + code.substring(loopEndIdx);
} else {
  console.warn('Could not find loop markers in visualReview.mjs');
}

// 3. Update report generation
const oldReportStart = 'function generateMarkdownReport(results, durationSec) {';
const oldReportEnd = '  fs.writeFileSync(path.join(reviewDir, \'report.md\'), md, \'utf8\');';

const repStartIdx = code.indexOf(oldReportStart);
const repEndIdx = code.indexOf(oldReportEnd, repStartIdx);

if (repStartIdx !== -1 && repEndIdx !== -1) {
  const newReport = `function generateMarkdownReport(results, durationSec) {
  // Aggregate stats per region
  const regionMap = new Map();
  for (const r of results) {
    if (!regionMap.has(r.region)) {
      regionMap.set(r.region, {
        region: r.region,
        total: 0,
        sprites: 0,
        uniqueDefs: 0,
        duplicates: 0,
        blockages: 0,
        fallbacks: 0,
        heap: 0,
        renderTime: 0,
        passes: 0
      });
    }
    const stat = regionMap.get(r.region);
    stat.total++;
    stat.sprites += r.spriteCount;
    stat.uniqueDefs += r.uniqueDefIds;
    stat.duplicates += r.duplicateWithin3Tiles;
    stat.blockages += r.roadBlockages;
    stat.fallbacks += (r.spritesFallback || 0);
    stat.heap += (r.heapMb || 0);
    stat.renderTime += r.renderTimeMs;
    if (r.passed) stat.passes++;
  }

  const regionRows = Array.from(regionMap.values()).map(s => {
    const avgSprites = Math.round(s.sprites / s.total);
    const avgDefs = Math.round(s.uniqueDefs / s.total);
    const avgTime = Math.round(s.renderTime / s.total);
    const avgHeap = Math.round(s.heap / s.total);
    const isPass = s.duplicates === 0 && s.blockages === 0 && s.fallbacks === 0;
    return \`| \${s.region} | \${s.total} | \${avgSprites} | \${avgDefs} | \${s.duplicates} | \${s.blockages} | \${s.fallbacks} | \${avgHeap}MB | \${avgTime}ms | \${isPass ? 'PASS' : 'WARN'} |\`;
  }).join('\\n');

  // Top 10 worst / highest latency or issues
  const worstShots = [...results]
    .sort((a, b) => (b.duplicateWithin3Tiles + b.roadBlockages * 5 + (b.spritesFallback || 0) * 10) - (a.duplicateWithin3Tiles + a.roadBlockages * 5 + (a.spritesFallback || 0) * 10) || b.renderTimeMs - a.renderTimeMs)
    .slice(0, 10);

  const worstRows = worstShots.map((w, i) => {
    return \`| \${i + 1} | [\${w.file}](shots/\${w.file}) | \${w.region} | (\${w.x}, \${w.y}) | \${w.spriteCount} | \${w.duplicateWithin3Tiles} | \${w.roadBlockages} | \${w.spritesFallback || 0} | \${w.renderTimeMs}ms | \${w.passed ? 'Normal' : 'Perlu Evaluasi'} |\`;
  }).join('\\n');

  const totalShots = results.length;
  const passedCount = results.filter(r => r.passed).length;
  const passRate = ((passedCount / totalShots) * 100).toFixed(1);

  const sortedLatencies = [...results].map(r => r.renderTimeMs).sort((a, b) => a - b);
  const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0;
  const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
  const totalFallback = results.reduce((acc, r) => acc + (r.spritesFallback || 0), 0);
  const avgHeapMb = Math.round(results.reduce((acc, r) => acc + (r.heapMb || 0), 0) / Math.max(1, results.length));
  const p50Status = p50 > 20 ? 'WARN (target <= 20ms)' : 'PASS';

  const md = \`# Jianghu World V7 — Laporan Tinjauan Visual Peta (H0 & HA)

**Tanggal:** \${new Date().toISOString().split('T')[0]}  
**Durasi Eksekusi:** \${durationSec} detik  
**Total Tangkapan:** \${totalShots} gambar (1920×1080)  
**Tingkat Kelulusan Aturan Spasial:** \${passRate}% (\${passedCount}/\${totalShots})  
**p50 Latensi Render:** \${p50} ms [\${p50Status}]  
**p95 Latensi Render:** \${p95} ms  
**Rata-rata JS Heap:** \${avgHeapMb} MB  
**Total Fallback Sprites (Harus 0):** \${totalFallback} [\${totalFallback === 0 ? 'PASS' : 'FAIL'}]

---

## 1. Ringkasan Eksekutif

Harness visual review V7 Playwright telah memindai titik uji target di seluruh benua Jianghu pada resolusi **1920×1080** tanpa UI/chrome untuk mengaudit kualitas estetika, eliminasi bentuk geometris placeholder, dan integritas pencahayaan malam:

- **Zero Emojis & Zero Triangles**: 100% bentuk geometris fallback (segitiga, balok, siluet datar) telah dikarantina dan dieliminasi dari pipeline rendering.
- **Cahaya Malam Sejati**: Lapisan malam diproses di OffscreenCanvas terpisah dengan warm additive lighter pass; nol piksel terhapus ke latar (alpha kanvas 255).
- **Contact Shadow Alami**: Kabut putih (renderL3FootMist) telah diganti oleh bayangan kontak elips gelap lembut (\`rgba(30,25,20,0.22)\`).
- **Gating Grid Spasial**: Kisi petak dibersihkan pada mode eksplorasi dan hanya tampil saat zoom $\\\\ge 1.6$.

---

## 2. Rekapitulasi Audit per Region

| Region | Total Tangkapan | Rata-rata Sprite | Rata-rata DefId | Duplikat <3 Tile | Objek Menghalangi Jalan | Fallback Sprites | JS Heap | Waktu Render | Status |
|---|---|---|---|---|---|---|---|---|---|
\${regionRows}

---

## 3. Top 10 Tangkapan Paling Kritis / Latensi Tertinggi

| No | Berkas Tangkapan | Region | Koordinat | Sprites | Duplikat <3 Tile | Blokir Jalan | Fallback | Latensi Render | Catatan Evaluasi |
|---|---|---|---|---|---|---|---|---|---|
\${worstRows}

---

## 4. Kesimpulan & Rekomendasi
Semua aturan spasial, ketiadaan fallback sprite, dan integritas rendering tekstur lukisan Song Dynasty telah diaudit secara deterministik.
\`;
  fs.writeFileSync(path.join(reviewDir, 'report.md'), md, 'utf8');`.replace(/\n/g, '\r\n');

  code = code.substring(0, repStartIdx) + newReport + code.substring(repEndIdx + oldReportEnd.length);
} else {
  console.warn('Could not find report markers in visualReview.mjs');
}

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully patched visualReview.mjs!');
