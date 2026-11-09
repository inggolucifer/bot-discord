import { describe, it, expect } from 'vitest';
import { chooseDestination, planReturnHome } from '../../../services/npcWanderPlanner';

describe('V30 NPC Wander Planner (npcWanderPlanner.js)', () => {
  const dummyAnchors = [
    { id: 'desa_a', name: 'Desa A', regionSlug: 'region_1', type: 'village', x: 100, y: 100 },
    { id: 'desa_b', name: 'Desa B', regionSlug: 'region_1', type: 'town', x: 200, y: 100 },
    { id: 'kota_c', name: 'Kota C', regionSlug: 'region_2', type: 'city', x: 300, y: 100 },
    { id: 'danger_1', name: 'Gua Bahaya', regionSlug: 'region_1', type: 'danger_zone', x: 150, y: 150 },
    { id: 'secret_1', name: 'Alam Rahasia', regionSlug: 'region_2', type: 'secret_realm', x: 250, y: 250 },
    { id: 'isolated', name: 'Pulau Terpencil', regionSlug: 'region_3', type: 'island', x: 9999, y: 9999 }
  ];

  const dummyAnchorMap = {};
  dummyAnchors.forEach(a => { dummyAnchorMap[a.id] = a; });

  const dummyGraph = {
    shortestPath(fromId, toId) {
      if (fromId === 'isolated' || toId === 'isolated') {
        return { path: [], totalLi: Infinity };
      }
      return { path: [fromId, toId], totalLi: 20 };
    }
  };

  const baseNpc = {
    _id: '507f1f77bcf86cd799439011',
    vitalStatus: { isAlive: true, isEssential: false, isInjured: false, downedUntil: null },
    cultivation: { realmIndex: 0 },
    schedule: {
      currentAnchorId: 'desa_a',
      homeAnchorId: 'desa_a',
      wanderLevel: 2,
      lastJourneyDay: -1,
      activityState: 'idle'
    },
    social: { sectId: null },
    attributes: { travelSpeed: 10 }
  };

  it('1. Returns null if NPC is essential', () => {
    const npc = { ...baseNpc, vitalStatus: { ...baseNpc.vitalStatus, isEssential: true } };
    const res = chooseDestination(npc, {
      anchors: dummyAnchors,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      gameDay: 1,
      now: 1000000
    });
    expect(res).toBeNull();
  });

  it('2. Returns null if wanderLevel is 0', () => {
    const npc = { ...baseNpc, schedule: { ...baseNpc.schedule, wanderLevel: 0 } };
    const res = chooseDestination(npc, {
      anchors: dummyAnchors,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      gameDay: 1,
      now: 1000000
    });
    expect(res).toBeNull();
  });

  it('3. Returns null if already journeyed today (lastJourneyDay === gameDay)', () => {
    const npc = { ...baseNpc, schedule: { ...baseNpc.schedule, lastJourneyDay: 5 } };
    const res = chooseDestination(npc, {
      anchors: dummyAnchors,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      gameDay: 5,
      now: 1000000
    });
    expect(res).toBeNull();
  });

  it('4. Deterministic: calling twice with identical state and gameDay yields identical result', () => {
    const res1 = chooseDestination(baseNpc, {
      anchors: dummyAnchors,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      gameDay: 10,
      now: 1000000
    });
    const res2 = chooseDestination(baseNpc, {
      anchors: dummyAnchors,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      gameDay: 10,
      now: 1000000
    });
    expect(res1).toEqual(res2);
  });

  it('5. Does not choose danger_zone, secret_realm, or island for NPC with realmIndex === 0', () => {
    for (let day = 1; day <= 50; day++) {
      const res = chooseDestination(baseNpc, {
        anchors: dummyAnchors,
        anchorMap: dummyAnchorMap,
        graph: dummyGraph,
        gameDay: day,
        now: 1000000
      });
      if (res) {
        expect(['danger_1', 'secret_1', 'isolated']).not.toContain(res.toAnchorId);
      }
    }
  });

  it('6. Skips candidate when no route exists (shortestPath returns null / empty)', () => {
    const isolatedNpc = {
      ...baseNpc,
      schedule: { ...baseNpc.schedule, currentAnchorId: 'isolated' }
    };
    const res = chooseDestination(isolatedNpc, {
      anchors: dummyAnchors,
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      gameDay: 1,
      now: 1000000
    });
    expect(res).toBeNull();
  });

  it('7. Wander level 2 selects significantly more often than level 1 across 200 seeds', () => {
    let countLvl1 = 0;
    let countLvl2 = 0;

    for (let i = 0; i < 200; i++) {
      const npcLvl1 = { ...baseNpc, schedule: { ...baseNpc.schedule, wanderLevel: 1 } };
      const npcLvl2 = { ...baseNpc, schedule: { ...baseNpc.schedule, wanderLevel: 2 } };

      const res1 = chooseDestination(npcLvl1, {
        anchors: dummyAnchors,
        anchorMap: dummyAnchorMap,
        graph: dummyGraph,
        gameDay: i + 1,
        now: 1000000
      });
      const res2 = chooseDestination(npcLvl2, {
        anchors: dummyAnchors,
        anchorMap: dummyAnchorMap,
        graph: dummyGraph,
        gameDay: i + 1,
        now: 1000000
      });

      if (res1) countLvl1++;
      if (res2) countLvl2++;
    }

    expect(countLvl2).toBeGreaterThan(countLvl1);
    expect(countLvl1).toBeGreaterThan(30); // ~35% of 200 = 70
    expect(countLvl2).toBeGreaterThan(100); // ~75% of 200 = 150
  });

  it('8. planReturnHome creates a return path toward homeAnchorId with purpose pulang', () => {
    const visitingNpc = {
      ...baseNpc,
      schedule: {
        ...baseNpc.schedule,
        currentAnchorId: 'kota_c',
        homeAnchorId: 'desa_a',
        activityState: 'visiting'
      }
    };
    const res = planReturnHome(visitingNpc, {
      anchorMap: dummyAnchorMap,
      graph: dummyGraph,
      now: 2000000
    });
    expect(res).not.toBeNull();
    expect(res.toAnchorId).toBe('desa_a');
    expect(res.purpose).toBe('pulang');
    expect(res.pathAnchors).toEqual(['kota_c', 'desa_a']);
  });
});
