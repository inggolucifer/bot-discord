/**
 * scripts/gen/buildVillagesV10.js
 * Master Village & Authored Settlement Generator V10:
 * Enforces V10 Grid Contract, 1x1 Mortal Houses, and Strict Footprint Clearance.
 *
 * Requirements:
 * - 1 mortal house = strict 1x1 tile (cw: 1, ch: 1), south-facing door with clear path.
 * - Multi-tile centerpieces and setpieces reserve their full footprint (g.fw x g.fh) + canopy.
 * - ZERO overlap between props, roads, and anchor core setpieces.
 * - Distance between houses >= 3 (>= 2 cells spacing), prop-to-prop >= 2.
 * - Unique layout fingerprints across all 52 anchors (uniqueLayouts == 52).
 * - BFS reachability from anchor center to all houses.
 * - Maximum single defId dominance <= 35% per village (target >= 3 houses per village).
 */

const fs = require('fs');
const path = require('path');
const worldData = require('../../utils/worldData');
const { getTileAt, WORLD_SEED } = require('../../utils/proceduralWorldEngine');
const GC = require('../../utils/gridContract');
const { getRegionAt } = require('../../utils/worldRegionEngine');
const assetBindings = require('../../config/asset-bindings.json');

const archetypes = require('../../world-data/village-archetypes-v9.json');
const anchors = worldData.getAnchors();

const REGION_LANDMARK_CENTERS = {
  central_plains: { x: 2700, y: 2800 },
  nine_springs_delta: { x: 2400, y: 2450 },
  azure_mountain_range: { x: 2200, y: 3340 },
  northern_desolate: { x: 2120, y: 4180 },
  thundersteppe: { x: 2400, y: 4000 },
  godthunder_peaks: { x: 3540, y: 4500 },
  mirror_lake: { x: 3100, y: 3100 },
  beast_prairies: { x: 1400, y: 3800 },
  western_sacred_desert: { x: 820, y: 2220 },
  western_gorge_labyrinth: { x: 500, y: 1500 },
  hermit_highlands: { x: 1200, y: 4200 },
  border_march: { x: 2300, y: 1950 },
  lava_spine: { x: 1100, y: 700 },
  venom_mire: { x: 2600, y: 900 },
  southern_demon_domain: { x: 1900, y: 1400 },
  crimson_battlefield: { x: 2900, y: 600 },
  abyssal_scar: { x: 1900, y: 600 },
  southern_plague_woods: { x: 3400, y: 550 },
  bone_sea_coast: { x: 1750, y: 150 },
  spirit_wood_sea: { x: 3700, y: 1300 },
  mist_insect_valley: { x: 4150, y: 750 },
  formation_barrens: { x: 3600, y: 2200 },
  sword_gorge: { x: 3400, y: 3250 },
  ore_teeth_range: { x: 3625, y: 2800 },
  eastern_sea: { x: 3880, y: 2750 },
  frostmoon_sea: { x: 4650, y: 4050 },
  floating_wind_isles: { x: 4600, y: 2700 },
  immortal_ruins_valley: { x: 600, y: 1000 },
  void_rift: { x: 250, y: 4750 }
};

function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

function rectChebyshevDist(x1, y1, w1, h1, x2, y2, w2, h2) {
  const dx = x1 > (x2 + w2 - 1) ? x1 - (x2 + w2 - 1) : (x2 > (x1 + w1 - 1) ? x2 - (x1 + w1 - 1) : 0);
  const dy = y1 > (y2 + h2 - 1) ? y1 - (y2 + h2 - 1) : (y2 > (y1 + h1 - 1) ? y2 - (y1 + h1 - 1) : 0);
  return Math.max(dx, dy);
}

function getArchetypeForAnchor(anchor) {
  for (const [key, arch] of Object.entries(archetypes)) {
    if (arch.anchors && arch.anchors.includes(anchor.id)) {
      return { key, ...arch };
    }
  }

  const r = anchor.region || '';
  if (r.includes('desert') || r.includes('dune')) return { key: 'desert_caravan', ...archetypes.desert_caravan };
  if (r.includes('northern') || r.includes('snow') || r.includes('frost')) return { key: 'frost_hamlet', ...archetypes.frost_hamlet };
  if (r.includes('steppe') || r.includes('prairie')) return { key: 'steppe_camp', ...archetypes.steppe_camp };
  if (r.includes('sea') || r.includes('coast') || anchor.type === 'port' || anchor.id.includes('donghai') || anchor.id.includes('canghai')) {
    return { key: 'coastal_fishing', ...archetypes.coastal_fishing };
  }
  if (r.includes('demon') || r.includes('mire') || r.includes('plague') || r.includes('scar') || r.includes('lava') || r.includes('rift')) {
    return { key: 'demon_fort', ...archetypes.demon_fort };
  }
  if (r.includes('mountain') || r.includes('hill') || r.includes('gorge') || r.includes('peaks')) {
    return { key: 'hill_terrace', ...archetypes.hill_terrace };
  }
  if (r.includes('river') || r.includes('lake') || r.includes('delta') || anchor.id.includes('jinling') || anchor.id.includes('padi_emas')) {
    return { key: 'river_village', ...archetypes.river_village };
  }
  return { key: 'garrison_town', ...archetypes.garrison_town };
}

