const fs = require('fs');
const path = require('path');

const BOT_ROOT = path.resolve(__dirname, '../..');
const anchors = require('../../world-data/anchors.json');
const travelPath = path.join(BOT_ROOT, 'config/travelDistances.js');

const TILES_PER_LI = 5;

// 1. Definisikan 52 settlements dari anchors kanonikal
const settlements = anchors.map(a => ({
  regionSlug: a.region,
  name: a.name,
  minRealmIndex: Math.max(0, (a.tier || 1) - 1)
}));

// Inisialisasi daftar ketetanggaan
const distancesLi = {};
for (const a of anchors) {
  distancesLi[a.name] = {};
}

// 2. Hubungkan tiap simpul ke 3 tetangga terdekat (jarak Euclid)
for (let i = 0; i < anchors.length; i++) {
  const a1 = anchors[i];
  const sorted = anchors
    .map((a2, j) => ({
      index: j,
      name: a2.name,
      x: a2.x,
      y: a2.y,
      dist: Math.hypot(a1.x - a2.x, a1.y - a2.y)
    }))
    .filter(x => x.index !== i)
    .sort((a, b) => a.dist - b.dist);

  for (let k = 0; k < 3; k++) {
    const nb = sorted[k];
    const li = Math.max(10, Math.floor(nb.dist / TILES_PER_LI));
    distancesLi[a1.name][nb.name] = li;
    distancesLi[nb.name][a1.name] = li;
  }
}

// 3. Hitung komponen terhubung & sambungkan jika > 1 (MST bridge)
function getComponents() {
  const visited = new Set();
  const comps = [];

  for (const a of anchors) {
    if (!visited.has(a.name)) {
      const comp = [];
      const q = [a.name];
      visited.add(a.name);
      while (q.length > 0) {
        const curr = q.shift();
        comp.push(curr);
        for (const nb of Object.keys(distancesLi[curr] || {})) {
          if (!visited.has(nb)) {
            visited.add(nb);
            q.push(nb);
          }
        }
      }
      comps.push(comp);
    }
  }
  return comps;
}

let comps = getComponents();
while (comps.length > 1) {
  // Cari pasangan node terdekat antar comp[0] dan comp[other]
  let bestDist = Infinity;
  let bestPair = null;

  for (const n1 of comps[0]) {
    const a1 = anchors.find(a => a.name === n1);
    for (let c = 1; c < comps.length; c++) {
      for (const n2 of comps[c]) {
        const a2 = anchors.find(a => a.name === n2);
        const dist = Math.hypot(a1.x - a2.x, a1.y - a2.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestPair = [n1, n2];
        }
      }
    }
  }

  if (bestPair) {
    const li = Math.max(10, Math.floor(bestDist / TILES_PER_LI));
    distancesLi[bestPair[0]][bestPair[1]] = li;
    distancesLi[bestPair[1]][bestPair[0]] = li;
  }
  comps = getComponents();
}

// 4. Verifikasi dengan TravelGraph (Dijkstra 52x51)
const { TravelGraph } = require('../../utils/travelGraph');
const graph = new TravelGraph(distancesLi);
let validPairs = 0;

for (let i = 0; i < anchors.length; i++) {
  for (let j = 0; j < anchors.length; j++) {
    if (i === j) continue;
    const res = graph.shortestPath(anchors[i].name, anchors[j].name);
    if (res.path && res.path.length > 0 && Number.isFinite(res.totalLi) && res.totalLi > 0) {
      validPairs++;
    }
  }
}

console.log(`[VERIFIKASI] Simpul: ${settlements.length}, Komponen: ${comps.length}, Pasangan Valid: ${validPairs}/${52 * 51}`);

if (validPairs !== 52 * 51) {
  console.error('[ERROR] Tidak semua pasangan 52x51 memiliki rute!');
  process.exit(1);
}

// 5. Susun format berkas JavaScript
const content = `/**
 * JIANGHU BOT & IMMORTAL-X — TRAVEL GRAPH CANONICAL CONFIG (config/travelDistances.js)
 * V23 G1: Rekonstruksi graf penjelajahan 52 simpul pemukiman kanonikal V20
 * - 52 Simpul = 52 Anchor kanonikal
 * - Graf terhubung penuh 1 komponen (Dijkstra 52x51 rute valid)
 * - Jarak dihitung via Euclidean riil skala 5 petak per Li
 */

module.exports = {
  LI_PER_HOUR: 100,
  AMBUSH_LOSS_PERCENT: 0.05,
  AMBUSH_LOSS_CAP_SILVER_EQ: 500,
  settlements: ${JSON.stringify(settlements, null, 4)},
  distancesLi: ${JSON.stringify(distancesLi, null, 4)}
};
`;

fs.writeFileSync(travelPath, content, 'utf8');
console.log(`[SUKSES] ${travelPath} berhasil diperbarui dengan 52 simpul.`);
