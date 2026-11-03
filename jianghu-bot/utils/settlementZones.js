const anchors = require('../world-data/anchors.json');

const EXCLUSION_RADII = {
  hamlet: 6,
  village: 10,
  town: 14,
  major_city: 24,
  capital_city: 36,
  sect: 16,
  outpost: 8,
  port: 10,
  island: 10,
  secret_realm: 6,
  danger_zone: 8
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
  findAnchorByEntrance,
  findAnchorBySpan,
  EXCLUSION_RADII
};
