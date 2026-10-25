const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const targets = [
  { name: 'xingcun_village', x: 2050, y: 2650 },
  { name: 'canghai', x: 3700, y: 2550 },
  { name: 'demon_gate', x: 2500, y: 800 },
  { name: 'azure_pass', x: 2600, y: 3340 },
  { name: 'desert_oasis', x: 820, y: 2220 },
  { name: 'frost_village', x: 2350, y: 4300 },
  { name: 'lava_spine', x: 1350, y: 950 },
  { name: 'lake_edge', x: 3100, y: 3100 },
  { name: 'thunder_sect', x: 2400, y: 4000 },
  { name: 'river_crossing', x: 2036, y: 2651 }
];

async function run() {
  console.log('| Shot | Titik (x,y) | (a) Unique Colors (>=400) | (b) Luma Std (6-40) | (c) Lag-54 Autocorr (<0.35) | Status |');
  console.log('|---|---|---|---|---|---|');
  for (const t of targets) {
    const p = path.join('review/shots/v9_ground', t.name + '.png');
    const { data, info } = await sharp(p).raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    const GRID_X = 64, GRID_Y = 36;
    const colors = new Set();
    for (let gy = 0; gy < GRID_Y; gy++) {
      const py = Math.floor(gy * (height / GRID_Y));
      for (let gx = 0; gx < GRID_X; gx++) {
        const px = Math.floor(gx * (width / GRID_X));
        const idx = (py * width + px) * channels;
        colors.add((data[idx] << 16) | (data[idx + 1] << 8) | data[idx + 2]);
      }
    }
    let lumaSum = 0, lumaSqSum = 0;
    const totalPixels = width * height;
    const colLumaSum = new Float64Array(width);
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const idx = (row + x) * channels;
        const luma = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        lumaSum += luma;
        lumaSqSum += luma * luma;
        colLumaSum[x] += luma;
      }
    }
    const meanLuma = lumaSum / totalPixels;
    const lumaStd = Math.sqrt(Math.max(0, (lumaSqSum / totalPixels) - (meanLuma * meanLuma)));
    const colAvg = new Float64Array(width);
    let colAvgMean = 0;
    for (let x = 0; x < width; x++) {
      colAvg[x] = colLumaSum[x] / height;
      colAvgMean += colAvg[x];
    }
    colAvgMean /= width;
    let colVar = 0;
    for (let x = 0; x < width; x++) {
      const diff = colAvg[x] - colAvgMean;
      colVar += diff * diff;
    }
    colVar /= width;
    const LAG = 54;
    let cov = 0;
    const samples = width - LAG;
    for (let x = 0; x < samples; x++) {
      cov += (colAvg[x] - colAvgMean) * (colAvg[x + LAG] - colAvgMean);
    }
    cov /= samples;
    const autocorr = colVar > 1e-6 ? Math.abs(cov / colVar) : 0;
    const pass = colors.size >= 400 && lumaStd >= 6.0 && lumaStd <= 40.0 && autocorr < 0.35;
    console.log(`| ${t.name} | (${t.x},${t.y}) | ${colors.size} | ${lumaStd.toFixed(2)} | ${autocorr.toFixed(3)} | ${pass ? 'PASS' : 'FAIL'} |`);
  }
}
run();
