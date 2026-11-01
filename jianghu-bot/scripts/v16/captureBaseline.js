'use strict';
/**
 * scripts/v16/captureBaseline.js
 * Captures baseline world screenshots & hook data for ALL required points in scripts/v16/requiredPoints.json
 * Output directory: review/v16_baseline/
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const REQUIRED_POINTS_PATH = path.resolve(__dirname, 'requiredPoints.json');
const OUT_DIR = path.resolve(PROJECT_ROOT, 'review/v16_baseline');

fs.mkdirSync(OUT_DIR, { recursive: true });

const requiredPoints = JSON.parse(fs.readFileSync(REQUIRED_POINTS_PATH, 'utf8'));
console.log(`[captureBaseline] Loaded ${requiredPoints.length} required points from ${REQUIRED_POINTS_PATH}`);

const shots = requiredPoints.map(p => ({
  name: p.id,
  x: p.x,
  y: p.y,
  zoom: p.zoom,
  grid: false, // Strict rule: pixel metrics are measured with &grid=0
  desc: `${p.id} (${p.x}, ${p.y}) z=${p.zoom} ${p.class}`
}));

const shotsConfigPath = path.resolve(__dirname, 'baseline_shots_config.json');
fs.writeFileSync(shotsConfigPath, JSON.stringify(shots, null, 2), 'utf8');

console.log(`[captureBaseline] Launching captureWorld.cjs for ${shots.length} baseline shots...`);
const captureScript = path.resolve(PROJECT_ROOT, 'scripts/captureWorld.cjs');

const child = spawn(process.execPath, [captureScript, shotsConfigPath, OUT_DIR], {
  cwd: PROJECT_ROOT,
  stdio: 'inherit'
});

child.on('close', (code) => {
  if (code === 0) {
    console.log(`\n[captureBaseline] Successfully captured all ${shots.length} baseline shots to: ${OUT_DIR}`);
    process.exit(0);
  } else {
    console.error(`\n[captureBaseline] Capture process exited with error code: ${code}`);
    process.exit(code || 1);
  }
});
