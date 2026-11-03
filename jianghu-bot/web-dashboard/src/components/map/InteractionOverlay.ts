/**
 * JIANGHU WORLD — INTERACTION OVERLAY & RAYCASTER (components/map/InteractionOverlay.ts)
 * V21 F2 Modular Extraction:
 * - Hovered Tile Outline (Gold Ink Wash / Selection highlight)
 * - Xuan Paper Resource Hover Labels with drop shadows and collision avoidance
 * - World Edge Ink Clouds
 * - Screen-to-World Coordinate Raycasting Helpers
 */

import { TileData } from '@/types/world';
import { renderWorldEdgeClouds } from '@/lib/proceduralObjects';

export interface ResourceLabelItem {
  tile: TileData;
  screenX: number;
  screenY: number;
  dist: number;
  label: string;
}

export interface InteractionOverlayParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  camera: { x: number; y: number; zoom: number };
  currentTileSize: number;
  hoveredTile: TileData | null;
  selectedTile: { x: number; y: number } | null;
  toScreenX: (worldX: number) => number;
  toScreenY: (worldY: number) => number;
  eligibleResourceLabels: ResourceLabelItem[];
  time: number;
}

export function renderInteractionLayer({
  ctx,
  width,
  height,
  camera,
  currentTileSize,
  hoveredTile,
  selectedTile,
  toScreenX,
  toScreenY,
  eligibleResourceLabels,
  time
}: InteractionOverlayParams): void {
  ctx.save();

  // 1. Regular Hover Tile Golden Frame (when not build mode)
  if (hoveredTile && (!selectedTile || selectedTile.x !== hoveredTile.tileX || selectedTile.y !== hoveredTile.tileY)) {
    const hsx = toScreenX(hoveredTile.tileX);
    const hsy = toScreenY(hoveredTile.tileY);

    ctx.save();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
    ctx.lineWidth = Math.max(1, 1.5 * camera.zoom);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
    ctx.fillRect(hsx, hsy, currentTileSize, currentTileSize);
    ctx.strokeRect(hsx + 0.5, hsy + 0.5, currentTileSize - 1, currentTileSize - 1);
    ctx.restore();
  }

  // 2. Selected Tile Mandala Ring
  if (selectedTile) {
    const ssx = toScreenX(selectedTile.x);
    const ssy = toScreenY(selectedTile.y);
    ctx.save();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = Math.max(1.5, 2.2 * camera.zoom);
    ctx.strokeRect(ssx + 0.5, ssy + 0.5, currentTileSize - 1, currentTileSize - 1);
    ctx.restore();
  }

  // 3. Dedicated Xuan Paper Resource Label Pass with Collision Avoidance
  if (eligibleResourceLabels.length > 0 && (camera.zoom >= 0.75 || hoveredTile)) {
    eligibleResourceLabels.sort((a, b) => a.dist - b.dist);

    const renderedBoxes: Array<{ x: number; y: number; w: number; h: number }> = [];
    const maxLabels = 8;
    const fontSize = Math.max(11, Math.min(13, Math.floor(12 * Math.max(1.0, camera.zoom))));

    ctx.font = `bold ${fontSize}px "Cinzel", "Noto Serif SC", serif, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const item of eligibleResourceLabels) {
      if (renderedBoxes.length >= maxLabels) break;

      const textWidth = ctx.measureText(item.label).width;
      const paddingX = 8;
      const paddingY = 4;
      const boxWidth = textWidth + paddingX * 2;
      const boxHeight = fontSize + paddingY * 2;

      const boxX = Math.max(8, Math.min(width - boxWidth - 8, item.screenX - boxWidth / 2));
      let boxY = item.screenY - boxHeight - 8;
      if (boxY < 8) {
        boxY = Math.min(height - boxHeight - 8, item.screenY + 12);
      } else {
        boxY = Math.min(height - boxHeight - 8, boxY);
      }

      let overlaps = false;
      for (const box of renderedBoxes) {
        if (
          boxX < box.x + box.w &&
          boxX + boxWidth > box.x &&
          boxY < box.y + box.h &&
          boxY + boxHeight > box.y
        ) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;

      renderedBoxes.push({ x: boxX, y: boxY, w: boxWidth, h: boxHeight });

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = '#F4F1EA';
      ctx.beginPath();
      const r = 4;
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, r);
      } else {
        ctx.rect(boxX, boxY, boxWidth, boxHeight);
      }
      ctx.fill();

      // Small arrow pointing to node
      const arrowX = Math.max(boxX + 8, Math.min(boxX + boxWidth - 8, item.screenX));
      ctx.beginPath();
      if (boxY < item.screenY) {
        ctx.moveTo(arrowX - 4, boxY + boxHeight);
        ctx.lineTo(arrowX + 4, boxY + boxHeight);
        ctx.lineTo(arrowX, boxY + boxHeight + 4);
      } else {
        ctx.moveTo(arrowX - 4, boxY);
        ctx.lineTo(arrowX + 4, boxY);
        ctx.lineTo(arrowX, boxY - 4);
      }
      ctx.closePath();
      ctx.fill();

      // Border and gold/emerald line accent
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#2E3A38';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, r);
      } else {
        ctx.rect(boxX, boxY, boxWidth, boxHeight);
      }
      ctx.stroke();

      ctx.strokeStyle = item.tile.resourceType === 'ore' ? '#D97706' : '#059669';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(boxX + r, boxY + 1.5);
      ctx.lineTo(boxX + boxWidth - r, boxY + 1.5);
      ctx.stroke();

      ctx.fillStyle = '#1A2421';
      ctx.fillText(item.label, boxX + boxWidth / 2, boxY + boxHeight / 2 + 1);

      ctx.restore();
    }
  }

  // 4. World Boundary Edge Ink Clouds (Outside 0..5000)
  const viewTilesX = width / currentTileSize;
  const viewTilesY = height / currentTileSize;
  const minTileX = camera.x - viewTilesX / 2;
  const maxTileX = camera.x + viewTilesX / 2;
  const minTileY = camera.y - viewTilesY / 2;
  const maxTileY = camera.y + viewTilesY / 2;
  const isLeftEdge = minTileX <= 0;
  const isRightEdge = maxTileX >= 5000;
  const isTopEdge = minTileY <= 0;
  const isBottomEdge = maxTileY >= 5000;

  renderWorldEdgeClouds(ctx, width, height, isLeftEdge, isRightEdge, isTopEdge, isBottomEdge, time);

  ctx.restore();
}

/**
 * Screen pixel to World Tile coordinate raycasting
 */
export function screenToWorldTile(
  screenX: number,
  screenY: number,
  canvasWidth: number,
  canvasHeight: number,
  cameraX: number,
  cameraY: number,
  currentTileSize: number
): { tileX: number; tileY: number } {
  const viewTilesX = canvasWidth / currentTileSize;
  const viewTilesY = canvasHeight / currentTileSize;
  const tileX = Math.floor(cameraX - viewTilesX / 2 + screenX / currentTileSize);
  const tileY = Math.floor(cameraY - viewTilesY / 2 + screenY / currentTileSize);
  return {
    tileX: Math.max(0, Math.min(4999, tileX)),
    tileY: Math.max(0, Math.min(4999, tileY))
  };
}
