/**
 * JIANGHU WORLD — STATIC LAYER RENDERER (components/map/StaticLayerRenderer.ts)
 * V21 F2 Modular Extraction:
 * - Chunk Ground Bitmaps (G0-G3) with baked WebP LOD tiers
 * - Procedural Fallback Ground & Territory Overlays
 * - Region Palette Color Tint Multiply
 * - Shan Shui Grid Lines (Cached Bitmaps / Major 8-cell lines)
 * - Build Zone Overlay (Plots & Land Claiming)
 * - Macro Mode 5000x5000 Continent & Regional Bounds
 * Zero draw calls when camera is static (Idle State).
 */

import { TileData } from '@/types/world';
import { chunkManager, CHUNK_SIZE, MAX_CHUNK_X, MAX_CHUNK_Y } from '@/lib/chunkManager';
import { perfProbe } from '@/lib/perfProbe';
import {
  renderL1TerrainBase,
  renderL2BiomeTransitions,
  renderL3GroundDecal,
  renderL4AutotileGround,
  getRegionColorAt
} from '@/lib/groundRenderer';
import { CANONICAL_REGIONS, CANONICAL_LANDMARKS } from '@/config/canonicalRegions';
import { getWorldRasterImageSync } from '@/lib/worldRasterLoader';
import { renderL0XuanPaper } from '@/lib/proceduralObjects';

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Checks whether camera has moved significantly enough to invalidate static layer.
 * Threshold: position > 0.05 px, zoom > 0.001
 */
export function isCameraDirty(prev: CameraState | null, next: CameraState): boolean {
  if (!prev) return true;
  if (Math.abs(prev.x - next.x) > 0.05) return true;
  if (Math.abs(prev.y - next.y) > 0.05) return true;
  if (Math.abs(prev.zoom - next.zoom) > 0.001) return true;
  return false;
}

export interface StaticLayerRenderParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  camera: CameraState;
  currentTileSize: number;
  tileMap: Map<string, TileData>;
  toScreenX: (worldX: number) => number;
  toScreenY: (worldY: number) => number;
  showGrid: boolean;
  isBuildMode: boolean;
  hoveredTile: TileData | null;
  time: number;
}

