'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const outDir = path.resolve(__dirname, '../../review/shots_v18');
fs.mkdirSync(outDir, { recursive: true });

const reqPointsFile = path.resolve(__dirname, '../v16/requiredPoints.json');
const requiredPoints = JSON.parse(fs.readFileSync(reqPointsFile, 'utf8'));

const roadIds = new Set([
  'P01_xingcun', 'P02_xingcun_cross', 'P11_xueshan', 'P13_road_h', 'P14_road_v',
  'P30_road_rand', 'P31_road_rand', 'P32_road_rand', 'P33_road_rand', 'P34_road_rand'
]);

const shots = [];

for (const p of requiredPoints) {
  // Mode 1: Ground-only, grid off (for pixel-level verify_v18 gates)
  shots.push({
    name: p.id,
    x: p.x,
    y: p.y,
    zoom: p.zoom,
    grid: 0,
    ground: 'only'
  });

  // Mode 2: Full composite with grid ON (for player visual verification)
  shots.push({
    name: `${p.id}_grid`,
    x: p.x,
    y: p.y,
    zoom: p.zoom,
    grid: 1
  });

  // Noroad pair for road evaluation
  if (roadIds.has(p.id)) {
    shots.push({
      name: `${p.id}_noroad`,
      x: p.x,
      y: p.y,
      zoom: p.zoom,
      grid: 0,
      ground: 'only',
      noroad: 1,
      allowDuplicate: true
    });
  }
}

const manifestPath = path.resolve(__dirname, '../../review/v18_all_shots_manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(shots, null, 2), 'utf8');
console.log(`[captureAllV18] Generated manifest with ${shots.length} shots across ${requiredPoints.length} points.`);

const captureScript = path.resolve(__dirname, '../captureWorld.cjs');
console.log(`[captureAllV18] Launching captureWorld into ${outDir}...`);
const res = spawnSync('node', [captureScript, manifestPath, outDir], { stdio: 'inherit' });
if (res.status !== 0) {
  console.error(`[captureAllV18] captureWorld failed with code ${res.status}`);
  process.exit(res.status || 1);
}

console.log(`[captureAllV18] Successfully captured all V18 proof shots.`);
