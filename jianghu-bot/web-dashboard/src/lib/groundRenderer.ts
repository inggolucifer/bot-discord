/**
 * JIANGHU WORLD — AUTHORITATIVE GROUND & TERRAIN RENDERER (lib/groundRenderer.ts)
 * Implements Layers G0–G6 for authentic Song Dynasty Shan Shui ink-wash landscape:
 * - G0: Region background palette blending (12-tile organic soft blend across borders)
 * - G1: Deterministic multi-variant terrain wash (3 variants per terrain type via hash2d(tx, ty))
 * - G2: Biome boundary soft transitions (wet-on-wet watercolor edge bleeding)
 * - G3: Procedural ground decals (nature micro-details: grass tufts, clovers, pebbles, fallen leaves)
 * - G4: Autotiling for rivers & roads with atlas sprites and dynamic water wave shimmer
 * - G5: Contact shadow integration (under tall objects)
 * - G6: Biome ambient atmospheric fog overlays (valleys, miasma swamps, snowy peaks)
 * - Chunk Ground Bitmap Cache: Offscreen canvas per 32x32 chunk for 60+ FPS
 */

import { CANONICAL_REGIONS } from '@/config/canonicalRegions';
import { atlasLoader } from './atlasLoader';
import { groundTextures } from './groundTextures';

export interface TerrainWashPalette {
  baseColor: string;
  accentColor: string;
  mistColor: string;
  grainColor?: string;
  isWater?: boolean;
  isHazard?: boolean;
  isRoad?: boolean;
  staminaCost: number;
}

/**
 * Fast 32-bit integer PRNG (xxHash / Murmur-style) for deterministic world-coordinate hashing.
 * Guarantees zero chunk-boundary seams because it relies purely on global (x, y).
 */
export function hash2d(x: number, y: number): number {
  let h = ((x * 374761393 + y * 668265263) ^ 0x5bf03635) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Wuxia Shan Shui / Ink-wash color palettes for all 35+ terrain types.
 */
export function getTerrainWashPalette(terrainType: string): TerrainWashPalette {
  switch (terrainType) {
    // Water & Perairan
    case 'river':
    case 'river_shallow':
      return { baseColor: '#A4C4CE', accentColor: '#7C97A6', mistColor: '#DCE8EC', grainColor: '#688696', isWater: true, staminaCost: 1.5 };
    case 'lake':
    case 'lake_deep':
      return { baseColor: '#7C9EB2', accentColor: '#53788F', mistColor: '#C8DEE8', grainColor: '#43687E', isWater: true, staminaCost: 2.0 };
    case 'ocean':
    case 'eastern_sea':
    case 'sea':
    case 'sea_reef':
      return { baseColor: '#5C8299', accentColor: '#3E5E73', mistColor: '#B0C9D6', grainColor: '#2B4A5F', isWater: true, staminaCost: 3.0 };
    case 'pond_lotus':
      return { baseColor: '#93B7AA', accentColor: '#5E8C7B', mistColor: '#D7E9E2', grainColor: '#497464', isWater: true, staminaCost: 1.4 };

    // Vegetation, Farmland & Woods
    case 'meadow':
      return { baseColor: '#D4DEC9', accentColor: '#A8BC99', mistColor: '#EFF3EA', grainColor: '#8CA37A', staminaCost: 1.0 };
    case 'farmland':
    case 'herb_field':
      return { baseColor: '#C9D6B8', accentColor: '#8CA37A', mistColor: '#E9EFE0', grainColor: '#6B8756', staminaCost: 1.0 };
    case 'bamboo_grove':
    case 'bamboo_dense':
    case 'bamboo_forest':
      return { baseColor: '#BDCEBA', accentColor: '#5E8C7B', mistColor: '#E2EBE0', grainColor: '#4A6B53', staminaCost: 1.3 };
    case 'spirit_wood':
    case 'forest':
      return { baseColor: '#B5C4B1', accentColor: '#4A6B53', mistColor: '#DFE7DC', grainColor: '#395340', staminaCost: 1.2 };
    case 'dead_wood':
      return { baseColor: '#C4BCB1', accentColor: '#736B60', mistColor: '#E5E0DA', grainColor: '#544D44', staminaCost: 1.4 };

    // Mountains, Hills & Cliffs
    case 'hill':
    case 'ridge_low':
      return { baseColor: '#CDC4B5', accentColor: '#9A8F82', mistColor: '#ECE7E0', grainColor: '#7D7366', staminaCost: 1.6 };
    case 'mountain':
    case 'azure_mountain':
    case 'mountain_rock':
    case 'cliff':
      return { baseColor: '#B2ABA0', accentColor: '#5C5449', mistColor: '#DDD7CF', grainColor: '#433D35', staminaCost: 3.5 };
    case 'mountain_peak':
      return { baseColor: '#999187', accentColor: '#3D372E', mistColor: '#CECBC5', grainColor: '#2B261F', staminaCost: 4.0 };
    case 'canyon_floor':
      return { baseColor: '#C2B4A3', accentColor: '#7E6F5E', mistColor: '#E8E1D7', grainColor: '#605345', staminaCost: 1.8 };
    case 'mountain_pass':
    case 'sword_gorge_pass':
      return { baseColor: '#B8AF9F', accentColor: '#706454', mistColor: '#E2DCD2', grainColor: '#53493C', staminaCost: 1.2 };

    // Desert & Sand
    case 'western_desert':
    case 'desert_sand':
    case 'dune':
    case 'desert':
      return { baseColor: '#E6D7B8', accentColor: '#C4AF86', mistColor: '#F5EFE0', grainColor: '#A89269', staminaCost: 1.4 };
    case 'oasis':
      return { baseColor: '#C4D6B0', accentColor: '#6B9668', mistColor: '#EAF2DF', grainColor: '#527C4F', staminaCost: 1.0 };

    // Snow & Ice
    case 'snow':
    case 'northern_glacial':
      return { baseColor: '#E5ECF2', accentColor: '#AFC4D6', mistColor: '#F6F9FC', grainColor: '#95B0C5', staminaCost: 1.5 };
    case 'glacier':
    case 'ice_crack':
      return { baseColor: '#D0E0EC', accentColor: '#7C9FB8', mistColor: '#EDF5FB', grainColor: '#5D84A0', staminaCost: 2.2 };

    // Dangerous / Hazard
    case 'swamp':
    case 'demonic_swamp':
      return { baseColor: '#BDB3C7', accentColor: '#6E5D7A', mistColor: '#E5DFEB', grainColor: '#55465F', isHazard: true, staminaCost: 2.0 };
    case 'poison_pool':
    case 'miasma_waste':
      return { baseColor: '#B29BBF', accentColor: '#583669', mistColor: '#E2D6E9', grainColor: '#412450', isHazard: true, staminaCost: 2.5 };
    case 'lava_flow':
    case 'crater':
    case 'basalt':
      return { baseColor: '#D1A392', accentColor: '#8C3D2E', mistColor: '#EED9D2', grainColor: '#6F2B1E', isHazard: true, staminaCost: 3.0 };
    case 'battlefield_ash':
    case 'abyss_edge':
    case 'void_rift':
      return { baseColor: '#534E60', accentColor: '#302D3B', mistColor: '#C4BFCE', grainColor: '#22202B', isHazard: true, staminaCost: 2.2 };
    case 'island_reef':
      return { baseColor: '#C5D6DF', accentColor: '#65869B', mistColor: '#EAF1F6', grainColor: '#4A6A7E', staminaCost: 1.2 };

    // Cultural / Settlement / Roads (Natural Loam & Gravel Song Dynasty Wash)
    case 'settlement':
    case 'sect_ground':
      return { baseColor: '#C8BEAD', accentColor: '#8C775D', mistColor: '#DFD8CC', grainColor: '#6B5B46', staminaCost: 1.0 };
    case 'ruin_floor':
    case 'formation_tile':
      return { baseColor: '#C7C2BA', accentColor: '#6E6B66', mistColor: '#E8E5E0', grainColor: '#53504C', staminaCost: 1.1 };
    case 'road_stone':
    case 'road_dirt':
    case 'road':
      return { baseColor: '#D8CFBF', accentColor: '#A39682', mistColor: '#EDE7DC', grainColor: '#847764', isRoad: true, staminaCost: 0.8 };

    // Default Plains
    case 'plains':
    default:
      return { baseColor: '#E2DACB', accentColor: '#B5A894', mistColor: '#F4EFE6', grainColor: '#968875', staminaCost: 1.0 };
  }
}

// ============================================================================
// G0: REGION BACKGROUND PALETTE & 12-TILE ORGANIC SOFT BLEND
// ============================================================================

/**
 * Computes region color with organic 12-tile soft blend near borders.
 */
export function getRegionColorAt(wx: number, wy: number): string {
  let primaryRegion = CANONICAL_REGIONS[0];
  let minDistToEdge = 999999;

  for (const reg of CANONICAL_REGIONS) {
    const { minX, maxX, minY, maxY } = reg.bounds;
    if (wx >= minX && wx <= maxX && wy >= minY && wy <= maxY) {
      primaryRegion = reg;
      const dLeft = wx - minX;
      const dRight = maxX - wx;
      const dTop = wy - minY;
      const dBottom = maxY - wy;
      minDistToEdge = Math.min(dLeft, dRight, dTop, dBottom);
      break;
    }
  }

  const baseHex = primaryRegion.palette?.terrainColor || primaryRegion.palette?.primary || '#3a5f38';

  // If well within region interior (> 12 tiles from border), return primary color directly
  if (minDistToEdge > 12) {
    return baseHex;
  }

  // Near border: find neighboring candidate region to blend with
  let neighborRegion = CANONICAL_REGIONS[0];
  let foundNeighbor = false;

  for (const reg of CANONICAL_REGIONS) {
    if (reg === primaryRegion) continue;
    const { minX, maxX, minY, maxY } = reg.bounds;
    if (wx >= minX - 12 && wx <= maxX + 12 && wy >= minY - 12 && wy <= maxY + 12) {
      neighborRegion = reg;
      foundNeighbor = true;
      break;
    }
  }

  if (!foundNeighbor) return baseHex;

  // Cosine smooth blend factor (0 to 1) across the 12-tile transition zone
  const t = Math.max(0, Math.min(1, minDistToEdge / 12));
  const smoothT = 0.5 - 0.5 * Math.cos(t * Math.PI);

  const neighborHex = neighborRegion.palette?.terrainColor || neighborRegion.palette?.primary || '#3a5f38';
  return interpolateColor(neighborHex, baseHex, smoothT);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16)
    ];
  }
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0
  ];
}