export function renderStaticLayer({
  ctx,
  width,
  height,
  camera,
  currentTileSize,
  tileMap,
  toScreenX,
  toScreenY,
  showGrid,
  isBuildMode,
  hoveredTile,
  time
}: StaticLayerRenderParams): void {
  const tGround0 = performance.now();

  ctx.clearRect(0, 0, width, height);

  const viewTilesX = width / currentTileSize;
  const viewTilesY = height / currentTileSize;
  const minTileX = Math.max(0, Math.floor(camera.x - viewTilesX / 2) - 1);
  const maxTileX = Math.min(4999, Math.ceil(camera.x + viewTilesX / 2) + 1);
  const minTileY = Math.max(0, Math.floor(camera.y - viewTilesY / 2) - 1);
  const maxTileY = Math.min(4999, Math.ceil(camera.y + viewTilesY / 2) + 1);

  // 1. Chunk Ground Bitmaps (LOD Tier 0, 1, 2)
  const minChunkX = Math.max(0, Math.floor(minTileX / CHUNK_SIZE));
  const maxChunkX = Math.min(MAX_CHUNK_X, Math.floor(maxTileX / CHUNK_SIZE));
  const minChunkY = Math.max(0, Math.floor(minTileY / CHUNK_SIZE));
  const maxChunkY = Math.min(MAX_CHUNK_Y, Math.floor(maxTileY / CHUNK_SIZE));

  const renderedChunkKeys = new Set<string>();

  for (let cy = minChunkY; cy <= maxChunkY; cy++) {
    for (let cx = minChunkX; cx <= maxChunkX; cx++) {
      const csx = toScreenX(cx * CHUNK_SIZE);
      const csy = toScreenY(cy * CHUNK_SIZE);
      const csw = CHUNK_SIZE * currentTileSize;
      const csh = CHUNK_SIZE * currentTileSize;
      const lodTier = camera.zoom >= 0.7 ? 0 : (camera.zoom >= 0.35 ? 1 : 2);
      const bitmap = chunkManager.getChunkBitmap(cx, cy, 54, lodTier);
      if (bitmap) {
        ctx.drawImage(bitmap, csx, csy, csw, csh);
        renderedChunkKeys.add(`${cx}:${cy}`);
      } else {
        const regColor = getRegionColorAt(cx * CHUNK_SIZE + 16, cy * CHUNK_SIZE + 16);
        ctx.fillStyle = regColor;
        ctx.fillRect(csx, csy, csw, csh);
      }
    }
  }

  // 2. Fallback per-tile & dynamic ground overlays
  const getNeighborTerrain = (wx: number, wy: number) => {
    const t = tileMap.get(`${wx},${wy}`) || chunkManager.getTile(wx, wy);
    return t?.terrainType;
  };

  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      const cx = Math.floor(tx / CHUNK_SIZE);
      const cy = Math.floor(ty / CHUNK_SIZE);
      const chunkHasBitmap = renderedChunkKeys.has(`${cx}:${cy}`);

      const tile = tileMap.get(`${tx},${ty}`) || chunkManager.getTile(tx, ty);
      const sx = toScreenX(tx);
      const sy = toScreenY(ty);

      if (!tile) {
        if (!chunkHasBitmap) {
          const regColor = getRegionColorAt(tx, ty);
          ctx.fillStyle = regColor;
          ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
        }
        continue;
      }

      if (!chunkHasBitmap) {
        renderL1TerrainBase(ctx, sx, sy, currentTileSize, tile.terrainType, tx, ty);
        renderL2BiomeTransitions(ctx, sx, sy, currentTileSize, tx, ty, tile.terrainType, getNeighborTerrain);
        renderL3GroundDecal(ctx, sx, sy, currentTileSize, tx, ty, tile.terrainType);
      }

      // Dynamic River Wave Shimmer
      const isWater = tile.terrainType.includes('river') || tile.terrainType.includes('water') || tile.terrainType.includes('lake') || tile.terrainType.includes('sea');
      if (isWater) {
        renderL4AutotileGround(ctx, sx, sy, currentTileSize, tx, ty, tile.terrainType, time, getNeighborTerrain);
      }

      // Territory overlay tints
      if (tile.territoryType === 'death_zone') {
        ctx.fillStyle = 'rgba(147, 51, 234, 0.18)';
        ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 1, sy + 1, currentTileSize - 2, currentTileSize - 2);
      } else if (tile.territoryType === 'danger_zone') {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
        ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(sx + 1, sy + 1, currentTileSize - 2, currentTileSize - 2);
      } else if (tile.territoryType === 'hunting_zone') {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
        ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
      } else if (tile.territoryType === 'sect_territory') {
        ctx.fillStyle = 'rgba(128, 0, 128, 0.1)';
        ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
      }

      // Claimed Land / Farmland
      if (tile.isClaimable && !tile.buildingName && !tile.isUnderConstruction && tile.ownerId) {
        ctx.fillStyle = 'rgba(6, 78, 59, 0.85)';
        const pw = currentTileSize * 0.7;
        const ph = Math.max(9, 11 * camera.zoom);
        const px = sx + (currentTileSize - pw) / 2;
        const py = sy + currentTileSize * 0.45;
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = '#34D399';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(px, py, pw, ph);
        ctx.fillStyle = '#A7F3D0';
        ctx.font = `bold ${Math.max(7, 8 * camera.zoom)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('MILIK', sx + currentTileSize / 2, py + ph / 2);
      }
      if (tile.cropType) {
        ctx.fillStyle = '#F59E0B';
        ctx.font = `bold ${Math.max(8, 11 * camera.zoom)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('田', sx + currentTileSize * 0.5, sy + currentTileSize * 0.55);
      }
    }
  }

  // 3. Region Color Tint Multiply
  const blendedRegionColor = getRegionColorAt(camera.x, camera.y);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = blendedRegionColor;
  ctx.globalAlpha = 0.05;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // 4. Shan Shui Grid Lines
  if (showGrid && camera.zoom >= 0.25) {
    ctx.save();
    if (camera.zoom >= 0.50) {
      for (let cy = minChunkY; cy <= maxChunkY; cy++) {
        for (let cx = minChunkX; cx <= maxChunkX; cx++) {
          const gridBmp = chunkManager.getChunkGridBitmap(cx, cy, 54);
          if (gridBmp) {
            const csx = Math.round(toScreenX(cx * CHUNK_SIZE)) + 0.5;
            const csy = Math.round(toScreenY(cy * CHUNK_SIZE)) + 0.5;
            const csw = Math.round(CHUNK_SIZE * currentTileSize);
            const csh = Math.round(CHUNK_SIZE * currentTileSize);
            ctx.drawImage(gridBmp, csx, csy, csw, csh);
          }
        }
      }
    } else {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(40, 30, 20, 0.22)';
      const startMajorX = Math.floor(minTileX / 8) * 8;
      const endMajorX = Math.ceil((maxTileX + 1) / 8) * 8;
      for (let tx = startMajorX; tx <= endMajorX; tx += 8) {
        const sx = Math.round(toScreenX(tx)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
        ctx.stroke();
      }
      const startMajorY = Math.floor(minTileY / 8) * 8;
      const endMajorY = Math.ceil((maxTileY + 1) / 8) * 8;
      for (let ty = startMajorY; ty <= endMajorY; ty += 8) {
        const sy = Math.round(toScreenY(ty)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 5. Build Zone Overlay
  if (isBuildMode) {
    ctx.save();
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        const tile = tileMap.get(`${tx},${ty}`) || chunkManager.getTile(tx, ty);
        const sx = toScreenX(tx);
        const sy = toScreenY(ty);

        if (!tile) continue;

        if (tile.ownerId) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
          ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(sx + 1, sy + 1, currentTileSize - 2, currentTileSize - 2);
        } else if (tile.isClaimable) {
          if (tile.dangerTier === 2) {
            ctx.fillStyle = 'rgba(217, 119, 6, 0.25)';
            ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
            ctx.strokeStyle = '#D97706';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx + 1, sy + 1, currentTileSize - 2, currentTileSize - 2);
          } else {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.28)';
            ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(sx + 1, sy + 1, currentTileSize - 2, currentTileSize - 2);
          }
        } else {
          const isBuffer = Boolean(tile.territoryType === 'settlement_buffer' || tile.isSettlementTile);
          if (isBuffer) {
            ctx.fillStyle = 'rgba(71, 85, 105, 0.28)';
            ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
            ctx.strokeStyle = '#64748B';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx + 1, sy + 1, currentTileSize - 2, currentTileSize - 2);
          } else {
            ctx.fillStyle = 'rgba(220, 38, 38, 0.16)';
            ctx.fillRect(sx, sy, currentTileSize, currentTileSize);
            ctx.strokeStyle = 'rgba(220, 38, 38, 0.35)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(sx, sy + currentTileSize);
            ctx.lineTo(sx + currentTileSize, sy);
            ctx.stroke();
          }
        }
      }
    }

    if (hoveredTile) {
      const hsx = toScreenX(hoveredTile.tileX);
      const hsy = toScreenY(hoveredTile.tileY);
      const isBuildable = hoveredTile.isClaimable && !hoveredTile.ownerId;
      ctx.fillStyle = isBuildable ? 'rgba(16, 185, 129, 0.38)' : 'rgba(220, 38, 38, 0.38)';
      ctx.fillRect(hsx, hsy, currentTileSize, currentTileSize);
      ctx.strokeStyle = isBuildable ? '#10B981' : '#EF4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(hsx, hsy, currentTileSize, currentTileSize);
    }
    ctx.restore();
  }

  perfProbe.mark('render:ground', performance.now() - tGround0);
}

