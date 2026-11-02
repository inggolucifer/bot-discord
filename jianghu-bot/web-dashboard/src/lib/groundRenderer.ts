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
 * Continuous 2D value noise with cubic Hermite interpolation.
 * World-coordinate continuous, guaranteeing zero seams across chunk boundaries.
 */
export function smoothNoise2D(x: number, y: number, seed: number = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);

  const n00 = ((hash2d(xi + seed * 13, yi + seed * 37) & 0xffff) / 65535.0);
  const n10 = ((hash2d((xi + 1) + seed * 13, yi + seed * 37) & 0xffff) / 65535.0);
  const n01 = ((hash2d(xi + seed * 13, (yi + 1) + seed * 37) & 0xffff) / 65535.0);
  const n11 = ((hash2d((xi + 1) + seed * 13, (yi + 1) + seed * 37) & 0xffff) / 65535.0);

  const nx0 = n00 * (1 - u) + n10 * u;
  const nx1 = n01 * (1 - u) + n11 * u;
  return nx0 * (1 - v) + nx1 * v;
}

/**
 * 2-Octave Continuous Fractal Noise in range [0, 1].
 */
export function fbmNoise2D(x: number, y: number, seed: number = 0): number {
  return smoothNoise2D(x * 0.05, y * 0.05, seed) * 0.7 +
         smoothNoise2D(x * 0.12, y * 0.12, seed + 1013) * 0.3;
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
      return { baseColor: '#266572', accentColor: '#1E525C', mistColor: '#72B5C2', grainColor: '#174048', isWater: true, staminaCost: 1.4 };

    // Vegetation, Farmland & Woods
    case 'meadow':
      return { baseColor: '#5F8C45', accentColor: '#426B2E', mistColor: '#92B37B', grainColor: '#355624', staminaCost: 1.0 };
    case 'farmland':
    case 'herb_field':
      return { baseColor: '#4A7C36', accentColor: '#2C5022', mistColor: '#CDE5C0', grainColor: '#386629', staminaCost: 1.0 };
    case 'bamboo_grove':
    case 'bamboo_dense':
    case 'bamboo_forest':
      return { baseColor: '#4A7C38', accentColor: '#325C24', mistColor: '#80B86C', grainColor: '#284C1C', staminaCost: 1.3 };
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
      return { baseColor: '#586A7A', accentColor: '#3A4855', mistColor: '#BACBD9', grainColor: '#2C3742', staminaCost: 3.5 };
    case 'mountain_peak':
      return { baseColor: '#4A5A69', accentColor: '#2C3843', mistColor: '#A8BDCD', grainColor: '#1E2730', staminaCost: 4.0 };
    case 'canyon_floor':
      return { baseColor: '#A2603F', accentColor: '#7E4628', mistColor: '#E2BFA8', grainColor: '#60331B', staminaCost: 1.8 };
    case 'mountain_pass':
    case 'sword_gorge_pass':
      return { baseColor: '#6B7A88', accentColor: '#4A5662', mistColor: '#CBD5DE', grainColor: '#36404A', staminaCost: 1.2 };

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
 * Appears deterministically on ~16% of tiles with natural Wuxia aesthetics.
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
  // ~16% of tiles receive a micro decal to avoid visual noise / dust clutter
  if ((h & 0xff) > 42) return;

  const offsetX = sx + (((h >>> 8) & 0x7f) / 127) * (tileSize * 0.5) + tileSize * 0.25;
  const offsetY = sy + (((h >>> 15) & 0x7f) / 127) * (tileSize * 0.5) + tileSize * 0.25;
  const decalKind = (h >>> 22) % 4;

  ctx.save();

  if (terrainType.includes('meadow') || terrainType.includes('farmland') || terrainType === 'plains') {
    if (decalKind === 0) {
      // Twin-blade grass arch (ink wash stroke)
      ctx.strokeStyle = 'rgba(70, 95, 65, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
      ctx.quadraticCurveTo(offsetX - 2, offsetY - 5, offsetX - 3, offsetY - 6);
      ctx.moveTo(offsetX, offsetY);
      ctx.quadraticCurveTo(offsetX + 2, offsetY - 4, offsetX + 4, offsetY - 5);
      ctx.stroke();
    } else if (decalKind === 1) {
      // Tiny wild blossom dot (vermilion red or gold petal)
      const petalColor = (h & 1) ? '#D97706' : '#DC2626';
      ctx.fillStyle = petalColor;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(offsetX, offsetY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (decalKind === 2) {
      // Delicate clover patch
      ctx.fillStyle = 'rgba(60, 90, 50, 0.3)';
      ctx.beginPath();
      ctx.arc(offsetX - 1.2, offsetY - 1.2, 1.2, 0, Math.PI * 2);
      ctx.arc(offsetX + 1.2, offsetY - 1.2, 1.2, 0, Math.PI * 2);
      ctx.arc(offsetX, offsetY + 1.2, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (terrainType.includes('bamboo') || terrainType.includes('forest') || terrainType.includes('wood')) {
    if (decalKind === 0 || decalKind === 1) {
      // Fallen bamboo blade / autumn leaf
      ctx.fillStyle = 'rgba(140, 110, 60, 0.35)';
      ctx.beginPath();
      ctx.ellipse(offsetX, offsetY, 3, 1, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Soft moss patch
      ctx.fillStyle = 'rgba(45, 75, 40, 0.22)';
      ctx.beginPath();
      ctx.ellipse(offsetX, offsetY, 3.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (terrainType.includes('mountain') || terrainType.includes('rock') || terrainType.includes('cliff') || terrainType.includes('hill')) {
    // Subtle slate mineral fleck (cool ink wash, very faint)
    ctx.fillStyle = 'rgba(80, 95, 110, 0.25)';
    ctx.beginPath();
    ctx.ellipse(offsetX, offsetY, 2.2, 1.2, (h & 3) * Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (terrainType.includes('desert') || terrainType.includes('sand') || terrainType.includes('dune')) {
    // Subtle wind-carved sand ripple arch
    ctx.strokeStyle = 'rgba(210, 185, 140, 0.28)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(offsetX - 4, offsetY);
    ctx.quadraticCurveTo(offsetX, offsetY - 1.5, offsetX + 4, offsetY + 0.8);
    ctx.stroke();
  } else if (terrainType.includes('snow') || terrainType.includes('ice') || terrainType.includes('glacier')) {
    // Soft frost sparkle
    ctx.fillStyle = 'rgba(240, 248, 255, 0.45)';
    ctx.fillRect(offsetX, offsetY - 1.5, 1, 3);
    ctx.fillRect(offsetX - 1.5, offsetY, 3, 1);
  } else if (terrainType.includes('swamp') || terrainType.includes('mire') || terrainType.includes('poison')) {
    // Marsh bubble puddle
    ctx.fillStyle = 'rgba(90, 70, 100, 0.28)';
    ctx.beginPath();
    ctx.arc(offsetX, offsetY, 2.5, 0, Math.PI * 2);
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
 * @deprecated V18 P4: Deprecated in favor of buildRoadAlphaMask single continuous raster corridor.
 * Kept for test backwards-compatibility.
 * V13 P2: Continuous 47-blob Soft Road Path Generator (Zero Ladder Artifacts)
 * - Seamless boundary connections (hw = 0.44 * tileSize, matching adjoining cells)
 * - Filleted rounded corners (r = 0.3 cell) with bezier/arcTo
 * - Undulating organic edges (noise amplitude 0.04 cell)
 * - Natural trodden road end-caps
 */
export function drawSoftBlobRoadPath(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  bitmask: number,
  worldX?: number,
  worldY?: number,
  neighborsExtended?: { isDoubleWide?: boolean }
) {
  const hasN = (bitmask & 1) !== 0;
  const hasE = (bitmask & 2) !== 0;
  const hasS = (bitmask & 4) !== 0;
  const hasW = (bitmask & 8) !== 0;

  const cx = px + tileSize * 0.5;
  const cy = py + tileSize * 0.5;
  const isWide = neighborsExtended?.isDoubleWide || ((hasE && hasW) && (hasN || hasS)) || ((hasN && hasS) && (hasE || hasW));

  const wx = worldX !== undefined ? worldX : px / tileSize;
  const wy = worldY !== undefined ? worldY : py / tileSize;

  // V16: Continuous world noise displacement for organic road edge roughness (0.15..0.35 cell)
  const wMod = 1.0 + 0.10 * Math.sin(wx * 0.6 + wy * 0.4) + 0.06 * Math.cos(wx * 1.2 - wy * 0.8);
  const hw = (isWide ? tileSize * 0.50 : tileSize * 0.42) * wMod;
  const r = tileSize * 0.28;

  // Gentle lateral undulation
  const undulateX = (smoothNoise2D(wx * 0.25, wy * 0.25, 41) - 0.5) * (tileSize * 0.12);
  const undulateY = (smoothNoise2D(wx * 0.25, wy * 0.25, 73) - 0.5) * (tileSize * 0.12);

  const left = cx - hw + undulateX;
  const right = cx + hw + undulateX;
  const top = cy - hw + undulateY;
  const bottom = cy + hw + undulateY;

  ctx.beginPath();

  if (!hasN && !hasS && !hasW && !hasE) {
    // Single isolated stepping stone / natural patch
    ctx.ellipse(cx + undulateX, cy + undulateY, Math.max(0.1, hw * 0.85), Math.max(0.1, hw * 0.75), 0.2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    return;
  }

  // Draw continuous interconnected corridor with organic curved segments
  // Top side (North)
  if (hasN) {
    ctx.moveTo(left, py);
    const midX = (left + right) * 0.5 + undulateX;
    ctx.quadraticCurveTo(midX, py + (cy - hw - py) * 0.5, right, py);
  } else {
    ctx.moveTo(left + r, top);
    const midX = (left + right) * 0.5;
    ctx.quadraticCurveTo(midX, top + undulateY * 0.5, right - r, top);
    if (!hasE) ctx.arcTo(right, top, right, top + r, r);
  }

  // Right side (East)
  if (hasE) {
    if (!hasN) ctx.lineTo(right, top);
    const midY = cy + undulateY;
    ctx.quadraticCurveTo(right + (px + tileSize - right) * 0.5, midY - hw, px + tileSize, cy - hw);
    ctx.lineTo(px + tileSize, cy + hw);
    if (!hasS) ctx.quadraticCurveTo(right + (px + tileSize - right) * 0.5, midY + hw, right, bottom);
  } else {
    if (hasN) ctx.lineTo(right, cy - hw);
    const midY = (top + bottom) * 0.5;
    ctx.quadraticCurveTo(right + undulateX * 0.5, midY, right, bottom - r);
    if (!hasS) ctx.arcTo(right, bottom, right - r, bottom, r);
  }

  // Bottom side (South)
  if (hasS) {
    if (!hasE && !hasS) ctx.lineTo(right, bottom);
    const midX = (left + right) * 0.5 + undulateX;
    ctx.quadraticCurveTo(midX, bottom + (py + tileSize - bottom) * 0.5, right, py + tileSize);
    ctx.lineTo(left, py + tileSize);
    if (!hasW) ctx.quadraticCurveTo(left, bottom + (py + tileSize - bottom) * 0.5, left, bottom);
  } else {
    if (hasE) ctx.lineTo(cx + hw, bottom);
    const midX = (left + right) * 0.5;
    ctx.quadraticCurveTo(midX, bottom - undulateY * 0.5, left + r, bottom);
    if (!hasW) ctx.arcTo(left, bottom, left, bottom - r, r);
  }

  // Left side (West)
  if (hasW) {
    if (!hasS) ctx.lineTo(left, bottom);
    const midY = cy + undulateY;
    ctx.quadraticCurveTo(left - (left - px) * 0.5, midY + hw, px, cy + hw);
    ctx.lineTo(px, cy - hw);
    if (!hasN) ctx.quadraticCurveTo(left - (left - px) * 0.5, midY - hw, left, top);
  } else {
    if (hasS) ctx.lineTo(left, cy + hw);
    const midY = (top + bottom) * 0.5;
    ctx.quadraticCurveTo(left - undulateX * 0.5, midY, left, top + r);
    if (!hasN) ctx.arcTo(left, top, left + r, top, r);
  }

  ctx.closePath();
  ctx.fill();
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

  if (!isRiver) return;

  const bitmask = calculateAutotileBitmask(tx, ty, terrainType, getNeighborTerrain);
  const frameId = getAutotileFrameId(terrainType, bitmask);

  // Attempt atlas sprite draw for rivers only
  const drawn = atlasLoader.hasFrame(frameId) && atlasLoader.drawSprite(ctx, frameId, sx, sy, tileSize, tileSize, 0.95);

  if (!drawn) {
    ctx.save();
    ctx.fillStyle = '#8EA8AE';
    ctx.fillRect(sx, sy, tileSize, tileSize);
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
export interface GroundBisectFlags {
  groundOnly?: boolean;
  layers?: 'base' | 'base+families' | 'base+families+variants' | 'all';
  noRoad?: boolean;
  noFarm?: boolean;
}

export function renderChunkGroundBitmap(
  cx: number,
  cy: number,
  tiles: Array<{ tileX: number; tileY: number; terrainType: string }>,
  tileSize: number = 54,
  getNeighborTerrain?: NeighborTerrainFn,
  flags?: GroundBisectFlags
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;

  if (groundTextures.ready) {
    const textured = renderChunkGroundBitmapTextured(cx, cy, tiles, tileSize, getNeighborTerrain, flags);
    if (textured) return textured;
  }

  const canvasWidth = CHUNK_SIZE * tileSize;
  const canvasHeight = CHUNK_SIZE * tileSize;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Solid base fill with region base color to prevent any transparency leaks
  const centerWorldX = cx * CHUNK_SIZE + 16;
  const centerWorldY = cy * CHUNK_SIZE + 16;
  ctx.fillStyle = getRegionColorAt(centerWorldX, centerWorldY);
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

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

  // Step 3: Render Autotiles for Static Rivers (G4 Base)
  for (const t of tiles) {
    const lx = t.tileX - cx * CHUNK_SIZE;
    const ly = t.tileY - cy * CHUNK_SIZE;
    const sx = lx * tileSize;
    const sy = ly * tileSize;

    const isRiver = t.terrainType.includes('river') || t.terrainType.includes('lake') || t.terrainType.includes('water') || t.terrainType.includes('sea');

    if (isRiver) {
      const bitmask = calculateAutotileBitmask(t.tileX, t.tileY, t.terrainType, chunkNeighborTerrain);
      const frameId = getAutotileFrameId(t.terrainType, bitmask);
      if (atlasLoader.hasFrame(frameId)) {
        atlasLoader.drawSprite(ctx, frameId, sx, sy, tileSize, tileSize, 0.40);
      }
      // Rich vibrant river water glaze (Hue ~185-195 deg, Sat > 0.35) to prevent desaturated foam
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(38, 118, 142, 0.65)';
      ctx.fillRect(sx, sy, tileSize, tileSize);
      ctx.restore();
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

  // 1. Blocked solid cell footprint outline (subtle 1px border, no solid pink fill)
  ctx.strokeStyle = 'rgba(120, 70, 50, 0.15)';
  ctx.lineWidth = 1;
  for (const t of tiles) {
    if (t.isSolid && !t.terrainType.includes('road')) {
      const lx = t.tileX - cx * CHUNK_SIZE;
      const ly = t.tileY - cy * CHUNK_SIZE;
      ctx.strokeRect(lx * tileSize + 0.5, ly * tileSize + 0.5, tileSize - 1, tileSize - 1);
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
 * V18 P4: Continuous Single-Corridor Road Mask (Zero Bubbles, Zero Staircases, Zero Lobes).
 * Rasterized at 4 px/cell over full chunk + BORDER=3 halo padding (152x152).
 * Bilinear domain-warped in world coordinates with smoothstep(0.42, 0.58).
 * Guarantees holes == 0, lobeRatio <= 1.35, widthCV <= 0.18, and chunk seam ratio <= 1.30.
 */
function buildRoadAlphaMask(
  gridFamilies: string[],
  GRID_DIM: number,
  BORDER: number,
  cx: number,
  cy: number,
  ctxMB2: CanvasRenderingContext2D,
  tileSize: number
): void {
  const S = 4; // 4 px per cell
  const W = GRID_DIM * S; // 38 * 4 = 152 px
  const scratchR = getScratch('ROAD_RAW', W, W);
  const scratchRB = getScratch('ROAD_BLUR', W, W);
  const scratchRW = getScratch('ROAD_WARP', W, W);
  if (!scratchR || !scratchRB || !scratchRW) return;

  const isRoadOrSettlement = (gx: number, gy: number): boolean => {
    if (gx < 0 || gx >= GRID_DIM || gy < 0 || gy >= GRID_DIM) return false;
    const fam = gridFamilies[gy * GRID_DIM + gx];
    return fam === 'road_stone' || fam === 'settlement_floor';
  };
  const isStrictRoad = (gx: number, gy: number): boolean => {
    if (gx < 0 || gx >= GRID_DIM || gy < 0 || gy >= GRID_DIM) return false;
    return gridFamilies[gy * GRID_DIM + gx] === 'road_stone';
  };

  const g = scratchR.ctx;
  g.clearRect(0, 0, W, W);
  g.fillStyle = '#ffffff';

  for (let gy = 0; gy < GRID_DIM; gy++) {
    for (let gx = 0; gx < GRID_DIM; gx++) {
      if (!isStrictRoad(gx, gy)) continue;
      const hasN = isStrictRoad(gx, gy - 1);
      const hasS = isStrictRoad(gx, gy + 1);
      const hasW = isStrictRoad(gx - 1, gy);
      const hasE = isStrictRoad(gx + 1, gy);

      // Multi-lane roads (width 2) have outer boundaries balanced with 0.26 inset to match corridor scale
      let inT = 0.09 * S;
      let inB = 0.09 * S;
      let inL = 0.09 * S;
      let inR = 0.09 * S;

      if (hasE || hasW) {
        if (hasS && !hasN) inT = 0.26 * S;
        if (hasN && !hasS) inB = 0.26 * S;
      }
      if (hasN || hasS) {
        if (hasE && !hasW) inL = 0.26 * S;
        if (hasW && !hasE) inR = 0.26 * S;
      }

      const x0 = gx * S + inL;
      const x1 = (gx + 1) * S - inR;
      const y0 = gy * S + inT;
      const y1 = (gy + 1) * S - inB;

      g.fillRect(x0, y0, x1 - x0, y1 - y0);

      if (gx < GRID_DIM - 1 && isRoadOrSettlement(gx + 1, gy)) {
        g.fillRect(x1, y0, (gx + 1) * S + 0.10 * S + 1 - x1, y1 - y0);
      }
      if (gy < GRID_DIM - 1 && isRoadOrSettlement(gx, gy + 1)) {
        g.fillRect(x0, y1, x1 - x0, (gy + 1) * S + 0.10 * S + 1 - y1);
      }
      if (
        gx < GRID_DIM - 1 &&
        gy < GRID_DIM - 1 &&
        isRoadOrSettlement(gx + 1, gy + 1) &&
        isRoadOrSettlement(gx + 1, gy) &&
        isRoadOrSettlement(gx, gy + 1)
      ) {
        g.fillRect(x1, y1, (gx + 1) * S + 0.10 * S + 1 - x1, (gy + 1) * S + 0.10 * S + 1 - y1);
      }
    }
  }

  // 1) Blur sigma = 0.28 cell = 1.12 px (rounds right angles, removes 1-cell staircases)
  const gB = scratchRB.ctx;
  gB.clearRect(0, 0, W, W);
  gB.filter = 'blur(1.12px)';
  gB.drawImage(scratchR.canvas, 0, 0);
  gB.filter = 'none';

  // 2) World domain-warp sampling
  const srcImgData = gB.getImageData(0, 0, W, W);
  const src = srcImgData.data;
  const dstImgData = scratchRW.ctx.createImageData(W, W);
  const dst = dstImgData.data;

  let pIdx = 0;
  for (let py = 0; py < W; py++) {
    const wy = cy * CHUNK_SIZE + (py / S - BORDER);
    for (let px = 0; px < W; px++) {
      const wx = cx * CHUNK_SIZE + (px / S - BORDER);
      const dx = (smoothNoise2D(wx * 1.1, wy * 1.1, 5) - 0.5) * 0.14 + (smoothNoise2D(wx * 3.3, wy * 3.3, 9) - 0.5) * 0.06;
      const dy = (smoothNoise2D(wx * 1.1, wy * 1.1, 17) - 0.5) * 0.14 + (smoothNoise2D(wx * 3.3, wy * 3.3, 21) - 0.5) * 0.06;

      const sx = px + dx * S;
      const sy = py + dy * S;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(W - 1, Math.max(0, x0 + 1));
      const y1 = Math.min(W - 1, Math.max(0, y0 + 1));
      const cx0 = Math.max(0, Math.min(W - 1, x0));
      const cy0 = Math.max(0, Math.min(W - 1, y0));
      const fx = sx - x0;
      const fy = sy - y0;

      const v00 = src[(cy0 * W + cx0) * 4];
      const v10 = src[(cy0 * W + x1) * 4];
      const v01 = src[(y1 * W + cx0) * 4];
      const v11 = src[(y1 * W + x1) * 4];
      const sample = ((v00 * (1 - fx) + v10 * fx) * (1 - fy) + (v01 * (1 - fx) + v11 * fx) * fy) / 255.0;

      let alpha = 0;
      if (sample > 0.42) {
        if (sample >= 0.58) {
          alpha = 255;
        } else {
          const t = (sample - 0.42) / (0.58 - 0.42);
          alpha = Math.round(t * t * (3 - 2 * t) * 255);
        }
      }

      dst[pIdx] = 255;
      dst[pIdx + 1] = 255;
      dst[pIdx + 2] = 255;
      dst[pIdx + 3] = alpha;
      pIdx += 4;
    }
  }
  scratchRW.ctx.putImageData(dstImgData, 0, 0);

  // 3) Upscale to ctxMB2
  ctxMB2.clearRect(0, 0, GRID_DIM * tileSize, GRID_DIM * tileSize);
  ctxMB2.imageSmoothingEnabled = true;
  ctxMB2.imageSmoothingQuality = 'high';
  ctxMB2.drawImage(scratchRW.canvas, 0, 0, W, W, 0, 0, GRID_DIM * tileSize, GRID_DIM * tileSize);
}

function applyRoadInnerShadow(
  ctxT: CanvasRenderingContext2D,
  scratchMB2: { canvas: HTMLCanvasElement },
  canvasWidth: number,
  canvasHeight: number,
  BORDER: number,
  tileSize: number,
  isSnow: boolean = false
): void {
  if (isSnow) return; // Snow roads use clean trodden snow tint without dirt edge shadow
  const scratchSh = getScratch('ROAD_INNER_SH', canvasWidth, canvasHeight);
  if (!scratchSh) return;
  const sCtx = scratchSh.ctx;
  sCtx.clearRect(0, 0, canvasWidth, canvasHeight);

  // 1. Draw sliced road mask
  sCtx.drawImage(
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

  // 2. destination-out with blurred mask keeps only the ~1.5px inner boundary rim
  sCtx.save();
  sCtx.globalCompositeOperation = 'destination-out';
  sCtx.filter = 'blur(1.5px)';
  sCtx.drawImage(
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
  sCtx.filter = 'none';

  // Tint only the rim pixels with dark brown (source-in fills only existing rim alpha)
  sCtx.globalCompositeOperation = 'source-in';
  sCtx.fillStyle = 'rgb(40, 32, 24)';
  sCtx.fillRect(0, 0, canvasWidth, canvasHeight);
  sCtx.restore();

  // 3. Composite subtle dark brown inner shadow onto road pixels (source-over)
  ctxT.save();
  ctxT.globalCompositeOperation = 'source-over';
  ctxT.globalAlpha = 0.14;
  ctxT.drawImage(scratchSh.canvas, 0, 0);
  ctxT.restore();
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
  getNeighborTerrain?: NeighborTerrainFn,
  flags?: GroundBisectFlags
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

  // Solid base fill with region base color to prevent any transparency leaks
  const centerWorldX = cx * CHUNK_SIZE + 16;
  const centerWorldY = cy * CHUNK_SIZE + 16;
  ctx.fillStyle = getRegionColorAt(centerWorldX, centerWorldY);
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Build tile lookup dictionary for chunk-local fast neighbor queries
  const tileLookup = new Map<string, string>();
  for (const t of tiles) {
    tileLookup.set(`${t.tileX},${t.tileY}`, t.terrainType);
  }

  const chunkNeighborTerrain: NeighborTerrainFn = (x, y) => {
    return tileLookup.get(`${x},${y}`) || (getNeighborTerrain ? getNeighborTerrain(x, y) : undefined);
  };

  // Step 2: Determine family for each tile in chunk + border 3 tiles (38x38 grid for wide blur padding)
  const BORDER = 3;
  const GRID_DIM = CHUNK_SIZE + BORDER * 2; // 38
  const gridFamilies = new Array<string>(GRID_DIM * GRID_DIM);
  const presentFamilies = new Set<string>();
  const chunkInternalFamilyCounts = new Map<string, number>();

  for (let dy = -BORDER; dy < CHUNK_SIZE + BORDER; dy++) {
    for (let dx = -BORDER; dx < CHUNK_SIZE + BORDER; dx++) {
      const gx = cx * CHUNK_SIZE + dx;
      const gy = cy * CHUNK_SIZE + dy;
      let terrain = chunkNeighborTerrain(gx, gy);
      if (!terrain) {
        // Clamping to nearest tile inside chunk bounds prevents injecting fake 'plains' into mountain/snow biomes
        const clampX = Math.max(0, Math.min(CHUNK_SIZE - 1, dx));
        const clampY = Math.max(0, Math.min(CHUNK_SIZE - 1, dy));
        terrain = tileLookup.get(`${cx * CHUNK_SIZE + clampX},${cy * CHUNK_SIZE + clampY}`) || tiles[0]?.terrainType || 'plains';
      }

      const fInfo = groundTextures.familyOf(terrain);
      let fam = fInfo ? fInfo.family : 'plains';
      if (terrain.includes('road') && fam === 'plains') {
        fam = 'road_stone';
      }
      const idx = (dy + BORDER) * GRID_DIM + (dx + BORDER);
      gridFamilies[idx] = fam;
      presentFamilies.add(fam);

      if (dx >= 0 && dx < CHUNK_SIZE && dy >= 0 && dy < CHUNK_SIZE) {
        chunkInternalFamilyCounts.set(fam, (chunkInternalFamilyCounts.get(fam) || 0) + 1);
      }
    }
  }

  // Step 3: Sort families by bottom->top render priority
  // Dominant internal family serves as base layer to ensure true regional foundation
  let dominantFamily = tiles[0]?.terrainType ? (groundTextures.familyOf(tiles[0].terrainType)?.family || 'plains') : 'plains';
  let maxCount = -1;
  for (const [fam, cnt] of chunkInternalFamilyCounts.entries()) {
    if (cnt > maxCount) {
      maxCount = cnt;
      dominantFamily = fam;
    }
  }

  const sortedFamilies = Array.from(presentFamilies).sort((a, b) => {
    if (a === dominantFamily) return -1;
    if (b === dominantFamily) return 1;
    return getFamilyPriority(a) - getFamilyPriority(b);
  });

  // Prepare scratch canvases (V17 P2: High-resolution mask 4 px/cell = 152x152)
  const MASK_SCALE = 4;
  const MASK_DIM = GRID_DIM * MASK_SCALE; // 152
  const scratchT = getScratch('T', canvasWidth, canvasHeight);
  const scratchM = getScratch('M', MASK_DIM, MASK_DIM);
  const scratchMB = getScratch('MB', GRID_DIM * tileSize, GRID_DIM * tileSize);
  const scratchMB2 = getScratch('MB2', GRID_DIM * tileSize, GRID_DIM * tileSize);

  if (!scratchT || !scratchM || !scratchMB || !scratchMB2) return null;

  const ctxT = scratchT.ctx;
  const ctxM = scratchM.ctx;
  const ctxMB = scratchMB.ctx;
  const ctxMB2 = scratchMB2.ctx;

  // Step 4: Render each family
  for (const F of sortedFamilies) {
    if (flags?.layers === 'base' && F !== sortedFamilies[0]) continue;
    if (flags?.noRoad && F === 'road_stone') continue;
    ctxT.clearRect(0, 0, canvasWidth, canvasHeight);
    ctxT.globalCompositeOperation = 'source-over';

    // 4b: High-resolution continuous organic mask M (152x152)
    const imgData = ctxM.createImageData(MASK_DIM, MASK_DIM);
    const d32 = new Uint32Array(imgData.data.buffer);
    if (F === 'settlement_floor') {
      // V13 P2: 2-octave organic noise boundary with f=0.08 and 0.02, zero straight edges
      for (let my = 0; my < MASK_DIM; my++) {
        const gy = my / MASK_SCALE;
        const worldY = cy * CHUNK_SIZE + (gy - BORDER);
        const rowOffset = my * MASK_DIM;
        for (let mx = 0; mx < MASK_DIM; mx++) {
          const gx = mx / MASK_SCALE;
          const worldX = cx * CHUNK_SIZE + (gx - BORDER);
          const cellGx = Math.max(0, Math.min(GRID_DIM - 1, Math.floor(gx)));
          const cellGy = Math.max(0, Math.min(GRID_DIM - 1, Math.floor(gy)));
          if (gridFamilies[cellGy * GRID_DIM + cellGx] === 'settlement_floor') {
            let minDist = 4;
            for (let sdy = -3; sdy <= 3; sdy++) {
              for (let sdx = -3; sdx <= 3; sdx++) {
                const ny = cellGy + sdy;
                const nx = cellGx + sdx;
                if (nx < 0 || nx >= GRID_DIM || ny < 0 || ny >= GRID_DIM || gridFamilies[ny * GRID_DIM + nx] !== 'settlement_floor') {
                  const d = Math.hypot(gx - (nx + 0.5), gy - (ny + 0.5));
                  if (d < minDist) minDist = d;
                }
              }
            }
            const n1 = (Math.sin(worldX * 0.08) * Math.cos(worldY * 0.08) + 1.0) * 0.5;
            const n2 = (Math.sin(worldX * 0.02 + 1.2) * Math.cos(worldY * 0.02 + 2.1) + 1.0) * 0.5;
            const noise = n1 * 0.4 + n2 * 0.6;
            const alphaRatio = Math.max(0, Math.min(1.0, (minDist + (noise - 0.5) * 0.6) / 1.0));
            d32[rowOffset + mx] = (Math.round(alphaRatio * 230) << 24);
          } else {
            d32[rowOffset + mx] = 0x00000000;
          }
        }
      }
    } else {
      const isBaseFamily = (F === sortedFamilies[0]);
      if (isBaseFamily) {
        d32.fill(0xff000000);
      } else {
        // Continuous world-space 2-octave FBM noise boundary displacement (V17 P2)
        for (let my = 0; my < MASK_DIM; my++) {
          const gy = (my + 0.5) / MASK_SCALE;
          const worldY = cy * CHUNK_SIZE + (gy - BORDER);
          const rowOffset = my * MASK_DIM;
          for (let mx = 0; mx < MASK_DIM; mx++) {
            const gx = (mx + 0.5) / MASK_SCALE;
            const worldX = cx * CHUNK_SIZE + (gx - BORDER);

            // 2-octave FBM noise displacement vector in continuous world coordinates
            const dispX = (fbmNoise2D(worldX * 0.15, worldY * 0.15, 777) - 0.5) * 2.5;
            const dispY = (fbmNoise2D(worldX * 0.15, worldY * 0.15, 888) - 0.5) * 2.5;

            const sampleGx = Math.max(0, Math.min(GRID_DIM - 1, Math.floor(gx + dispX)));
            const sampleGy = Math.max(0, Math.min(GRID_DIM - 1, Math.floor(gy + dispY)));
            const isMatch = (gridFamilies[sampleGy * GRID_DIM + sampleGx] === F);

            d32[rowOffset + mx] = isMatch ? 0xff000000 : 0x00000000;
          }
        }
      }
    }
    ctxM.putImageData(imgData, 0, 0);

    // 4c: Upscale M to MB (single continuous raster corridor for road_stone, feathered for organic terrain)
    ctxMB.clearRect(0, 0, GRID_DIM * tileSize, GRID_DIM * tileSize);
    if (F === 'road_stone') {
      buildRoadAlphaMask(gridFamilies, GRID_DIM, BORDER, cx, cy, ctxMB2, tileSize);
    } else {
      ctxMB.imageSmoothingEnabled = true;
      ctxMB.imageSmoothingQuality = 'high';
      ctxMB.drawImage(scratchM.canvas, 0, 0, MASK_DIM, MASK_DIM, 0, 0, GRID_DIM * tileSize, GRID_DIM * tileSize);

      ctxMB2.clearRect(0, 0, GRID_DIM * tileSize, GRID_DIM * tileSize);
      // V17 P2: Broad organic Gaussian blur (1.5 * tileSize = 81px) for seamless continuous transition
      // Water shorelines use a crisp 0.35 * tileSize blur to prevent over-extended cyan edge bands
      const isWaterFam = F === 'river' || F === 'lake' || F === 'pond_lotus' || F === 'ocean' || F === 'sea' || F === 'water';
      const blurPx = F === 'settlement_floor' ? tileSize * 0.45 : (isWaterFam ? tileSize * 0.35 : tileSize * 1.5);
      ctxMB2.filter = `blur(${blurPx.toFixed(1)}px)`;
      ctxMB2.drawImage(scratchMB.canvas, 0, 0);
      ctxMB2.filter = 'none';

      // Organic transition mask overlay (ink splatter edges)
      const transMask = groundTextures.getTransitionMask(Math.abs(hash2d(cx * 17 + cy, cy * 31)));
      if (transMask) {
        ctxMB2.save();
        ctxMB2.globalCompositeOperation = 'source-atop';
        ctxMB2.globalAlpha = F === 'settlement_floor' ? 0.30 : 0.25;
        ctxMB2.drawImage(transMask, 0, 0, GRID_DIM * tileSize, GRID_DIM * tileSize);
        ctxMB2.restore();
      }
    }

    // 4e: Fill T with seamless base pattern + smooth noise-blended secondary variants (V11)
    let effectiveFamily = F;
    if (F === 'settlement_floor') {
      let snowCnt = 0;
      let desertCnt = 0;
      let volcanicCnt = 0;
      let swampCnt = 0;
      let rockCnt = 0;
      for (let i = 0; i < gridFamilies.length; i++) {
        const fam = gridFamilies[i];
        if (fam === 'snow' || fam === 'ice_crack' || fam === 'glacier') snowCnt++;
        else if (fam === 'desert_sand' || fam === 'dune' || fam === 'oasis') desertCnt++;
        else if (fam === 'volcanic' || fam === 'lava_flow') volcanicCnt++;
        else if (fam === 'swamp' || fam === 'demonic_swamp' || fam === 'poison_pool') swampCnt++;
        else if (fam === 'rock_ground' || fam === 'cliff' || fam === 'mountain_pass') rockCnt++;
      }
      if (snowCnt >= 30) effectiveFamily = 'snow';
      else if (desertCnt >= 30) effectiveFamily = 'desert_sand';
      else if (volcanicCnt >= 30) effectiveFamily = 'volcanic';
      else if (swampCnt >= 30) effectiveFamily = 'swamp';
      else if (rockCnt >= 30) effectiveFamily = 'rock_ground';
      else effectiveFamily = 'settlement_floor';
    }

    const fInfo = groundTextures.familyOf(effectiveFamily);
    const variants = fInfo && fInfo.variants && fInfo.variants.length > 0
      ? fInfo.variants
      : [`v11/${effectiveFamily}_m1`, `v11/${effectiveFamily}_m2`, `v11/${effectiveFamily}_m3`, `v11/${effectiveFamily}_m4`];

    const isNonPeriodicFamily = (F === 'rock_ground' || F === 'snow' || F === 'mountain_pass' || F === 'cliff');
    // Incommensurate co-prime tile spans (8, 11, 7, 13) break spatial autocorrelation (maxAutocorr <= 0.35)
    // while maintaining 100% continuous world-coordinate chunk seamlessness
    const variantSpans = isNonPeriodicFamily ? [8, 11, 7, 13] : [8, 8, 8, 8];

    // V11: 1024x1024 macro texture base span
    const baseSpanTiles = variantSpans[0];
    const textureSpanPx = baseSpanTiles * tileSize; // 432px at tileSize 54
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

let radialMaskCanvas: HTMLCanvasElement | null = null;
function getRadialMaskCanvas(size: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (radialMaskCanvas && radialMaskCanvas.width === size) return radialMaskCanvas;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const rad = size / 2;
  const grad = ctx.createRadialGradient(rad, rad, 0, rad, rad, rad);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.80)');
  grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.35)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  radialMaskCanvas = c;
  return c;
}

    // 2. Blend secondary variants
    if (isNonPeriodicFamily && variants.length > 1 && flags?.layers !== 'base+families') {
      // V18: Rotated overlapping blocks with radial alpha in pure world coordinates
      // Breaks autocorrelation periodicity (maxAutocorr <= 0.35) with zero chunk boundary seams
      const spanPx = 8 * tileSize; // 432px
      const step = spanPx / 2;     // 216px (4 tiles)
      const radMask = getRadialMaskCanvas(spanPx);
      const scratchBlock = getScratch('RAD_BLOCK', spanPx, spanPx);

      if (radMask && scratchBlock) {
        const sCtx = scratchBlock.ctx;
        const gxStart = -1;
        const gxEnd = Math.ceil(canvasWidth / step) + 1;
        const gyStart = -1;
        const gyEnd = Math.ceil(canvasHeight / step) + 1;

        for (let gy = gyStart; gy < gyEnd; gy++) {
          const worldGy = Math.round((cy * CHUNK_SIZE * tileSize) / step) + gy;
          const py = gy * step;
          for (let gx = gxStart; gx < gxEnd; gx++) {
            const worldGx = Math.round((cx * CHUNK_SIZE * tileSize) / step) + gx;
            const px = gx * step;

            const h = Math.abs(hash2d(worldGx + 101, worldGy + 203));
            const rot = h % 4;
            let vIdx = (h >> 2) % variants.length;
            if (F === 'snow') {
              const r = (h >> 2) % 100;
              if (r < 35) vIdx = 0;
              else if (r < 65) vIdx = 1;
              else if (r < 85) vIdx = 2;
              else vIdx = 3;
              if (vIdx >= variants.length) vIdx = 0;
            }
            const img = groundTextures.getImage(variants[vIdx]);
            if (!img) continue;

            sCtx.clearRect(0, 0, spanPx, spanPx);
            sCtx.save();
            sCtx.translate(spanPx / 2, spanPx / 2);
            sCtx.rotate(rot * (Math.PI / 2));
            sCtx.drawImage(img, -spanPx / 2, -spanPx / 2, spanPx, spanPx);
            sCtx.restore();

            sCtx.globalCompositeOperation = 'destination-in';
            sCtx.drawImage(radMask, 0, 0);
            sCtx.globalCompositeOperation = 'source-over';

            const warpX = (smoothNoise2D(worldGx * 0.3, worldGy * 0.3) - 0.5) * 0.3 * tileSize;
            const warpY = (smoothNoise2D(worldGx * 0.3 + 17, worldGy * 0.3 + 31) - 0.5) * 0.3 * tileSize;
            ctxT.drawImage(scratchBlock.canvas, px + warpX, py + warpY);
          }
        }
      }
    } else if (variants.length > 1 && F !== 'road_stone' && flags?.layers !== 'base+families') {
      const VM_CELLS = 16; // 16x16 sample points inside chunk (2 tiles per cell)
      const V_BORDER = 3;  // 3 cells padding outside chunk (6 tiles halo)
      const V_GRID_DIM = VM_CELLS + V_BORDER * 2; // 22x22 total mask dimensions

      const scratchVM = getScratch('VM', V_GRID_DIM, V_GRID_DIM);
      const scratchVMB = getScratch('VMB', canvasWidth, canvasHeight);
      const scratchVT = getScratch('VT', canvasWidth, canvasHeight);

      if (scratchVM && scratchVMB && scratchVT) {
        const ctxVM = scratchVM.ctx;
        const ctxVMB = scratchVMB.ctx;
        const ctxVT = scratchVT.ctx;

        const famId = Math.abs(hash2d(F.length, F.charCodeAt(0) || 7));
        const cellTiles = CHUNK_SIZE / VM_CELLS; // 2 tiles per mask cell
        const cellPx = canvasWidth / VM_CELLS;
        const padPx = V_BORDER * cellPx;

        const numSecondary = variants.length - 1;
        const threshold = numSecondary === 1 ? 0.72 : (0.75 + (numSecondary - 2) * 0.02);

        for (let vIdx = 1; vIdx < variants.length; vIdx++) {
          const varId = variants[vIdx];
          const varPattern = groundTextures.getPattern(ctxVT, varId);
          if (!varPattern) continue;

          const varSeed = famId + vIdx * 104729;
          const vmImgData = ctxVM.createImageData(V_GRID_DIM, V_GRID_DIM);
          const vmD32 = new Uint32Array(vmImgData.data.buffer);

          let hasAny = false;
          for (let my = -V_BORDER; my < VM_CELLS + V_BORDER; my++) {
            const worldY = cy * CHUNK_SIZE + (my + 0.5) * cellTiles;
            const rowOffset = (my + V_BORDER) * V_GRID_DIM;
            for (let mx = -V_BORDER; mx < VM_CELLS + V_BORDER; mx++) {
              const worldX = cx * CHUNK_SIZE + (mx + 0.5) * cellTiles;
              const nVal = fbmNoise2D(worldX, worldY, varSeed);
              const idx = rowOffset + (mx + V_BORDER);
              if (nVal > threshold) {
                const alpha = Math.min(255, Math.floor(((nVal - threshold) / (1.0 - threshold)) * 320));
                vmD32[idx] = (alpha << 24) | 0x00ffffff;
                hasAny = true;
              } else {
                vmD32[idx] = 0x00000000;
              }
            }
          }

          if (!hasAny) continue;
          ctxVM.putImageData(vmImgData, 0, 0);

          // 2b. Upscale & blur variant mask with continuous border padding
          ctxVMB.clearRect(0, 0, canvasWidth, canvasHeight);
          ctxVMB.imageSmoothingEnabled = true;
          ctxVMB.imageSmoothingQuality = 'high';
          ctxVMB.filter = `blur(${(tileSize * 0.9).toFixed(1)}px)`; // ~50px organic soft blend
          ctxVMB.drawImage(
            scratchVM.canvas,
            0,
            0,
            V_GRID_DIM,
            V_GRID_DIM,
            -padPx,
            -padPx,
            canvasWidth + 2 * padPx,
            canvasHeight + 2 * padPx
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

    // 2e: V11 Composite 20% detail overlay from FAMILY_detail.png (omit for non-periodic families which have custom strata)
    const detailPattern = (!isNonPeriodicFamily && flags?.layers !== 'base+families') ? groundTextures.getDetailPattern(ctxT, F) : null;
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

/**
 * V18 P2: Procedural Shan Shui Farmland Paddy Composite.
 * Clean meadow foundation with world-coordinate continuous variable paddy plots (3-6 x 2-4 cells),
 * rounded corners r=0.25 cell, dual vibrant green tones (#5d9441 & #4f8738), emerald ridges (#3f6f2e),
 * and light green rice shoot dots (#7cc24a). Zero artificial teal pools or sky sheen.
 */
function getPaddyRowY(r: number): number {
  return r * 3 + Math.floor(Math.sin(r * 1.7) * 0.8);
}
function getPaddyColX(r: number, c: number): number {
  return Math.floor(c * 4.5 + Math.sin(c * 1.5 + r * 2.3) * 0.7);
}

function compositeFarmlandPaddy(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  canvasWidth: number,
  canvasHeight: number,
  tileSize: number
): void {
  ctx.save();

  // 1. Base: Soft-light glaze enhancing the underlying meadow macro textures to vibrant rural tones
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = 'rgba(78, 130, 48, 0.28)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 2. World-coordinate variable paddy plots (3-6 x 2-4 cells)
  ctx.globalCompositeOperation = 'source-over';

  const minWy = cy * CHUNK_SIZE;
  const maxWy = (cy + 1) * CHUNK_SIZE;
  const minWx = cx * CHUNK_SIZE;
  const maxWx = (cx + 1) * CHUNK_SIZE;

  const rMin = Math.floor((minWy - 8) / 3);
  const rMax = Math.ceil((maxWy + 8) / 3);
  const cMin = Math.floor((minWx - 10) / 4.5);
  const cMax = Math.ceil((maxWx + 10) / 4.5);

  const ridgeWidth = tileSize * 0.30; // 0.30 cell ridge width
  const rRadius = tileSize * 0.25;    // r = 0.25 cell rounded corner

  for (let r = rMin; r <= rMax; r++) {
    const Y0 = getPaddyRowY(r);
    const Y1 = getPaddyRowY(r + 1);
    const H = Y1 - Y0; // 2..4 cells
    const py = (Y0 - minWy) * tileSize;
    const ph = H * tileSize;
    if (py + ph < 0 || py > canvasHeight) continue;

    for (let c = cMin; c <= cMax; c++) {
      const X0 = getPaddyColX(r, c);
      const X1 = getPaddyColX(r, c + 1);
      const W = X1 - X0; // 3..6 cells
      const px = (X0 - minWx) * tileSize;
      const pw = W * tileSize;
      if (px + pw < 0 || px > canvasWidth) continue;

      // 2a. Pematang (ridge): #3f6f2e selebar 0.30 sel
      ctx.fillStyle = '#3f6f2e';
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, rRadius + 2);
      ctx.fill();

      // 2b. Badan petak sawah: sudut membulat r=0.25 sel, dua nada hijau (#5d9441 & #4f8738)
      const ix0 = px + ridgeWidth;
      const iy0 = py + ridgeWidth;
      const iw = pw - ridgeWidth * 2;
      const ih = ph - ridgeWidth * 2;
      if (iw <= 0 || ih <= 0) continue;

      const plotSeed = Math.abs(hash2d(X0 * 31 + 7, Y0 * 47 + 13));
      const plotColor = (plotSeed % 2 === 0) ? '#5d9441' : '#4f8738';
      ctx.fillStyle = plotColor;
      ctx.beginPath();
      ctx.roundRect(ix0, iy0, iw, ih, rRadius);
      ctx.fill();

      // 2c. Tanah cokelat HANYA decal <= 5% luas total
      if (plotSeed % 4 === 0) {
        ctx.fillStyle = 'rgba(75, 58, 28, 0.20)';
        const lx = ix0 + (plotSeed % Math.max(1, Math.floor(iw - 16)));
        const ly = iy0 + ((plotSeed >> 3) % Math.max(1, Math.floor(ih - 16)));
        const lw = Math.min(iw * 0.35, tileSize * 0.8);
        const lh = Math.min(ih * 0.35, tileSize * 0.5);
        ctx.beginPath();
        ctx.roundRect(lx, ly, lw, lh, 3);
        ctx.fill();
      }

      // 2d. Rumpun padi: titik hijau muda #7cc24a ukuran 0.12-0.20 sel, <= 2/sel
      ctx.fillStyle = '#7cc24a';
      const dotRadius = Math.max(1.8, tileSize * 0.08); // ~0.16 sel diameter
      const stepX = tileSize * 0.85;
      const stepY = tileSize * 0.85;
      for (let sy = iy0 + tileSize * 0.45; sy < iy0 + ih - tileSize * 0.35; sy += stepY) {
        for (let sx = ix0 + tileSize * 0.45; sx < ix0 + iw - tileSize * 0.35; sx += stepX) {
          const jx = ((Math.sin(sx * 0.2 + sy * 0.3) + 1) * 0.5 - 0.5) * (tileSize * 0.12);
          const jy = ((Math.cos(sx * 0.3 - sy * 0.2) + 1) * 0.5 - 0.5) * (tileSize * 0.12);
          ctx.beginPath();
          ctx.arc(sx + jx, sy + jy, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  ctx.restore();
}

/**
 * V18 P2: Procedural Lotus Pond Composite.
 * Renders misty teal-aquamarine reflective water channels interspersed with dense,
 * overlapping emerald lotus leaf pads (#3ca048, #459e3c) and soft pink blossom accents.
 * Saturasi air <= 0.45, V >= 0.45 in accordance with V18 P2 specification.
 */
function compositeLotusPond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  canvasWidth: number,
  canvasHeight: number,
  tileSize: number
): void {
  ctx.save();

  // 1. Pale misty translucent water channels (Sat <= 0.45, V >= 0.45)
  // Hue ~182 deg, Sat ~0.38, Val ~0.60 (#5f969b)
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#5f969b';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Soft organic jade water wash
  ctx.fillStyle = 'rgba(78, 142, 115, 0.35)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 2. Lush emerald lotus pads covering ~65% of the pond surface
  // Arranged in natural organic clusters along cell grid
  const numCols = Math.ceil(canvasWidth / (tileSize * 0.8));
  const numRows = Math.ceil(canvasHeight / (tileSize * 0.8));

  for (let ry = 0; ry < numRows; ry++) {
    const wy = cy * CHUNK_SIZE + ry * 0.8;
    for (let rx = 0; rx < numCols; rx++) {
      const wx = cx * CHUNK_SIZE + rx * 0.8;
      const seed = Math.abs(hash2d(Math.floor(wx * 19 + 7), Math.floor(wy * 23 + 13)));

      // 76% chance of lotus leaf cluster in this slot
      if ((seed % 100) < 76) {
        const px = rx * (tileSize * 0.8) + ((seed % 17) - 8);
        const py = ry * (tileSize * 0.8) + (((seed >> 4) % 17) - 8);
        const padR = tileSize * 0.44 + ((seed % 7) - 3);

        // Emerald lotus pad (#3ca048 & #459e3c)
        ctx.fillStyle = (seed % 2 === 0) ? '#3ca048' : '#459e3c';
        ctx.beginPath();
        ctx.arc(px, py, Math.max(10, padR), 0.25, Math.PI * 2 - 0.25);
        ctx.fill();

        // Lotus flower on ~28% of clusters
        if ((seed % 7) < 2) {
          ctx.fillStyle = 'rgba(238, 155, 180, 0.95)';
          ctx.beginPath();
          ctx.arc(px + 2, py - 2, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px + 2, py - 2, 2.0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  ctx.restore();
}

/**
 * V18 P3: Karst Rock Stratification & Mineral Depth for Azure Mountains.
 * Pure world-coordinate 4-octave FBM value noise at 1/4 cell resolution (128x128) with 2-cell halo padding (144x144),
 * slanted ~15 deg (ang = 0.26 rad), amplitude modulated to never exceed 6 cells continuous length.
 * Continuous across chunk boundaries with zero edge-clamping artifacts.
 * Zero repeat patterns, zero moire spikes (moirePeakRatio <= 150, maxAutocorr <= 0.35, seamRatio <= 1.30).
 */
function compositeAzureKarst(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  canvasWidth: number,
  canvasHeight: number,
  tileSize: number
): void {
  // 1. Halo-padded world-coordinate 4-octave FBM strata at 1/8 cell resolution
  const M_CELLS = CHUNK_SIZE * 8; // 256 px for inner chunk
  const BORDER_CELLS = 2;         // 2 cells halo padding
  const BORDER_PX = BORDER_CELLS * 8; // 16 px padding in scratch resolution
  const DIM = M_CELLS + 2 * BORDER_PX; // 288x288 total scratch buffer
  const padPx = BORDER_CELLS * tileSize; // Pixel padding on destination canvas

  const scratch = getScratch('KZ', DIM, DIM);
  if (!scratch) return;

  const imgData = scratch.ctx.createImageData(DIM, DIM);
  const d32 = new Uint32Array(imgData.data.buffer);

  const ang = 0.26; // ≈ 15° (non-horizontal)
  const sinA = Math.sin(ang);
  const cosA = Math.cos(ang);

  for (let py = 0; py < DIM; py++) {
    const wy = cy * CHUNK_SIZE + (py - BORDER_PX + 0.5) / 8;
    const rowOffset = py * DIM;
    for (let px = 0; px < DIM; px++) {
      const wx = cx * CHUNK_SIZE + (px - BORDER_PX + 0.5) / 8;

      // 4-octave FBM value noise in world cell coordinates (4th octave provides fine mineral patina)
      const L = 1 + 0.05 * (2 * smoothNoise2D(wx * 0.04, wy * 0.04, 11) - 1)
                  + 0.035 * (2 * smoothNoise2D(wx * 0.15, wy * 0.15, 23) - 1)
                  + 0.025 * (2 * smoothNoise2D(wx * 0.60, wy * 0.60, 37) - 1)
                  + 0.035 * (2 * smoothNoise2D(wx * 2.20, wy * 2.20, 73) - 1);

      // Slanted strata lines modulated by low-frequency noise (no unbroken lines > 6 cells)
      const s = Math.sin((wx * sinA + wy * cosA) * 0.8 + 2.5 * smoothNoise2D(wx * 0.05, wy * 0.05, 51));
      const env = smoothNoise2D(wx * 0.15, wy * 0.15, 61);
      const strata = 0.045 * s * Math.max(0, env - 0.35);

      // Neutral gray modulation: 1.0 maps to 128 (scale 180 yields subtle soft-light strata over rock_ground macro)
      const gray = Math.max(0, Math.min(255, Math.round(128 + ((L + strata) - 1.0) * 180)));
      d32[rowOffset + px] = 0xff000000 | (gray << 16) | (gray << 8) | gray;
    }
  }
  scratch.ctx.putImageData(imgData, 0, 0);

  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(scratch.canvas, -padPx, -padPx, canvasWidth + 2 * padPx, canvasHeight + 2 * padPx);

  // 2. Subtle ancient iron oxide & mineral patina decals (purely world-coordinate anchored)
  for (let i = 0; i < 6; i++) {
    const seed = Math.abs(hash2d(cx * 67 + i * 29, cy * 83 + i * 37));
    const px = ((seed % 1000) / 1000) * (canvasWidth - 80) + 40;
    const py = (((seed >> 10) % 1000) / 1000) * (canvasHeight - 80) + 40;
    const rw = 20 + (seed % 28);
    const rh = 10 + ((seed >> 5) % 16);

    const isMoss = (seed % 3 === 0);
    ctx.fillStyle = isMoss ? 'rgba(72, 95, 68, 0.16)' : 'rgba(110, 95, 82, 0.14)';
    ctx.beginPath();
    ctx.ellipse(px, py, Math.max(0.1, rw), Math.max(0.1, rh), 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

    const allowComposites = (flags?.layers !== 'base+families' && flags?.layers !== 'base+families+variants');
    if (allowComposites) {
      if (F === 'farmland' && !flags?.noFarm) {
        compositeFarmlandPaddy(ctxT, cx, cy, canvasWidth, canvasHeight, tileSize);
      } else if (F === 'pond_lotus' || F === 'lake') {
        compositeLotusPond(ctxT, cx, cy, canvasWidth, canvasHeight, tileSize);
      } else if (F === 'plains' || F === 'meadow') {
        ctxT.save();
        ctxT.globalCompositeOperation = 'soft-light';
        ctxT.fillStyle = 'rgba(75, 125, 45, 0.45)';
        ctxT.fillRect(0, 0, canvasWidth, canvasHeight);
        ctxT.restore();
      }

      if (F === 'rock_ground' || F === 'canyon_floor' || F === 'cliff' || F === 'mountain_pass') {
        compositeAzureKarst(ctxT, cx, cy, canvasWidth, canvasHeight, tileSize);
      }

      if (F === 'settlement_floor') {
        ctxT.save();
        ctxT.globalCompositeOperation = 'source-over';
        ctxT.fillStyle = 'rgba(180, 160, 135, 0.08)';
        ctxT.fillRect(0, 0, canvasWidth, canvasHeight);
        ctxT.restore();
      }
    }

    // V13 P2: Road in snowy/glacial biomes becomes trodden ice path (bluish-grey, no cream circles)
    let isSnowRoad = false;
    if (F === 'road_stone') {
      let snowCnt = 0;
      for (let i = 0; i < gridFamilies.length; i++) {
        const fam = gridFamilies[i];
        if (fam === 'snow' || fam === 'ice_crack' || fam === 'glacier') snowCnt++;
      }
      if (snowCnt >= 15) {
        isSnowRoad = true;
        // V18 P5: Neutral trodden ice/snow path (dL in [-20, -10], sat <= 0.12, BminusR <= 18)
        ctxT.save();
        ctxT.fillStyle = 'rgba(215, 218, 201, 0.95)';
        ctxT.fillRect(0, 0, canvasWidth, canvasHeight);
        ctxT.restore();
      }
    }

    // V15 P2: Mountain pass in Azure Mountains gets neutral stone tint (J2)
    if (F === 'mountain_pass') {
      let azureCnt = 0;
      for (let i = 0; i < gridFamilies.length; i++) {
        const fam = gridFamilies[i];
        if (fam === 'rock_ground' || fam === 'cliff') azureCnt++;
      }
      if (azureCnt >= 10) {
        ctxT.save();
        ctxT.fillStyle = 'rgba(105, 108, 110, 0.22)';
        ctxT.fillRect(0, 0, canvasWidth, canvasHeight);
        ctxT.restore();
      }
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

    // 4f.1: Road inner edge shadow rgba(40, 32, 24, 0.14) ~1.5px
    if (F === 'road_stone') {
      applyRoadInnerShadow(ctxT, scratchMB2, canvasWidth, canvasHeight, BORDER, tileSize, isSnowRoad);
    }

    // 4g: Draw T onto chunk canvas
    ctx.drawImage(scratchT.canvas, 0, 0);

    // 4h: Road edges blend smoothly into surrounding ground macro (Prompt V14 P1)
  }

  const allowMacroOverlay = (flags?.layers !== 'base+families' && flags?.layers !== 'base+families+variants');
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
  if (allowMacroOverlay) ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Step 6a: Autotiles for Rivers (G4 Base)
  for (const t of tiles) {
    const lx = t.tileX - cx * CHUNK_SIZE;
    const ly = t.tileY - cy * CHUNK_SIZE;
    const sx = lx * tileSize;
    const sy = ly * tileSize;

    const isRiver = t.terrainType.includes('river') || t.terrainType.includes('lake') || t.terrainType.includes('water') || t.terrainType.includes('sea');

    if (isRiver) {
      const bitmask = calculateAutotileBitmask(t.tileX, t.tileY, t.terrainType, chunkNeighborTerrain);
      const frameId = getAutotileFrameId(t.terrainType, bitmask);
      if (atlasLoader.hasFrame(frameId)) {
        atlasLoader.drawSprite(ctx, frameId, sx, sy, tileSize, tileSize, 0.40);
      }
      // Rich vibrant river water glaze (Hue ~185-195 deg, Sat > 0.35) to prevent desaturated foam
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(38, 118, 142, 0.65)';
      ctx.fillRect(sx, sy, tileSize, tileSize);
      ctx.restore();
    }
  }

  // Step 6b: Procedural Ground Decals (G3)
  if (allowMacroOverlay) {
    for (const t of tiles) {
      const lx = t.tileX - cx * CHUNK_SIZE;
      const ly = t.tileY - cy * CHUNK_SIZE;
      const sx = lx * tileSize;
      const sy = ly * tileSize;

      renderL3GroundDecal(ctx, sx, sy, tileSize, t.tileX, t.tileY, t.terrainType);
    }
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
