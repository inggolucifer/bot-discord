'use strict';
/**
 * scripts/v11/colorProbe.js
 * Samples 40x40 px patches (center and 4 corners) from a 1280x720 PNG screenshot,
 * computes average RGB -> CIE Lab, and calculates CIE Delta E 76 against a target terrain color.
 *
 * Usage:
 *   node scripts/v11/colorProbe.js <imagePath> <targetHexOrRegionId>
 *   node scripts/v11/colorProbe.js --audit-dir <shotsDir> <shotListJson>
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const worldData = require('../../utils/worldData');

function hexToRgb(hex) {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// sRGB to CIE XYZ (D65 illuminant)
function rgbToXyz(r, g, b) {
  let [R, G, B] = [r / 255, g / 255, b / 255].map(v => {
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
  });
  // D65 reference
  const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
  const Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
  return [X * 100, Y * 100, Z * 100];
}

// XYZ to CIE Lab
function xyzToLab(x, y, z) {
  // D65 reference white
  const Xn = 95.047, Yn = 100.000, Zn = 108.883;
  let [fx, fy, fz] = [x / Xn, y / Yn, z / Zn].map(v => {
    return v > 0.008856 ? Math.cbrt(v) : (7.787 * v) + (16 / 116);
  });
  const L = (116 * fy) - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  return [L, a, b];
}

function rgbToLab(r, g, b) {
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

function deltaE76(lab1, lab2) {
  const dL = lab1[0] - lab2[0];
  const da = lab1[1] - lab2[1];
  const db = lab1[2] - lab2[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

async function probeImage(imagePath, targetHex) {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`File image tidak ditemukan: ${imagePath}`);
  }

  const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // 5 patches of 40x40: center, top-left, top-right, bottom-left, bottom-right
  const patchCoords = [
    { name: 'center', cx: Math.floor(width / 2), cy: Math.floor(height / 2) },
    { name: 'topLeft', cx: 120, cy: 120 },
    { name: 'topRight', cx: width - 120, cy: 120 },
    { name: 'bottomLeft', cx: 120, cy: height - 120 },
    { name: 'bottomRight', cx: width - 120, cy: height - 120 }
  ];

  const targetRgb = hexToRgb(targetHex);
  const targetLab = rgbToLab(...targetRgb);

  const patches = [];
  let totalDeltaE = 0;

  for (const pt of patchCoords) {
    const half = 20;
    let rSum = 0, gSum = 0, bSum = 0, count = 0;

    for (let py = pt.cy - half; py < pt.cy + half; py++) {
      if (py < 0 || py >= height) continue;
      for (let px = pt.cx - half; px < pt.cx + half; px++) {
        if (px < 0 || px >= width) continue;
        const idx = (py * width + px) * channels;
        rSum += data[idx];
        gSum += data[idx + 1];
        bSum += data[idx + 2];
        count++;
      }
    }

    const avgR = rSum / count;
    const avgG = gSum / count;
    const avgB = bSum / count;
    const patchLab = rgbToLab(avgR, avgG, avgB);
    const dE = deltaE76(patchLab, targetLab);

    totalDeltaE += dE;
    patches.push({
      name: pt.name,
      rgb: [Math.round(avgR), Math.round(avgG), Math.round(avgB)],
      lab: patchLab.map(v => Math.round(v * 10) / 10),
      deltaE: Math.round(dE * 10) / 10
    });
  }

  const avgDeltaE = Math.round((totalDeltaE / patches.length) * 10) / 10;
  const centerDeltaE = patches[0].deltaE;

  return {
    imagePath,
    targetHex,
    targetLab: targetLab.map(v => Math.round(v * 10) / 10),
    centerDeltaE,
    avgDeltaE,
    patches
  };
}

module.exports = {
  hexToRgb,
  rgbToLab,
  deltaE76,
  probeImage
};

if (require.main === module) {
  (async () => {
    const imgArg = process.argv[2];
    const targetArg = process.argv[3];

    if (!imgArg || !targetArg) {
      console.log('Usage: node scripts/v11/colorProbe.js <imagePath> <targetHexOrRegionId>');
      process.exit(1);
    }

    let targetHex = targetArg;
    if (!targetHex.startsWith('#')) {
      const reg = worldData.getRegionDef(targetArg);
      targetHex = (reg && reg.palette && reg.palette.terrainColor) || '#7f9a5a';
    }

    try {
      const res = await probeImage(imgArg, targetHex);
      console.log(JSON.stringify(res, null, 2));
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  })();
}