export interface MacroLayerRenderParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  camera: CameraState;
  currentTileSize: number;
  toScreenX: (worldX: number) => number;
  toScreenY: (worldY: number) => number;
  hoveredRegion: any;
  playerPos: { x: number; y: number };
  time: number;
}

export function renderMacroLayer({
  ctx,
  width,
  height,
  camera,
  currentTileSize,
  toScreenX,
  toScreenY,
  hoveredRegion,
  playerPos,
  time
}: MacroLayerRenderParams): void {
  ctx.clearRect(0, 0, width, height);

  // 1. Base Continent Raster
  const rasterImg = getWorldRasterImageSync();
  if (rasterImg && rasterImg.complete && rasterImg.naturalWidth > 0) {
    const rx0 = toScreenX(0);
    const ry0 = toScreenY(0);
    const rx1 = toScreenX(5000);
    const ry1 = toScreenY(5000);
    ctx.drawImage(rasterImg, rx0, ry0, rx1 - rx0, ry1 - ry0);
  } else {
    renderL0XuanPaper(ctx, width, height, camera.zoom);
  }

  // 2. Draw 29 Canonical Regions
  CANONICAL_REGIONS.forEach((reg: any) => {
    const rx = toScreenX(reg.bounds.minX);
    const ry = toScreenY(reg.bounds.minY);
    const rw = (reg.bounds.maxX - reg.bounds.minX) * currentTileSize;
    const rh = (reg.bounds.maxY - reg.bounds.minY) * currentTileSize;

    const isHovered = hoveredRegion?.regionSlug === reg.regionSlug;

    ctx.save();
    if (isHovered) {
      ctx.fillStyle = reg.palette?.accent ? `${reg.palette.accent}26` : 'rgba(212, 177, 106, 0.15)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(rx, ry, rw, rh);
    } else {
      ctx.strokeStyle = reg.palette?.accent ? `${reg.palette.accent}44` : 'rgba(212, 177, 106, 0.25)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(rx, ry, rw, rh);
    }

    const cx = rx + rw / 2;
    const cy = ry + rh / 2;
    ctx.fillStyle = isHovered ? '#FFFFFF' : '#F3E8D0';
    ctx.font = `bold ${Math.max(10, 14 * camera.zoom * 2.5)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(reg.displayName, cx, cy - 8);

    if (reg.chineseName) {
      ctx.fillStyle = isHovered ? '#F59E0B' : '#D4B16A';
      ctx.font = `bold ${Math.max(9, 12 * camera.zoom * 2.5)}px serif`;
      ctx.fillText(reg.chineseName, cx, cy + 10);
    }

    const tier = reg.dangerTier || 1;
    let tierColor = '#10B981';
    if (tier === 2) tierColor = '#06B6D4';
    else if (tier === 3) tierColor = '#F59E0B';
    else if (tier === 4) tierColor = '#EF4444';
    else if (tier === 5) tierColor = '#A855F7';

    ctx.fillStyle = tierColor;
    ctx.font = `bold ${Math.max(8, 10 * camera.zoom * 2)}px sans-serif`;
    ctx.fillText(`Tier ${tier}`, cx, cy + 26);
    ctx.restore();
  });

  // 3. Draw Landmarks
  CANONICAL_LANDMARKS.forEach(lm => {
    const lx = toScreenX(lm.x);
    const ly = toScreenY(lm.y);

    ctx.save();
    let char = '城';
    let badgeBg = '#1E293B';
    let badgeBorder = '#D4B16A';
    if (lm.type === 'sect') {
      char = '宗';
      badgeBg = '#451A03';
      badgeBorder = '#F59E0B';
    } else if (lm.type === 'secret_realm') {
      char = '秘';
      badgeBg = '#3B0764';
      badgeBorder = '#C084FC';
    } else if (lm.type === 'port') {
      char = '津';
      badgeBg = '#0C4A6E';
      badgeBorder = '#38BDF8';
    } else if (lm.type === 'pass') {
      char = '关';
      badgeBg = '#7F1D1D';
      badgeBorder = '#F87171';
    } else if (lm.type === 'village') {
      char = '村';
      badgeBg = '#064E3B';
      badgeBorder = '#34D399';
    }

    const badgeR = Math.max(7, 10 * camera.zoom * 2);
    ctx.beginPath();
    ctx.arc(lx, ly, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = badgeBg;
    ctx.fill();
    ctx.strokeStyle = badgeBorder;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#FEF08A';
    ctx.font = `bold ${Math.max(8, 10 * camera.zoom * 2)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, lx, ly + 0.5);

    ctx.font = `bold ${Math.max(8, 9 * camera.zoom * 2)}px sans-serif`;
    const textW = ctx.measureText(lm.name).width;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(lx - textW / 2 - 4, ly + badgeR + 3, textW + 8, 12);
    ctx.strokeStyle = badgeBorder;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(lx - textW / 2 - 4, ly + badgeR + 3, textW + 8, 12);
    ctx.fillStyle = '#FEF08A';
    ctx.fillText(lm.name, lx, ly + badgeR + 11);
    ctx.restore();
  });

  // 4. Draw Player Pin
  const plx = toScreenX(playerPos.x);
  const ply = toScreenY(playerPos.y);
  ctx.save();
  const pulseR = 12 + Math.sin(time * 4) * 4;
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(plx, ply, pulseR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.arc(plx, ply, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Anda', plx, ply - 10);
  ctx.restore();
}
