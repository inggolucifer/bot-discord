import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const barriers = require('../../../world-data/barriers.json');
const passes = require('../../../world-data/passes.json');
const {
  loadRouteData,
  segmentCrossesBarrier,
  routeLeg,
  defaultRouteFn
} = require('../../../utils/npcRoute');
const { buildJourney, positionAt } = require('../../../utils/npcJourney');

function cheb(ax, ay, bx, by) {
  return Math.max(Math.abs(bx - ax), Math.abs(by - ay));
}

function bestPassFor(ax, ay, bx, by, barrierId) {
  const candidates = passes.filter((p) => p.barrierId === barrierId);
  let best = null;
  let bestDist = Infinity;
  for (const p of candidates) {
    const d = cheb(ax, ay, p.x, p.y) + cheb(p.x, p.y, bx, by);
    if (d < bestDist || (d === bestDist && p.id < best.id)) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

describe('NPC Pure Routing Module (V32 F1)', () => {
  it('(a) segmen yang tidak menyilang barrier mengembalikan [A, B]', () => {
    const res = defaultRouteFn(2000, 2500, 2100, 2600);
    expect(res).toEqual([
      { x: 2000, y: 2500 },
      { x: 2100, y: 2600 }
    ]);
  });

  it('(b) menyilang azure_wall (2400,3000) -> (2400,3700) memilih pass detour terkecil dengan y=3098 dan y=3602', () => {
    const expectedPass = bestPassFor(2400, 3000, 2400, 3700, 'azure_wall');
    const res = defaultRouteFn(2400, 3000, 2400, 3700);
    expect(Array.isArray(res)).toBe(true);
    expect(res[0]).toEqual({ x: 2400, y: 3000 });
    expect(res[res.length - 1]).toEqual({ x: 2400, y: 3700 });
    expect(res).toContainEqual({ x: expectedPass.x, y: 3098 });
    expect(res).toContainEqual({ x: expectedPass.x, y: expectedPass.y });
    expect(res).toContainEqual({ x: expectedPass.x, y: 3602 });
  });

  it('(c) tidak ada sub-segmen hasil yang menyilang barrier kecuali di koridor celah', () => {
    const pairs = [
      [2400, 3000, 2400, 3700, 'azure_wall'],
      [1300, 2250, 1800, 2250, 'west_cliff'],
      [2200, 1700, 2200, 2200, 'great_rift']
    ];
    for (const [ax, ay, bx, by, barrierId] of pairs) {
      const barrier = barriers.find((b) => b.id === barrierId);
      const pass = bestPassFor(ax, ay, bx, by, barrierId);
      const pts = defaultRouteFn(ax, ay, bx, by);
      expect(pts).not.toBeNull();
      const horizontal = (barrier.bounds.maxX - barrier.bounds.minX) >= (barrier.bounds.maxY - barrier.bounds.minY);

      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const steps = Math.max(1, Math.ceil(dist / 4));
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const x = p1.x + (p2.x - p1.x) * t;
          const y = p1.y + (p2.y - p1.y) * t;
          const inside =
            x > barrier.bounds.minX &&
            x < barrier.bounds.maxX &&
            y > barrier.bounds.minY &&
            y < barrier.bounds.maxY;
          if (inside) {
            if (horizontal) {
              expect(Math.abs(x - pass.x)).toBeLessThanOrEqual(Math.max(pass.width, 3));
            } else {
              expect(Math.abs(y - pass.y)).toBeLessThanOrEqual(Math.max(pass.width, 3));
            }
          }
        }
      }
    }
  });

  it('(d) arah sebaliknya (B ke A) menghasilkan celah yang sama', () => {
    const fwd = defaultRouteFn(2400, 3000, 2400, 3700);
    const rev = defaultRouteFn(2400, 3700, 2400, 3000);
    const expectedPass = bestPassFor(2400, 3000, 2400, 3700, 'azure_wall');
    expect(fwd).toContainEqual({ x: expectedPass.x, y: expectedPass.y });
    expect(rev).toContainEqual({ x: expectedPass.x, y: expectedPass.y });
    expect(rev).toEqual([...fwd].reverse());
  });

  it('(e) west_cliff dilintasi lewat merchant_pass pada sumbu X (x=1448, x=1602, y=2250)', () => {
    const res = defaultRouteFn(1300, 2250, 1800, 2250);
    expect(res).toEqual([
      { x: 1300, y: 2250 },
      { x: 1448, y: 2250 },
      { x: 1500, y: 2250 },
      { x: 1602, y: 2250 },
      { x: 1800, y: 2250 }
    ]);
  });

  it('(f) great_rift dilintasi lewat chain_bridge pada sumbu Y', () => {
    const res = defaultRouteFn(2200, 1700, 2200, 2200);
    expect(res).toEqual([
      { x: 2200, y: 1700 },
      { x: 2300, y: 1798 },
      { x: 2300, y: 1950 },
      { x: 2300, y: 2052 },
      { x: 2200, y: 2200 }
    ]);
  });

  it('(g) menuju pulau_penyu_raksasa (4350,2750) dari (3920,2700) atau melintasi rintangan tanpa celah mengembalikan null', () => {
    expect(defaultRouteFn(3920, 2700, 4350, 2750)).toBeNull();
    // lava_lakes: minX 700, maxX 1500, minY 300, maxY 1100
    expect(defaultRouteFn(600, 700, 1600, 700)).toBeNull();
    // mirror_lake_water: minX 3100, maxX 3700, minY 3600, maxY 4100
    expect(defaultRouteFn(3400, 3599, 3400, 4101)).toBeNull();
    // forbidden_peaks: minX 3300, maxX 3950, minY 4100, maxY 4900
    expect(defaultRouteFn(3200, 4500, 4000, 4500)).toBeNull();
  });

  it('(h) endpoint di dalam bounds barrier membuat barrier itu diabaikan (segmentCrossesBarrier = false)', () => {
    const azureWall = barriers.find((b) => b.id === 'azure_wall');
    expect(segmentCrossesBarrier(2200, 3350, 2400, 3700, azureWall)).toBe(false);
    expect(segmentCrossesBarrier(2400, 3000, 2200, 3350, azureWall)).toBe(false);
    const res = defaultRouteFn(2200, 3350, 2400, 3700);
    expect(res).toEqual([
      { x: 2200, y: 3350 },
      { x: 2400, y: 3700 }
    ]);
  });

  it('(i) deterministik (2x panggil identik), semua koordinat integer, dan tanpa titik duplikat berurutan', () => {
    const route1 = defaultRouteFn(2100.4, 3098, 2600.2, 3602);
    const route2 = defaultRouteFn(2100.4, 3098, 2600.2, 3602);
    expect(route1).toEqual(route2);
    expect(route1.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < route1.length; i++) {
      expect(Number.isInteger(route1[i].x)).toBe(true);
      expect(Number.isInteger(route1[i].y)).toBe(true);
      if (i > 0) {
        const same = route1[i].x === route1[i - 1].x && route1[i].y === route1[i - 1].y;
        expect(same).toBe(false);
      }
    }
    // Check loadRouteData returns cached data with 7 barriers and 6 passes
    const dataA = loadRouteData();
    const dataB = loadRouteData();
    expect(dataA).toBe(dataB);
    expect(dataA.barriers.length).toBe(7);
    expect(dataA.passes.length).toBe(6);
  });

  it('(j) celah pilihan benar-benar memiliki detour chebyshev(A, pass) + chebyshev(pass, B) terkecil', () => {
    const testCases = [
      [800, 3000, 800, 3700, 'azure_wall'],    // caravan_gap (750)
      [2150, 3000, 2150, 3700, 'azure_wall'],  // north_pass (2200)
      [2650, 3000, 2650, 3700, 'azure_wall'],  // mist_pass (2600)
      [3150, 3000, 3150, 3700, 'azure_wall']   // sword_gorge (3100)
    ];
    for (const [ax, ay, bx, by, barrierId] of testCases) {
      const expectedPass = bestPassFor(ax, ay, bx, by, barrierId);
      const pts = routeLeg(ax, ay, bx, by, { barriers, passes });
      expect(pts).not.toBeNull();
      expect(pts).toContainEqual({ x: expectedPass.x, y: expectedPass.y });
    }
  });
});

