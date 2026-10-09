/**
 * JIANGHU WORLD — PROCEDURAL OBJECT & TERRAIN SHUIMO GENERATOR (T0 PIPELINE)
 * Style Bible Compliant: Traditional Chinese Ink-Wash (Shuimo/Xieyi).
 * Muted palette: Jade green (#5E8C7B), Slate blue (#7C97A6), Warm grey (#9A8F82), Xuan paper (#F4F1EA), Cinnabar (#9B3A2E).
 * Generates procedural tall objects (karst rock pillars, bamboo clumps, pavilions, mountains, trees)
 * and seamless paper wash textures when static atlas sprites are not yet loaded.
 */

import { WorldObjectDef, NpcAttitude } from '@/types/world';

// ============================================================================
// 1. OBJECT DEFINITIONS REGISTRY (T0 PROCEDURAL & ATLAS COMPATIBLE)
// ============================================================================

export const OBJECT_DEFINITIONS: Record<string, WorldObjectDef> = {
  // --- KARST PILLARS & PEAKS ---
  karst_pillar_1x1: {
    id: 'karst_pillar_1x1',
    name: 'Pilar Karst Tunggal',
    px: { w: 100, h: 220 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.95 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['mountain', 'karst']
  },
  mt_rock_2x1: {
    id: 'mt_rock_2x1',
    name: 'Tebing Batu Karst Sedang',
    px: { w: 200, h: 280 },
    footprint: { cw: 2, ch: 1 },
    anchor: { x: 0.5, y: 0.95 },
    overhangCells: 1.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['mountain', 'cliff']
  },
  mt_rock_2x2: {
    id: 'mt_rock_2x2',
    name: 'Gugusan Gunung Cadas',
    px: { w: 200, h: 360 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.95 },
    overhangCells: 1.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['mountain', 'barrier']
  },
  mt_rock_3x2: {
    id: 'mt_rock_3x2',
    name: 'Puncak Gunung Azure Megah',
    px: { w: 300, h: 440 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.95 },
    overhangCells: 2.4,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['mountain', 'barrier']
  },
  mt_rock_4x3: {
    id: 'mt_rock_4x3',
    name: 'Dinding Benteng Pegunungan Raksasa',
    px: { w: 400, h: 560 },
    footprint: { cw: 4, ch: 3 },
    anchor: { x: 0.5, y: 0.95 },
    overhangCells: 2.6,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['mountain', 'barrier']
  },

  // --- BAMBOO GROVES & FORESTS ---
  bamboo_clump_1x1: {
    id: 'bamboo_clump_1x1',
    name: 'Rumpun Bambu Hijau',
    px: { w: 100, h: 180 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 0.8,
    collision: 'soft',
    staminaMult: 1.25,
    sortBias: 0,
    fogFoot: true,
    tags: ['bamboo', 'vegetation']
  },
  bamboo_clump_2x1: {
    id: 'bamboo_clump_2x1',
    name: 'Rumpun Bambu Rimbun',
    px: { w: 200, h: 220 },
    footprint: { cw: 2, ch: 1 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 1.2,
    collision: 'soft',
    staminaMult: 1.3,
    sortBias: 0,
    fogFoot: true,
    tags: ['bamboo', 'vegetation']
  },
  bamboo_clump_2x2: {
    id: 'bamboo_clump_2x2',
    name: 'Hutan Bambu Padat Tinta',
    px: { w: 200, h: 260 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 0.6,
    collision: 'soft',
    staminaMult: 1.35,
    sortBias: 0,
    fogFoot: true,
    tags: ['bamboo', 'vegetation']
  },

  // --- TREES ---
  pine_tree_1x1: {
    id: 'pine_tree_1x1',
    name: 'Pohon Pinus Kuno',
    px: { w: 100, h: 160 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 0.6,
    collision: 'soft',
    staminaMult: 1.15,
    sortBias: 0,
    fogFoot: true,
    tags: ['tree', 'pine']
  },
  spirit_tree_2x2: {
    id: 'spirit_tree_2x2',
    name: 'Pohon Roh Bertunas Cahaya',
    px: { w: 200, h: 280 },
    footprint: { cw: 2, ch: 2 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['tree', 'spirit']
  },

  // --- STRUCTURES & SET-PIECES ---
  pavilion_1x1: {
    id: 'pavilion_1x1',
    name: 'Paviliun Teh Tepi Jalan',
    px: { w: 100, h: 140 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.4,
    collision: 'none',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: false,
    tags: ['building', 'pavilion']
  },
  village_house_2x1: {
    id: 'village_house_2x1',
    name: 'Gubuk Desa Beratap Jerami',
    px: { w: 200, h: 180 },
    footprint: { cw: 2, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.8,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: false,
    tags: ['building', 'residence']
  },
  sect_gate_3x2: {
    id: 'sect_gate_3x2',
    name: 'Gerbang Megah Balai Sekte',
    px: { w: 300, h: 320 },
    footprint: { cw: 3, ch: 2 },
    anchor: { x: 0.5, y: 0.92 },
    overhangCells: 1.2,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: true,
    tags: ['building', 'sect']
  },
  boulder_1x1: {
    id: 'boulder_1x1',
    name: 'Bongkahan Batu Cadas',
    px: { w: 100, h: 110 },
    footprint: { cw: 1, ch: 1 },
    anchor: { x: 0.5, y: 0.9 },
    overhangCells: 0.1,
    collision: 'solid',
    staminaMult: 1.0,
    sortBias: 0,
    fogFoot: false,
    tags: ['rock']
  }
};

// ============================================================================
// 2. TERRAIN COLOR PALETTES (L1 WASH ENGINE)
// ============================================================================

export interface TerrainWashPalette {
  baseColor: string;
  accentColor: string;
  mistColor: string;
  isWater?: boolean;
  isHazard?: boolean;
  staminaCost: number;
}

export function getTerrainWashPalette(terrainType: string): TerrainWashPalette {
  switch (terrainType) {
    // Water
    case 'river':
    case 'river_shallow':
      return { baseColor: '#A4C4CE', accentColor: '#7C97A6', mistColor: '#DCE8EC', isWater: true, staminaCost: 1.5 };
    case 'lake':
    case 'lake_deep':
      return { baseColor: '#7C9EB2', accentColor: '#53788F', mistColor: '#C8DEE8', isWater: true, staminaCost: 2.0 };
    case 'ocean':
    case 'eastern_sea':
    case 'sea':
    case 'sea_reef':
      return { baseColor: '#5C8299', accentColor: '#3E5E73', mistColor: '#B0C9D6', isWater: true, staminaCost: 3.0 };
    case 'pond_lotus':
      return { baseColor: '#93B7AA', accentColor: '#5E8C7B', mistColor: '#D7E9E2', isWater: true, staminaCost: 1.4 };

    // Vegetation & Farmland
    case 'meadow':
      return { baseColor: '#D4DEC9', accentColor: '#A8BC99', mistColor: '#EFF3EA', staminaCost: 1.0 };
    case 'farmland':
    case 'herb_field':
      return { baseColor: '#C9D6B8', accentColor: '#8CA37A', mistColor: '#E9EFE0', staminaCost: 1.0 };
    case 'bamboo_grove':
    case 'bamboo_dense':
    case 'bamboo_forest':
      return { baseColor: '#BDCEBA', accentColor: '#5E8C7B', mistColor: '#E2EBE0', staminaCost: 1.3 };
    case 'spirit_wood':
    case 'forest':
      return { baseColor: '#B5C4B1', accentColor: '#4A6B53', mistColor: '#DFE7DC', staminaCost: 1.2 };
    case 'dead_wood':
      return { baseColor: '#C4BCB1', accentColor: '#736B60', mistColor: '#E5E0DA', staminaCost: 1.4 };

    // Mountains, Hills & Cliffs
    case 'hill':
    case 'ridge_low':
      return { baseColor: '#CDC4B5', accentColor: '#9A8F82', mistColor: '#ECE7E0', staminaCost: 1.6 };
    case 'mountain':
    case 'azure_mountain':
    case 'mountain_rock':
    case 'cliff':
      return { baseColor: '#B2ABA0', accentColor: '#5C5449', mistColor: '#DDD7CF', staminaCost: 3.5 };
    case 'mountain_peak':
      return { baseColor: '#999187', accentColor: '#3D372E', mistColor: '#CECBC5', staminaCost: 4.0 };
    case 'canyon_floor':
      return { baseColor: '#C2B4A3', accentColor: '#7E6F5E', mistColor: '#E8E1D7', staminaCost: 1.8 };
    case 'mountain_pass':
    case 'sword_gorge_pass':
      return { baseColor: '#B8AF9F', accentColor: '#706454', mistColor: '#E2DCD2', staminaCost: 1.2 };

    // Desert & Sand
    case 'western_desert':
    case 'desert_sand':
    case 'dune':
    case 'desert':
      return { baseColor: '#E6D7B8', accentColor: '#C4AF86', mistColor: '#F5EFE0', staminaCost: 1.4 };
    case 'oasis':
      return { baseColor: '#C4D6B0', accentColor: '#6B9668', mistColor: '#EAF2DF', staminaCost: 1.0 };

    // Snow & Ice
    case 'snow':
    case 'northern_glacial':
      return { baseColor: '#E5ECF2', accentColor: '#AFC4D6', mistColor: '#F6F9FC', staminaCost: 1.5 };
    case 'glacier':
    case 'ice_crack':
      return { baseColor: '#D0E0EC', accentColor: '#7C9FB8', mistColor: '#EDF5FB', staminaCost: 2.2 };

    // Dangerous / Hazard
    case 'swamp':
    case 'demonic_swamp':
      return { baseColor: '#BDB3C7', accentColor: '#6E5D7A', mistColor: '#E5DFEB', isHazard: true, staminaCost: 2.0 };
    case 'poison_pool':
    case 'miasma_waste':
      return { baseColor: '#B29BBF', accentColor: '#583669', mistColor: '#E2D6E9', isHazard: true, staminaCost: 2.5 };
    case 'lava_flow':
    case 'crater':
      return { baseColor: '#D1A392', accentColor: '#8C3D2E', mistColor: '#EED9D2', isHazard: true, staminaCost: 3.0 };
    case 'battlefield_ash':
    case 'abyss_edge':
      return { baseColor: '#A89E9D', accentColor: '#453B3A', mistColor: '#DCD4D4', isHazard: true, staminaCost: 2.2 };

    // Cultural / Settlement
    case 'settlement':
    case 'sect_ground':
      return { baseColor: '#DDD5C7', accentColor: '#8C775D', mistColor: '#F0ECE4', staminaCost: 1.0 };
    case 'ruin_floor':
    case 'formation_tile':
      return { baseColor: '#C7C2BA', accentColor: '#6E6B66', mistColor: '#E8E5E0', staminaCost: 1.1 };
    case 'road_stone':
    case 'road_dirt':
      return { baseColor: '#D8CFBF', accentColor: '#A39682', mistColor: '#EDE7DC', staminaCost: 0.8 };

    // Default Plains
    case 'plains':
    default:
      return { baseColor: '#E2DACB', accentColor: '#B5A894', mistColor: '#F4EFE6', staminaCost: 1.0 };
  }
}

// ============================================================================
// 3. PROCEDURAL PROCEDURES FOR L0, L1, L2, L3, L4, L6, L7
// ============================================================================

/**
 * L0: Renders parchment paper grain and faint grid (alpha ~0.06).
 */
export function renderL0XuanPaper(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoom: number,
  paperImg?: HTMLImageElement | null
) {
  if (paperImg && paperImg.complete && paperImg.naturalWidth > 0) {
    ctx.drawImage(paperImg, 0, 0, width, height);
  } else {
    // Warm Xuan paper gradient
    const grad = ctx.createRadialGradient(width / 2, height / 2, height * 0.2, width / 2, height / 2, width * 0.8);
    grad.addColorStop(0, '#FAF7F0');
    grad.addColorStop(0.6, '#F4EFE3');
    grad.addColorStop(1, '#EAE1CE');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle paper fibers (Xuan silk dust)
    ctx.fillStyle = 'rgba(120, 100, 80, 0.025)';
    for (let i = 0; i < 50; i++) {
      const fx = (i * 187.3) % width;
      const fy = (i * 329.7) % height;
      ctx.fillRect(fx, fy, 2, 2);
    }
  }
}

/**
 * L1 & L2: Renders flat ground wash and micro details within tile cell.
 */
export function renderL1TerrainCell(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tileSize: number,
  terrainType: string,
  time: number,
  tx: number,
  ty: number
) {
  const p = getTerrainWashPalette(terrainType);

  // Soft wash fill
  ctx.fillStyle = p.baseColor;
  ctx.fillRect(sx, sy, tileSize, tileSize);

  // Subtle ink bleeding border
  ctx.strokeStyle = p.accentColor;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(sx, sy, tileSize, tileSize);

  // L2: Flat ground details (strictly 1 cell, no overflow)
  if (p.isWater) {
    // Water ripple strokes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    const wave1 = Math.sin(time * 1.5 + tx * 0.6 + ty * 0.4) * 2.5;
    ctx.beginPath();
    ctx.moveTo(sx + tileSize * 0.15, sy + tileSize * 0.45 + wave1);
    ctx.quadraticCurveTo(sx + tileSize * 0.5, sy + tileSize * 0.4 - wave1, sx + tileSize * 0.85, sy + tileSize * 0.45 + wave1);
    ctx.moveTo(sx + tileSize * 0.25, sy + tileSize * 0.75 - wave1);
    ctx.quadraticCurveTo(sx + tileSize * 0.6, sy + tileSize * 0.7 + wave1, sx + tileSize * 0.75, sy + tileSize * 0.75 - wave1);
    ctx.stroke();
  } else if (terrainType.includes('road')) {
    // Road stone paving / path track
    ctx.fillStyle = 'rgba(130, 115, 95, 0.25)';
    ctx.fillRect(sx + tileSize * 0.2, sy + tileSize * 0.2, tileSize * 0.6, tileSize * 0.6);
  } else if (terrainType.includes('meadow') || terrainType.includes('farmland') || terrainType === 'plains') {
    // Gentle grass tufts
    ctx.strokeStyle = 'rgba(70, 95, 65, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + tileSize * 0.3, sy + tileSize * 0.7);
    ctx.lineTo(sx + tileSize * 0.32, sy + tileSize * 0.58);
    ctx.moveTo(sx + tileSize * 0.65, sy + tileSize * 0.6);
    ctx.lineTo(sx + tileSize * 0.68, sy + tileSize * 0.48);
    ctx.stroke();
  } else if (terrainType.includes('desert') || terrainType.includes('dune')) {
    // Sand ripple
    ctx.strokeStyle = 'rgba(180, 150, 110, 0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx + tileSize * 0.1, sy + tileSize * 0.5);
    ctx.quadraticCurveTo(sx + tileSize * 0.5, sy + tileSize * 0.45, sx + tileSize * 0.9, sy + tileSize * 0.52);
    ctx.stroke();
  }
}

/**
 * L3: Soft foot mist (kabut di kaki objek menjulang).
 */
export function renderL3FootMist(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  footprintWidth: number,
  mistHeight: number
) {
  const mistGrad = ctx.createLinearGradient(0, baseY - mistHeight, 0, baseY + mistHeight * 0.5);
  mistGrad.addColorStop(0, 'rgba(244, 241, 234, 0)');
  mistGrad.addColorStop(0.6, 'rgba(244, 241, 234, 0.75)');
  mistGrad.addColorStop(1, 'rgba(244, 241, 234, 0.95)');

  ctx.fillStyle = mistGrad;
  ctx.beginPath();
  ctx.ellipse(baseX, baseY, footprintWidth * 0.7, mistHeight, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * L4: Tall procedural object renderer (Shuimo style).
 */
export function renderL4ProceduralObject(
  ctx: CanvasRenderingContext2D,
  defId: string,
  screenX: number,
  screenY: number,
  tileSize: number,
  time: number,
  alpha: number = 1.0,
  flipX: boolean = false
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  if (flipX) {
    ctx.translate(screenX + tileSize, screenY);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(screenX, screenY);
  }

  if (defId.startsWith('karst_pillar') || defId.startsWith('mt_rock')) {
    // KARST ROCK PILLAR / MOUNTAIN PEAK
    const def = OBJECT_DEFINITIONS[defId] || OBJECT_DEFINITIONS.karst_pillar_1x1;
    const w = def.footprint.cw * tileSize;
    const h = (def.footprint.ch + def.overhangCells) * tileSize;
    const topX = w * 0.5;
    const baseY = h;

    // Body of mountain / karst cliff (Layered Ink Wash)
    const cliffGrad = ctx.createLinearGradient(0, 0, w, h);
    cliffGrad.addColorStop(0, '#5C6B66'); // Slate-grey jade tint
    cliffGrad.addColorStop(0.5, '#454C47'); // Charcoal ink
    cliffGrad.addColorStop(1, '#2D3330'); // Deep ink base
    ctx.fillStyle = cliffGrad;

    ctx.beginPath();
    ctx.moveTo(w * 0.15, baseY);
    ctx.lineTo(w * 0.25, h * 0.4);
    ctx.lineTo(topX - w * 0.1, h * 0.05);
    ctx.lineTo(topX + w * 0.1, h * 0.05);
    ctx.lineTo(w * 0.75, h * 0.35);
    ctx.lineTo(w * 0.85, baseY);
    ctx.closePath();
    ctx.fill();

    // Shading side (Dry-brush side cleft)
    ctx.fillStyle = '#222724';
    ctx.beginPath();
    ctx.moveTo(topX, h * 0.05);
    ctx.lineTo(w * 0.75, h * 0.35);
    ctx.lineTo(w * 0.85, baseY);
    ctx.lineTo(topX + w * 0.05, baseY);
    ctx.closePath();
    ctx.fill();

    // Ochre / Cinnabar rock strata streak
    ctx.strokeStyle = 'rgba(185, 162, 122, 0.45)';
    ctx.lineWidth = Math.max(1, tileSize * 0.03);
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h * 0.3);
    ctx.lineTo(w * 0.65, h * 0.45);
    ctx.moveTo(w * 0.25, h * 0.65);
    ctx.lineTo(w * 0.75, h * 0.75);
    ctx.stroke();

    // Mountain peak mist wash
    const peakMist = ctx.createLinearGradient(0, 0, 0, h * 0.2);
    peakMist.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    peakMist.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = peakMist;
    ctx.fillRect(w * 0.15, 0, w * 0.7, h * 0.2);

  } else if (defId.startsWith('bamboo_clump')) {
    // BAMBOO CLUMP (Slender vertical stalks with feathery leaves)
    const def = OBJECT_DEFINITIONS[defId] || OBJECT_DEFINITIONS.bamboo_clump_1x1;
    const w = def.footprint.cw * tileSize;
    const h = (def.footprint.ch + def.overhangCells) * tileSize;
    const stalks = def.footprint.cw * 3;
    const sway = Math.sin(time * 1.5 + screenX * 0.05) * (tileSize * 0.04);

    for (let s = 0; s < stalks; s++) {
      const bx = w * (0.15 + (s / (stalks - 1 || 1)) * 0.7);
      const by = h * 0.95;
      const tx = bx + sway * (0.7 + s * 0.1);
      const ty = h * (0.1 + (s % 2) * 0.15);

      // Stalk
      ctx.strokeStyle = s % 2 === 0 ? '#3B5742' : '#2A3F30';
      ctx.lineWidth = Math.max(1.5, tileSize * 0.035);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo((bx + tx) / 2 + sway, (by + ty) / 2, tx, ty);
      ctx.stroke();

      // Nodes
      ctx.fillStyle = '#1D2A20';
      for (let n = 1; n <= 3; n++) {
        const ny = by - (by - ty) * (n * 0.25);
        const nx = bx + (tx - bx) * (n * 0.25);
        ctx.fillRect(nx - 2, ny - 1, 4, 2);
      }

      // Leaves (Feathery lanceolate strokes)
      ctx.fillStyle = s % 2 === 0 ? '#4F7257' : '#395340';
      for (let l = -2; l <= 2; l++) {
        ctx.beginPath();
        const lx = tx + l * tileSize * 0.08;
        const ly = ty + Math.abs(l) * tileSize * 0.05;
        ctx.ellipse(lx, ly, tileSize * 0.12, tileSize * 0.04, l * 0.35 + sway * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
    }

  } else if (defId.startsWith('pine_tree') || defId.startsWith('spirit_tree')) {
    // PINE TREE / SPIRIT TREE (Twisted gnarled trunk + tiered cloud canopy)
    const def = OBJECT_DEFINITIONS[defId] || OBJECT_DEFINITIONS.pine_tree_1x1;
    const w = def.footprint.cw * tileSize;
    const h = (def.footprint.ch + def.overhangCells) * tileSize;

    // Gnarled trunk
    ctx.strokeStyle = '#4A3B32';
    ctx.lineWidth = Math.max(2, tileSize * 0.08);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.95);
    ctx.quadraticCurveTo(w * 0.35, h * 0.6, w * 0.5, h * 0.35);
    ctx.stroke();

    // Pine needle tiers (Cloud cluster layers)
    const isSpirit = defId.includes('spirit');
    const leafColor1 = isSpirit ? '#5E8C7B' : '#334839';
    const leafColor2 = isSpirit ? '#7C97A6' : '#223327';

    for (let t = 0; t < 3; t++) {
      const cy = h * (0.35 - t * 0.12);
      const rx = w * (0.35 - t * 0.05);
      const ry = tileSize * 0.15;

      ctx.fillStyle = t % 2 === 0 ? leafColor1 : leafColor2;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (defId.startsWith('pavilion') || defId.startsWith('sect_gate') || defId.startsWith('village_house')) {
    // CHINESE PAVILION / HOUSE
    const def = OBJECT_DEFINITIONS[defId] || OBJECT_DEFINITIONS.pavilion_1x1;
    const w = def.footprint.cw * tileSize;
    const h = (def.footprint.ch + def.overhangCells) * tileSize;

    // Base stone platform
    ctx.fillStyle = '#6E675F';
    ctx.fillRect(w * 0.15, h * 0.75, w * 0.7, h * 0.2);

    // Columns
    ctx.fillStyle = '#7A2E26'; // Vermilion pillars
    ctx.fillRect(w * 0.22, h * 0.45, w * 0.08, h * 0.32);
    ctx.fillRect(w * 0.7, h * 0.45, w * 0.08, h * 0.32);

    // Upturned roof eaves
    ctx.fillStyle = '#9B3A2E'; // Cinnabar tile roof
    ctx.beginPath();
    ctx.moveTo(w * 0.05, h * 0.48);
    ctx.quadraticCurveTo(w * 0.5, h * 0.22, w * 0.95, h * 0.48);
    ctx.lineTo(w * 0.85, h * 0.48);
    ctx.lineTo(w * 0.5, h * 0.32);
    ctx.lineTo(w * 0.15, h * 0.48);
    ctx.closePath();
    ctx.fill();

  } else {
    // Generic Boulder / Rock
    const w = tileSize;
    const h = tileSize;
    ctx.fillStyle = '#6A635B';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.7, w * 0.35, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * L6: Fog of war ink wash mask (3 states: unknown, silhouette, explored).
 */
export function renderL6FogOfWarCell(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tileSize: number,
  status: 'unknown' | 'silhouette' | 'explored'
) {
  if (status === 'explored') return;

  if (status === 'unknown') {
    // Deep dark ink wash
    ctx.fillStyle = 'rgba(28, 32, 30, 0.96)';
    ctx.fillRect(sx - 1, sy - 1, tileSize + 2, tileSize + 2);
  } else if (status === 'silhouette') {
    // Misty semi-transparent fog
    ctx.fillStyle = 'rgba(215, 208, 195, 0.75)';
    ctx.fillRect(sx - 1, sy - 1, tileSize + 2, tileSize + 2);
  }
}

/**
 * L7: Monster dry-brush ink ring with tier color accent.
 */
export function renderL7MonsterInkRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  tier: number = 1,
  isBoss: boolean = false,
  time: number = 0
) {
  ctx.save();

  // Tier accent color
  let accentColor = '#10B981'; // Tier 1: Jade green
  if (tier === 2) accentColor = '#EAB308'; // Tier 2: Amber gold
  else if (tier === 3) accentColor = '#F97316'; // Tier 3: Orange
  else if (tier === 4) accentColor = '#EF4444'; // Tier 4: Crimson
  else if (tier >= 5) accentColor = '#A855F7'; // Tier 5: Purple

  // Pulse rotation
  const rot = (time * 0.5) % (Math.PI * 2);
  ctx.translate(cx, cy);
  ctx.rotate(rot);

  // Outer irregular dry-brush ring
  ctx.strokeStyle = '#222927';
  ctx.lineWidth = Math.max(2, radius * 0.22);
  ctx.setLineDash([radius * 0.8, radius * 0.2, radius * 0.4]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner tier color glow ring
  ctx.setLineDash([]);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = Math.max(1, radius * 0.1);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
  ctx.stroke();

  // Double ring for boss monsters
  if (isBoss) {
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = Math.max(1.5, radius * 0.12);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Resolves species emoji / icon for monsters based on name, key, or category.
 */
export function getMonsterIcon(name?: string, key?: string): string {
  const text = `${name || ''} ${key || ''}`.toLowerCase();
  if (text.includes('naga') || text.includes('dragon') || text.includes('wyrm')) return '🐉';
  if (text.includes('harimau') || text.includes('macan') || text.includes('tiger')) return '🐯';
  if (text.includes('ular') || text.includes('snake') || text.includes('viper') || text.includes('piton')) return '🐍';
  if (text.includes('elang') || text.includes('rajawali') || text.includes('bird') || text.includes('roc')) return '🦅';
  if (text.includes('beruang') || text.includes('bear')) return '🐻';
  if (text.includes('laba') || text.includes('spider')) return '🕷️';
  if (text.includes('rubah') || text.includes('fox')) return '🦊';
  if (text.includes('serigala') || text.includes('wolf')) return '🐺';
  if (text.includes('iblis') || text.includes('demon') || text.includes('siluman') || text.includes('asura')) return '👹';
  if (text.includes('hantu') || text.includes('ghost') || text.includes('arwah')) return '👻';
  return '🐾';
}

/**
 * L7: Resource sparkling spiritual particle node (herb, ore, wood, fish).
 */
export function renderL7ResourceSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  resourceType: 'herb' | 'ore' | 'wood' | 'fish' | string = 'herb',
  time: number = 0,
  isDormant: boolean = false
) {
  ctx.save();

  if (isDormant) {
    ctx.fillStyle = 'rgba(100, 116, 139, 0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Sparkling colors per resource type
  let primaryColor = '#10B981';
  let sparkleColor = '#6EE7B7';
  let icon = '🌱';
  if (resourceType === 'ore') {
    primaryColor = '#F59E0B';
    sparkleColor = '#FDE68A';
    icon = '⛏️';
  } else if (resourceType === 'wood') {
    primaryColor = '#059669';
    sparkleColor = '#A7F3D0';
    icon = '🪵';
  } else if (resourceType === 'fish') {
    primaryColor = '#0284C7';
    sparkleColor = '#7DD3FC';
    icon = '🐟';
  }

  // Soft spiritual pulse aura
  const pulse = Math.sin(time * 3) * 0.2 + 0.8;
  const auraR = radius * 0.65 * pulse;
  const auraGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraR);
  auraGrad.addColorStop(0, primaryColor + '66');
  auraGrad.addColorStop(0.7, primaryColor + '22');
  auraGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
  ctx.fill();

  // Floating sparkle particles (4 orbiting stars)
  const particleCount = 4;
  for (let i = 0; i < particleCount; i++) {
    const angle = time * 2 + (i * Math.PI * 2) / particleCount;
    const dist = (radius * 0.45) + Math.sin(time * 4 + i) * (radius * 0.1);
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    const starR = Math.max(1, radius * 0.08 * (Math.sin(time * 5 + i) * 0.3 + 0.7));

    ctx.fillStyle = sparkleColor;
    ctx.beginPath();
    ctx.arc(px, py, starR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Resource Icon in center
  ctx.font = `${Math.max(10, radius * 0.6)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, cx, cy);

  ctx.restore();
}

/**
 * L7: Monster aggro radius preview.
 */
export function renderL7AggroRadius(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radiusPx: number,
  time: number = 0
) {
  ctx.save();
  ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
  ctx.beginPath();
  ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -time * 15;
  ctx.beginPath();
  ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * L7: NPC badge with attitude color ring and "9+" formatting.
 */
export function renderL7NpcBadge(
  ctx: CanvasRenderingContext2D,
  badgeX: number,
  badgeY: number,
  radius: number,
  npcCount: number,
  attitude: NpcAttitude = 'neutral'
) {
  ctx.save();

  // Attitude border color
  let ringColor = '#9CA3AF'; // neutral
  if (attitude === 'friendly') ringColor = '#10B981';
  else if (attitude === 'hostile') ringColor = '#EF4444';
  else if (attitude === 'quest') ringColor = '#F59E0B';

  // Charcoal base
  const grad = ctx.createLinearGradient(badgeX - radius, badgeY - radius, badgeX + radius, badgeY + radius);
  grad.addColorStop(0, '#374151');
  grad.addColorStop(0.5, '#1F2937');
  grad.addColorStop(1, '#111827');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Attitude ring
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = Math.max(1, radius * 0.25);
  ctx.stroke();

  // Text label ("9+" or count)
  const text = npcCount > 9 ? '9+' : String(npcCount);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.max(8, radius * 1.15)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, badgeX, badgeY);

  ctx.restore();
}

/**
 * World edge cloud border (x/y in 0 or 4999).
 */
export function renderWorldEdgeClouds(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isLeftEdge: boolean,
  isRightEdge: boolean,
  isTopEdge: boolean,
  isBottomEdge: boolean,
  time: number
) {
  if (!isLeftEdge && !isRightEdge && !isTopEdge && !isBottomEdge) return;

  ctx.save();
  const cloudGrad = (x1: number, y1: number, x2: number, y2: number) => {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0, 'rgba(40, 48, 45, 0.85)');
    g.addColorStop(0.5, 'rgba(75, 88, 83, 0.45)');
    g.addColorStop(1, 'rgba(244, 241, 234, 0)');
    return g;
  };

  const cloudSize = 100;
  if (isTopEdge) {
    ctx.fillStyle = cloudGrad(0, 0, 0, cloudSize);
    ctx.fillRect(0, 0, width, cloudSize);
  }
  if (isBottomEdge) {
    ctx.fillStyle = cloudGrad(0, height, 0, height - cloudSize);
    ctx.fillRect(0, height - cloudSize, width, cloudSize);
  }
  if (isLeftEdge) {
    ctx.fillStyle = cloudGrad(0, 0, cloudSize, 0);
    ctx.fillRect(0, 0, cloudSize, height);
  }
  if (isRightEdge) {
    ctx.fillStyle = cloudGrad(width, 0, width - cloudSize, 0);
    ctx.fillRect(width - cloudSize, 0, cloudSize, height);
  }
  ctx.restore();
}
