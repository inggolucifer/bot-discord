'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const outDir = path.resolve(__dirname, '../../review/v18_baseline');
fs.mkdirSync(outDir, { recursive: true });

const shots = [
  // 1. Farmland benchmarks
  { name: 'P04_farm', x: 2450, y: 2450, zoom: 1.4, grid: 0, ground: 'only' },
  { name: 'P16_west_farm', x: 1800, y: 2400, zoom: 1.4, grid: 0, ground: 'only' },

  // 2. Road benchmarks with paired noroad shots
  { name: 'P01_xingcun', x: 2050, y: 2650, zoom: 1.4, grid: 0, ground: 'only' },
  { name: 'P01_xingcun_noroad', x: 2050, y: 2650, zoom: 1.4, grid: 0, ground: 'only', noroad: 1 },
  { name: 'P02_xingcun_cross', x: 2062, y: 2648, zoom: 1.4, grid: 0, ground: 'only' },
  { name: 'P02_xingcun_cross_noroad', x: 2062, y: 2648, zoom: 1.4, grid: 0, ground: 'only', noroad: 1 },
  { name: 'P11_xueshan', x: 2350, y: 4300, zoom: 1.4, grid: 0, ground: 'only' },
  { name: 'P11_xueshan_noroad', x: 2350, y: 4300, zoom: 1.4, grid: 0, ground: 'only', noroad: 1 },
  { name: 'P13_road_h', x: 2040, y: 2651, zoom: 1.4, grid: 0, ground: 'only' },
  { name: 'P13_road_h_noroad', x: 2040, y: 2651, zoom: 1.4, grid: 0, ground: 'only', noroad: 1 },
  { name: 'P14_road_v', x: 2053, y: 2648, zoom: 1.4, grid: 0, ground: 'only' },
  { name: 'P14_road_v_noroad', x: 2053, y: 2648, zoom: 1.4, grid: 0, ground: 'only', noroad: 1 },

  // 3. Azure benchmarks
  { name: 'P06_azure_pass', x: 2200, y: 3340, zoom: 1.0, grid: 0, ground: 'only' },
  { name: 'P07_azure_west', x: 1500, y: 3350, zoom: 1.0, grid: 0, ground: 'only' },
  { name: 'P08_azure_far_west', x: 800, y: 3350, zoom: 1.0, grid: 0, ground: 'only' },
  { name: 'P09_azure_east', x: 3300, y: 3350, zoom: 1.0, grid: 0, ground: 'only' },
  { name: 'P10_azure_mist', x: 2600, y: 3340, zoom: 1.0, grid: 0, ground: 'only' },

  // 4. 5 deterministic snow points (seed 1618)
  { name: 'snow_rand_1', x: 2241, y: 4481, zoom: 1.4, grid: 0, ground: 'only' },
  { name: 'snow_rand_2', x: 2319, y: 4189, zoom: 1.4, grid: 0, ground: 'only' },
  { name: 'snow_rand_3', x: 2177, y: 4444, zoom: 1.4, grid: 0, ground: 'only' },
  { name: 'snow_rand_4', x: 2330, y: 4362, zoom: 1.4, grid: 0, ground: 'only' },
  { name: 'snow_rand_5', x: 2304, y: 4432, zoom: 1.4, grid: 0, ground: 'only' }
];

const shotsFile = path.resolve(__dirname, '../../review/v18_baseline_shots.json');
fs.writeFileSync(shotsFile, JSON.stringify(shots, null, 2), 'utf8');
console.log(`[captureBaselineV18] Wrote ${shots.length} shots to ${shotsFile}`);

const captureScript = path.resolve(__dirname, '../captureWorld.cjs');
console.log(`[captureBaselineV18] Invoking captureWorld.cjs...`);
const res = spawnSync('node', [captureScript, shotsFile, outDir], { stdio: 'inherit' });
if (res.status !== 0) {
  console.error(`[captureBaselineV18] captureWorld exited with code ${res.status}`);
  process.exit(res.status || 1);
}
console.log(`[captureBaselineV18] All baseline shots captured successfully!`);
