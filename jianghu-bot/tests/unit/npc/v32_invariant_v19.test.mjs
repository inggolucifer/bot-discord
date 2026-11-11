import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const snapshot = require('../../../world-data/npc-ecosystem-snapshot-v27.json');
const anchors = require('../../../world-data/anchors.json');
const { checkInvariants } = require('../../../scripts/v28/lib/invariants');
const { buildJourney } = require('../../../utils/npcJourney');
const { defaultRouteFn } = require('../../../utils/npcRoute');

const sampleNpc = snapshot.npcs[0];
const now = 1000000;

function makeNpcWithJourney(journey) {
  return {
    ...sampleNpc,
    schedule: {
      ...sampleNpc.schedule,
      activityState: 'traveling',
      targetDestination: journey
    }
  };
}

describe('Invariant V19: Journey Leg Continuity & Pass-Only Barrier Crossing (V32 F4)', () => {
  it('MERAH pada journey dengan legs yang terputus (tidak kontinu)', () => {
    const brokenJourney = {
      type: 'journey',
      purpose: 'berkelana',
      fromId: 'a',
      toId: 'b',
      pathAnchors: ['a', 'b'],
      startedAt: now,
      etaAt: now + 600000,
      totalTiles: 200,
      legs: [
        { ax: 2000, ay: 2500, bx: 2100, by: 2500, len: 100 },
        { ax: 2150, ay: 2550, bx: 2250, by: 2550, len: 100 }
      ]
    };

    const res = checkInvariants({ npcs: [makeNpcWithJourney(brokenJourney)], anchors });
    const v19 = res.violations.filter((v) => v.code === 'V19');
    expect(v19.length).toBeGreaterThan(0);
  });

  it('MERAH pada journey yang menyilang azure_wall atau eastern_sea_coast tanpa lewat celah', () => {
    const illegalWallJourney = {
      type: 'journey',
      purpose: 'berkelana',
      fromId: 'utara',
      toId: 'selatan',
      pathAnchors: ['utara', 'selatan'],
      startedAt: now,
      etaAt: now + 4200000,
      totalTiles: 700,
      legs: [{ ax: 2400, ay: 3000, bx: 2400, by: 3700, len: 700 }]
    };

    const resWall = checkInvariants({ npcs: [makeNpcWithJourney(illegalWallJourney)], anchors });
    expect(resWall.violations.some((v) => v.code === 'V19')).toBe(true);

    const illegalSeaJourney = {
      type: 'journey',
      purpose: 'berkelana',
      fromId: 'dermaga_donghai',
      toId: 'pulau_penyu_raksasa',
      pathAnchors: ['dermaga_donghai', 'pulau_penyu_raksasa'],
      startedAt: now,
      etaAt: now + 3000000,
      totalTiles: 430,
      legs: [{ ax: 3920, ay: 2700, bx: 4350, by: 2750, len: 430 }]
    };

    const resSea = checkInvariants({ npcs: [makeNpcWithJourney(illegalSeaJourney)], anchors });
    expect(resSea.violations.some((v) => v.code === 'V19')).toBe(true);
  });

  it('HIJAU pada journey ber-routeFn yang melewati celah resmi azure_wall', () => {
    const customAnchors = {
      utara: { id: 'utara', x: 2500, y: 3000 },
      selatan: { id: 'selatan', x: 2500, y: 3700 }
    };
    const validJourney = buildJourney({
      pathAnchors: ['utara', 'selatan'],
      anchorMap: customAnchors,
      now,
      tilesPerMinute: 10,
      routeFn: defaultRouteFn
    });
    expect(validJourney).not.toBeNull();

    const res = checkInvariants({ npcs: [makeNpcWithJourney(validJourney)], anchors });
    const v19 = res.violations.filter((v) => v.code === 'V19');
    expect(v19).toEqual([]);
  });

  it('HIJAU pada journey multi-barrier ber-routeFn (great_rift + azure_wall)', () => {
    const multiAnchors = {
      utara_rift: { id: 'utara_rift', x: 2200, y: 1700 },
      selatan_wall: { id: 'selatan_wall', x: 2200, y: 3700 }
    };
    const validMulti = buildJourney({
      pathAnchors: ['utara_rift', 'selatan_wall'],
      anchorMap: multiAnchors,
      now,
      tilesPerMinute: 10,
      maxTiles: 3000,
      routeFn: defaultRouteFn
    });
    expect(validMulti).not.toBeNull();
    expect(validMulti.legs.length).toBeGreaterThanOrEqual(7);

    const res = checkInvariants({ npcs: [makeNpcWithJourney(validMulti)], anchors });
    expect(res.violations.filter((v) => v.code === 'V19')).toEqual([]);
  });
});
