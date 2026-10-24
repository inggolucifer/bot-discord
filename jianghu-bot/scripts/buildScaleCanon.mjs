import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const atlasIndexPath = path.resolve(__dirname, '../web-dashboard/public/assets/atlas/atlas_index.json');
const scaleCanonPath = path.resolve(__dirname, '../world-data/scale-canon.json');
const webScaleCanonPath = path.resolve(__dirname, '../web-dashboard/src/config/scaleCanon.json');
const scaleFlagsCsvPath = path.resolve(__dirname, '../review/scale_flags.csv');

const reviewDir = path.resolve(__dirname, '../review');
if (!fs.existsSync(reviewDir)) fs.mkdirSync(reviewDir, { recursive: true });

const atlasIndex = JSON.parse(fs.readFileSync(atlasIndexPath, 'utf8'));

// Map pages containing world/biome/settlement objects
const MAP_PAGES = [
  'biome_nature_0', 'biome_nature_1', 'biome_nature_2', 'biome_nature_3',
  'biome_nature_4', 'biome_nature_5', 'biome_nature_6', 'biome_nature_7',
  'settlement_0', 'settlement_1', 'settlement_2', 'settlement_3', 'settlement_4',
  'core_0', 'core_1'
];

function determineCategoryAndClass(id, f) {
  const w = f.frame.w;
  const h = f.frame.h;
  const cw = f.footprint?.cw || 1;
  const ch = f.footprint?.ch || 1;

  // 1. Regional Landmark (XXL: visualW 8-12, collision base 6x4 to 10x6)
  if (id.startsWith('landmark_')) {
    return {
      category: 'landmark',
      sizeClass: 'XXL',
      visualW: 10.0,
      collision: { w: 6, h: 4, offsetX: 2.0 },
      anchor: { x: 0.5, y: 0.95 }
    };
  }

  // 1b. Regional Authored Huts (Prompt 3 - class S, 1x1 grid)
  if (id.startsWith('hut_')) {
    return {
      category: 'building',
      sizeClass: 'S',
      visualW: 1.2,
      collision: { w: 1, h: 1, offsetX: 0.1 },
      anchor: { x: 0.5, y: 0.92 }
    };
  }

  // 1c. Authored Village Props (Prompt 3 - class S, 1x1 grid)
  if (id.startsWith('prop_')) {
    const isPassable = id.includes('campfire') || id.includes('vegetable_patch');
    return {
      category: 'building',
      sizeClass: 'S',
      visualW: 1.0,
      collision: isPassable ? { w: 0, h: 0, offsetX: 0.5 } : { w: 1, h: 1, offsetX: 0 },
      anchor: { x: 0.5, y: 0.92 }
    };
  }

  // 2. Flora, Flowers, Medicinal Herbs & Shrubs (S: visualW 0.9–1.1)
  // MUST RUN BEFORE Mountains & Trees to prevent 'nature_wild_mountain_peony_cluster' being classified as mountain!
  const isFlora = (
    id.includes('peony') || id.includes('camellia') || id.includes('flower') ||
    id.includes('medicinal') || id.includes('herb') || id.includes('ginseng') ||
    id.includes('lotus') || id.includes('orchid') || id.includes('shrub') ||
    id.includes('tea_bush') || id.includes('creeper') || id.includes('chrysanthemum') ||
    id.includes('grass') || id.includes('mushroom') || id.includes('fern') ||
    id.includes('wolfberry') || id.includes('angelica') || id.includes('polygonum') ||
    id.includes('salvia') || id.includes('astragalus') || id.includes('licorice') ||
    id.includes('aconite') || id.includes('coptis') || id.includes('polygonatum') ||
    id.includes('codonopsis') || id.includes('rehmannia') || id.includes('skullcap')
  );

  if (isFlora && !id.startsWith('tree_') && !id.includes('spirit_tree') && !id.startsWith('landmark_')) {
    // Flower clusters like peony and camellia: 1.1x1.1 (fits gracefully in 1 grid)
    if (id.includes('peony') || id.includes('camellia') || id.includes('tea_bush') || id.includes('cluster')) {
      return {
        category: 'nature',
        sizeClass: 'S',
        visualW: 1.1,
        collision: { w: 0, h: 0, offsetX: 0.55 },
        anchor: { x: 0.5, y: 0.92 }
      };
    }
    return {
      category: 'nature',
      sizeClass: 'S',
      visualW: 1.0,
      collision: { w: 0, h: 0, offsetX: 0.5 },
      anchor: { x: 0.5, y: 0.92 }
    };
  }

  // 3. Small Street, Yard & Rural Props (S: visualW 0.9–1.2, 1-grid)
  // MUST RUN BEFORE general buildings to prevent lantern, well, bench from becoming 3x3 buildings!
  const isSmallProp = (
    id.includes('lantern') || id.includes('well') || id.includes('bench') ||
    id.includes('flagpole') || id.includes('mooring_post') || id.includes('stepping_stones') ||
    id.includes('notice_board') || id.includes('mailbox') || id.includes('signpost') ||
    id.includes('scarecrow') || id.includes('chicken_coop') || id.includes('duck_coop') ||
    id.includes('mortar_pestle') || id.includes('roller_mill') || id.includes('grain_grinder') ||
    id.includes('water_trough') || id.includes('water_basin') || id.includes('cistern') ||
    id.includes('drying_mat') || id.includes('haystack') || id.includes('apiary') ||
    id.includes('torch_beacon') || id.includes('earth_god_miniature_shrine') ||
    id.includes('weapon_rack') || id.includes('mile_marker') || id.includes('boundary_stele') ||
    id.includes('fish_trap') || id.includes('fortune_teller') || id.includes('stele_shrine') ||
    id.includes('pebble_shoal')
  );

  if (isSmallProp && !id.startsWith('landmark_')) {
    if (id.includes('lantern') || id.includes('torch')) {
      return {
        category: 'building',
        sizeClass: 'S',
        visualW: 1.0,
        collision: { w: 1, h: 1, offsetX: 0 },
        anchor: { x: 0.5, y: 0.95 }
      };
    }
    if (id.includes('well') || id.includes('coop') || id.includes('bench') || id.includes('weapon_rack') || id.includes('drying_mat')) {
      return {
        category: 'building',
        sizeClass: 'S',
        visualW: 1.15,
        collision: { w: 1, h: 1, offsetX: 0.075 },
        anchor: { x: 0.5, y: 0.92 }
      };
    }
    return {
      category: 'building',
      sizeClass: 'S',
      visualW: 1.0,
      collision: { w: 1, h: 1, offsetX: 0 },
      anchor: { x: 0.5, y: 0.95 }
    };
  }

  // 4. Resource Gathering Nodes (S, 1x1 grid)
  if (id.startsWith('resource_')) {
    return {
      category: 'resource',
      sizeClass: 'S',
      visualW: 1.0,
      collision: { w: 0, h: 0, offsetX: 0.5 },
      anchor: { x: 0.5, y: 0.95 }
    };
  }

  // 5. Autotile Textures (S, 1x1)
  if (id.startsWith('autotile_')) {
    return {
      category: 'autotile',
      sizeClass: 'S',
      visualW: 1.0,
      collision: { w: 1, h: 1, offsetX: 0 },
      anchor: { x: 0.5, y: 0.5 }
    };
  }

  // 6. Mountains & Crags (L / XL / XXL)
  const isActualMountain = (
    id.startsWith('mt_') || id.includes('cliff') || id.includes('crag') ||
    id.includes('bastion') || id.includes('twin_peaks') || id.includes('karst_pillar') ||
    id.includes('mountain_pass_stone_archway') || id.includes('mountain_hermitage') ||
    (id.includes('mountain') && !isFlora && !isSmallProp)
  );
  if (isActualMountain) {
    if (w >= 600 || cw >= 6 || id.includes('bastion') || id.includes('ridge')) {
      return {
        category: 'mountain',
        sizeClass: 'XXL',
        visualW: 9.0,
        collision: { w: 6, h: 3, offsetX: 1.5 },
        anchor: { x: 0.5, y: 0.95 }
      };
    }
    if (w >= 500 || cw >= 4 || id.includes('twin_peaks')) {
      return {
        category: 'mountain',
        sizeClass: 'XL',
        visualW: 6.0,
        collision: { w: 4, h: 2, offsetX: 1.0 },
        anchor: { x: 0.5, y: 0.95 }
      };
    }
    return {
      category: 'mountain',
      sizeClass: 'L',
      visualW: 3.5,
      collision: { w: 2, h: 1, offsetX: 0.75 },
      anchor: { x: 0.5, y: 0.95 }
    };
  }

  // 3. Buildings & Architecture (M / L / XL)
  if (
    id.startsWith('building_') || id.startsWith('structure_') ||
    id.startsWith('pagoda_') || id.startsWith('sect_') ||
    id.startsWith('xitong_') || id.startsWith('pavilion_') ||
    id.startsWith('village_')
  ) {
    if (w >= 600 || cw >= 5 || id.includes('gate') || id.includes('pagoda') || id.includes('xitong')) {
      return {
        category: 'building',
        sizeClass: 'XL',
        visualW: 6.0,
        collision: { w: 4, h: 2, offsetX: 1.0 },
        anchor: { x: 0.5, y: 0.95 }
      };
    }
    if (w >= 400 || cw >= 3 || id.includes('inn') || id.includes('residence') || id.includes('hall')) {
      return {
        category: 'building',
        sizeClass: 'L',
        visualW: 4.0,
        collision: { w: 3, h: 2, offsetX: 0.5 },
        anchor: { x: 0.5, y: 0.95 }
      };
    }
    return {
      category: 'building',
      sizeClass: 'M',
      visualW: 3.0,
      collision: { w: 2, h: 1, offsetX: 0.5 },
      anchor: { x: 0.5, y: 0.95 }
    };
  }

  // 4. Trees & Flora (M / L)
  if (
    id.startsWith('tree_') || id.startsWith('pine_') ||
    id.startsWith('willow_') || id.startsWith('spirit_tree') ||
    id.includes('tree')
  ) {
    if (w >= 400 || h >= 460 || cw >= 3) {
      return {
        category: 'tree',
        sizeClass: 'L',
        visualW: 3.5,
        collision: { w: 1, h: 1, offsetX: 1.25 },
        anchor: { x: 0.5, y: 0.95 }
      };
    }
    return {
      category: 'tree',
      sizeClass: 'M',
      visualW: 2.5,
      collision: { w: 1, h: 1, offsetX: 0.75 },
      anchor: { x: 0.5, y: 0.95 }
    };
  }

  // 5. Bamboo Groves (S / M)
  if (id.startsWith('bamboo_')) {
    if (w >= 300 || cw >= 2) {
      return {
        category: 'bamboo',
        sizeClass: 'M',
        visualW: 2.25,
        collision: { w: 1, h: 1, offsetX: 0.625 },
        anchor: { x: 0.5, y: 0.92 }
      };
    }
    return {
      category: 'bamboo',
      sizeClass: 'S',
      visualW: 1.25,
      collision: { w: 1, h: 1, offsetX: 0.125 },
      anchor: { x: 0.5, y: 0.92 }
    };
  }

  // 6. Rocks & Boulders (S / M / L)
  if (id.startsWith('rock_') || id.includes('boulder') || (id.includes('stone') && !id.includes('relic'))) {
    if (w >= 350 || cw >= 3) {
      return {
        category: 'rock',
        sizeClass: 'L',
        visualW: 3.5,
        collision: { w: 2, h: 1, offsetX: 0.75 },
        anchor: { x: 0.5, y: 0.95 }
      };
    }
    if (w >= 220 || cw >= 2) {
      return {
        category: 'rock',
        sizeClass: 'M',
        visualW: 2.0,
        collision: { w: 1, h: 1, offsetX: 0.5 },
        anchor: { x: 0.5, y: 0.95 }
      };
    }
    return {
      category: 'rock',
      sizeClass: 'S',
      visualW: 1.25,
      collision: { w: 1, h: 1, offsetX: 0.125 },
      anchor: { x: 0.5, y: 0.95 }
    };
  }

  // 7. Ancient Relics (S / M)
  if (id.startsWith('ancient_relic_')) {
    return {
      category: 'relic',
      sizeClass: 'S',
      visualW: 1.5,
      collision: { w: 1, h: 1, offsetX: 0.25 },
      anchor: { x: 0.5, y: 0.95 }
    };
  }

  // 12. Quest Markers & Rings (S/M)
  if (id.startsWith('ring_') || id.startsWith('marker_')) {
    return {
      category: 'marker',
      sizeClass: 'S',
      visualW: 1.25,
      collision: { w: 0, h: 0, offsetX: 0.625 },
      anchor: { x: 0.5, y: 0.5 }
    };
  }

  // 13. Fallback Small (XS / S: w <= 200)
  if (w <= 200 || h <= 200) {
    return {
      category: 'nature',
      sizeClass: 'S',
      visualW: 1.0,
      collision: { w: 0, h: 0, offsetX: 0.5 },
      anchor: { x: 0.5, y: 0.95 }
    };
  }

  // 14. Fallback Nature scenic object
  return {
    category: 'nature',
    sizeClass: 'M',
    visualW: 2.0,
    collision: { w: 1, h: 1, offsetX: 0.5 },
    anchor: { x: 0.5, y: 0.95 }
  };
}