function interpolateColor(hex1: string, hex2: string, factor: number): string {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

// ============================================================================
// G1: DETERMINISTIC MULTI-VARIANT TERRAIN WASH (NO CHUNK SEAMS)
// ============================================================================

/**
 * Renders L1 terrain base with 3 deterministic ink-wash variants.
 * Eliminates the flat solid color look with subtle Song Dynasty watercolor tones.
 */
export function renderL1TerrainBase(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tileSize: number,
  terrainType: string,
  tx: number,
  ty: number
) {
  const p = getTerrainWashPalette(terrainType);
  const h = hash2d(tx, ty);
  const variant = h % 3;

  // Base wash fill
  ctx.fillStyle = p.baseColor;
  ctx.fillRect(sx, sy, tileSize, tileSize);

  // Deterministic Micro-Noise (+-4% luminance variation to eliminate flat solid looks)
  const microLuma = ((h % 80) - 40) / 1000;
  if (microLuma !== 0) {
    ctx.save();
    ctx.fillStyle = microLuma > 0 ? '#FFFFFF' : '#000000';
    ctx.globalAlpha = Math.abs(microLuma);
    ctx.fillRect(sx, sy, tileSize, tileSize);
    ctx.restore();
  }

  // Subtle ink wash tonal modulation (Variant 0, 1, 2)
  ctx.save();
  if (variant === 0) {
    // Radial soft center wash
    const grad = ctx.createRadialGradient(
      sx + tileSize * 0.5,
      sy + tileSize * 0.5,
      tileSize * 0.1,
      sx + tileSize * 0.5,
      sy + tileSize * 0.5,
      tileSize * 0.65
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.04)');
    ctx.fillStyle = grad;
    ctx.fillRect(sx, sy, tileSize, tileSize);
  } else if (variant === 1) {
    // Horizontal Xuan paper grain wash
    const grad = ctx.createLinearGradient(sx, sy, sx + tileSize, sy);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.03)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.06)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.03)');
    ctx.fillStyle = grad;
    ctx.fillRect(sx, sy, tileSize, tileSize);
  } else {
    // Diagonal subtle ink shading
    const grad = ctx.createLinearGradient(sx, sy, sx + tileSize, sy + tileSize);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.05)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.02)');
    ctx.fillStyle = grad;
    ctx.fillRect(sx, sy, tileSize, tileSize);
  }

  // Paper mineral dust flecks (2 tiny deterministic flecks per cell)
  if (p.grainColor) {
    const fx1 = sx + ((h >>> 8) % Math.floor(tileSize * 0.8)) + tileSize * 0.1;
    const fy1 = sy + ((h >>> 14) % Math.floor(tileSize * 0.8)) + tileSize * 0.1;
    ctx.fillStyle = p.grainColor;
    ctx.globalAlpha = 0.14;
    ctx.fillRect(fx1, fy1, 1.2, 1.2);
  }

  ctx.restore();
}

