/**
 * scripts/gen/buildRegionPOI.js
 * Generator for Regional Set-Pieces & Challenge Dressing (Prompt J2 & J5)
 *
 * Places deterministically for each of the 29 regions:
 * 1. Boundary stele (Prasasti penanda perbatasan)
 * 2. Two thematic POIs (Kuil kuno, peninggalan artefak, kamp pertapa)
 * 3. One resource node cluster (3-5 nodes: giok, besi roh, herba kuno)
 *
 * Places thematic dressing for all 145 challenge nodes (lair, elite camps, hazard)
 * ensuring >= 3 dressing objects within 6 tiles of each node.
 *
 * Output: world-data/region-poi-v10.json
 */

const fs = require('fs');
const path = require('path');
const GC = require('../../utils/gridContract');
const { getTileAt } = require('../../utils/proceduralWorldEngine');
const { getRegionAt } = require('../../utils/worldRegionEngine');

console.log('\n=== GENERATOR SET-PIECE REGIONAL & DRESSING TANTANGAN (buildRegionPOI.js) ===\n');

// 1. Load Data
const regions = require('../../world-data/regions.json');
const regionPalettes = require('../../world-data/region-palettes-v10.json');
const challengeData = require('../../world-data/region_challenge_v9.json');
const authoredProps = require('../../world-data/authored-props.json');

// Pre-fill occupied grid with authored props & roads
const occupiedGrid = new Map();
const AUTHORED_ROAD_TILES = new Set();

if (authoredProps.roads) {
  for (const r of authoredProps.roads) {
    const minX = Math.min(r.from.x, r.to.x);
    const maxX = Math.max(r.from.x, r.to.x);
    const minY = Math.min(r.from.y, r.to.y);
    const maxY = Math.max(r.from.y, r.to.y);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        AUTHORED_ROAD_TILES.add(`${x},${y}`);
      }
    }
  }
}

if (authoredProps.props) {
  for (const p of authoredProps.props) {
    const g = GC.getGrid(p.defId);
    if (g) {
      GC.mark(p.x, p.y, g, occupiedGrid, p.id);
    } else {
      occupiedGrid.set(`${p.x},${p.y}`, p.id);
    }
  }
}

const THEME_POI_DEFS = {
  temperate: {
    stele: 'building_wayside_stone_boundary_stele',
    poi1: 'building_spirit_gathering_gazebo',
    poi2: 'building_wayside_stone_stele_shrine_arbor',
    resources: ['resource_ancient_herb_garden', 'resource_spirit_jade', 'resource_spirit_spring']
  },
  cold: {
    stele: 'building_wayside_stone_stele',
    poi1: 'ancient_relic_kunlun_mirror',
    poi2: 'building_mountain_hermitage_shack',
    resources: ['resource_snow_lotus', 'resource_spirit_jade']
  },
  desert: {
    stele: 'building_wayside_mile_marker_stele',
    poi1: 'ancient_relic_haotian_tower',
    poi2: 'building_wayside_stone_stele_pavilion_ruin',
    resources: ['resource_spirit_jade', 'resource_iron_ore']
  },
  volcanic: {
    stele: 'building_wayside_stone_stele',
    poi1: 'ancient_relic_donghuang_bell',
    poi2: 'building_wayside_spirit_altar',
    resources: ['resource_dragon_blood_grass', 'resource_heavenly_iron_ore']
  },
  swamp: {
    stele: 'building_wayside_stone_boundary_stele',
    poi1: 'ancient_relic_shennong_herbal_cauldron',
    poi2: 'building_countryside_thatched_gazebo',
    resources: ['resource_dragon_blood_grass', 'resource_ironwood_log']
  },
  mountain: {
    stele: 'building_wayside_stone_boundary_stele',
    poi1: 'structure_scatter_mountain_daoist_stone_lantern_beacon',
    poi2: 'building_wooden_watchtower',
    resources: ['resource_heavenly_iron_ore', 'resource_iron_ore']
  },
  sea: {
    stele: 'building_wayside_bamboo_raft_mooring_post',
    poi1: 'building_riverside_watermill_paddle_wheel',
    poi2: 'ancient_relic_nuwa_stone',
    resources: ['resource_golden_carp', 'resource_spirit_koi_pool']
  },
  ruin: {
    stele: 'building_wayside_stone_stele_pavilion_ruin',
    poi1: 'ancient_relic_xuanyuan_sword',
    poi2: 'structure_scatter_ruin_ancient_broken_halberd_sword_grave',
    resources: ['resource_ancient_sword_tomb', 'resource_spirit_jade']
  },
  grass: {
    stele: 'building_wayside_wooden_mile_marker_stele',
    poi1: 'building_wayside_tea_resting_shed',
    poi2: 'building_wayside_earth_god_miniature_shrine',
    resources: ['resource_ironwood_log', 'resource_ancient_herb_garden']
  },
  forest: {
    stele: 'building_wayside_stone_boundary_stele',
    poi1: 'building_rustic_apiary_beehives',
    poi2: 'building_village_thatched_granary_round',
    resources: ['resource_spirit_wood', 'resource_ironwood_log']
  }
};

