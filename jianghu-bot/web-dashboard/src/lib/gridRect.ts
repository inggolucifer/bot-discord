/**
 * GRID RECT CALCULATOR V10 (web-dashboard/src/lib/gridRect.ts)
 * Single authoritative formula for rendering sprites strictly aligned to grid cells.
 */

export interface GridBBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface GridEntry {
  fw: number;
  fh: number;
  vw: number;
  vh: number;
  rowsAbove: number;
  mode: 'solid' | 'soft' | 'none';
  srcW: number;
  srcH: number;
  bbox: GridBBox;
  class?: string;
}

export interface SpriteRectResult {
  drawX: number;
  drawY: number;
  dw: number;
  dh: number;
  footX: number;
  footY: number;
  sortKey: number;
}

/**
 * Pure function to compute exact screen draw rect and anchor points from Grid Contract specifications.
 * @param g GridEntry from grid-canon-v10
 * @param tx World tile X (top-left of footprint)
 * @param ty World tile Y (top-left of footprint)
 * @param T Tile size in screen pixels (e.g. 54 or 54 * zoom)
 * @param toX Coordinate transformer to screen X
 * @param toY Coordinate transformer to screen Y
 */
export function computeSpriteRect(
  g: GridEntry,
  tx: number,
  ty: number,
  T: number,
  toX: (wx: number) => number,
  toY: (wy: number) => number
): SpriteRectResult {
  const bboxW = (g.bbox.x1 - g.bbox.x0) * g.srcW;
  const scale = bboxW > 0 ? (g.vw * T) / bboxW : (g.vw * T) / g.srcW;
  const dw = g.srcW * scale;
  const dh = g.srcH * scale;
  const contentLeft = toX(tx + (g.fw - g.vw) / 2);
  const contentBottom = toY(ty + g.fh);

  return {
    drawX: contentLeft - g.bbox.x0 * dw,
    drawY: contentBottom - g.bbox.y1 * dh,
    dw,
    dh,
    footX: toX(tx + g.fw / 2),
    footY: contentBottom,
    sortKey: (ty + g.fh)
  };
}
