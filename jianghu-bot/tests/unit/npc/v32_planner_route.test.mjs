import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const anchors = require('../../../world-data/anchors.json');
const passes = require('../../../world-data/passes.json');
const { travelGraph } = require('../../../utils/travelGraph');
const { buildJourney } = require('../../../utils/npcJourney');
const { defaultRouteFn } = require('../../../utils/npcRoute');
const { chooseDestination, planReturnHome } = require('../../../services/npcWanderPlanner');

const anchorMap = Object.fromEntries(anchors.map((a) => [a.id, a]));
const azurePasses = passes.filter((p) => p.barrierId === 'azure_wall');

describe('NPC Wander Planner Route & Island Ban (V32 F3)', () => {
  it('(a) 500 seed acak deterministik (termasuk realmIndex >= 3 di dermaga_donghai) tidak pernah memilih atau melintasi anchor bertipe island', () => {
    const pickedDestinations = [];
    for (let i = 0; i < 500; i++) {
      const npc = {
        _id: `npc_seed_${i}`,
        name: `Pengelana ${i}`,
        vitalStatus: { isAlive: true, isEssential: false, isInjured: false },
        cultivation: { realmIndex: 5 },
        attributes: { travelSpeed: 10 },
        schedule: {
          currentAnchorId: 'dermaga_donghai',
          homeAnchorId: 'dermaga_donghai',
          wanderLevel: 2,
          lastJourneyDay: -1,
          activityState: 'idle'
        }
      };
      const plan = chooseDestination(npc, {
        anchors,
        anchorMap,
        graph: travelGraph,
        gameDay: i + 1,
        now: 1000000
      });
      if (plan) {
        pickedDestinations.push(plan);
        expect(anchorMap[plan.toAnchorId]?.type).not.toBe('island');
        for (const aid of plan.pathAnchors || []) {
          expect(anchorMap[aid]?.type).not.toBe('island');
        }
      }
    }
    expect(pickedDestinations.length).toBeGreaterThan(50);
  });

  it('(b) dari 500 seed acak, tidak ada rencana yang buildJourney(..., routeFn) nya null dan semua membawa plan.journey valid', () => {
    const startAnchors = anchors.filter((a) => a.type !== 'island').slice(0, 10);
    let planCount = 0;
    for (let i = 0; i < 500; i++) {
      const start = startAnchors[i % startAnchors.length];
      const npc = {
        _id: `npc_valid_${i}`,
        name: `Kultivator ${i}`,
        vitalStatus: { isAlive: true, isEssential: false, isInjured: false },
        cultivation: { realmIndex: 4 },
        attributes: { travelSpeed: 12 },
        schedule: {
          currentAnchorId: start.id,
          homeAnchorId: start.id,
          wanderLevel: 2,
          lastJourneyDay: -1,
          activityState: 'idle'
        }
      };
      const now = 5000000 + i * 1000;
      const plan = chooseDestination(npc, {
        anchors,
        anchorMap,
        graph: travelGraph,
        gameDay: i + 10,
        now
      });
      if (plan) {
        planCount++;
        expect(plan.journey).toBeTruthy();
        expect(Array.isArray(plan.journey.legs)).toBe(true);
        expect(plan.journey.legs.length).toBeGreaterThan(0);

        const rebuilt = buildJourney({
          pathAnchors: plan.pathAnchors,
          anchorMap,
          now,
          tilesPerMinute: 12,
          purpose: plan.purpose,
          routeFn: defaultRouteFn
        });
        expect(rebuilt).not.toBeNull();
      }
    }
    expect(planCount).toBeGreaterThan(100);
  });

  it('(c) rute dari anchor utara azure_wall ke selatan selalu melewati salah satu celah (|x - pass.x| <= 3)', () => {
    const wallAnchorMap = {
      pos_utara_uji: { id: 'pos_utara_uji', name: 'Utara Uji', type: 'village', regionSlug: 'qinghe', x: 2500, y: 3000 },
      pos_selatan_uji: { id: 'pos_selatan_uji', name: 'Selatan Uji', type: 'village', regionSlug: 'qinghe', x: 2500, y: 3700 }
    };
    const wallAnchors = Object.values(wallAnchorMap);
    const wallGraph = {
      shortestPath(from, to) {
        return { path: [from, to], totalLi: 70 };
      }
    };

    let selectedCrossPlan = null;
    for (let day = 1; day <= 30; day++) {
      const npc = {
        _id: 'npc_wall_cross',
        name: 'Pendekar Lintas Tembok',
        vitalStatus: { isAlive: true, isEssential: false, isInjured: false },
        cultivation: { realmIndex: 1 },
        attributes: { travelSpeed: 10 },
        schedule: {
          currentAnchorId: 'pos_utara_uji',
          homeAnchorId: 'pos_utara_uji',
          wanderLevel: 2,
          lastJourneyDay: -1,
          activityState: 'idle'
        }
      };
      const plan = chooseDestination(npc, {
        anchors: wallAnchors,
        anchorMap: wallAnchorMap,
        graph: wallGraph,
        gameDay: day,
        now: 2000000
      });
      if (plan) {
        selectedCrossPlan = plan;
        break;
      }
    }

    expect(selectedCrossPlan).not.toBeNull();
    expect(selectedCrossPlan.journey).toBeTruthy();
    const waypoints = selectedCrossPlan.journey.legs.flatMap((l) => [
      { x: l.ax, y: l.ay },
      { x: l.bx, y: l.by }
    ]);
    const passesCorridor = waypoints.some((pt) =>
      azurePasses.some((p) => Math.abs(pt.x - p.x) <= 3 && pt.y >= 3098 && pt.y <= 3602)
    );
    expect(passesCorridor).toBe(true);
  });

  it('(d) planReturnHome untuk NPC terdampar di pulau_penyu_raksasa menghasilkan teleport pulang', () => {
    const strandedNpc = {
      _id: 'npc_stranded_unit',
      name: 'Kultivator Terdampar',
      attributes: { travelSpeed: 10 },
      schedule: {
        currentAnchorId: 'pulau_penyu_raksasa',
        homeAnchorId: 'dermaga_donghai',
        activityState: 'visiting'
      }
    };
    const res = planReturnHome(strandedNpc, {
      anchorMap,
      graph: travelGraph,
      now: 3000000
    });
    expect(res).not.toBeNull();
    expect(res.toAnchorId).toBe('dermaga_donghai');
    expect(res.purpose).toBe('pulang');
    expect(res.teleport).toBe(true);
  });

  it('(e) planReturnHome rute daratan jarak jauh (>900 tile) melintasi azure_wall memakai maxTiles 10000 dan melewati koridor celah', () => {
    const longNpc = {
      _id: 'npc_long_return',
      name: 'Kultivator Pulang Jauh',
      attributes: { travelSpeed: 12 },
      schedule: {
        currentAnchorId: 'desa_tianhe', // (2200, 3950) south of azure_wall
        homeAnchorId: 'desa_xingcun',   // (2050, 2650) north of azure_wall (> 900 tiles)
        activityState: 'visiting'
      }
    };
    const res = planReturnHome(longNpc, {
      anchorMap,
      graph: travelGraph,
      now: 4000000
    });
    expect(res).not.toBeNull();
    expect(res.teleport).toBe(false);
    expect(res.journey).not.toBeNull();
    expect(res.journey.totalTiles).toBeGreaterThan(900);
    const passesXCorridor = res.journey.legs.some((l) =>
      azurePasses.some((p) => Math.abs(l.bx - p.x) <= 3 && l.by >= 3100 && l.by <= 3600)
    );
    expect(passesXCorridor).toBe(true);

    // Direct cross-wall return without intermediate pass anchor (> 900 tiles) inserts exact pass waypoint
    const directMap = {
      selatan_jauh: { id: 'selatan_jauh', name: 'Selatan Jauh', x: 2500, y: 3900 },
      utara_jauh: { id: 'utara_jauh', name: 'Utara Jauh', x: 2500, y: 2900 }
    };
    const directGraph = {
      shortestPath: (f, t) => ({ path: [f, t], totalLi: 100 })
    };
    const directRes = planReturnHome({
      _id: 'npc_direct_long',
      attributes: { travelSpeed: 10 },
      schedule: { currentAnchorId: 'selatan_jauh', homeAnchorId: 'utara_jauh', activityState: 'visiting' }
    }, { anchorMap: directMap, graph: directGraph, now: 4000000 });
    expect(directRes.teleport).toBe(false);
    expect(directRes.journey.totalTiles).toBeGreaterThan(900);
    expect(directRes.journey.legs.some((l) => azurePasses.some((p) => l.bx === p.x && l.by === p.y))).toBe(true);
  });
});
