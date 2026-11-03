/**
 * JIANGHU BOT & IMMORTAL-X — TRAVEL GRAPH & DIJKSTRA ENGINE (utils/travelGraph.js)
 * V21 F4: Algoritma jalur terpendek Dijkstra untuk sistem perjalanan antar-simpul pemukiman
 */

const { distancesLi, LI_PER_HOUR } = require('../config/travelDistances');

class TravelGraph {
  constructor(adjList) {
    this.adj = adjList || {};
    this.cache = new Map();
  }

  /**
   * Menemukan jalur terpendek antara dua simpul menggunakan Dijkstra
   */
  shortestPath(start, dest) {
    if (!start || !dest) return { path: [], totalLi: Infinity };
    if (start === dest) return { path: [start], totalLi: 0 };

    const key = `${start}->${dest}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const dist = {};
    const prev = {};
    const q = new Set();

    // Kumpulkan semua simpul yang ada di graf
    for (const node of Object.keys(this.adj)) {
      q.add(node);
      dist[node] = Infinity;
      const neighbors = this.adj[node] || {};
      for (const neighbor of Object.keys(neighbors)) {
        q.add(neighbor);
        if (dist[neighbor] === undefined) dist[neighbor] = Infinity;
      }
    }

    if (!q.has(start) || !q.has(dest)) {
      return { path: [], totalLi: Infinity };
    }

    dist[start] = 0;

    while (q.size > 0) {
      let u = null;
      for (const node of q) {
        if (u === null || dist[node] < dist[u]) {
          u = node;
        }
      }

      if (u === null || dist[u] === Infinity) break;
      if (u === dest) break;

      q.delete(u);

      const neighbors = this.adj[u] || {};
      for (const [v, d] of Object.entries(neighbors)) {
        if (!q.has(v)) continue;
        const alt = dist[u] + Number(d);
        if (alt < dist[v]) {
          dist[v] = alt;
          prev[v] = u;
        }
      }
    }

    if (dist[dest] === Infinity) {
      const unreachable = { path: [], totalLi: Infinity };
      this.cache.set(key, unreachable);
      return unreachable;
    }

    const path = [];
    let curr = dest;
    while (curr) {
      path.unshift(curr);
      curr = prev[curr];
    }

    const result = {
      path: path[0] === start ? path : [],
      totalLi: dist[dest]
    };
    this.cache.set(key, result);
    return result;
  }

  /**
   * Menghitung estimasi durasi perjalanan dalam milidetik (ms)
   * Base: 100 li per jam
   */
  travelDurationMs(totalLi, speed) {
    if (totalLi <= 0 || !isFinite(totalLi)) return 0;
    const baseSpeed = Number(speed) > 0 ? Number(speed) : (LI_PER_HOUR || 100);
    const hours = totalLi / baseSpeed;
    return Math.round(hours * 3600 * 1000);
  }
}

const defaultTravelGraph = new TravelGraph(distancesLi);

module.exports = {
  TravelGraph,
  defaultTravelGraph,
  travelGraph: defaultTravelGraph
};
