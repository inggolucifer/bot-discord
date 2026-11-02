'use strict';
/**
 * scripts/v19/captureAllV19.js
 * Captures 24 proof shots (12 ground-only + 12 grid-on) + paired noroad shots for V19 release verification.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const outDir = path.resolve(__dirname, '../../review/shots_v19');
fs.mkdirSync(outDir, { recursive: true });

const points = [
  { id: 'P01_xingcun', x: 2050, y: 2650, zoom: 1.4, isRoad: true },
  { id: 'P04_farm', x: 2450, y: 2450, zoom: 1.4 },
  { id: 'P07_azure_west', x: 1500, y: 3350, zoom: 1.0 },
  { id: 'P11_xueshan', x: 2350, y: 4300, zoom: 1.4, isRoad: true },
  { id: 'P13_road_h', x: 2040, y: 2651, zoom: 1.4, isRoad: true },
  { id: 'P14_road_v', x: 2053, y: 2648, zoom: 1.4, isRoad: true },
  { id: 'P06_azure_pass', x: 2200, y: 3340, zoom: 1.0 },
  { id: 'P16_west_farm', x: 2215, y: 2444, zoom: 1.4 },
  { id: 'P02_xingcun_cross', x: 2062, y: 2648, zoom: 1.4, isRoad: true },
  { id: 'P03_wild', x: 2300, y: 3000, zoom: 1.4 },
  { id: 'P05_forest', x: 2700, y: 2300, zoom: 1.4 },
  { id: 'P12_desert', x: 900, y: 2600, zoom: 1.4 },
];

const shots = [];

for (const pt of points) {
  // Mode 1: Ground-only, grid off
  shots.push({
    name: pt.id,
    x: pt.x,
    y: pt.y,
    zoom: pt.zoom,
    grid: 0,
    ground: 'only',
    allowDuplicate: true
  });

  // Mode 2: Full composite with grid ON
  shots.push({
    name: `${pt.id}_grid`,
    x: pt.x,
    y: pt.y,
    zoom: pt.zoom,
    grid: 1,
    allowDuplicate: true
  });

  // Mode 3: Noroad pair for road points
  if (pt.isRoad) {
    shots.push({
      name: `${pt.id}_noroad`,
      x: pt.x,
      y: pt.y,
      zoom: pt.zoom,
      grid: 0,
      ground: 'only',
      noroad: 1,
      allowDuplicate: true
    });
  }
}

const manifestPath = path.resolve(__dirname, '../../review/v19_raw/v19_shots_manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(shots, null, 2), 'utf8');
console.log(`[captureAllV19] Generated manifest with ${shots.length} shots across ${points.length} points.`);

const captureScript = path.resolve(__dirname, '../captureWorld.cjs');
console.log(`[captureAllV19] Launching captureWorld into ${outDir}...`);
const res = spawnSync('node', [captureScript, manifestPath, outDir], { stdio: 'inherit' });
if (res.status !== 0) {
  console.error(`[captureAllV19] captureWorld failed with code ${res.status}`);
  process.exit(res.status || 1);
}

console.log(`[captureAllV19] Successfully captured all V19 proof shots.`);
