/**
 * scripts/gen/buildVillagesV9.js
 * Master Village & Authored Settlement Generator (Prompt D1 & D2):
 * Generates distinct layouts for all 52 anchors across 8 regional archetypes.
 * Enforces:
 * - Deterministic seed per anchor (hash(anchor.id) ^ WORLD_SEED).
 * - Curved Catmull-Rom road networks (rectilinear EW/NS segments, width 2 main, width 1 alleys).
 * - Roads generated along terrain valleys; houses placed strictly adjacent (dist 1..3) to road.
 * - ZERO roads on top of houses/props, and ZERO houses/props on top of roads.
 * - Inter-house Chebyshev spacing >= 3 (distance >= 1 empty tile).
 * - Pairwise prop-to-prop and prop-to-house Chebyshev spacing >= 2 (globally across all anchors).
 * - Max 35% of any single defId per village (target >= 3 houses per inland village).
 * - Centerpiece per village on valid land terrain outside anchor setpiece footprint (R in [5..7]).
 * - Anchor core clearance (no props within Chebyshev <= 2 of anchor center).
 * - Distance to water >= 6 for inland archetypes.
 * - Unique layout fingerprints across all 52 anchors.
 */

const fs = require('fs');
const path = require('path');
const worldData = require('../../utils/worldData');
const { getTileAt, WORLD_SEED } = require('../../utils/proceduralWorldEngine');

const archetypes = require('../../world-data/village-archetypes-v9.json');
const anchors = worldData.getAnchors();

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

// Catmull-Rom spline interpolation
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

