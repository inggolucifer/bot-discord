const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const reqPointsPath = path.resolve(__dirname, '../v16/requiredPoints.json');
const points = JSON.parse(fs.readFileSync(reqPointsPath, 'utf8'));

const outDir = path.resolve(__dirname, '../../review/v17_baseline');
fs.mkdirSync(outDir, { recursive: true });

const shots = [];

// 1. All required points in ground-only mode
for (const p of points) {
  shots.push({
    name: p.id,
    x: p.x,
    y: p.y,
    zoom: p.zoom,
    grid: 0,
    ground: 'only'
  });
}

// 2. Bisect diagnosis shots for P1
// P07 boundary bisect
shots.push(
  { name: 'P07_bisect_base', x: 1500, y: 3350, zoom: 1, grid: 0, ground: 'only', layers: 'base' },
  { name: 'P07_bisect_families', x: 1500, y: 3350, zoom: 1, grid: 0, ground: 'only', layers: 'base+families' },
  { name: 'P07_bisect_variants', x: 1500, y: 3350, zoom: 1, grid: 0, ground: 'only', layers: 'base+families+variants' },
  { name: 'P07_bisect_all', x: 1500, y: 3350, zoom: 1, grid: 0, ground: 'only', layers: 'all' }
);

// P06 boundary bisect
shots.push(
  { name: 'P06_bisect_base', x: 2200, y: 3340, zoom: 1, grid: 0, ground: 'only', layers: 'base' },
  { name: 'P06_bisect_families', x: 2200, y: 3340, zoom: 1, grid: 0, ground: 'only', layers: 'base+families' },
  { name: 'P06_bisect_variants', x: 2200, y: 3340, zoom: 1, grid: 0, ground: 'only', layers: 'base+families+variants' },
  { name: 'P06_bisect_all', x: 2200, y: 3340, zoom: 1, grid: 0, ground: 'only', layers: 'all' }
);

// P04 farmland bisect
shots.push(
  { name: 'P04_bisect_nofarm', x: 2450, y: 2450, zoom: 1.4, grid: 0, ground: 'only', nofarm: 1 },
  { name: 'P04_bisect_default', x: 2450, y: 2450, zoom: 1.4, grid: 0, ground: 'only' },
  { name: 'P04_bisect_base', x: 2450, y: 2450, zoom: 1.4, grid: 0, ground: 'only', layers: 'base' },
  { name: 'P04_bisect_families', x: 2450, y: 2450, zoom: 1.4, grid: 0, ground: 'only', layers: 'base+families' }
);

// P01 & P11 road bisect
shots.push(
  { name: 'P01_bisect_noroad', x: 2050, y: 2650, zoom: 1.4, grid: 0, ground: 'only', noroad: 1 },
  { name: 'P01_bisect_default', x: 2050, y: 2650, zoom: 1.4, grid: 0, ground: 'only' },
  { name: 'P11_bisect_noroad', x: 2350, y: 4300, zoom: 1.4, grid: 0, ground: 'only', noroad: 1 },
  { name: 'P11_bisect_default', x: 2350, y: 4300, zoom: 1.4, grid: 0, ground: 'only' }
);

const shotsFile = path.resolve(__dirname, '../../review/v17_baseline_shots.json');
fs.writeFileSync(shotsFile, JSON.stringify(shots, null, 2), 'utf8');
console.log(`[captureBaselineV17] Wrote ${shots.length} shots to ${shotsFile}`);

const captureScript = path.resolve(__dirname, '../captureWorld.cjs');
console.log(`[captureBaselineV17] Invoking captureWorld.cjs...`);
const res = spawnSync('node', [captureScript, shotsFile, outDir], { stdio: 'inherit' });
if (res.status !== 0) {
  console.error(`[captureBaselineV17] captureWorld exited with code ${res.status}`);
  process.exit(res.status || 1);
}
console.log(`[captureBaselineV17] All baseline shots captured successfully!`);