function findFreeCell(targetX, targetY, defId, maxRadius = 35, requiredRegionId = null) {
  const g = GC.getGrid(defId);
  const fw = g ? g.fw : 1;
  const fh = g ? g.fh : 1;

  for (let r = 0; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = targetX + dx;
        const y = targetY + dy;

        // Bounds check
        if (x < 10 || x > 4990 || y < 10 || y > 4990) continue;

        // Road check
        let touchesRoad = false;
        for (let fy = 0; fy < fh; fy++) {
          for (let fx = 0; fx < fw; fx++) {
            if (AUTHORED_ROAD_TILES.has(`${x + fx},${y + fy}`)) {
              touchesRoad = true;
              break;
            }
          }
          if (touchesRoad) break;
        }
        if (touchesRoad) continue;

        // Terrain check
        const tile = getTileAt(x, y);
        if (!tile) continue;
        const t = tile.terrainType || '';
        if (tile.isSolid && !t.includes('mountain') && !t.includes('cliff') && !t.includes('rock')) continue;
        if (!defId.includes('carp') && !defId.includes('koi') && !defId.includes('raft') && !defId.includes('watermill') && !defId.includes('dock')) {
          if (t.includes('water') || t.includes('sea') || t.includes('ocean')) continue;
        }

        // Region match
        if (requiredRegionId) {
          const reg = getRegionAt(x, y);
          if (reg.id !== requiredRegionId) continue;
        }

        // Grid contract free check
        if (g) {
          if (!GC.isFree(x, y, g, occupiedGrid)) continue;
        } else {
          if (occupiedGrid.has(`${x},${y}`)) continue;
        }

        return { x, y };
      }
    }
  }
  return null;
}

const regionPois = [];

// 2. Generate 4 Set-Pieces per Region (29 Regions)
console.log('Menempatkan 4 Set-Piece per Wilayah (29 Wilayah)...');
let totalSetPiecesPlaced = 0;