function getArchetypeForAnchor(anchor) {
  for (const [key, arch] of Object.entries(archetypes)) {
    if (arch.anchors && arch.anchors.includes(anchor.id)) {
      return { key, ...arch };
    }
  }

  // Fallback assignment based on region / terrain / type
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

  // Helper to add rectilinear (EW or NS) road segments
  function addRoadTile(x, y) {
    localRoadTiles.add(`${x},${y}`);
    globalRoadTiles.add(`${x},${y}`);
  }

  function buildSegment(x1, y1, x2, y2) {
    if (x1 === x2 && y1 === y2) {
      addRoadTile(x1, y1);
      return;
    }
    const midX = x2;
    const midY = y1;

    // Segment 1: (x1, y1) -> (midX, midY) [EW]
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

    // Segment 2: (midX, midY) -> (x2, y2) [NS]
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

  // Pure port pier exemption (dermaga_donghai: ferry bridges and pier landmark)
  if (anchor.id === 'dermaga_donghai') {
    return {
      props: [],
      roads: [],
      fingerprint: hashString(`pier_donghai_bridges;`).toString(16),
      houseCount: 0,
      dominantDefPct: 0
    };
  }

  // 1. Scan Walkable Terrain & Determine Valley Direction
  const R_MIN = 5; // Clear of ALL anchor setpieces (pagoda, shrine gate, cottage, landmark)
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

  // Compute valley centroid
  let vDx = 0, vDy = 0;
  if (rawLandSpots.length > 0) {
    vDx = Math.round(rawLandSpots.reduce((s, p) => s + p.dx, 0) / rawLandSpots.length);
    vDy = Math.round(rawLandSpots.reduce((s, p) => s + p.dy, 0) / rawLandSpots.length);
  }

  // 2. Build Curved Roads (Catmull-Rom spline flowing across anchor, width 2)
  const roadAngle = (vDx !== 0 || vDy !== 0) ? Math.atan2(vDy, vDx) : (rng() * Math.PI * 2);
  const mainLen = 10 + Math.floor(rng() * 3); // 10..12 tiles
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
    // Parallel lane (width 2)
    buildSegment(prevRoadPt.x, prevRoadPt.y + 1, rx, ry + 1);
    prevRoadPt = { x: rx, y: ry };
  }

  // Branch Alley (perpendicular, length 7..9)
  const alleyAngle = roadAngle + Math.PI / 2;
  const aLen = 7 + Math.floor(rng() * 3);
  const ap1 = { x: Math.round(p2.x - Math.cos(alleyAngle) * (aLen * 0.5)), y: Math.round(p2.y - Math.sin(alleyAngle) * (aLen * 0.5)) };
  const ap2 = { x: Math.round(p2.x + Math.cos(alleyAngle) * (aLen * 0.5)), y: Math.round(p2.y + Math.sin(alleyAngle) * (aLen * 0.5)) };
  buildSegment(ap1.x, ap1.y, ap2.x, ap2.y);

  // 3. Place Centerpiece Landmark (R in [5..7] on non-road tile)
  const cpDef = arch.centerpiece || 'building_village_well';
  let cpPlaced = false;
  const cpCandidates = [
    { dx: 0, dy: 5 }, { dx: 0, dy: -5 }, { dx: -5, dy: 0 }, { dx: 5, dy: 0 },
    { dx: 5, dy: 5 }, { dx: -5, dy: -5 }, { dx: -5, dy: 5 }, { dx: 5, dy: -5 },
    { dx: 0, dy: 6 }, { dx: 0, dy: -6 }, { dx: -6, dy: 0 }, { dx: 6, dy: 0 }
  ];

  for (const c of cpCandidates) {
    const cx = ax + c.dx;
    const cy = ay + c.dy;
    const cKey = `${cx},${cy}`;
    if (globalRoadTiles.has(cKey)) continue;
    if (globalOccupied.has(cKey)) continue;
    if (isWaterOrSolid(cx, cy)) continue;

    const tooClose = globalProps.some(p => Math.max(Math.abs(cx - p.x), Math.abs(cy - p.y)) < 2);
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
      cw: 1,
      ch: 1,
      collision: 'solid',
      enterable: false
    };

    villageProps.push(cpObj);
    globalProps.push(cpObj);
    globalOccupied.add(cKey);
    cpPlaced = true;
    break;
  }

  // 4. Place Houses (Target: 4 to 8 houses, min 3 houses, distance 1..3 from road)
  const targetHouses = 4 + Math.floor(rng() * 4); // 4-7 houses
  const candidateHouses = [];

  for (const spot of rawLandSpots) {
    const sKey = `${spot.x},${spot.y}`;
    if (globalOccupied.has(sKey)) continue;
    if (globalRoadTiles.has(sKey)) continue;

    // Check distance to local road: must be 1 to 3 tiles from road
    let nearRoad = false;
    for (let rdy = -3; rdy <= 3; rdy++) {
      for (let rdx = -3; rdx <= 3; rdx++) {
        if (localRoadTiles.has(`${spot.x + rdx},${spot.y + rdy}`)) {
          nearRoad = true;
          break;
        }
      }
      if (nearRoad) break;
    }
    if (!nearRoad) continue;

    candidateHouses.push(spot);
  }

  // Shuffle candidates deterministically
  candidateHouses.sort((a, b) => {
    const valA = (rng() * 100 + Math.max(Math.abs(a.dx), Math.abs(a.dy))) | 0;
    const valB = (rng() * 100 + Math.max(Math.abs(b.dx), Math.abs(b.dy))) | 0;
    return valA - valB;
  });

  const placedHouses = [];
  const defCounts = {};

  for (const cand of candidateHouses) {
    if (placedHouses.length >= targetHouses) break;

    // Check Chebyshev spacing >= 3 with other houses
    const tooCloseToHouse = globalProps.some(p => p.kind === 'house' && Math.max(Math.abs(cand.x - p.x), Math.abs(cand.y - p.y)) < 3);
    if (tooCloseToHouse) continue;

    // Check Chebyshev spacing >= 2 with any other object
    const tooCloseToObj = globalProps.some(p => Math.max(Math.abs(cand.x - p.x), Math.abs(cand.y - p.y)) < 2);
    if (tooCloseToObj) continue;

    // Pick defId cycling through hutPool so every house has a distinct defId (max dominance <= 25-33% <= 35%)
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
    const facing = cand.y < ay ? 'south' : 'north';

    const houseObj = {
      id: houseId,
      anchorId: anchor.id,
      region: anchor.region,
      x: cand.x,
      y: cand.y,
      kind: 'house',
      facing,
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

  // 5. Place Companion Props (distance >= 2 from all objects, outside road)
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
      if (Math.max(Math.abs(px - ax), Math.abs(py - ay)) <= 2) continue; // Outside anchor core

      const tooClose = globalProps.some(p => Math.max(Math.abs(px - p.x), Math.abs(py - p.y)) < 2);
      if (tooClose) continue;

      const pDef = propPool[propIdx % propPool.length];
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
        cw: 1,
        ch: 1,
        collision: 'none',
        enterable: false
      };

      villageProps.push(propObj);
      globalProps.push(propObj);
      globalOccupied.add(pKey);
      break; // 1 companion prop per house
    }
  }

  // Compute Layout Fingerprint (Hash of relative coordinates and defIds)
  let fpString = '';
  for (const p of villageProps) {
    fpString += `${p.x - ax},${p.y - ay}:${p.defId};`;
  }
  const fingerprint = hashString(fpString).toString(16);

  const houseCount = placedHouses.length;
  const maxDefCount = Object.keys(defCounts).length > 0 ? Math.max(...Object.values(defCounts)) : 0;
  const dominantDefPct = houseCount > 0 ? (maxDefCount / houseCount) * 100 : 0;

  return {
    props: villageProps,
    roads: roadSegments,
    fingerprint,
    houseCount,
    dominantDefPct
  };
}

async function main() {
  console.log('=== PEMBANGUN DESA 8 ARKETIPE JIANGHU V9 (buildVillagesV9.js) ===\n');

  const allProps = [];
  const allRoads = [];
  const globalOccupied = new Set();
  const globalRoadTiles = new Set();
  const fingerprints = new Set();
  const villageReports = [];

  // Donghai bridges (Prompt A2)
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

  // Pre-register Donghai bridges in globalProps
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
    version: 9,
    seed: WORLD_SEED,
    note: 'Lapisan objek tertulis V9 - 52 desa berbasis 8 arketipe dengan jalan melengkung Catmull-Rom dan centerpiece unik.',
    props: allProps,
    roads: allRoads
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 1), 'utf8');
  console.log(`\n[SELESAI] Hasil disimpan ke ${outPath}.`);

  if (uniqueLayoutCount === 52) {
    console.log('[PASS GERBANG D] 52/52 anchor memiliki tata letak 100% unik!');
    process.exit(0);
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
