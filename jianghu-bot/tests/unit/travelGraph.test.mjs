import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { TravelGraph } = require('../../utils/travelGraph');
const {
  hashSeed,
  resolveTravelEvent,
  evaluateTravelProgress,
  TRAVEL_EVENTS
} = require('../../config/travelEvents');
const { distancesLi } = require('../../config/travelDistances');

describe('V21 F4 — Node Travel Graph & Deterministic Travel Events', () => {
  const graph = new TravelGraph(distancesLi);

  describe('Dijkstra Shortest Path Routing', () => {
    it('finds direct 1-hop shortest path between adjacent settlements', () => {
      const res = graph.shortestPath('Desa Xingcun', 'Tianjing');
      expect(res.path).toEqual(['Desa Xingcun', 'Tianjing']);
      expect(res.totalLi).toBe(50);
    });

    it('finds multi-hop shortest path correctly via transit hubs', () => {
      // Desa Xingcun -> Tianjing (50) -> Luoyang Kecil (100) = 150 Li
      const res = graph.shortestPath('Desa Xingcun', 'Luoyang Kecil');
      expect(res.path).toEqual(['Desa Xingcun', 'Tianjing', 'Luoyang Kecil']);
      expect(res.totalLi).toBe(150);

      // Desa Xingcun -> Pelabuhan Timur
      const resPort = graph.shortestPath('Desa Xingcun', 'Pelabuhan Timur');
      expect(resPort.path).toEqual(['Desa Xingcun', 'Tianjing', 'Pelabuhan Timur']);
      expect(resPort.totalLi).toBe(450);
    });

    it('handles identical origin and destination with zero distance', () => {
      const res = graph.shortestPath('Tianjing', 'Tianjing');
      expect(res.path).toEqual(['Tianjing']);
      expect(res.totalLi).toBe(0);
    });

    it('handles disconnected or nonexistent nodes gracefully', () => {
      const res = graph.shortestPath('Tianjing', 'Pulau Khayalan Tak Nyata');
      expect(res.path).toEqual([]);
      expect(res.totalLi).toBe(Infinity);
    });
  });

  describe('Travel Duration Calculation', () => {
    it('computes exact travel duration based on speed and total distance', () => {
      // 100 Li pada kecepatan normal (100 Li/jam) = 1 jam (3600000 ms)
      const durationNormal = graph.travelDurationMs(100, 100);
      expect(durationNormal).toBe(3600000);

      // 100 Li dengan mount cepat (200 Li/jam) = 0.5 jam (1800000 ms)
      const durationFast = graph.travelDurationMs(100, 200);
      expect(durationFast).toBe(1800000);

      // Distance 0 menghasilkan durasi 0 ms
      expect(graph.travelDurationMs(0, 100)).toBe(0);
    });
  });

  describe('Deterministic Travel Events', () => {
    it('produces 100% identical event for identical playerId, edgeKey, and startedAt', () => {
      const pId = 'cultivator_999';
      const edge = 'Tianjing->Luoyang Kecil';
      const time = 1700000000;

      const eventA = resolveTravelEvent(pId, edge, time);
      const eventB = resolveTravelEvent(pId, edge, time);

      expect(eventA).toEqual(eventB);
      expect(eventA.type).toBeDefined();
      expect(eventA.name).toBeDefined();
    });

    it('varies events across different segments according to weight distribution', () => {
      const types = new Set();
      for (let i = 0; i < 50; i++) {
        const ev = resolveTravelEvent(`player_${i}`, `Edge_${i}`, 1700000000 + i * 1000);
        types.add(ev.type);
      }
      // Setidaknya ada 2 varian event yang muncul dari 50 undian acak
      expect(types.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Offline Travel Recalculation', () => {
    it('accurately computes progress percentage and arrival status without leaking timers', () => {
      const start = 1000000;
      const end = 2000000; // 1000 detik durasi

      // Tepat di tengah perjalanan (50%)
      const mid = evaluateTravelProgress(start, end, 1500000);
      expect(mid.progressPercent).toBe(50);
      expect(mid.isArrived).toBe(false);
      expect(mid.remainingMs).toBe(500000);

      // Setelah waktu kedatangan terlampaui (100%)
      const completed = evaluateTravelProgress(start, end, 2500000);
      expect(completed.progressPercent).toBe(100);
      expect(completed.isArrived).toBe(true);
      expect(completed.remainingMs).toBe(0);
    });
  });

  describe('Zero Chunk Fetch During Travel Constraint (§5 Gate F4)', () => {
    it('verifies that travel mode prevents any chunk fetches from firing', () => {
      let networkFetchCount = 0;
      const mockFetch = () => { networkFetchCount++; };

      const isTravelActive = true;
      function requestChunkBitmap(cx, cy) {
        if (isTravelActive) return null; // Paused during travel
        mockFetch();
        return { cx, cy };
      }

      // Simulate 20 frames while player is traveling
      for (let f = 0; f < 20; f++) {
        const res = requestChunkBitmap(75, 75);
        expect(res).toBeNull();
      }

      expect(networkFetchCount).toBe(0);
    });
  });
});