for (const reg of regions) {
  const themeName = regionPalettes.regions[reg.id] || 'temperate';
  const themeDefs = THEME_POI_DEFS[themeName] || THEME_POI_DEFS.temperate;
  const b = reg.bounds;
  const cx = Math.floor((b.minX + b.maxX) / 2);
  const cy = Math.floor((b.minY + b.maxY) / 2);

  // 1. Boundary Stele (near entrance / border)
  const steleTargetX = Math.floor(b.minX + (b.maxX - b.minX) * 0.15);
  const steleTargetY = cy;
  const stelePos = findFreeCell(steleTargetX, steleTargetY, themeDefs.stele, 45, reg.id) ||
                   findFreeCell(cx, cy, themeDefs.stele, 45, reg.id);
  if (stelePos) {
    const objId = `poi_stele_${reg.id}_${stelePos.x}_${stelePos.y}`;
    const g = GC.getGrid(themeDefs.stele);
    if (g) GC.mark(stelePos.x, stelePos.y, g, occupiedGrid, objId);
    else occupiedGrid.set(`${stelePos.x},${stelePos.y}`, objId);

    regionPois.push({
      id: objId,
      defId: themeDefs.stele,
      x: stelePos.x,
      y: stelePos.y,
      regionId: reg.id,
      kind: 'boundary_stele',
      customLabel: `Prasasti Batas ${reg.name}`
    });
    totalSetPiecesPlaced++;
  }

  // 2. Thematic POI 1
  const poi1TargetX = cx - Math.floor((b.maxX - b.minX) * 0.18);
  const poi1TargetY = cy + Math.floor((b.maxY - b.minY) * 0.12);
  const poi1Pos = findFreeCell(poi1TargetX, poi1TargetY, themeDefs.poi1, 50, reg.id) ||
                  findFreeCell(cx, cy, themeDefs.poi1, 50, reg.id);
  if (poi1Pos) {
    const objId = `poi_thematic_1_${reg.id}_${poi1Pos.x}_${poi1Pos.y}`;
    const g = GC.getGrid(themeDefs.poi1);
    if (g) GC.mark(poi1Pos.x, poi1Pos.y, g, occupiedGrid, objId);
    else occupiedGrid.set(`${poi1Pos.x},${poi1Pos.y}`, objId);

    regionPois.push({
      id: objId,
      defId: themeDefs.poi1,
      x: poi1Pos.x,
      y: poi1Pos.y,
      regionId: reg.id,
      kind: 'thematic_poi_1',
      customLabel: `Peninggalan Kuno ${reg.name}`
    });
    totalSetPiecesPlaced++;
  }

  // 3. Thematic POI 2
  const poi2TargetX = cx + Math.floor((b.maxX - b.minX) * 0.18);
  const poi2TargetY = cy - Math.floor((b.maxY - b.minY) * 0.12);
  const poi2Pos = findFreeCell(poi2TargetX, poi2TargetY, themeDefs.poi2, 50, reg.id) ||
                  findFreeCell(cx, cy, themeDefs.poi2, 50, reg.id);
  if (poi2Pos) {
    const objId = `poi_thematic_2_${reg.id}_${poi2Pos.x}_${poi2Pos.y}`;
    const g = GC.getGrid(themeDefs.poi2);
    if (g) GC.mark(poi2Pos.x, poi2Pos.y, g, occupiedGrid, objId);
    else occupiedGrid.set(`${poi2Pos.x},${poi2Pos.y}`, objId);

    regionPois.push({
      id: objId,
      defId: themeDefs.poi2,
      x: poi2Pos.x,
      y: poi2Pos.y,
      regionId: reg.id,
      kind: 'thematic_poi_2',
      customLabel: `Kuil Semesta ${reg.name}`
    });
    totalSetPiecesPlaced++;
  }

  // 4. Resource Node Cluster (3 to 5 nodes)
  const resTargetX = cx + Math.floor((b.maxX - b.minX) * 0.08);
  const resTargetY = cy + Math.floor((b.maxY - b.minY) * 0.08);
  const clusterCenter = findFreeCell(resTargetX, resTargetY, themeDefs.resources[0], 50, reg.id) ||
                        findFreeCell(cx, cy, themeDefs.resources[0], 50, reg.id);

  if (clusterCenter) {
    const numNodes = 4;
    const OFFSETS = [
      { dx: 0, dy: 0 },
      { dx: 2, dy: 1 },
      { dx: -2, dy: 2 },
      { dx: 1, dy: -2 },
      { dx: -1, dy: -2 }
    ];

    for (let ni = 0; ni < numNodes; ni++) {
      const off = OFFSETS[ni];
      const rDef = themeDefs.resources[ni % themeDefs.resources.length];
      const rPos = findFreeCell(clusterCenter.x + off.dx, clusterCenter.y + off.dy, rDef, 4, reg.id);
      if (rPos) {
        const objId = `poi_resource_${reg.id}_${ni}_${rPos.x}_${rPos.y}`;
        const g = GC.getGrid(rDef);
        if (g) GC.mark(rPos.x, rPos.y, g, occupiedGrid, objId);
        else occupiedGrid.set(`${rPos.x},${rPos.y}`, objId);

        regionPois.push({
          id: objId,
          defId: rDef,
          x: rPos.x,
          y: rPos.y,
          regionId: reg.id,
          kind: 'resource_cluster',
          customLabel: `Sumber Daya ${reg.name}`
        });
        totalSetPiecesPlaced++;
      }
    }
  }
}