// ============================================================================
// G2: BIOME BOUNDARY SOFT TRANSITIONS (EDGE BLEEDING)
// ============================================================================

export type NeighborTerrainFn = (wx: number, wy: number) => string | undefined;

/**
 * Renders feathered watercolor edge bleeding when a tile borders different terrain types.
 * Eliminates harsh square cuts between water, grass, sand, and rock.
 */
export function renderL2BiomeTransitions(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tileSize: number,
  tx: number,
  ty: number,
  currentTerrain: string,
  getNeighborTerrain?: NeighborTerrainFn
) {
  if (!getNeighborTerrain) return;

  const north = getNeighborTerrain(tx, ty - 1);
  const east = getNeighborTerrain(tx + 1, ty);
  const south = getNeighborTerrain(tx, ty + 1);
  const west = getNeighborTerrain(tx - 1, ty);

  const curPal = getTerrainWashPalette(currentTerrain);
  const bleedW = Math.max(5, tileSize * 0.32);

  ctx.save();

  // Helper to bleed neighboring terrain color softly into current cell edge with directional gradient
  const bleedEdge = (
    neighborTerrain: string | undefined,
    x: number,
    y: number,
    w: number,
    h: number,
    direction: 'north' | 'south' | 'east' | 'west'
  ) => {
    if (!neighborTerrain || neighborTerrain === currentTerrain) return;
    const nPal = getTerrainWashPalette(neighborTerrain);
    const bleedColor = curPal.isWater ? nPal.baseColor : (nPal.isWater ? nPal.accentColor : nPal.baseColor);

    let grad: CanvasGradient;
    if (direction === 'north') {
      grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, bleedColor);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else if (direction === 'south') {
      grad = ctx.createLinearGradient(x, y + h, x, y);
      grad.addColorStop(0, bleedColor);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else if (direction === 'west') {
      grad = ctx.createLinearGradient(x, y, x + w, y);
      grad.addColorStop(0, bleedColor);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else {
      grad = ctx.createLinearGradient(x + w, y, x, y);
      grad.addColorStop(0, bleedColor);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }

    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(x, y, w, h);
  };

  // North edge
  if (north && north !== currentTerrain) {
    bleedEdge(north, sx, sy, tileSize, bleedW, 'north');
  }
  // South edge
  if (south && south !== currentTerrain) {
    bleedEdge(south, sx, sy + tileSize - bleedW, tileSize, bleedW, 'south');
  }
  // West edge
  if (west && west !== currentTerrain) {
    bleedEdge(west, sx, sy, bleedW, tileSize, 'west');
  }
  // East edge
  if (east && east !== currentTerrain) {
    bleedEdge(east, sx + tileSize - bleedW, sy, bleedW, tileSize, 'east');
  }

  ctx.restore();
}

// ============================================================================
// G3: PROCEDURAL GROUND DECALS (NATURE MICRO-DETAILS)
// ============================================================================

/**
 * Renders lightweight procedural nature decals (grass tufts, wildflowers, pebbles, moss).
 * Appears deterministically on ~28% of tiles.
 */
export function renderL3GroundDecal(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tileSize: number,
  tx: number,
  ty: number,
  terrainType: string
) {
  const h = hash2d(tx, ty);
  // ~28% of tiles receive a micro decal
  if ((h & 0xff) > 72) return;

  const offsetX = sx + (((h >>> 8) & 0x7f) / 127) * (tileSize * 0.5) + tileSize * 0.25;
  const offsetY = sy + (((h >>> 15) & 0x7f) / 127) * (tileSize * 0.5) + tileSize * 0.25;
  const decalKind = (h >>> 22) % 4;

  ctx.save();

  if (terrainType.includes('meadow') || terrainType.includes('farmland') || terrainType === 'plains') {
    if (decalKind === 0) {
      // Twin-blade grass arch (ink wash stroke)
      ctx.strokeStyle = 'rgba(70, 95, 65, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
      ctx.quadraticCurveTo(offsetX - 2, offsetY - 6, offsetX - 4, offsetY - 8);
      ctx.moveTo(offsetX, offsetY);
      ctx.quadraticCurveTo(offsetX + 2, offsetY - 5, offsetX + 5, offsetY - 7);
      ctx.stroke();
    } else if (decalKind === 1) {
      // Tiny wild blossom dot (vermilion red or gold petal)
      const petalColor = (h & 1) ? '#D97706' : '#DC2626';
      ctx.fillStyle = petalColor;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(offsetX, offsetY, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (decalKind === 2) {
      // Delicate clover patch
      ctx.fillStyle = 'rgba(60, 90, 50, 0.4)';
      ctx.beginPath();
      ctx.arc(offsetX - 1.5, offsetY - 1.5, 1.5, 0, Math.PI * 2);
      ctx.arc(offsetX + 1.5, offsetY - 1.5, 1.5, 0, Math.PI * 2);
      ctx.arc(offsetX, offsetY + 1.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (terrainType.includes('bamboo') || terrainType.includes('forest') || terrainType.includes('wood')) {
    if (decalKind === 0 || decalKind === 1) {
      // Fallen bamboo blade / autumn leaf
      ctx.fillStyle = 'rgba(140, 110, 60, 0.45)';
      ctx.beginPath();
      ctx.ellipse(offsetX, offsetY, 3.5, 1.2, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Soft moss patch
      ctx.fillStyle = 'rgba(45, 75, 40, 0.3)';
      ctx.beginPath();
      ctx.ellipse(offsetX, offsetY, 4, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (terrainType.includes('mountain') || terrainType.includes('rock') || terrainType.includes('cliff') || terrainType.includes('hill')) {
    // Slate pebble or stone fissure
    ctx.fillStyle = 'rgba(50, 45, 40, 0.45)';
    ctx.beginPath();
    ctx.ellipse(offsetX, offsetY, 3, 1.8, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (terrainType.includes('desert') || terrainType.includes('sand') || terrainType.includes('dune')) {
    // Wind-carved sand ripple arch
    ctx.strokeStyle = 'rgba(180, 150, 110, 0.45)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(offsetX - 6, offsetY);
    ctx.quadraticCurveTo(offsetX, offsetY - 2, offsetX + 6, offsetY + 1);
    ctx.stroke();
  } else if (terrainType.includes('snow') || terrainType.includes('ice') || terrainType.includes('glacier')) {
    // Ice sparkle crystal
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillRect(offsetX, offsetY - 2, 1, 5);
    ctx.fillRect(offsetX - 2, offsetY, 5, 1);
  } else if (terrainType.includes('swamp') || terrainType.includes('mire') || terrainType.includes('poison')) {
    // Marsh bubble puddle
    ctx.fillStyle = 'rgba(90, 70, 100, 0.35)';
    ctx.beginPath();
    ctx.arc(offsetX, offsetY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ============================================================================
// G4: AUTOTILE ROADS & RIVERS (WITH ATLAS SPRITES & DYNAMIC SHIMMER)
// ============================================================================

const AUTOTILE_COMPATIBILITY: Record<string, string[]> = {
  river: ['river', 'river_shallow', 'lake', 'lake_deep', 'waterfall_pool', 'ocean', 'eastern_sea', 'pond_lotus'],
  lake: ['lake', 'lake_deep', 'river', 'pond_lotus', 'ocean'],
  road_stone: ['road_stone', 'settlement', 'sect_ground', 'road', 'road_dirt'],
  road_dirt: ['road_dirt', 'road_stone', 'settlement', 'road'],
  road: ['road', 'road_stone', 'road_dirt', 'settlement']
};

export function isTerrainConnected(baseTerrain: string, neighborTerrain?: string): boolean {
  if (!neighborTerrain) return false;
  if (baseTerrain === neighborTerrain) return true;
  const list = AUTOTILE_COMPATIBILITY[baseTerrain];
  if (list && list.includes(neighborTerrain)) return true;
  return false;
}

/**
 * Calculates 4-neighbor directional bitmask (0..15):
 * - Bit 0 (1): North (y - 1)
 * - Bit 1 (2): East (x + 1)
 * - Bit 2 (4): South (y + 1)
 * - Bit 3 (8): West (x - 1)
 */
export function calculateAutotileBitmask(
  x: number,
  y: number,
  currentTerrain: string,
  getTerrainFn?: NeighborTerrainFn
): number {
  if (!getTerrainFn) return 0;
  let bitmask = 0;

  // North (y - 1)
  if (isTerrainConnected(currentTerrain, getTerrainFn(x, y - 1))) bitmask |= 1;
  // East (x + 1)
  if (isTerrainConnected(currentTerrain, getTerrainFn(x + 1, y))) bitmask |= 2;
  // South (y + 1)
  if (isTerrainConnected(currentTerrain, getTerrainFn(x, y + 1))) bitmask |= 4;
  // West (x - 1)
  if (isTerrainConnected(currentTerrain, getTerrainFn(x - 1, y))) bitmask |= 8;

  return bitmask;
}

export function getAutotileFrameId(terrainType: string, bitmask: number): string {
  const hex = (bitmask & 0x0f).toString(16).padStart(2, '0');
  let category = 'river';
  if (terrainType.includes('road')) category = 'road';
  else if (terrainType.includes('lake') || terrainType.includes('water') || terrainType.includes('sea')) category = 'river';
  return `autotile_${category}_m${hex}`;
}

/**
 * Renders autotile ground with atlas sprites, fallback paths, and dynamic river water wave shimmer.
 */
export function renderL4AutotileGround(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tileSize: number,
  tx: number,
  ty: number,
  terrainType: string,
  time: number,
  getNeighborTerrain?: NeighborTerrainFn
) {
  const isRiver = terrainType.includes('river') || terrainType.includes('lake') || terrainType.includes('water') || terrainType.includes('sea');
  const isRoad = terrainType.includes('road');

  if (!isRiver && !isRoad) return;

  const bitmask = calculateAutotileBitmask(tx, ty, terrainType, getNeighborTerrain);
  const frameId = getAutotileFrameId(terrainType, bitmask);

  // Attempt atlas sprite draw
  const drawn = atlasLoader.hasFrame(frameId) && atlasLoader.drawSprite(ctx, frameId, sx, sy, tileSize, tileSize, 0.95);

  if (!drawn) {
    // Vector fallback path if atlas texture is decoding
    ctx.save();
    if (isRiver) {
      ctx.fillStyle = '#8EA8AE';
      ctx.fillRect(sx, sy, tileSize, tileSize);
    } else if (isRoad) {
      ctx.fillStyle = '#D8CFBF';
      ctx.fillRect(sx, sy, tileSize, tileSize);
      ctx.fillStyle = '#B5A894';
      ctx.fillRect(sx + tileSize * 0.15, sy + tileSize * 0.15, tileSize * 0.7, tileSize * 0.7);
    }
    ctx.restore();
  }

  // Dynamic River Wave Shimmer (G4 Animation)
  if (isRiver) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.lineWidth = 1;
    const wave = Math.sin(time * 2.2 + tx * 0.7 + ty * 0.5) * (tileSize * 0.05);

    ctx.beginPath();
    ctx.moveTo(sx + tileSize * 0.2, sy + tileSize * 0.45 + wave);
    ctx.quadraticCurveTo(sx + tileSize * 0.5, sy + tileSize * 0.4 - wave, sx + tileSize * 0.8, sy + tileSize * 0.45 + wave);

    ctx.moveTo(sx + tileSize * 0.3, sy + tileSize * 0.75 - wave);
    ctx.quadraticCurveTo(sx + tileSize * 0.6, sy + tileSize * 0.7 + wave, sx + tileSize * 0.75, sy + tileSize * 0.75 - wave);
    ctx.stroke();
    ctx.restore();
  }
}

// ============================================================================
// G6: BIOME AMBIENT ATMOSPHERE & DRIFTING MIST OVERLAYS
// ============================================================================

/**
 * Renders atmospheric drifting fog bands and weather haze per region.
 * Uses very low alpha (<= 0.06) so it adds cinematic depth without obscuring controls.
 */
export function renderBiomeAmbientFog(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  currentRegion: any,
  time: number,
  cameraZoom: number
) {
  if (!currentRegion) return;
  const slug = currentRegion.regionSlug || currentRegion.id || '';

  ctx.save();

  if (slug.includes('delta') || slug.includes('lake') || slug.includes('river') || slug.includes('valley')) {
    // Drifting River Mist Ribbons
    const mistY1 = ((time * 12) % (height + 200)) - 100;
    const mistY2 = (((time * 16) + height * 0.5) % (height + 200)) - 100;

    const grad1 = ctx.createLinearGradient(0, mistY1 - 40, 0, mistY1 + 40);
    grad1.addColorStop(0, 'rgba(225, 235, 238, 0)');
    grad1.addColorStop(0.5, 'rgba(225, 235, 238, 0.06)');
    grad1.addColorStop(1, 'rgba(225, 235, 238, 0)');

    ctx.fillStyle = grad1;
    ctx.fillRect(0, mistY1 - 40, width, 80);

    const grad2 = ctx.createLinearGradient(0, mistY2 - 50, 0, mistY2 + 50);
    grad2.addColorStop(0, 'rgba(225, 235, 238, 0)');
    grad2.addColorStop(0.5, 'rgba(225, 235, 238, 0.05)');
    grad2.addColorStop(1, 'rgba(225, 235, 238, 0)');

    ctx.fillStyle = grad2;
    ctx.fillRect(0, mistY2 - 50, width, 100);
  } else if (slug.includes('desert') || slug.includes('sand') || slug.includes('gorge')) {
    // Warm Golden Dust Haze
    ctx.fillStyle = 'rgba(235, 205, 145, 0.04)';
    ctx.fillRect(0, 0, width, height);
  } else if (slug.includes('desolate') || slug.includes('glacial') || slug.includes('snow')) {
    // Glacial Cold Frost Tint
    ctx.fillStyle = 'rgba(215, 230, 245, 0.05)';
    ctx.fillRect(0, 0, width, height);
  } else if (slug.includes('swamp') || slug.includes('mire') || slug.includes('poison') || slug.includes('demon')) {
    // Murky Miasma Ambient Overlay
    ctx.fillStyle = 'rgba(120, 80, 140, 0.05)';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

// ============================================================================
// MASTER CHUNK GROUND BITMAP RENDERER (OFFSCREEN CACHE)
// ============================================================================

const CHUNK_SIZE = 32;

/**
 * Pre-renders an entire 32x32 chunk's ground layer (G0, G1, G2, G3, and base G4)
 * onto an OffscreenCanvas. This provides 60+ FPS high-performance rendering.
 */
export function renderChunkGroundBitmap(
  cx: number,
  cy: number,
  tiles: Array<{ tileX: number; tileY: number; terrainType: string }>,
  tileSize: number = 54,
  getNeighborTerrain?: NeighborTerrainFn
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;

  if (groundTextures.ready) {
    const textured = renderChunkGroundBitmapTextured(cx, cy, tiles, tileSize, getNeighborTerrain);
    if (textured) return textured;
  }

  const canvasWidth = CHUNK_SIZE * tileSize;
  const canvasHeight = CHUNK_SIZE * tileSize;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Build tile lookup dictionary for chunk-local fast neighbor queries
  const tileLookup = new Map<string, string>();
  for (const t of tiles) {
    tileLookup.set(`${t.tileX},${t.tileY}`, t.terrainType);
  }

  const chunkNeighborTerrain: NeighborTerrainFn = (x, y) => {
    return tileLookup.get(`${x},${y}`) || (getNeighborTerrain ? getNeighborTerrain(x, y) : undefined);
  };

  // Step 1: Render L1 Base Wash & Variants (G0 + G1)
  for (const t of tiles) {
    const lx = t.tileX - cx * CHUNK_SIZE;
    const ly = t.tileY - cy * CHUNK_SIZE;
    const sx = lx * tileSize;
    const sy = ly * tileSize;

    renderL1TerrainBase(ctx, sx, sy, tileSize, t.terrainType, t.tileX, t.tileY);
  }

  // Step 2: Render Biome Transitions (G2)
  for (const t of tiles) {
    const lx = t.tileX - cx * CHUNK_SIZE;
    const ly = t.tileY - cy * CHUNK_SIZE;
    const sx = lx * tileSize;
    const sy = ly * tileSize;

    renderL2BiomeTransitions(ctx, sx, sy, tileSize, t.tileX, t.tileY, t.terrainType, chunkNeighborTerrain);
  }

  // Step 3: Render Autotiles for Roads & Static Rivers (G4 Base)
  for (const t of tiles) {
    const lx = t.tileX - cx * CHUNK_SIZE;
    const ly = t.tileY - cy * CHUNK_SIZE;
    const sx = lx * tileSize;
    const sy = ly * tileSize;

    const isRiver = t.terrainType.includes('river') || t.terrainType.includes('lake') || t.terrainType.includes('water') || t.terrainType.includes('sea');
    const isRoad = t.terrainType.includes('road');

    if (isRiver || isRoad) {
      const bitmask = calculateAutotileBitmask(t.tileX, t.tileY, t.terrainType, chunkNeighborTerrain);
      const frameId = getAutotileFrameId(t.terrainType, bitmask);
      if (atlasLoader.hasFrame(frameId)) {
        atlasLoader.drawSprite(ctx, frameId, sx, sy, tileSize, tileSize, 0.95);
      }
    }
  }

  // Step 4: Render Procedural Ground Decals (G3)
  for (const t of tiles) {
    const lx = t.tileX - cx * CHUNK_SIZE;
    const ly = t.tileY - cy * CHUNK_SIZE;
    const sx = lx * tileSize;
    const sy = ly * tileSize;

    renderL3GroundDecal(ctx, sx, sy, tileSize, t.tileX, t.tileY, t.terrainType);
  }

  return canvas;
}

// Scratch canvas cache for texture layer rasterization to avoid GC pauses
const scratchCanvasMap = new Map<string, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }>();

function getScratch(id: string, w: number, h: number) {
  if (typeof document === 'undefined') return null;
  let item = scratchCanvasMap.get(id);
  if (!item) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    item = { canvas: c, ctx };
    scratchCanvasMap.set(id, item);
  } else {
    if (item.canvas.width !== w || item.canvas.height !== h) {
      item.canvas.width = w;
      item.canvas.height = h;
    }
  }
  return item;
}

const FAMILY_RENDER_ORDER = [
  'ocean', 'swamp', 'demonic_swamp', 'poison_pool', 'ice_crack', 'snow',
  'desert_sand', 'dune', 'island_reef', 'canyon_floor', 'hill', 'plains',
  'meadow', 'farmland', 'herb_field', 'forest_floor', 'bamboo_floor',
  'dead_wood', 'miasma_waste', 'battlefield_ash', 'crater', 'volcanic',
  'lava_flow', 'lightning_scar', 'abyss_edge', 'rock_ground', 'mountain_pass',
  'ruin_floor', 'formation_tile', 'settlement_floor', 'road_stone'
];

function getFamilyPriority(f: string): number {
  const idx = FAMILY_RENDER_ORDER.indexOf(f);
  return idx >= 0 ? idx : Math.floor(FAMILY_RENDER_ORDER.length / 2);
}

const perfRing: number[] = [];

/**
 * V12 P9: Tale of Immortal Authentic Grid Overlay Pre-renderer
 * Pre-renders cell lines, 8-cell major lines, and blocked solid cell tints onto an OffscreenCanvas.
 * Cached per 32x32 chunk for 60+ FPS zero-overhead pan & zoom.
 */
export function renderChunkGridBitmap(
  cx: number,
  cy: number,
  tiles: Array<{ tileX: number; tileY: number; terrainType: string; isSolid?: boolean }>,
  tileSize: number = 54
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;

  const canvasWidth = CHUNK_SIZE * tileSize;
  const canvasHeight = CHUNK_SIZE * tileSize;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Blocked solid cell tint: rgba(180, 40, 30, 0.10) (exclude roads)
  ctx.fillStyle = 'rgba(180, 40, 30, 0.10)';
  for (const t of tiles) {
    if (t.isSolid && !t.terrainType.includes('road')) {
      const lx = t.tileX - cx * CHUNK_SIZE;
      const ly = t.tileY - cy * CHUNK_SIZE;
      ctx.fillRect(lx * tileSize, ly * tileSize, tileSize, tileSize);
    }
  }

  // 2. Adaptive cell lines (width: 1 device-px, snap to half-pixel)
  for (const t of tiles) {
    const lx = t.tileX - cx * CHUNK_SIZE;
    const ly = t.tileY - cy * CHUNK_SIZE;
    const x0 = Math.round(lx * tileSize) + 0.5;
    const y0 = Math.round(ly * tileSize) + 0.5;
    const x1 = Math.round((lx + 1) * tileSize) + 0.5;
    const y1 = Math.round((ly + 1) * tileSize) + 0.5;

    const fInfo = groundTextures.familyOf(t.terrainType);
    const fam = fInfo ? fInfo.family : 'plains';
    const famSpec = (groundTextures.manifest as any)?.families?.[fam];
    const lum = famSpec?.targetLuminance ?? 120;
    const isLight = lum > 140;

    // Delta L target 6-14: light ground -> rgba(40,30,20,0.09); dark ground -> rgba(255,248,230,0.07)
    ctx.lineWidth = 1;
    ctx.strokeStyle = isLight ? 'rgba(40, 30, 20, 0.09)' : 'rgba(255, 248, 230, 0.07)';

    ctx.beginPath();
    ctx.moveTo(x1, y0);
    ctx.lineTo(x1, y1);
    ctx.moveTo(x0, y1);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  // 3. Major lines: every 8 cells and chunk borders (alpha 0.22, 1.5 device-px)
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(40, 30, 20, 0.22)';
  for (let i = 0; i <= CHUNK_SIZE; i += 8) {
    const px = Math.min(canvasWidth - 1, Math.round(i * tileSize)) + 0.5;
    const py = Math.min(canvasHeight - 1, Math.round(i * tileSize)) + 0.5;

    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, canvasHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(canvasWidth, py);
    ctx.stroke();
  }

  return canvas;
}

/**
 * High-fidelity seamless ink-wash textured ground renderer (V9 Prompt B4 & B5).
 * Renders layered multi-family seamless textures with soft edge masks and macro radial variation.
 */
export function renderChunkGroundBitmapTextured(
  cx: number,
  cy: number,
  tiles: Array<{ tileX: number; tileY: number; terrainType: string }>,
  tileSize: number = 54,
  getNeighborTerrain?: NeighborTerrainFn
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const t0 = performance.now();

  const canvasWidth = CHUNK_SIZE * tileSize;
  const canvasHeight = CHUNK_SIZE * tileSize;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Build tile lookup dictionary for chunk-local fast neighbor queries
  const tileLookup = new Map<string, string>();
  for (const t of tiles) {
    tileLookup.set(`${t.tileX},${t.tileY}`, t.terrainType);
  }

  const chunkNeighborTerrain: NeighborTerrainFn = (x, y) => {
    return tileLookup.get(`${x},${y}`) || (getNeighborTerrain ? getNeighborTerrain(x, y) : undefined);
  };

  // Step 2: Determine family for each tile in chunk + border 2 tiles (36x36 grid)
  const BORDER = 2;
  const GRID_DIM = CHUNK_SIZE + BORDER * 2; // 36
  const gridFamilies = new Array<string>(GRID_DIM * GRID_DIM);
  const presentFamilies = new Set<string>();

  for (let dy = -BORDER; dy < CHUNK_SIZE + BORDER; dy++) {
    for (let dx = -BORDER; dx < CHUNK_SIZE + BORDER; dx++) {
      const gx = cx * CHUNK_SIZE + dx;
      const gy = cy * CHUNK_SIZE + dy;
      const terrain = chunkNeighborTerrain(gx, gy) || 'plains';
      const fInfo = groundTextures.familyOf(terrain);
      const fam = fInfo ? fInfo.family : 'plains';
      const idx = (dy + BORDER) * GRID_DIM + (dx + BORDER);
      gridFamilies[idx] = fam;
      presentFamilies.add(fam);
    }
  }

  // Step 3: Sort families by bottom->top render priority
  const sortedFamilies = Array.from(presentFamilies).sort((a, b) => getFamilyPriority(a) - getFamilyPriority(b));

  // Prepare scratch canvases
  const scratchT = getScratch('T', canvasWidth, canvasHeight);
  const scratchM = getScratch('M', GRID_DIM, GRID_DIM);
  const scratchMB = getScratch('MB', GRID_DIM * tileSize, GRID_DIM * tileSize);
  const scratchMB2 = getScratch('MB2', GRID_DIM * tileSize, GRID_DIM * tileSize);

  if (!scratchT || !scratchM || !scratchMB || !scratchMB2) return null;

  const ctxT = scratchT.ctx;
  const ctxM = scratchM.ctx;
  const ctxMB = scratchMB.ctx;
  const ctxMB2 = scratchMB2.ctx;

  // Step 4: Render each family
  for (const F of sortedFamilies) {
    ctxT.clearRect(0, 0, canvasWidth, canvasHeight);
    ctxT.globalCompositeOperation = 'source-over';

    // 4b: Small mask M (36x36)
    const imgData = ctxM.createImageData(GRID_DIM, GRID_DIM);
    const d32 = new Uint32Array(imgData.data.buffer);
    for (let i = 0; i < gridFamilies.length; i++) {
      d32[i] = gridFamilies[i] === F ? 0xff000000 : 0x00000000;
    }
    ctxM.putImageData(imgData, 0, 0);

    // 4c: Upscale M to MB (nearest-neighbor for road_stone, smooth feathered for organic terrain)
    ctxMB.clearRect(0, 0, GRID_DIM * tileSize, GRID_DIM * tileSize);
    if (F === 'road_stone') {
      ctxMB.imageSmoothingEnabled = false;
      ctxMB.drawImage(scratchM.canvas, 0, 0, GRID_DIM, GRID_DIM, 0, 0, GRID_DIM * tileSize, GRID_DIM * tileSize);

      ctxMB2.clearRect(0, 0, GRID_DIM * tileSize, GRID_DIM * tileSize);
      ctxMB2.filter = 'none';
      ctxMB2.drawImage(scratchMB.canvas, 0, 0);
    } else {
      ctxMB.imageSmoothingEnabled = true;
      ctxMB.imageSmoothingQuality = 'high';
      ctxMB.drawImage(scratchM.canvas, 0, 0, GRID_DIM, GRID_DIM, 0, 0, GRID_DIM * tileSize, GRID_DIM * tileSize);

      ctxMB2.clearRect(0, 0, GRID_DIM * tileSize, GRID_DIM * tileSize);
      // V11: Settlement floor feathering blur 0.85 * tileSize (~46px) dissolves sharp box
      const blurPx = F === 'settlement_floor' ? tileSize * 0.85 : tileSize * 0.32;
      ctxMB2.filter = `blur(${blurPx.toFixed(1)}px)`;
      ctxMB2.drawImage(scratchMB.canvas, 0, 0);
      ctxMB2.filter = 'none';

      // V11: Organic transition mask overlay (ink splatter edges) for organic biomes
      if (F !== 'settlement_floor') {
        const transMask = groundTextures.getTransitionMask(Math.abs(hash2d(cx * 17 + cy, cy * 31)));
        if (transMask) {
          ctxMB2.save();
          ctxMB2.globalCompositeOperation = 'source-atop';
          ctxMB2.globalAlpha = 0.25;
          ctxMB2.drawImage(transMask, 0, 0, GRID_DIM * tileSize, GRID_DIM * tileSize);
          ctxMB2.restore();
        }
      }
    }

    // 4e: Fill T with seamless base pattern + smooth noise-blended secondary variants (V11)
    const fInfo = groundTextures.familyOf(F);
    const variants = fInfo && fInfo.variants && fInfo.variants.length > 0
      ? fInfo.variants
      : [`${F}_v1`, `${F}_v2`, `${F}_v3`, `${F}_v4`];

    // V11: 1024x1024 macro texture spans 8 cells
    const textureSpanPx = 8 * tileSize; // 432px at tileSize 54
    const scale = textureSpanPx / 1024; // 0.421875

    // World-coordinate origin offset for continuous texture alignment across chunks
    const chunkWorldPx = (cx * CHUNK_SIZE) * tileSize;
    const chunkWorldPy = (cy * CHUNK_SIZE) * tileSize;
    const originX = -((chunkWorldPx % textureSpanPx + textureSpanPx) % textureSpanPx);
    const originY = -((chunkWorldPy % textureSpanPx + textureSpanPx) % textureSpanPx);

    // 1. Draw base variant across entire chunk (m1)
    const basePattern = groundTextures.getPattern(ctxT, variants[0]);
    if (basePattern) {
      if (typeof (basePattern as any).setTransform === 'function') {
        const matrix = new DOMMatrix().translate(originX, originY).scale(scale);
        basePattern.setTransform(matrix);
      }
      ctxT.fillStyle = basePattern;
      ctxT.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // 2. If multiple variants, blend secondary variants smoothly using continuous blurred variant mask
    if (variants.length > 1 && F !== 'road_stone') {
      const BLOCK_TILES = 8;
      const BLOCKS_PER_CHUNK = CHUNK_SIZE / BLOCK_TILES; // 4
      const V_BORDER = 1;
      const V_GRID_DIM = BLOCKS_PER_CHUNK + V_BORDER * 2; // 6x6 blocks

      const scratchVM = getScratch('VM', V_GRID_DIM, V_GRID_DIM);
      const scratchVMB = getScratch('VMB', canvasWidth, canvasHeight);
      const scratchVT = getScratch('VT', canvasWidth, canvasHeight);

      if (scratchVM && scratchVMB && scratchVT) {
        const ctxVM = scratchVM.ctx;
        const ctxVMB = scratchVMB.ctx;
        const ctxVT = scratchVT.ctx;

        const famId = Math.abs(hash2d(F.length, F.charCodeAt(0) || 7));

        for (let vIdx = 1; vIdx < variants.length; vIdx++) {
          const varId = variants[vIdx];
          const varPattern = groundTextures.getPattern(ctxVT, varId);
          if (!varPattern) continue;

          // 2a. Fill small 6x6 variant mask using V11 macro sampling hash
          const vmImgData = ctxVM.createImageData(V_GRID_DIM, V_GRID_DIM);
          const vmD32 = new Uint32Array(vmImgData.data.buffer);

          let hasAny = false;
          for (let by = -V_BORDER; by < BLOCKS_PER_CHUNK + V_BORDER; by++) {
            for (let bx = -V_BORDER; bx < BLOCKS_PER_CHUNK + V_BORDER; bx++) {
              const bGlobalX = cx * BLOCKS_PER_CHUNK + bx;
              const bGlobalY = cy * BLOCKS_PER_CHUNK + by;
              const selIdx = Math.abs(hash2d(bGlobalX * 7919 + famId, bGlobalY * 104729 + famId)) % variants.length;
              const idx = (by + V_BORDER) * V_GRID_DIM + (bx + V_BORDER);
              if (selIdx === vIdx) {
                vmD32[idx] = 0xff000000;
                hasAny = true;
              } else {
                vmD32[idx] = 0x00000000;
              }
            }
          }

          if (!hasAny) continue;
          ctxVM.putImageData(vmImgData, 0, 0);

          // 2b. Upscale & blur variant mask to eliminate block boundary seams
          ctxVMB.clearRect(0, 0, canvasWidth, canvasHeight);
          ctxVMB.imageSmoothingEnabled = true;
          ctxVMB.imageSmoothingQuality = 'high';
          ctxVMB.filter = `blur(${(tileSize * 1.2).toFixed(1)}px)`; // ~65px organic soft blend
          ctxVMB.drawImage(
            scratchVM.canvas,
            V_BORDER,
            V_BORDER,
            BLOCKS_PER_CHUNK,
            BLOCKS_PER_CHUNK,
            0,
            0,
            canvasWidth,
            canvasHeight
          );
          ctxVMB.filter = 'none';

          // 2c. Render secondary variant pattern masked by blurred mask
          ctxVT.clearRect(0, 0, canvasWidth, canvasHeight);
          ctxVT.globalCompositeOperation = 'source-over';
          if (typeof (varPattern as any).setTransform === 'function') {
            const matrix = new DOMMatrix().translate(originX, originY).scale(scale);
            varPattern.setTransform(matrix);
          }
          ctxVT.fillStyle = varPattern;
          ctxVT.fillRect(0, 0, canvasWidth, canvasHeight);

          ctxVT.globalCompositeOperation = 'destination-in';
          ctxVT.drawImage(scratchVMB.canvas, 0, 0);

          // 2d. Composite secondary variant softly on top of T
          ctxT.globalCompositeOperation = 'source-over';
          ctxT.drawImage(scratchVT.canvas, 0, 0);
        }
      }
    }

    // 2e: V11 Composite 20% detail overlay from FAMILY_detail.png
    const detailPattern = groundTextures.getDetailPattern(ctxT, F);
    if (detailPattern) {
      ctxT.save();
      ctxT.globalCompositeOperation = 'soft-light';
      ctxT.globalAlpha = 0.20;
      if (typeof (detailPattern as any).setTransform === 'function') {
        const matrix = new DOMMatrix().translate(originX, originY).scale(scale);
        detailPattern.setTransform(matrix);
      }
      ctxT.fillStyle = detailPattern;
      ctxT.fillRect(0, 0, canvasWidth, canvasHeight);
      ctxT.restore();
    }

    // 4f: Mask T with blurred MB2 (crisp mask for road_stone)
    ctxT.globalCompositeOperation = 'destination-in';
    ctxT.drawImage(
      scratchMB2.canvas,
      BORDER * tileSize,
      BORDER * tileSize,
      canvasWidth,
      canvasHeight,
      0,
      0,
      canvasWidth,
      canvasHeight
    );
    ctxT.globalCompositeOperation = 'source-over';

    // 4f.2: For road_stone, add crisp 2px semi-transparent dark borders along non-road edges (Prompt H2)
    if (F === 'road_stone') {
      ctxT.fillStyle = 'rgba(40, 30, 20, 0.35)';
      for (let ly = BORDER; ly < BORDER + CHUNK_SIZE; ly++) {
        for (let lx = BORDER; lx < BORDER + CHUNK_SIZE; lx++) {
          if (gridFamilies[ly * GRID_DIM + lx] === 'road_stone') {
            const px = (lx - BORDER) * tileSize;
            const py = (ly - BORDER) * tileSize;
            if (gridFamilies[(ly - 1) * GRID_DIM + lx] !== 'road_stone') {
              ctxT.fillRect(px, py, tileSize, 2);
            }
            if (gridFamilies[(ly + 1) * GRID_DIM + lx] !== 'road_stone') {
              ctxT.fillRect(px, py + tileSize - 2, tileSize, 2);
            }
            if (gridFamilies[ly * GRID_DIM + lx - 1] !== 'road_stone') {
              ctxT.fillRect(px, py, 2, tileSize);
            }
            if (gridFamilies[ly * GRID_DIM + lx + 1] !== 'road_stone') {
              ctxT.fillRect(px + tileSize - 2, py, 2, tileSize);
            }
          }
        }
      }
    }

    // 4g: Draw T onto chunk canvas
    ctx.drawImage(scratchT.canvas, 0, 0);

    // 4h: Road edge grass decals on neighboring non-road cells (Prompt H2)
    if (F === 'road_stone') {
      for (let ly = BORDER; ly < BORDER + CHUNK_SIZE; ly++) {
        for (let lx = BORDER; lx < BORDER + CHUNK_SIZE; lx++) {
          const here = gridFamilies[ly * GRID_DIM + lx];
          if (here !== 'road_stone') {
            const hasRoadNeighbor = (
              gridFamilies[(ly - 1) * GRID_DIM + lx] === 'road_stone' ||
              gridFamilies[(ly + 1) * GRID_DIM + lx] === 'road_stone' ||
              gridFamilies[ly * GRID_DIM + lx - 1] === 'road_stone' ||
              gridFamilies[ly * GRID_DIM + lx + 1] === 'road_stone'
            );
            if (hasRoadNeighbor) {
              const wx = cx * CHUNK_SIZE + (lx - BORDER);
              const wy = cy * CHUNK_SIZE + (ly - BORDER);
              const px = (lx - BORDER) * tileSize;
              const py = (ly - BORDER) * tileSize;
              renderL3GroundDecal(ctx, px, py, tileSize, wx, wy, here);
            }
          }
        }
      }
    }
  }

  // Step 5: Macro radial overlay (anti-repetition)
  const hashVal = (hash2d(cx * 7 + 3, cy * 13 + 5) >>> 0) / 0xffffffff;
  const alpha = Math.min(0.1, 0.05 + 0.05 * hashVal);
  const isDark = (hash2d(cx * 11 + 1, cy * 17 + 2) & 1) === 0;
  const grad = ctx.createRadialGradient(
    canvasWidth / 2, canvasHeight / 2, canvasWidth * 0.1,
    canvasWidth / 2, canvasHeight / 2, canvasWidth * 0.7
  );
  grad.addColorStop(0, isDark ? `rgba(0, 0, 0, ${alpha.toFixed(3)})` : `rgba(255, 255, 255, ${alpha.toFixed(3)})`);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Step 6a: Autotiles for Rivers & Roads (G4 Base)
  for (const t of tiles) {
    const lx = t.tileX - cx * CHUNK_SIZE;
    const ly = t.tileY - cy * CHUNK_SIZE;
    const sx = lx * tileSize;
    const sy = ly * tileSize;

    const isRiver = t.terrainType.includes('river') || t.terrainType.includes('lake') || t.terrainType.includes('water') || t.terrainType.includes('sea');
    const isRoad = t.terrainType.includes('road');

    if (isRiver || isRoad) {
      const bitmask = calculateAutotileBitmask(t.tileX, t.tileY, t.terrainType, chunkNeighborTerrain);
      const frameId = getAutotileFrameId(t.terrainType, bitmask);
      if (atlasLoader.hasFrame(frameId)) {
        atlasLoader.drawSprite(ctx, frameId, sx, sy, tileSize, tileSize, 0.95);
      }
    }
  }

  // Step 6b: Procedural Ground Decals (G3)
  for (const t of tiles) {
    const lx = t.tileX - cx * CHUNK_SIZE;
    const ly = t.tileY - cy * CHUNK_SIZE;
    const sx = lx * tileSize;
    const sy = ly * tileSize;

    renderL3GroundDecal(ctx, sx, sy, tileSize, t.tileX, t.tileY, t.terrainType);
  }

  // Step 7: Performance profiling
  const elapsed = performance.now() - t0;
  perfRing.push(elapsed);
  if (perfRing.length > 20) perfRing.shift();
  if (perfRing.length === 20 && Math.random() < 0.05) {
    const sorted = [...perfRing].sort((a, b) => a - b);
    const median = sorted[10].toFixed(1);
    const p95 = sorted[18].toFixed(1);
    console.log(`[GROUND-PERF] Chunk render median: ${median}ms, p95: ${p95}ms (target <= 45ms)`);
  }

  return canvas;
}