const HUT_FRAMES_BY_ARCHETYPE = {
  river_village: ['hut_tea_harvester_day', 'hut_bamboo_field_day', 'hut_stilt_fisher_day', 'hut_stilt_fisher_dusk', 'hut_bamboo_field_dusk', 'hut_tea_harvester_dusk'],
  hill_terrace: ['hut_tea_harvester_day', 'hut_mountain_hermit_day', 'hut_charcoal_burner_day', 'hut_daoist_shrine_day', 'hut_mountain_hermit_dusk', 'hut_charcoal_burner_dusk'],
  desert_caravan: ['hut_desert_adobe_day', 'hut_desert_adobe_dusk', 'hut_abandoned_stone_overgrown', 'hut_charcoal_burner_day', 'hut_tea_harvester_day', 'hut_mountain_hermit_day'],
  frost_hamlet: ['hut_snow_thatched_day', 'hut_snow_thatched_dusk', 'hut_pine_woodcutter_day', 'hut_pine_woodcutter_dusk', 'hut_mountain_hermit_day', 'hut_charcoal_burner_day'],
  steppe_camp: ['hut_steppe_shepherd_day', 'hut_steppe_shepherd_dusk', 'hut_tea_harvester_day', 'hut_charcoal_burner_day', 'hut_daoist_shrine_day', 'hut_mountain_hermit_day'],
  coastal_fishing: ['hut_stilt_fisher_day', 'hut_stilt_fisher_dusk', 'hut_tea_harvester_day', 'hut_bamboo_field_day', 'hut_pine_woodcutter_day', 'hut_mountain_hermit_day'],
  demon_fort: ['hut_obsidian_stone_day', 'hut_obsidian_stone_dusk', 'hut_hunter_thatched_day', 'hut_hunter_thatched_dusk', 'hut_charcoal_burner_day', 'hut_mountain_hermit_day'],
  garrison_town: ['village_house_2x1', 'hut_daoist_shrine_day', 'hut_charcoal_burner_day', 'hut_tea_harvester_day', 'hut_mountain_hermit_day', 'hut_snow_thatched_day']
};

function isWaterOrSolid(x, y) {
  const tile = getTileAt(x, y);
  if (!tile) return true;
  const tt = tile.terrainType || '';
  const isWater = ['sea', 'ocean', 'sea_reef', 'lake_deep', 'lake', 'river', 'river_shallow', 'pond_lotus'].includes(tt) || tt.includes('water');
  if (tile.isSolid || isWater || tt.includes('road')) return true;
  return false;
}

function isWalkableGround(x, y) {
  const tile = getTileAt(x, y);
  if (!tile) return false;
  const tt = tile.terrainType || '';
  const isWater = ['sea', 'ocean', 'sea_reef', 'lake_deep', 'lake', 'river', 'river_shallow', 'pond_lotus'].includes(tt) || tt.includes('water');
  return !tile.isSolid && !isWater;
}

function distToWater(x, y, maxR = 6) {
  for (let dy = -maxR; dy <= maxR; dy++) {
    for (let dx = -maxR; dx <= maxR; dx++) {
      const t = getTileAt(x + dx, y + dy);
      if (t) {
        const tt = t.terrainType || '';
        if (['sea', 'ocean', 'lake', 'river', 'pond'].some(w => tt.includes(w))) {
          return Math.max(Math.abs(dx), Math.abs(dy));
        }
      }
    }
  }
  return maxR + 1;
}

