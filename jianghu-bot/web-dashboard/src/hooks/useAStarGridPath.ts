/**
 * useAStarGridPath.ts
 * Algoritma A* Pathfinding Berkinerja Tinggi untuk Peta Kisi Xianxia
 * Menghitung rute terpendek menghindari tebing batu terjal (solid obstacles)
 * Menghasilkan jalur navigasi bercahaya ala The Tale of Immortal (Gambar 3)
 */

export interface Point {
  x: number;
  y: number;
}

export interface PathNode {
  x: number;
  y: number;
  g: number; // Jarak tempuh dari awal
  h: number; // Heuristik ke tujuan
  f: number; // Total cost g + h
  parent: PathNode | null;
}

export interface PathfindingResult {
  path: Point[];
  totalSteps: number;
  estimatedStamina: number;
  reachable: boolean;
}

// Heuristik Chebyshev / Diagonal distance (pergerakan 8 arah pada grid)
function heuristic(x1: number, y1: number, x2: number, y2: number): number {
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);
  return Math.max(dx, dy);
}

export function findAStarPath(
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  solidTilesSet: Set<string>, // Set koordinat "x,y" yang solid/tidak dapat ditembus
  maxDistance: number = 80
): PathfindingResult {
  // Jika tujuan sama dengan posisi saat ini
  if (startX === targetX && startY === targetY) {
    return { path: [{ x: startX, y: startY }], totalSteps: 0, estimatedStamina: 0, reachable: true };
  }

  // Jika tujuan adalah tile solid yang tidak bisa diinjak
  if (solidTilesSet.has(`${targetX},${targetY}`)) {
    return { path: [], totalSteps: 0, estimatedStamina: 0, reachable: false };
  }

  const openList: PathNode[] = [];
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    x: startX,
    y: startY,
    g: 0,
    h: heuristic(startX, startY, targetX, targetY),
    f: heuristic(startX, startY, targetX, targetY),
    parent: null
  };

  openList.push(startNode);

  // Arah pergerakan: 8 arah (orthogonal + diagonal)
  const directions = [
    { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
    { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: 1, dy: -1 }, { dx: -1, dy: -1 }
  ];

  let iterations = 0;
  const MAX_ITERATIONS = 3000;

  while (openList.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;

    // Ambil node dengan nilai f terendah
    let lowestIdx = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[lowestIdx].f) {
        lowestIdx = i;
      }
    }

    const current = openList.splice(lowestIdx, 1)[0];
    const currentKey = `${current.x},${current.y}`;
    closedSet.add(currentKey);

    // Sampai di tujuan
    if (current.x === targetX && current.y === targetY) {
      const path: Point[] = [];
      let curr: PathNode | null = current;
      while (curr) {
        path.unshift({ x: curr.x, y: curr.y });
        curr = curr.parent;
      }
      return {
        path,
        totalSteps: path.length - 1,
        estimatedStamina: (path.length - 1) * 2, // estimasi rata-rata 2 stamina per langkah
        reachable: true
      };
    }

    // Jika jarak terlalu jauh melampaui batas pencarian
    if (current.g > maxDistance) continue;

    // Evaluasi tetangga
    for (const dir of directions) {
      const neighborX = current.x + dir.dx;
      const neighborY = current.y + dir.dy;
      const neighborKey = `${neighborX},${neighborY}`;

      if (closedSet.has(neighborKey)) continue;

      // Cek apakah rintangan solid
      if (solidTilesSet.has(neighborKey)) continue;

      const stepCost = dir.dx !== 0 && dir.dy !== 0 ? 1.414 : 1.0;
      const tentativeG = current.g + stepCost;

      const existing = openList.find(n => n.x === neighborX && n.y === neighborY);

      if (!existing) {
        const h = heuristic(neighborX, neighborY, targetX, targetY);
        openList.push({
          x: neighborX,
          y: neighborY,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current
        });
      } else if (tentativeG < existing.g) {
        existing.g = tentativeG;
        existing.f = tentativeG + existing.h;
        existing.parent = current;
      }
    }
  }

  // Jika tidak menemukan rute langsung, return rute parsial terdekat
  return { path: [], totalSteps: 0, estimatedStamina: 0, reachable: false };
}