function determineLight(id, category) {
  if (id.includes('lantern') || id.includes('lamp')) {
    return { r: 3.5, color: '#FFAA50', flicker: 0.05 };
  }
  if (id.includes('torch') || id.includes('brazier') || id.includes('fire')) {
    return { r: 4.0, color: '#FF7720', flicker: 0.08 };
  }
  if (id.includes('crystal') || id.includes('spring') || id.includes('spirit_tree')) {
    return { r: 3.0, color: '#50E3C2', flicker: 0.03 };
  }
  if (id.includes('beacon') || id.includes('relic_xuanyuan') || id.includes('relic_haotian')) {
    return { r: 5.0, color: '#FFD700', flicker: 0.04 };
  }
  return null;
}

const scaleCanon = {};
const flags = [];

let processedCount = 0;

for (const [id, f] of Object.entries(atlasIndex.frames)) {
  if (!MAP_PAGES.includes(f.page)) continue;

  const { category, sizeClass, visualW, collision, anchor } = determineCategoryAndClass(id, f);
  const srcW = f.frame.w;
  const srcH = f.frame.h;

  const ratio = Number((srcH / srcW).toFixed(4));
  const visualH = Number((visualW * ratio).toFixed(3));
  const pxPerTile = Number((srcW / visualW).toFixed(1));
  const light = determineLight(id, category);

  scaleCanon[id] = {
    id,
    page: f.page,
    category,
    class: sizeClass,
    srcW,
    srcH,
    visualW,
    visualH,
    ratio,
    collision,
    pxPerTile,
    anchor,
    light
  };

  processedCount++;

  // Check scale flags
  const isRatioAnomalous = ratio < 0.35 || ratio > 2.5;
  const isLowResForZoom = pxPerTile < 128;

  if (isRatioAnomalous || isLowResForZoom) {
    flags.push({
      id,
      page: f.page,
      category,
      class: sizeClass,
      srcW,
      srcH,
      visualW,
      ratio,
      pxPerTile,
      reason: [
        isRatioAnomalous ? 'ratio_anomaly' : null,
        isLowResForZoom ? 'low_px_per_tile' : null
      ].filter(Boolean).join(';')
    });
  }
}

// Write world-data/scale-canon.json
fs.writeFileSync(scaleCanonPath, JSON.stringify(scaleCanon, null, 2), 'utf8');
console.log(`[buildScaleCanon] Wrote ${processedCount} entries to world-data/scale-canon.json`);

// Write web-dashboard/src/config/scaleCanon.json
fs.writeFileSync(webScaleCanonPath, JSON.stringify(scaleCanon, null, 2), 'utf8');
console.log(`[buildScaleCanon] Wrote ${processedCount} entries to web-dashboard/src/config/scaleCanon.json`);

// Write review/scale_flags.csv
let csv = 'id,page,category,class,srcW,srcH,visualW,ratio,pxPerTile,reason\n';
for (const flag of flags) {
  csv += `${flag.id},${flag.page},${flag.category},${flag.class},${flag.srcW},${flag.srcH},${flag.visualW},${flag.ratio},${flag.pxPerTile},${flag.reason}\n`;
}
fs.writeFileSync(scaleFlagsCsvPath, csv, 'utf8');
console.log(`[buildScaleCanon] Wrote ${flags.length} flagged frames to review/scale_flags.csv`);