function generateVillage(anchor, globalProps, globalOccupied, globalRoadTiles) {
  const seed = (hashString(anchor.id) ^ WORLD_SEED) >>> 0;
  const rng = mulberry32(seed);
  const arch = getArchetypeForAnchor(anchor);
  const hutPool = HUT_FRAMES_BY_ARCHETYPE[arch.key] || HUT_FRAMES_BY_ARCHETYPE.river_village;

  const ax = anchor.x;
  const ay = anchor.y;

  const villageProps = [];
  const localRoadTiles = new Set();
  const roadSegments = [];

  function addRoadTile(x, y) {
    localRoadTiles.add(`${x},${y}`);
    globalRoadTiles.add(`${x},${y}`);
  }

  function buildSegment(x1, y1, x2, y2) {
    if (x1 === x2 && y1 === y2) {
      return;
    }
    const midX = x2;
    const midY = y1;

    // Segment 1: EW
    if (x1 !== midX) {
      const minX = Math.min(x1, midX);
      const maxX = Math.max(x1, midX);
      let runStart = null;
      for (let x = minX; x <= maxX; x++) {
        if (!globalOccupied.has(`${x},${y1}`)) {
          if (runStart === null) runStart = x;
          addRoadTile(x, y1);
        } else {
          if (runStart !== null) {
            roadSegments.push({
              anchorId: anchor.id,
              direction: 'EW',
              from: { x: runStart, y: y1 },
              to: { x: x - 1, y: y1 }
            });
            runStart = null;
          }
        }
      }
      if (runStart !== null) {
        roadSegments.push({
          anchorId: anchor.id,
          direction: 'EW',
          from: { x: runStart, y: y1 },
          to: { x: maxX, y: y1 }
        });
      }
    }

    // Segment 2: NS
    if (midY !== y2) {
      const minY = Math.min(midY, y2);
      const maxY = Math.max(midY, y2);
      let runStart = null;
      for (let y = minY; y <= maxY; y++) {
        if (!globalOccupied.has(`${midX},${y}`)) {
          if (runStart === null) runStart = y;
          addRoadTile(midX, y);
        } else {
          if (runStart !== null) {
            roadSegments.push({
              anchorId: anchor.id,
              direction: 'NS',
              from: { x: midX, y: runStart },
              to: { x: midX, y: y - 1 }
            });
            runStart = null;
          }
        }
      }
      if (runStart !== null) {
        roadSegments.push({
          anchorId: anchor.id,
          direction: 'NS',
          from: { x: midX, y: runStart },
          to: { x: midX, y: maxY }
        });
      }
    }
  }

  // Pure port pier exemption (dermaga_donghai)
  if (anchor.id === 'dermaga_donghai') {
    return {
      props: [],
      roads: [],
      fingerprint: hashString(`pier_donghai_bridges;`).toString(16),
      houseCount: 0,
      dominantDefPct: 0
    };
  }

  // 1. Scan Walkable Land in village perimeter (R in [3..12] strictly outside anchor core [<=2])
  const R_MIN = 3;
  const R_MAX = 12;
  const isWaterExempt = arch.key === 'coastal_fishing' || arch.key === 'river_village' || anchor.id.includes('canghai');

  const rawLandSpots = [];
  for (let dy = -R_MAX; dy <= R_MAX; dy++) {
    for (let dx = -R_MAX; dx <= R_MAX; dx++) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      if (dist < R_MIN || dist > R_MAX) continue;
      const hx = ax + dx;
      const hy = ay + dy;
      if (globalOccupied.has(`${hx},${hy}`)) continue;
      if (isWaterOrSolid(hx, hy)) continue;
      if (!isWaterExempt && distToWater(hx, hy, 6) < 6) continue;
      rawLandSpots.push({ x: hx, y: hy, dx, dy });
    }
  }

  // Compute valley centroid and principal axis for road angle
  let vDx = 0, vDy = 0;
  let roadAngle = 0;
  if (rawLandSpots.length > 0) {
    vDx = Math.round(rawLandSpots.reduce((s, p) => s + p.dx, 0) / rawLandSpots.length);
    vDy = Math.round(rawLandSpots.reduce((s, p) => s + p.dy, 0) / rawLandSpots.length);
    if (Math.abs(vDx) >= 2 || Math.abs(vDy) >= 2) {
      roadAngle = Math.atan2(vDy, vDx);
    } else {
      let varX = 0, varY = 0;
      for (const p of rawLandSpots) {
        varX += p.dx * p.dx;
        varY += p.dy * p.dy;
      }
      roadAngle = varY >= varX ? Math.PI / 2 : 0;
    }
  }

  // 2. Build Curved Roads (Catmull-Rom spline)
  const mainLen = 10 + Math.floor(rng() * 3);
  const p0 = { x: ax - Math.round(Math.cos(roadAngle) * mainLen), y: ay - Math.round(Math.sin(roadAngle) * mainLen) };
  const p1 = { x: ax - Math.round(Math.cos(roadAngle) * (mainLen * 0.4)), y: ay - Math.round(Math.sin(roadAngle) * (mainLen * 0.4)) };
  const p2 = { x: ax + Math.round(Math.cos(roadAngle) * (mainLen * 0.4) + (rng() * 4 - 2)), y: ay + Math.round(Math.sin(roadAngle) * (mainLen * 0.4) + (rng() * 4 - 2)) };
  const p3 = { x: ax + Math.round(Math.cos(roadAngle) * mainLen), y: ay + Math.round(Math.sin(roadAngle) * mainLen) };

  let prevRoadPt = p0;
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const rx = Math.round(catmullRom(p0.x, p1.x, p2.x, p3.x, t));
    const ry = Math.round(catmullRom(p0.y, p1.y, p2.y, p3.y, t));
    buildSegment(prevRoadPt.x, prevRoadPt.y, rx, ry);
    buildSegment(prevRoadPt.x, prevRoadPt.y + 1, rx, ry + 1);
    prevRoadPt = { x: rx, y: ry };
  }
  buildSegment(prevRoadPt.x, prevRoadPt.y, p3.x, p3.y);
  buildSegment(prevRoadPt.x, prevRoadPt.y + 1, p3.x, p3.y + 1);

  // Branch alley
  const alleyAngle = roadAngle + Math.PI / 2;
  const aLen = 7 + Math.floor(rng() * 3);
  const ap1 = { x: Math.round(p2.x - Math.cos(alleyAngle) * (aLen * 0.5)), y: Math.round(p2.y - Math.sin(alleyAngle) * (aLen * 0.5)) };
  const ap2 = { x: Math.round(p2.x + Math.cos(alleyAngle) * (aLen * 0.5)), y: Math.round(p2.y + Math.sin(alleyAngle) * (aLen * 0.5)) };
  buildSegment(ap1.x, ap1.y, ap2.x, ap2.y);

  // 3. Place Centerpiece Landmark (taking full Grid Contract footprint into account)
  const cpDef = arch.centerpiece || 'building_village_well';
  const gCp = GC.getGrid(cpDef);
  const cpFw = gCp ? gCp.fw : 1;
  const cpFh = gCp ? gCp.fh : 1;
  const cpRowsAbove = gCp ? gCp.rowsAbove : 0;

  let cpPlaced = false;
  const cpCandidates = [
    { dx: 0, dy: 5 }, { dx: 0, dy: -5 }, { dx: -5, dy: 0 }, { dx: 5, dy: 0 },
    { dx: 5, dy: 5 }, { dx: -5, dy: -5 }, { dx: -5, dy: 5 }, { dx: 5, dy: -5 },
    { dx: 0, dy: 6 }, { dx: 0, dy: -6 }, { dx: -6, dy: 0 }, { dx: 6, dy: 0 },
    { dx: 6, dy: 6 }, { dx: -6, dy: -6 }, { dx: 6, dy: -6 }, { dx: -6, dy: 6 },
    { dx: 0, dy: 7 }, { dx: 0, dy: -7 }, { dx: -7, dy: 0 }, { dx: 7, dy: 0 },
    { dx: 7, dy: 7 }, { dx: -7, dy: -7 }, { dx: 7, dy: -7 }, { dx: -7, dy: 7 },
    { dx: 0, dy: 8 }, { dx: 0, dy: -8 }, { dx: -8, dy: 0 }, { dx: 8, dy: 0 }
  ];

  for (const c of cpCandidates) {
    const cx = ax + c.dx;
    const cy = ay + c.dy;

    // Verify all cells of the centerpiece footprint
    let canPlaceCp = true;
    for (let dy = 0; dy < cpFh; dy++) {
      for (let dx = 0; dx < cpFw; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        const cKey = `${tx},${ty}`;
        if (globalRoadTiles.has(cKey) || globalOccupied.has(cKey) || isWaterOrSolid(tx, ty)) {
          canPlaceCp = false;
          break;
        }
        // Core clearance check (outside ±2 from anchor center)
        if (Math.abs(tx - ax) <= 2 && Math.abs(ty - ay) <= 2) {
          canPlaceCp = false;
          break;
        }
      }
      if (!canPlaceCp) break;
    }

    if (canPlaceCp && cpRowsAbove > 0) {
      for (let dy = 1; dy <= cpRowsAbove; dy++) {
        for (let dx = 0; dx < cpFw; dx++) {
          const tx = cx + dx;
          const ty = cy - dy;
          if (globalOccupied.has(`${tx},${ty}`)) {
            canPlaceCp = false;
            break;
          }
        }
        if (!canPlaceCp) break;
      }
    }

    if (!canPlaceCp) continue;

    const tooClose = globalProps.some(p => {
      const gP = GC.getGrid(p.defId);
      const pFw = gP ? gP.fw : (p.cw || 1);
      const pFh = gP ? gP.fh : (p.ch || 1);
      return rectChebyshevDist(cx, cy, cpFw, cpFh, p.x, p.y, pFw, pFh) < 2;
    });
    if (tooClose) continue;

    const cpObj = {
      id: `auth_${anchor.id}_centerpiece`,
      anchorId: anchor.id,
      region: anchor.region,
      x: cx,
      y: cy,
      kind: 'landmark',
      facing: 'south',
      defId: cpDef,
      fallbackDefId: 'building_ancestral_shrine_gate',
      cw: cpFw,
      ch: cpFh,
      collision: 'solid',
      enterable: false
    };

    villageProps.push(cpObj);
    globalProps.push(cpObj);
    for (let dy = 0; dy < cpFh; dy++) {
      for (let dx = 0; dx < cpFw; dx++) {
        globalOccupied.add(`${cx + dx},${cy + dy}`);
      }
    }
    if (cpRowsAbove > 0) {
      for (let dy = 1; dy <= cpRowsAbove; dy++) {
        for (let dx = 0; dx < cpFw; dx++) {
          globalOccupied.add(`${cx + dx},${cy - dy}`);
        }
      }
    }
    cpPlaced = true;
    break;
  }

  // 4. Place Houses (1x1 mortal houses, target: 4..7 houses, distance 1..3 from road, south door free)
  const targetHouses = 4 + Math.floor(rng() * 4);
  const candidateHouses = [];

  // Filter valid road tiles (belonging to connected components of size >= 3)
  const validRoadTiles = new Set();
  const visitedVal = new Set();
  for (const rKey of localRoadTiles) {
    if (visitedVal.has(rKey)) continue;
    const comp = [];
    const q = [rKey];
    visitedVal.add(rKey);
    while (q.length > 0) {
      const cur = q.shift();
      comp.push(cur);
      const [rx, ry] = cur.split(',').map(Number);
      for (const [nx, ny] of [[rx + 1, ry], [rx - 1, ry], [rx, ry + 1], [rx, ry - 1]]) {
        const nKey = `${nx},${ny}`;
        if (localRoadTiles.has(nKey) && !visitedVal.has(nKey)) {
          visitedVal.add(nKey);
          q.push(nKey);
        }
      }
    }
    if (comp.length >= 3) {
      for (const k of comp) validRoadTiles.add(k);
    }
  }

  for (const spot of rawLandSpots) {
    const sKey = `${spot.x},${spot.y}`;
    if (globalOccupied.has(sKey)) continue;
    if (globalRoadTiles.has(sKey)) continue;

    // Check distance to valid local road: must be 1 to 3 tiles from road
    let nearRoad = false;
    for (let rdy = -3; rdy <= 3; rdy++) {
      for (let rdx = -3; rdx <= 3; rdx++) {
        if (validRoadTiles.has(`${spot.x + rdx},${spot.y + rdy}`)) {
          nearRoad = true;
          break;
        }
      }
      if (nearRoad) break;
    }
    if (!nearRoad) continue;

    // South door path check: (spot.x, spot.y + 1) must be walkable ground and free of props
    const southKey = `${spot.x},${spot.y + 1}`;
    if (globalOccupied.has(southKey) || !isWalkableGround(spot.x, spot.y + 1)) {
      continue;
    }

    candidateHouses.push(spot);
  }

  // Deterministic shuffle with Fisher-Yates
  for (let i = candidateHouses.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = candidateHouses[i];
    candidateHouses[i] = candidateHouses[j];
    candidateHouses[j] = temp;
  }

  const placedHouses = [];
  const defCounts = {};

  for (const cand of candidateHouses) {
    if (placedHouses.length >= targetHouses) break;

    // Inter-house Chebyshev spacing >= 3 (distance >= 2 empty tiles)
    const tooCloseToHouse = globalProps.some(p => p.kind === 'house' && Math.max(Math.abs(cand.x - p.x), Math.abs(cand.y - p.y)) < 3);
    if (tooCloseToHouse) continue;

    // Pairwise distance to any object (including multi-tile centerpiece) >= 2
    const tooCloseToObj = globalProps.some(p => {
      const gP = GC.getGrid(p.defId);
      const pFw = gP ? gP.fw : (p.cw || 1);
      const pFh = gP ? gP.fh : (p.ch || 1);
      return rectChebyshevDist(cand.x, cand.y, 1, 1, p.x, p.y, pFw, pFh) < 2;
    });
    if (tooCloseToObj) continue;

    // Pick defId cycling through hutPool (max dominance <= 35%)
    let defId = null;
    for (let i = 0; i < hutPool.length; i++) {
      const candidateDef = hutPool[(i + placedHouses.length) % hutPool.length];
      if ((defCounts[candidateDef] || 0) === 0) {
        defId = candidateDef;
        break;
      }
    }
    if (!defId) {
      defId = hutPool[placedHouses.length % hutPool.length];
    }

    defCounts[defId] = (defCounts[defId] || 0) + 1;
    const houseId = `auth_${anchor.id}_h${String(placedHouses.length + 1).padStart(2, '0')}`;

    const houseObj = {
      id: houseId,
      anchorId: anchor.id,
      region: anchor.region,
      x: cand.x,
      y: cand.y,
      kind: 'house',
      facing: 'south',
      defId,
      fallbackDefId: 'building_village_thatched_cottage',
      cw: 1,
      ch: 1,
      collision: 'solid',
      enterable: true,
      structureTemplate: 'hut_6x5'
    };

    placedHouses.push(houseObj);
    villageProps.push(houseObj);
    globalProps.push(houseObj);
    globalOccupied.add(`${cand.x},${cand.y}`);
  }

  // Guarantee minimum 3 houses per village (Prompt Gate D: max dominance <= 35%)
  if (placedHouses.length < 3) {
    for (const spot of rawLandSpots) {
      if (placedHouses.length >= 3) break;
      const sKey = `${spot.x},${spot.y}`;
      if (globalOccupied.has(sKey) || globalRoadTiles.has(sKey)) continue;

      let nearRoad = false;
      for (let rdy = -3; rdy <= 3; rdy++) {
        for (let rdx = -3; rdx <= 3; rdx++) {
          if (localRoadTiles.has(`${spot.x + rdx},${spot.y + rdy}`)) {
            nearRoad = true;
            break;
          }
        }
        if (!nearRoad) break;
      }
      if (!nearRoad) continue;

      let doorFacing = 'south';
      const southKey = `${spot.x},${spot.y + 1}`;
      if (globalOccupied.has(southKey) || !isWalkableGround(spot.x, spot.y + 1)) {
        if (!globalOccupied.has(`${spot.x},${spot.y - 1}`) && isWalkableGround(spot.x, spot.y - 1)) {
          doorFacing = 'north';
        } else if (!globalOccupied.has(`${spot.x + 1},${spot.y}`) && isWalkableGround(spot.x + 1, spot.y)) {
          doorFacing = 'east';
        } else if (!globalOccupied.has(`${spot.x - 1},${spot.y}`) && isWalkableGround(spot.x - 1, spot.y)) {
          doorFacing = 'west';
        } else {
          continue;
        }
      }

      const tooCloseToHouse = globalProps.some(p => p.kind === 'house' && Math.max(Math.abs(spot.x - p.x), Math.abs(spot.y - p.y)) < 3);
      if (tooCloseToHouse) continue;

      const tooCloseToObj = globalProps.some(p => {
        const gP = GC.getGrid(p.defId);
        const pFw = gP ? gP.fw : (p.cw || 1);
        const pFh = gP ? gP.fh : (p.ch || 1);
        return rectChebyshevDist(spot.x, spot.y, 1, 1, p.x, p.y, pFw, pFh) < 2;
      });
      if (tooCloseToObj) continue;

      let defId = null;
      for (let i = 0; i < hutPool.length; i++) {
        const candidateDef = hutPool[(i + placedHouses.length) % hutPool.length];
        if ((defCounts[candidateDef] || 0) === 0) {
          defId = candidateDef;
          break;
        }
      }
      if (!defId) defId = hutPool[placedHouses.length % hutPool.length];
      defCounts[defId] = (defCounts[defId] || 0) + 1;

      const houseId = `auth_${anchor.id}_h${String(placedHouses.length + 1).padStart(2, '0')}`;
      const houseObj = {
        id: houseId,
        anchorId: anchor.id,
        region: anchor.region,
        x: spot.x,
        y: spot.y,
        kind: 'house',
        facing: doorFacing,
        defId,
        fallbackDefId: 'building_village_thatched_cottage',
        cw: 1,
        ch: 1,
        collision: 'solid',
        enterable: true,
        structureTemplate: 'hut_6x5'
      };

      placedHouses.push(houseObj);
      villageProps.push(houseObj);
      globalProps.push(houseObj);
      globalOccupied.add(sKey);
    }
  }

  // Ensure every placed house is strictly connected to road network (<= 3 Chebyshev)
  for (const h of placedHouses) {
    let near = false;
    let nearestRoad = null;
    let minDist = 999;
    for (const rKey of localRoadTiles) {
      const [rx, ry] = rKey.split(',').map(Number);
      const dist = Math.max(Math.abs(h.x - rx), Math.abs(h.y - ry));
      if (dist < minDist) {
        minDist = dist;
        nearestRoad = { x: rx, y: ry };
      }
      if (dist <= 3) {
        near = true;
      }
    }
    if (!near && nearestRoad) {
      buildSegment(h.x, h.y + 1, nearestRoad.x, nearestRoad.y);
    }
  }

  // 5. Place Companion Props (1 per house, Chebyshev distance >= 2 from all objects, outside road)
  const propPool = arch.props || ['prop_water_storage_urn', 'prop_firewood_stack', 'prop_small_stone_well'];
  let propIdx = 0;

  for (const h of placedHouses) {
    const propOffsets = [
      { dx: 2, dy: 0 }, { dx: -2, dy: 0 }, { dx: 0, dy: 2 }, { dx: 0, dy: -2 },
      { dx: 2, dy: 2 }, { dx: -2, dy: -2 }, { dx: 2, dy: -2 }, { dx: -2, dy: 2 },
      { dx: 3, dy: 0 }, { dx: -3, dy: 0 }, { dx: 0, dy: 3 }, { dx: 0, dy: -3 }
    ];

    for (const off of propOffsets) {
      const px = h.x + off.dx;
      const py = h.y + off.dy;
      const pKey = `${px},${py}`;

      if (globalOccupied.has(pKey)) continue;
      if (globalRoadTiles.has(pKey)) continue;
      if (isWaterOrSolid(px, py)) continue;
      if (Math.abs(px - ax) <= 2 && Math.abs(py - ay) <= 2) continue; // Outside anchor core

      const pDef = propPool[propIdx % propPool.length];
      const gP = GC.getGrid(pDef);
      const pFw = gP ? gP.fw : 1;
      const pFh = gP ? gP.fh : 1;

      // Check all footprint cells of the prop
      let canPlaceProp = true;
      for (let dy = 0; dy < pFh; dy++) {
        for (let dx = 0; dx < pFw; dx++) {
          const tx = px + dx;
          const ty = py + dy;
          if (globalOccupied.has(`${tx},${ty}`) || globalRoadTiles.has(`${tx},${ty}`) || isWaterOrSolid(tx, ty)) {
            canPlaceProp = false;
            break;
          }
          if (Math.abs(tx - ax) <= 2 && Math.abs(ty - ay) <= 2) {
            canPlaceProp = false;
            break;
          }
        }
        if (!canPlaceProp) break;
      }
      if (!canPlaceProp) continue;

      const tooClose = globalProps.some(p => {
        const gOther = GC.getGrid(p.defId);
        const oFw = gOther ? gOther.fw : (p.cw || 1);
        const oFh = gOther ? gOther.fh : (p.ch || 1);
        return rectChebyshevDist(px, py, pFw, pFh, p.x, p.y, oFw, oFh) < 2;
      });
      if (tooClose) continue;

      propIdx++;

      const propObj = {
        id: `auth_${anchor.id}_p${String(villageProps.length).padStart(2, '0')}`,
        anchorId: anchor.id,
        region: anchor.region,
        x: px,
        y: py,
        kind: 'prop',
        facing: 'south',
        defId: pDef,
        fallbackDefId: 'prop_water_storage_urn',
        cw: pFw,
        ch: pFh,
        collision: 'none',
        enterable: false
      };

      villageProps.push(propObj);
      globalProps.push(propObj);
      for (let dy = 0; dy < pFh; dy++) {
        for (let dx = 0; dx < pFw; dx++) {
          globalOccupied.add(`${px + dx},${py + dy}`);
        }
      }
      break; // 1 companion prop per house
    }
  }

  // Calculate stats & unique fingerprint
  const houses = villageProps.filter(p => p.kind === 'house');
  const houseCounts = {};
  for (const h of houses) {
    houseCounts[h.defId] = (houseCounts[h.defId] || 0) + 1;
  }
  const maxDef = Object.keys(houseCounts).length > 0 ? Math.max(...Object.values(houseCounts)) : 0;
  const dominantDefPct = houses.length > 0 ? (maxDef / houses.length) * 100 : 0;

  let fpStr = '';
  for (const p of villageProps) {
    fpStr += `${p.x - ax},${p.y - ay}:${p.defId};`;
  }
  const fingerprint = hashString(fpStr).toString(16);
  // Prune any disconnected road components of size < 3
  const compVisited = new Set();
  const deadRoadKeys = new Set();
  for (const rKey of localRoadTiles) {
    if (compVisited.has(rKey)) continue;
    const comp = [];
    const q = [rKey];
    compVisited.add(rKey);
    while (q.length > 0) {
      const cur = q.shift();
      comp.push(cur);
      const [rx, ry] = cur.split(',').map(Number);
      for (const [nx, ny] of [[rx + 1, ry], [rx - 1, ry], [rx, ry + 1], [rx, ry - 1]]) {
        const nKey = `${nx},${ny}`;
        if (localRoadTiles.has(nKey) && !compVisited.has(nKey)) {
          compVisited.add(nKey);
          q.push(nKey);
        }
      }
    }
    if (comp.length < 3) {
      for (const k of comp) {
        deadRoadKeys.add(k);
        localRoadTiles.delete(k);
        globalRoadTiles.delete(k);
      }
    }
  }

  const prunedRoads = [];
  for (const r of roadSegments) {
    if (r.direction === 'EW') {
      const y = r.from.y;
      const minX = Math.min(r.from.x, r.to.x);
      const maxX = Math.max(r.from.x, r.to.x);
      let runStart = null;
      for (let x = minX; x <= maxX; x++) {
        if (!deadRoadKeys.has(`${x},${y}`)) {
          if (runStart === null) runStart = x;
        } else {
          if (runStart !== null) {
            prunedRoads.push({ anchorId: r.anchorId, direction: 'EW', from: { x: runStart, y }, to: { x: x - 1, y } });
            runStart = null;
          }
        }
      }
      if (runStart !== null) {
        prunedRoads.push({ anchorId: r.anchorId, direction: 'EW', from: { x: runStart, y }, to: { x: maxX, y } });
      }
    } else if (r.direction === 'NS') {
      const x = r.from.x;
      const minY = Math.min(r.from.y, r.to.y);
      const maxY = Math.max(r.from.y, r.to.y);
      let runStart = null;
      for (let y = minY; y <= maxY; y++) {
        if (!deadRoadKeys.has(`${x},${y}`)) {
          if (runStart === null) runStart = y;
        } else {
          if (runStart !== null) {
            prunedRoads.push({ anchorId: r.anchorId, direction: 'NS', from: { x, y: runStart }, to: { x, y: y - 1 } });
            runStart = null;
          }
        }
      }
      if (runStart !== null) {
        prunedRoads.push({ anchorId: r.anchorId, direction: 'NS', from: { x, y: runStart }, to: { x, y: maxY } });
      }
    }
  }

  return {
    props: villageProps,
    roads: prunedRoads,
    fingerprint,
    houseCount: houses.length,
    dominantDefPct
  };
}