describe('buildJourney routeFn Integration (V32 F2)', () => {
  const anchorMap = {
    utara: { id: 'utara', x: 2500, y: 3000 },
    selatan: { id: 'selatan', x: 2500, y: 3700 },
    utara_jauh: { id: 'utara_jauh', x: 2400, y: 3000 },
    selatan_jauh: { id: 'selatan_jauh', x: 2100, y: 3850 },
    donghai: { id: 'donghai', x: 3920, y: 2700 },
    pulau: { id: 'pulau', x: 4350, y: 2750 }
  };

  it('(1) tanpa routeFn hasil identik dengan perilaku garis lurus sebelumnya', () => {
    const jDefault = buildJourney({
      pathAnchors: ['utara', 'selatan'],
      anchorMap,
      now: 1000,
      tilesPerMinute: 10
    });
    const jNullFn = buildJourney({
      pathAnchors: ['utara', 'selatan'],
      anchorMap,
      now: 1000,
      tilesPerMinute: 10,
      routeFn: null
    });
    expect(jDefault).not.toBeNull();
    expect(jDefault.legs).toEqual([{ ax: 2500, ay: 3000, bx: 2500, by: 3700, len: 700 }]);
    expect(jDefault.totalTiles).toBe(700);
    expect(jNullFn).toEqual(jDefault);
  });

  it('(2) dengan routeFn menyilang, legs.length > jumlah anchor - 1, sum(len) === totalTiles, dan null jika diblokir', () => {
    const jRouted = buildJourney({
      pathAnchors: ['utara', 'selatan'],
      anchorMap,
      now: 1000,
      tilesPerMinute: 10,
      routeFn: defaultRouteFn
    });
    expect(jRouted).not.toBeNull();
    expect(jRouted.legs.length).toBeGreaterThan(1);
    const sumLen = jRouted.legs.reduce((s, l) => s + l.len, 0);
    expect(sumLen).toBe(jRouted.totalTiles);

    const jBlocked = buildJourney({
      pathAnchors: ['donghai', 'pulau'],
      anchorMap,
      now: 1000,
      tilesPerMinute: 10,
      routeFn: defaultRouteFn
    });
    expect(jBlocked).toBeNull();
  });

  it('(3) detour yang membuat totalTiles > maxTiles (900) mengembalikan null meski garis lurus <= 900', () => {
    // Straight distance (2400,3000) -> (2100,3850) = 850 <= 900
    const straight = buildJourney({
      pathAnchors: ['utara_jauh', 'selatan_jauh'],
      anchorMap,
      now: 1000,
      tilesPerMinute: 10
    });
    expect(straight).not.toBeNull();
    expect(straight.totalTiles).toBe(850);

    // Detour through north_pass raises totalTiles above 900 -> null
    const routedDefaultCap = buildJourney({
      pathAnchors: ['utara_jauh', 'selatan_jauh'],
      anchorMap,
      now: 1000,
      tilesPerMinute: 10,
      routeFn: defaultRouteFn
    });
    expect(routedDefaultCap).toBeNull();
  });

  it('(4) positionAt pada t=0, t=1, dan titik tengah leg ber-waypoint terinterpolasi akurat', () => {
    const journey = buildJourney({
      pathAnchors: ['utara', 'selatan'],
      anchorMap,
      now: 10000,
      tilesPerMinute: 10,
      routeFn: defaultRouteFn
    });
    expect(journey).not.toBeNull();

    const pStart = positionAt(journey, journey.startedAt);
    expect(pStart.x).toBe(2500);
    expect(pStart.y).toBe(3000);

    const pEnd = positionAt(journey, journey.etaAt);
    expect(pEnd.x).toBe(2500);
    expect(pEnd.y).toBe(3700);

    // Check midpoint of leg 1 (masuk -> tengah)
    const leg0 = journey.legs[0];
    const leg1 = journey.legs[1];
    const targetTiles = leg0.len + leg1.len * 0.5;
    const duration = journey.etaAt - journey.startedAt;
    const midTime = journey.startedAt + (targetTiles / journey.totalTiles) * duration;
    const pMid = positionAt(journey, midTime);
    expect(pMid.x).toBe(Math.round((leg1.ax + leg1.bx) / 2));
    expect(pMid.y).toBe(Math.round((leg1.ay + leg1.by) / 2));
  });
});
