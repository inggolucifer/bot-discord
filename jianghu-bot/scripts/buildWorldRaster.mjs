/**
 * JIANGHU WORLD — MACRO WORLD RASTER BUILDER (scripts/buildWorldRaster.mjs)
 * Implements Fase H5a Specification:
 * - Generates 1250x1250 Macro World Raster (1 pixel = 4x4 world tiles, spanning 5000x5000 world)
 * - Renders organic region palettes with subtle Xuan paper texture
 * - Overlays mountain barriers, road networks (89 segments), and 52 canonical anchors
 * - Outputs to web-dashboard/public/assets/world-raster.webp & world-raster.png
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const sharp = require('sharp');

console.log('================================================================');
console.log('  JIANGHU WORLD — FASE H5A: MACRO WORLD RASTER BUILDER');
console.log('================================================================\n');

const RASTER_SIZE = 1250; // 1250x1250 pixels (1 px = 4 tiles)
const WORLD_SIZE = 5000;
const TILE_SCALE = WORLD_SIZE / RASTER_SIZE; // 4.0

const regionsPath = path.resolve(__dirname, '../world-data/regions.json');
const anchorsPath = path.resolve(__dirname, '../world-data/anchors.json');
const barriersPath = path.resolve(__dirname, '../world-data/barriers.json');
const regionMapPath = fs.existsSync(path.resolve(__dirname, '../world-data/organic-region-map.json'))
  ? path.resolve(__dirname, '../world-data/organic-region-map.json')
  : path.resolve(__dirname, '../world-data/_unused/organic-region-map.json');
const roadNetPath = fs.existsSync(path.resolve(__dirname, '../world-data/road-network.json'))
  ? path.resolve(__dirname, '../world-data/road-network.json')
  : path.resolve(__dirname, '../world-data/_unused/road-network.json');

const regions = JSON.parse(fs.readFileSync(regionsPath, 'utf8'));
const anchors = JSON.parse(fs.readFileSync(anchorsPath, 'utf8'));
const barriers = JSON.parse(fs.readFileSync(barriersPath, 'utf8'));
const regMap = JSON.parse(fs.readFileSync(regionMapPath, 'utf8'));
const roadNet = JSON.parse(fs.readFileSync(roadNetPath, 'utf8'));

// Precompute region RGB palettes
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16)
    ];
  }
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0
  ];
}

const regionColors = regions.map(r => {
  const hex = r.palette?.terrainColor || r.palette?.primary || '#3a5f38';
  return hexToRgb(hex);
});

console.log(`[1/4] Rendering Base Organic Terrain (${RASTER_SIZE}x${RASTER_SIZE} px)...`);
const rawBuffer = Buffer.alloc(RASTER_SIZE * RASTER_SIZE * 4); // RGBA

for (let py = 0; py < RASTER_SIZE; py++) {
  const wy = py * TILE_SCALE;
  const gy = Math.min(624, Math.floor(wy / 8));

  for (let px = 0; px < RASTER_SIZE; px++) {
    const wx = px * TILE_SCALE;
    const gx = Math.min(624, Math.floor(wx / 8));

    const regIdx = regMap.compressedGrid[gy * 625 + gx] || 0;
    const [r, g, b] = regionColors[regIdx] || [77, 115, 72];

    // Subtle paper grain modulation
    const noise = ((Math.sin(px * 12.9898 + py * 78.233) * 43758.5453) % 1) * 8 - 4;
    const finalR = Math.max(0, Math.min(255, Math.round(r + noise)));
    const finalG = Math.max(0, Math.min(255, Math.round(g + noise)));
    const finalB = Math.max(0, Math.min(255, Math.round(b + noise)));

    const offset = (py * RASTER_SIZE + px) * 4;
    rawBuffer[offset] = finalR;
    rawBuffer[offset + 1] = finalG;
    rawBuffer[offset + 2] = finalB;
    rawBuffer[offset + 3] = 255;
  }
}

console.log(`[2/4] Drawing Mountain Barrier Walls...`);
for (const b of barriers) {
  const minPx = Math.floor(b.bounds.minX / TILE_SCALE);
  const maxPx = Math.min(RASTER_SIZE - 1, Math.floor(b.bounds.maxX / TILE_SCALE));
  const minPy = Math.floor(b.bounds.minY / TILE_SCALE);
  const maxPy = Math.min(RASTER_SIZE - 1, Math.floor(b.bounds.maxY / TILE_SCALE));

  // Barrier dark stone ink wash
  const stoneR = b.type === 'lava_hazard' ? 120 : (b.type === 'chasm' ? 20 : 55);
  const stoneG = b.type === 'lava_hazard' ? 30 : (b.type === 'chasm' ? 15 : 50);
  const stoneB = b.type === 'lava_hazard' ? 25 : (b.type === 'chasm' ? 25 : 45);

  for (let py = minPy; py <= maxPy; py++) {
    for (let px = minPx; px <= maxPx; px++) {
      const offset = (py * RASTER_SIZE + px) * 4;
      rawBuffer[offset] = stoneR;
      rawBuffer[offset + 1] = stoneG;
      rawBuffer[offset + 2] = stoneB;
      rawBuffer[offset + 3] = 255;
    }
  }
}

console.log(`[3/4] Rasterizing Road Network (89 Segments)...`);
function drawThickPixel(px, py, r, g, b, radius = 1) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const qx = px + dx;
      const qy = py + dy;
      if (qx >= 0 && qx < RASTER_SIZE && qy >= 0 && qy < RASTER_SIZE) {
        const offset = (qy * RASTER_SIZE + qx) * 4;
        rawBuffer[offset] = r;
        rawBuffer[offset + 1] = g;
        rawBuffer[offset + 2] = b;
      }
    }
  }
}

for (const seg of roadNet.segments) {
  for (let i = 0; i < seg.waypoints.length - 1; i++) {
    const p1 = seg.waypoints[i];
    const p2 = seg.waypoints[i + 1];

    const px1 = Math.floor(p1.x / TILE_SCALE);
    const py1 = Math.floor(p1.y / TILE_SCALE);
    const px2 = Math.floor(p2.x / TILE_SCALE);
    const py2 = Math.floor(p2.y / TILE_SCALE);

    const dist = Math.hypot(px2 - px1, py2 - py1);
    const steps = Math.max(1, Math.ceil(dist * 2));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = Math.round(px1 + (px2 - px1) * t);
      const y = Math.round(py1 + (py2 - py1) * t);
      // Soft golden-ochre path color
      drawThickPixel(x, y, 218, 207, 191, 1);
    }
  }
}

console.log(`[4/4] Plotting 52 Canonical Anchor Seals...`);
for (const a of anchors) {
  const apx = Math.round(a.x / TILE_SCALE);
  const apy = Math.round(a.y / TILE_SCALE);

  let [ar, ag, ab] = [212, 177, 106]; // Gold for cities
  let radius = 3;

  if (a.type === 'sect') {
    [ar, ag, ab] = [180, 50, 40]; // Crimson for sects
    radius = 4;
  } else if (a.type === 'port') {
    [ar, ag, ab] = [56, 189, 248]; // Sky blue for ports
    radius = 3;
  } else if (a.type === 'pass') {
    [ar, ag, ab] = [234, 88, 12]; // Vermilion for passes
    radius = 3;
  }

  drawThickPixel(apx, apy, ar, ag, ab, radius);
}

// Save outputs
const outPublicDir = path.resolve(__dirname, '../web-dashboard/public/assets');
if (!fs.existsSync(outPublicDir)) fs.mkdirSync(outPublicDir, { recursive: true });

const webpPath = path.join(outPublicDir, 'world-raster.webp');
const pngPath = path.join(outPublicDir, 'world-raster.png');

console.log(`Writing raster to ${webpPath} and ${pngPath}...`);

await sharp(rawBuffer, {
  raw: {
    width: RASTER_SIZE,
    height: RASTER_SIZE,
    channels: 4
  }
})
  .webp({ quality: 92, effort: 4 })
  .toFile(webpPath);

await sharp(rawBuffer, {
  raw: {
    width: RASTER_SIZE,
    height: RASTER_SIZE,
    channels: 4
  }
})
  .png({ compressionLevel: 8 })
  .toFile(pngPath);

const webpSize = (fs.statSync(webpPath).size / 1024).toFixed(1);
const pngSize = (fs.statSync(pngPath).size / 1024).toFixed(1);

console.log(`-> Saved world-raster.webp: ${webpSize} KB`);
console.log(`-> Saved world-raster.png: ${pngSize} KB`);

console.log('\n================================================================');
console.log('  FASE H5A: MACRO WORLD RASTER GENERATED SUCCESSFULLY (PASS)');
console.log('================================================================');
