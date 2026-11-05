const anchors = require('../world-data/anchors.json');

const EXCLUSION_RADII = {
  hamlet: 6,
  village: 10,
  town: 14,
  major_city: 24,
  capital_city: 36,
  outpost: 6,
  sect: 10,
  port: 8
};

/**
 * Memeriksa apakah koordinat (x, y) berada dalam zona eksklusi pemukiman mana pun.
 * Menggunakan Chebyshev distance dari span anchor.
 *
 * @param {number} x - Koordinat dunia X
 * @param {number} y - Koordinat dunia Y
 * @returns {{ inZone: boolean, anchor: Object|null }}
 */
function isInSettlementExclusion(x, y) {
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const rad = (a.v20 && a.v20.exclusionRadius) || EXCLUSION_RADII[a.type] || 10;
    const minX = a.x - rad;
    const maxX = a.x + a.spanWidth - 1 + rad;
    const minY = a.y - rad;
    const maxY = a.y + a.spanHeight - 1 + rad;
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      return { inZone: true, anchor: a };
    }
  }
  return { inZone: false, anchor: null };
}

/**
 * Memeriksa apakah koordinat (x, y) berada dalam area bebas rintangan pemukiman (V24 H3):
 * 1. Forecourt clearance: area di depan sisi muka pemukiman
 * 2. Gate corridor: koridor selebar 3 petak x panjang 8 petak di depan pintu masuk
 *
 * @param {number} x
 * @param {number} y
 * @returns {{ inClearance: boolean, anchor: Object|null, reason: string|null }}
 */
function isInSettlementClearance(x, y) {
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const sw = a.spanWidth || 2;
    const sh = a.spanHeight || 2;
    const ent = a.v20?.entrance || { x: a.x + Math.floor(sw / 2), y: a.y + sh - 1, facing: 'south' };
    const facing = ent.facing || 'south';

    if (facing === 'west') {
      // Forecourt clearance to west
      if (x >= a.x - 3 && x < a.x && y >= a.y - 1 && y <= a.y + sh) {
        return { inClearance: true, anchor: a, reason: 'forecourt' };
      }
      // Gate corridor clearance to west: 8-long x 3-wide
      if (x >= ent.x - 8 && x < ent.x && y >= ent.y - 1 && y <= ent.y + 1) {
        return { inClearance: true, anchor: a, reason: 'corridor' };
      }
    } else {
      // 1. Forecourt clearance: (spanWidth + 2) x 3 baris di bawah footprint
      if (x >= a.x - 1 && x <= a.x + sw && y >= a.y + sh && y <= a.y + sh + 2) {
        return { inClearance: true, anchor: a, reason: 'forecourt' };
      }
      // 2. Gate corridor clearance: 3-wide x 8-long di selatan pintu masuk
      if (x >= ent.x - 1 && x <= ent.x + 1 && y >= ent.y + 1 && y <= ent.y + 8) {
        return { inClearance: true, anchor: a, reason: 'corridor' };
      }
    }
  }
  return { inClearance: false, anchor: null, reason: null };
}

/**
 * Mencari anchor pemukiman berdasarkan koordinat tile entrance
 */
function findAnchorByEntrance(x, y) {
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const ent = a.v20?.entrance;
    if (ent && ent.x === x && ent.y === y) {
      return a;
    }
  }
  return null;
}

/**
 * Mencari anchor pemukiman jika koordinat berada di dalam span anchor
 */
function findAnchorBySpan(x, y) {
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    if (x >= a.x && x < a.x + a.spanWidth && y >= a.y && y < a.y + a.spanHeight) {
      return a;
    }
  }
  return null;
}

module.exports = {
  isInSettlementExclusion,
  isInSettlementClearance,
  findAnchorByEntrance,
  findAnchorBySpan,
  EXCLUSION_RADII
};
