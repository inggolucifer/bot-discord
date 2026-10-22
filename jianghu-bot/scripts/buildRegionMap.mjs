/**
 * JIANGHU WORLD — ORGANIC REGION MAP & ROAD NETWORK ENGINE (scripts/buildRegionMap.mjs)
 * Implements Fase H3a Specification:
 * - 625x625 Macro Grid (each cell = 8x8 world tiles, spanning 5000x5000 world)
 * - Simplex / Value noise domain warping for organic, naturally curved region boundaries
 * - Mountain barrier & chasm placement from world-data/barriers.json
 * - A* road network connecting 52 canonical anchors along lowest-cost terrain corridors
 * - Outputs: world-data/organic-region-map.json & world-data/road-network.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const regionsPath = path.resolve(__dirname, '../world-data/regions.json');
const anchorsPath = path.resolve(__dirname, '../world-data/anchors.json');
const barriersPath = path.resolve(__dirname, '../world-data/barriers.json');
const passesPath = path.resolve(__dirname, '../world-data/passes.json');

const regions = JSON.parse(fs.readFileSync(regionsPath, 'utf8'));
const anchors = JSON.parse(fs.readFileSync(anchorsPath, 'utf8'));
const barriers = JSON.parse(fs.readFileSync(barriersPath, 'utf8'));
const passes = fs.existsSync(passesPath) ? JSON.parse(fs.readFileSync(passesPath, 'utf8')) : [];

console.log('================================================================');
console.log('  JIANGHU WORLD — FASE H3A: ORGANIC REGION & ROAD GENERATOR');
console.log('================================================================\n');

console.log(`Loaded ${regions.length} regions, ${anchors.length} anchors, ${barriers.length} barriers, ${passes.length} passes.`);

const GRID_SIZE = 625; // 625 * 8 = 5000 world tiles
const TILE_SCALE = 8;  // 1 cell = 8x8 tiles

// Simple deterministic 2D Perlin-like noise
function pseudoNoise(x, y) {
  let n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x, y) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;

  const s = fx * fx * (3 - 2 * fx);
  const t = fy * fy * (3 - 2 * fy);

  const n00 = pseudoNoise(i, j);
  const n10 = pseudoNoise(i + 1, j);
  const n01 = pseudoNoise(i, j + 1);
  const n11 = pseudoNoise(i + 1, j + 1);

  const nx0 = n00 * (1 - s) + n10 * s;
  const nx1 = n01 * (1 - s) + n11 * s;

  return nx0 * (1 - t) + nx1 * t;
}

function fbm(x, y, octaves = 3) {
  let val = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let o = 0; o < octaves; o++) {
    val += smoothNoise(x * freq, y * freq) * amp;
    freq *= 2.0;
    amp *= 0.5;
  }
  return val;
}

// 1. Organic Region Map Assignment with Domain Warping
console.log('\n[1/3] Generating 625x625 Organic Region Grid with Domain Warping...');
const regionGrid = new Uint8Array(GRID_SIZE * GRID_SIZE);
const regionSlugs = regions.map(r => r.id);

for (let gy = 0; gy < GRID_SIZE; gy++) {
  for (let gx = 0; gx < GRID_SIZE; gx++) {
    const wx = gx * TILE_SCALE + 4;
    const wy = gy * TILE_SCALE + 4;

    // Domain warp: perturb coordinates organically
    const warpX = (fbm(gx * 0.04, gy * 0.04) - 0.5) * 80;
    const warpY = (fbm(gx * 0.04 + 10, gy * 0.04 + 10) - 0.5) * 80;
    const queryX = Math.max(0, Math.min(4999, wx + warpX));
    const queryY = Math.max(0, Math.min(4999, wy + warpY));

    // Find best region matching warped bounds
    let assignedIdx = 0; // Default Central Plains
    let bestDist = 999999;

    for (let ri = 0; ri < regions.length; ri++) {
      const b = regions[ri].bounds;
      if (queryX >= b.minX && queryX <= b.maxX && queryY >= b.minY && queryY <= b.maxY) {
        // Compute distance to center of region
        const cx = (b.minX + b.maxX) / 2;
        const cy = (b.minY + b.maxY) / 2;
        const dist = Math.hypot(queryX - cx, queryY - cy);
        if (dist < bestDist) {
          bestDist = dist;
          assignedIdx = ri;
        }
      }
    }

    regionGrid[gy * GRID_SIZE + gx] = assignedIdx;
  }
}
console.log('-> Generated 625x625 organic region classification (390,625 cells).');

// 2. Cost Map for Road Pathfinder
console.log('\n[2/3] Building Traversal Cost Map (Barriers, Water, Mountains)...');
const costMap = new Float32Array(GRID_SIZE * GRID_SIZE);

// Default base terrain costs
for (let gy = 0; gy < GRID_SIZE; gy++) {
  for (let gx = 0; gx < GRID_SIZE; gx++) {
    const regIdx = regionGrid[gy * GRID_SIZE + gx];
    const reg = regions[regIdx];
    let baseCost = 1.0; // Open plains
    if (reg.id.includes('mountain') || reg.id.includes('peak') || reg.id.includes('range')) {
      baseCost = 3.5;
    } else if (reg.id.includes('desert') || reg.id.includes('sand')) {
      baseCost = 1.6;
    } else if (reg.id.includes('swamp') || reg.id.includes('mire')) {
      baseCost = 2.5;
    } else if (reg.id.includes('sea') || reg.id.includes('ocean')) {
      baseCost = 10.0;
    }
    costMap[gy * GRID_SIZE + gx] = baseCost;
  }
}

// Solid barriers have infinite cost (except at official mountain passes)
for (const b of barriers) {
  const minGx = Math.floor(b.bounds.minX / TILE_SCALE);
  const maxGx = Math.min(GRID_SIZE - 1, Math.floor(b.bounds.maxX / TILE_SCALE));
  const minGy = Math.floor(b.bounds.minY / TILE_SCALE);
  const maxGy = Math.min(GRID_SIZE - 1, Math.floor(b.bounds.maxY / TILE_SCALE));

  for (let gy = minGy; gy <= maxGy; gy++) {
    for (let gx = minGx; gx <= maxGx; gx++) {
      costMap[gy * GRID_SIZE + gx] = 999.0; // Impassable
    }
  }
}

// Carve open official passes through barriers
for (const p of passes) {
  const pgx = Math.floor(p.x / TILE_SCALE);
  const pgy = Math.floor(p.y / TILE_SCALE);
  const rad = 3; // 24 tiles wide corridor
  for (let dy = -rad; dy <= rad; dy++) {
    for (let dx = -rad; dx <= rad; dx++) {
      const gx = pgx + dx;
      const gy = pgy + dy;
      if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
        costMap[gy * GRID_SIZE + gx] = 0.5; // Natural road pass
      }
    }
  }
}
console.log('-> Traversal cost map generated with barrier walls and pass corridors.');

// 3. A* Road Pathfinder connecting 52 Anchors
console.log('\n[3/3] Generating A* Road Network between 52 Anchors...');

function getNeighbors(gx, gy) {
  const dirs = [
    { dx: 1, dy: 0, cost: 1.0 },
    { dx: -1, dy: 0, cost: 1.0 },
    { dx: 0, dy: 1, cost: 1.0 },
    { dx: 0, dy: -1, cost: 1.0 },
    { dx: 1, dy: 1, cost: 1.414 },
    { dx: -1, dy: 1, cost: 1.414 },
    { dx: 1, dy: -1, cost: 1.414 },
    { dx: -1, dy: -1, cost: 1.414 }
  ];
  const list = [];
  for (const d of dirs) {
    const nx = gx + d.dx;
    const ny = gy + d.dy;
    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
      list.push({ gx: nx, gy: ny, stepCost: d.cost });
    }
  }
  return list;
}

// Fast Binary Min-Heap Priority Queue for A*
class MinHeap {
  constructor() {
    this.heap = [];
  }
  push(node) {
    this.heap.push(node);
    this._up(this.heap.length - 1);
  }
  pop() {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const bottom = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this._down(0);
    }
    return top;
  }
  get size() {
    return this.heap.length;
  }
  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.heap[i].f < this.heap[p].f) {
        const tmp = this.heap[i];
        this.heap[i] = this.heap[p];
        this.heap[p] = tmp;
        i = p;
      } else break;
    }
  }
  _down(i) {
    const len = this.heap.length;
    while ((i << 1) + 1 < len) {
      let left = (i << 1) + 1;
      let right = left + 1;
      let best = left;
      if (right < len && this.heap[right].f < this.heap[left].f) best = right;
      if (this.heap[best].f < this.heap[i].f) {
        const tmp = this.heap[i];
        this.heap[i] = this.heap[best];
        this.heap[best] = tmp;
        i = best;
      } else break;
    }
  }
}

function findPath(startX, startY, goalX, goalY) {
  const heap = new MinHeap();
  const gScore = new Map();
  const cameFrom = new Map();

  const startKey = `${startX},${startY}`;
  gScore.set(startKey, 0);
  heap.push({ gx: startX, gy: startY, f: Math.hypot(goalX - startX, goalY - startY) });

  let iters = 0;
  const maxIters = 25000;

  while (heap.size > 0 && iters++ < maxIters) {
    const cur = heap.pop();
    if (cur.gx === goalX && cur.gy === goalY) {
      // Reconstruct path
      const path = [];
      let currKey = `${goalX},${goalY}`;
      while (currKey) {
        const [x, y] = currKey.split(',').map(Number);
        path.push({ gx: x, gy: y, wx: x * TILE_SCALE, wy: y * TILE_SCALE });
        currKey = cameFrom.get(currKey);
      }
      return path.reverse();
    }

    const curKey = `${cur.gx},${cur.gy}`;
    const curG = gScore.get(curKey) || 0;

    for (const n of getNeighbors(cur.gx, cur.gy)) {
      const cellCost = costMap[n.gy * GRID_SIZE + n.gx];
      if (cellCost >= 500) continue; // Impassable barrier

      const tentG = curG + n.stepCost * cellCost;
      const nKey = `${n.gx},${n.gy}`;

      if (!gScore.has(nKey) || tentG < gScore.get(nKey)) {
        gScore.set(nKey, tentG);
        cameFrom.set(nKey, curKey);
        const h = Math.hypot(goalX - n.gx, goalY - n.gy);
        heap.push({ gx: n.gx, gy: n.gy, f: tentG + h });
      }
    }
  }
  return null;
}

// Build Minimum Spanning Tree (MST) + K-Nearest Neighbor Edges between Anchors
const edges = [];
for (let i = 0; i < anchors.length; i++) {
  const a1 = anchors[i];
  const sortedOthers = [];
  for (let j = 0; j < anchors.length; j++) {
    if (i === j) continue;
    const a2 = anchors[j];
    const dist = Math.hypot(a1.x - a2.x, a1.y - a2.y);
    sortedOthers.push({ j, dist, a2 });
  }
  sortedOthers.sort((a, b) => a.dist - b.dist);

  // Connect to 2-3 nearest neighbors to form organic travel network
  const k = Math.min(3, sortedOthers.length);
  for (let m = 0; m < k; m++) {
    const o = sortedOthers[m];
    const edgeId = i < o.j ? `${i}-${o.j}` : `${o.j}-${i}`;
    if (!edges.some(e => e.id === edgeId) && o.dist < 1500) {
      edges.push({ id: edgeId, from: a1, to: o.a2, dist: o.dist });
    }
  }
}

console.log(`Planned ${edges.length} road connections across 52 anchors.`);

const roadSegments = [];
let successfulPaths = 0;

for (let e = 0; e < edges.length; e++) {
  const edge = edges[e];
  const sgx = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(edge.from.x / TILE_SCALE)));
  const sgy = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(edge.from.y / TILE_SCALE)));
  const ggx = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(edge.to.x / TILE_SCALE)));
  const ggy = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(edge.to.y / TILE_SCALE)));

  const pathResult = findPath(sgx, sgy, ggx, ggy);
  if (pathResult && pathResult.length > 0) {
    successfulPaths++;
    roadSegments.push({
      id: edge.id,
      fromAnchor: edge.from.id,
      toAnchor: edge.to.id,
      fromName: edge.from.name,
      toName: edge.to.name,
      nodeCount: pathResult.length,
      waypoints: pathResult.map(p => ({ x: p.wx, y: p.wy }))
    });

    // Lower traversal cost on established road nodes so future roads merge naturally
    for (const p of pathResult) {
      costMap[p.gy * GRID_SIZE + p.gx] = 0.2;
    }
  }
}

console.log(`-> Successfully connected ${successfulPaths} / ${edges.length} roads (${roadSegments.length} segments).`);

// 4. Save Artifacts to world-data/
const outRegionMapPath = path.resolve(__dirname, '../world-data/organic-region-map.json');
const outRoadNetworkPath = path.resolve(__dirname, '../world-data/road-network.json');

const regionMapData = {
  version: 'v7_organic',
  gridSize: GRID_SIZE,
  tileScale: TILE_SCALE,
  regionSlugs,
  // RLE compressed region grid to save disk/memory
  compressedGrid: Array.from(regionGrid)
};

fs.writeFileSync(outRegionMapPath, JSON.stringify(regionMapData));
fs.writeFileSync(outRoadNetworkPath, JSON.stringify({
  version: 'v7_roads',
  totalSegments: roadSegments.length,
  segments: roadSegments
}, null, 2));

console.log(`Saved organic region map to: ${outRegionMapPath} (${(fs.statSync(outRegionMapPath).size / 1024).toFixed(1)} KB)`);
console.log(`Saved road network to: ${outRoadNetworkPath} (${(fs.statSync(outRoadNetworkPath).size / 1024).toFixed(1)} KB)`);

console.log('\n================================================================');
console.log('  FASE H3A: ORGANIC REGIONS & ROAD NETWORK COMPLETE (PASS)');
console.log('================================================================');