console.log(`Berhasil menempatkan ${totalSetPiecesPlaced} set-piece di 29 wilayah.\n`);

// 3. Generate Thematic Dressing for 145 Challenge Nodes (Prompt J5)
console.log('Menempatkan Dekorasi Tematik untuk 145 Titik Tantangan (Prompt J5)...');
let totalDressingPlaced = 0;
let challengeNodesProcessed = 0;

const CHALLENGE_DRESSING_DEFS = {
  lair: [
    'building_wayside_spirit_altar',
    'structure_scatter_ruin_ancient_broken_halberd_sword_grave',
    'building_stone_lantern_shrine',
    'building_wayside_stone_stele'
  ],
  eliteCamp: [
    'building_wooden_watchtower',
    'structure_scatter_mountain_daoist_stone_lantern_beacon',
    'building_blacksmith_weapon_rack',
    'building_wayside_stone_stele_shrine_arbor'
  ],
  hazardZone: [
    'building_wayside_stone_stele_pavilion_ruin',
    'ancient_relic_donghuang_bell',
    'building_stone_water_basin',
    'building_wayside_spirit_altar'
  ]
};

for (const [regId, chal] of Object.entries(challengeData)) {
  const nodes = [
    { type: 'lair', ...chal.lair },
    ...(chal.eliteCamps || []).map(ec => ({ type: 'eliteCamp', ...ec })),
    { type: 'hazardZone', ...chal.hazardZone }
  ].filter(n => n.x != null && n.y != null);

  for (const n of nodes) {
    challengeNodesProcessed++;
    const dressingDefs = CHALLENGE_DRESSING_DEFS[n.type] || CHALLENGE_DRESSING_DEFS.lair;

    // Place at least 3 thematic dressing props within Chebyshev radius 2..5 of the node
    const CANDIDATES = [
      { dx: 3, dy: 1 },
      { dx: -3, dy: -2 },
      { dx: 2, dy: -3 },
      { dx: -2, dy: 3 },
      { dx: 4, dy: 2 },
      { dx: -4, dy: 1 }
    ];

    let placedForThisNode = 0;
    for (let ci = 0; ci < CANDIDATES.length && placedForThisNode < 3; ci++) {
      const off = CANDIDATES[ci];
      const dDef = dressingDefs[placedForThisNode % dressingDefs.length];
      const dPos = findFreeCell(n.x + off.dx, n.y + off.dy, dDef, 3, regId);
      if (dPos) {
        const objId = `chal_dress_${regId}_${n.type}_${dPos.x}_${dPos.y}`;
        const g = GC.getGrid(dDef);
        if (g) GC.mark(dPos.x, dPos.y, g, occupiedGrid, objId);
        else occupiedGrid.set(`${dPos.x},${dPos.y}`, objId);

        regionPois.push({
          id: objId,
          defId: dDef,
          x: dPos.x,
          y: dPos.y,
          regionId: regId,
          kind: 'challenge_dressing',
          challengeType: n.type,
          parentNode: { x: n.x, y: n.y },
          customLabel: `Dekorasi ${n.type}`
        });
        placedForThisNode++;
        totalDressingPlaced++;
      }
    }
  }
}

console.log(`Memproses ${challengeNodesProcessed} Titik Tantangan.`);
console.log(`Berhasil menempatkan ${totalDressingPlaced} objek dekorasi tantangan.\n`);

// 4. Save to world-data/region-poi-v10.json
const outputPath = path.resolve(__dirname, '../../world-data/region-poi-v10.json');
const outputPayload = {
  version: 'v10',
  updatedAt: new Date().toISOString(),
  totalObjects: regionPois.length,
  totalSetPieces: totalSetPiecesPlaced,
  totalChallengeDressing: totalDressingPlaced,
  pois: regionPois
};

fs.writeFileSync(outputPath, JSON.stringify(outputPayload, null, 2), 'utf8');
console.log(`[PASS] Berkas berhasil disimpan ke: ${outputPath}`);
console.log(`Total Objek Regional POI & Dekorasi Tantangan: ${regionPois.length}`);
console.log('SELESAI (EXIT 0)\n');
