import { describe, it, expect } from 'vitest';
import { toAnchorPath, buildJourney, positionAt } from '../../../utils/npcJourney';

describe('V30 NPC Journey Math (npcJourney.js)', () => {
  const dummyAnchorMap = {
    desa_a: { id: 'desa_a', name: 'Desa A', x: 100, y: 100 },
    desa_b: { id: 'desa_b', name: 'Desa B', x: 200, y: 100 },
    desa_c: { id: 'desa_c', name: 'Desa C', x: 200, y: 200 },
    desa_far: { id: 'desa_far', name: 'Desa Jauh', x: 2000, y: 2000 }
  };

  it('1. toAnchorPath: returns null if empty path or unreachable', () => {
    expect(toAnchorPath(null)).toBeNull();
    expect(toAnchorPath({ path: [], totalLi: Infinity })).toBeNull();
    expect(toAnchorPath({ path: ['desa_a'] })).toEqual(['desa_a']);
  });

  it('2. toAnchorPath: adapts raw shortestPath result array or object', () => {
    const raw1 = { path: ['desa_a', 'desa_b'], totalLi: 20 };
    expect(toAnchorPath(raw1)).toEqual(['desa_a', 'desa_b']);
    const raw2 = ['desa_a', 'desa_b'];
    expect(toAnchorPath(raw2)).toEqual(['desa_a', 'desa_b']);
  });

  it('3. buildJourney: returns null if path has less than 2 anchors', () => {
    const res = buildJourney({
      pathAnchors: ['desa_a'],
      anchorMap: dummyAnchorMap,
      now: 1000000,
      tilesPerMinute: 10,
      purpose: 'berkelana'
    });
    expect(res).toBeNull();
  });

  it('4. buildJourney: returns null if totalTiles exceeds maxTiles (900)', () => {
    const res = buildJourney({
      pathAnchors: ['desa_a', 'desa_far'],
      anchorMap: dummyAnchorMap,
      now: 1000000,
      tilesPerMinute: 10,
      purpose: 'berkelana',
      maxTiles: 900
    });
    expect(res).toBeNull();
  });

  it('5. buildJourney: calculates ETA according to travelSpeed (tilesPerMinute)', () => {
    // Distance from desa_a (100,100) to desa_b (200,100): Chebyshev = max(|200-100|, |100-100|) = 100 tiles.
    // tilesPerMinute = 10 -> 100 / 10 = 10 minutes = 600,000 ms.
    const now = 1000000;
    const res = buildJourney({
      pathAnchors: ['desa_a', 'desa_b'],
      anchorMap: dummyAnchorMap,
      now,
      tilesPerMinute: 10,
      purpose: 'berdagang'
    });
    expect(res).not.toBeNull();
    expect(res.totalTiles).toBe(100);
    expect(res.startedAt).toBe(now);
    expect(res.etaAt).toBe(now + 600000);
    expect(res.legs).toHaveLength(1);
    expect(res.legs[0]).toEqual({ ax: 100, ay: 100, bx: 200, by: 100, len: 100 });
  });

  it('6. positionAt: at t = 0 matches origin anchor', () => {
    const now = 1000000;
    const journey = buildJourney({
      pathAnchors: ['desa_a', 'desa_b'],
      anchorMap: dummyAnchorMap,
      now,
      tilesPerMinute: 10,
      purpose: 'berdagang'
    });
    const pos = positionAt(journey, now);
    expect(pos).toEqual({ x: 100, y: 100, arrived: false });
  });

  it('7. positionAt: at t = 1 matches destination anchor and arrived is true', () => {
    const now = 1000000;
    const journey = buildJourney({
      pathAnchors: ['desa_a', 'desa_b'],
      anchorMap: dummyAnchorMap,
      now,
      tilesPerMinute: 10,
      purpose: 'berdagang'
    });
    const pos = positionAt(journey, journey.etaAt);
    expect(pos).toEqual({ x: 200, y: 100, arrived: true });
    // Past ETA should also stay at destination and arrived: true
    const pastPos = positionAt(journey, journey.etaAt + 50000);
    expect(pastPos).toEqual({ x: 200, y: 100, arrived: true });
  });

  it('8. positionAt: midpoint of a single leg', () => {
    const now = 1000000;
    const journey = buildJourney({
      pathAnchors: ['desa_a', 'desa_b'],
      anchorMap: dummyAnchorMap,
      now,
      tilesPerMinute: 10,
      purpose: 'berdagang'
    });
    // Midpoint: now + 300,000 ms
    const pos = positionAt(journey, now + 300000);
    expect(pos).toEqual({ x: 150, y: 100, arrived: false });
  });

  it('9. positionAt: handles multiple legs accurately', () => {
    // Leg 1: desa_a (100,100) -> desa_b (200,100), len = 100
    // Leg 2: desa_b (200,100) -> desa_c (200,200), len = 100
    // Total len = 200. At 10 tiles/min, total time = 20 min = 1,200,000 ms.
    const now = 1000000;
    const journey = buildJourney({
      pathAnchors: ['desa_a', 'desa_b', 'desa_c'],
      anchorMap: dummyAnchorMap,
      now,
      tilesPerMinute: 10,
      purpose: 'berkelana'
    });
    expect(journey.totalTiles).toBe(200);
    expect(journey.legs).toHaveLength(2);

    // At 75% journey (15 minutes = 900,000 ms):
    // Should be at halfway point of leg 2: x = 200, y = 150
    const pos = positionAt(journey, now + 900000);
    expect(pos).toEqual({ x: 200, y: 150, arrived: false });
  });

  it('10. positionAt: coordinates are always integers (Math.round)', () => {
    const now = 1000000;
    const journey = buildJourney({
      pathAnchors: ['desa_a', 'desa_b'],
      anchorMap: dummyAnchorMap,
      now,
      tilesPerMinute: 10,
      purpose: 'berdagang'
    });
    // Non-trivial fraction of time
    const pos = positionAt(journey, now + 123456);
    expect(Number.isInteger(pos.x)).toBe(true);
    expect(Number.isInteger(pos.y)).toBe(true);
  });
});