async function main() {
  console.log('\n=== BUILD VILLAGES V10 (buildVillagesV10.js) ===\n');

  const allProps = [];
  const allRoads = [];
  const globalOccupied = new Set();
  const globalRoadTiles = new Set();
  const fingerprints = new Set();
  const villageReports = [];

  // 1. Pre-register all Anchor Setpieces in globalOccupied
  for (const a of anchors) {
    let sDefId = 'building_village_thatched_cottage';
    if (a.id === 'xitong_city' || a.name.toLowerCase().includes('xitong')) sDefId = 'xitong_city_landmark';
    else if (a.type === 'sect') sDefId = 'building_sect_library';
    else if (a.type === 'capital_city' || a.type === 'major_city' || a.type === 'city') sDefId = 'building_spirit_pagoda';
    else if (a.name.toLowerCase().includes('dermaga') || a.name.toLowerCase().includes('dock') || a.name.toLowerCase().includes('port') || a.type === 'port') sDefId = 'building_dock_warehouse';
    else if (a.type === 'village' || a.type === 'hamlet') sDefId = 'building_village_thatched_cottage';
    else if (a.type === 'outpost') sDefId = 'building_stone_torii_v1';
    else {
      const r = getRegionAt(a.x, a.y);
      const lm = assetBindings.landmarks[r.id];
      if (lm && (a.type === 'landmark' || a.type === 'focal')) sDefId = lm.defId;
    }
    const g = GC.getGrid(sDefId);
    const fw = g ? g.fw : 2;
    const fh = g ? g.fh : 2;
    const x0 = a.x - Math.floor(fw / 2);
    const y0 = a.y - fh;

    // Footprint
    for (let dy = 0; dy < fh; dy++) {
      for (let dx = 0; dx < fw; dx++) {
        globalOccupied.add(`${x0 + dx},${y0 + dy}`);
      }
    }
    // Canopy
    if (g && g.rowsAbove > 0) {
      for (let dy = 1; dy <= g.rowsAbove; dy++) {
        for (let dx = 0; dx < fw; dx++) {
          globalOccupied.add(`${x0 + dx},${y0 - dy}`);
        }
      }
    }
  }

  // 1b. Pre-register all 29 Regional Landmark Focal Centers
  for (const [rId, focal] of Object.entries(REGION_LANDMARK_CENTERS)) {
    const lm = assetBindings.landmarks[rId];
    if (lm) {
      const g = GC.getGrid(lm.defId);
      const fw = g ? g.fw : (lm.cw || 3);
      const fh = g ? g.fh : (lm.ch || 3);
      for (let dy = 0; dy < fh; dy++) {
        for (let dx = 0; dx < fw; dx++) {
          globalOccupied.add(`${focal.x + dx},${focal.y + dy}`);
        }
      }
      if (g && g.rowsAbove > 0) {
        for (let dy = 1; dy <= g.rowsAbove; dy++) {
          for (let dx = 0; dx < fw; dx++) {
            globalOccupied.add(`${focal.x + dx},${focal.y - dy}`);
          }
        }
      }
    }
  }

  // 2. Pre-register Donghai bridges
  const donghaiBridges = [
    {
      id: 'auth_bridge_donghai_01',
      anchorId: 'dermaga_donghai',
      region: 'eastern_sea',
      x: 3910,
      y: 2702,
      kind: 'bridge',
      facing: 'east',
      defId: 'building_wayside_stone_arch_bridge',
      fallbackDefId: 'building_wayside_stone_arch_bridge',
      cw: 2,
      ch: 1,
      collision: 'none',
      enterable: false
    },
    {
      id: 'auth_bridge_donghai_02',
      anchorId: 'dermaga_donghai',
      region: 'eastern_sea',
      x: 3914,
      y: 2702,
      kind: 'bridge',
      facing: 'east',
      defId: 'building_wayside_stone_arch_bridge',
      fallbackDefId: 'building_wayside_stone_arch_bridge',
      cw: 2,
      ch: 1,
      collision: 'none',
      enterable: false
    }
  ];

  for (const b of donghaiBridges) {
    allProps.push(b);
    globalOccupied.add(`${b.x},${b.y}`);
    globalOccupied.add(`${b.x + 1},${b.y}`);
  }

  console.log('| No | Anchor ID | Arketipe | Rumah | Dominan% | Fingerprint | Status |');
  console.log('|---|---|---|---|---|---|---|');

  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const arch = getArchetypeForAnchor(a);
    const result = generateVillage(a, allProps, globalOccupied, globalRoadTiles);

    fingerprints.add(result.fingerprint);
    allRoads.push(...result.roads);

    const isDomOk = result.dominantDefPct <= 35.0;
    const status = isDomOk ? 'PASS' : 'WARN';

    console.log(
      `| ${i + 1} | ${a.id} | ${arch.key} | ${result.houseCount} | ${result.dominantDefPct.toFixed(1)}% | ${result.fingerprint} | ${status} |`
    );

    villageReports.push({
      id: a.id,
      archetype: arch.key,
      houses: result.houseCount,
      dominantPct: result.dominantDefPct,
      fingerprint: result.fingerprint
    });
  }

  const uniqueLayoutCount = fingerprints.size;
  console.log(`\nTotal Anchor Diperiksa    : ${anchors.length}`);
  console.log(`Unique Layout Fingerprints : ${uniqueLayoutCount} (target: 52)`);
  console.log(`Total Objek Tertulis Dihasilkan: ${allProps.length}`);
  console.log(`Total Segmen Jalan        : ${allRoads.length}`);

  // Write new authored-props.json
  const outPath = path.resolve(__dirname, '../../world-data/authored-props.json');
  const payload = {
    version: 10,
    seed: WORLD_SEED,
    note: 'Lapisan objek tertulis V10 - 52 desa berbasis 8 arketipe dengan Kontrak Grid 1x1, jalan melengkung dan centerpiece presisi.',
    props: allProps,
    roads: allRoads
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 1), 'utf8');
  console.log(`\n[SELESAI] Hasil disimpan ke ${outPath}.`);

  if (uniqueLayoutCount === 52) {
    console.log('[PASS GERBANG D] 52/52 anchor memiliki tata letak 100% unik!');
  } else {
    console.error(`[FAIL] Hanya ${uniqueLayoutCount}/52 anchor yang memiliki tata letak unik.`);
    process.exit(1);
  }
}

module.exports = { getArchetypeForAnchor };

if (require.main === module) {
  main().catch(err => {
    console.error('[ERROR]', err);
    process.exit(1);
  });
}
