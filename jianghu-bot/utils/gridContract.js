'use strict';
/**
 * GRID CONTRACT v10 — single source of truth for object geometry.
 *  - obj.x, obj.y  = top-left cell of the FOOTPRINT (integers).
 *  - footprint     = cells [x, x+fw) x [y, y+fh)           (blocks / reserves ground)
 *  - canopy        = cells [x, x+fw) x [y-rowsAbove, y)    (visual body above footprint; reserved so nothing overlaps)
 *  - sprite content width == vw cells (vw === fw), centred on footprint, content bottom == y+fh.
 *  - mode: 'solid' (blocks walking) | 'soft' (walkable, still reserves cells) | 'none' (decor, reserves nothing)
 */
const path = require('path');
const GRID = require(path.join(__dirname, '..', 'world-data', 'grid-canon-v10.json')).frames;
const CANOPY_OVERLAP_ALLOWED = false;

function getGrid(defId) { return (defId && GRID[defId]) || null; }

function footprintRect(x, y, g) { return { x0: x, x1: x + g.fw, y0: y, y1: y + g.fh }; }
function canopyRect(x, y, g) { return g.rowsAbove > 0 ? { x0: x, x1: x + g.fw, y0: y - g.rowsAbove, y1: y } : null; }
function visualRect(x, y, g) { const l = x + (g.fw - g.vw) / 2, b = y + g.fh; return { x0: l, x1: l + g.vw, y0: b - g.vh, y1: b }; }

/** all cell keys of footprint (and canopy when asked) */
function cellsOf(x, y, g, withCanopy) {
  const out = [];
  for (let dy = 0; dy < g.fh; dy++) for (let dx = 0; dx < g.fw; dx++) out.push(`${x + dx},${y + dy}`);
  if (withCanopy) for (let dy = 1; dy <= g.rowsAbove; dy++) for (let dx = 0; dx < g.fw; dx++) out.push(`${x + dx},${y - dy}`);
  return out;
}

/** occupied: Map(cell->id) for footprints; occupied.canopy: Map(cell->id) for canopy cells (created lazily) */
function canopyMap(occupied) { return occupied.canopy || (occupied.canopy = new Map()); }

function isFree(x, y, g, occupied) {
  if (g.mode === 'none') return !occupied.has(`${x},${y}`);
  const canopy = canopyMap(occupied);
  for (const k of cellsOf(x, y, g, false)) if (occupied.has(k) || canopy.has(k)) return false;
  for (let dy = 1; dy <= g.rowsAbove; dy++) for (let dx = 0; dx < g.fw; dx++) {
    const k = `${x + dx},${y - dy}`;
    if (occupied.has(k)) return false;
    if (!CANOPY_OVERLAP_ALLOWED && canopy.has(k)) return false;
  }
  return true;
}

function mark(x, y, g, occupied, id) {
  if (g.mode === 'none') return;
  const canopy = canopyMap(occupied);
  for (const k of cellsOf(x, y, g, false)) occupied.set(k, id);
  for (let dy = 1; dy <= g.rowsAbove; dy++) for (let dx = 0; dx < g.fw; dx++) canopy.set(`${x + dx},${y - dy}`, id);
}

/** chunk containment: whole footprint+canopy inside chunk (size 32) -> no cross-chunk overlap by construction */
function insideChunk(x, y, g, chunkSize = 32) {
  const cx = Math.floor(x / chunkSize), cy = Math.floor(y / chunkSize);
  const minX = cx * chunkSize, minY = cy * chunkSize;
  return x >= minX && x + g.fw - 1 < minX + chunkSize && (y - g.rowsAbove) >= minY && y + g.fh - 1 < minY + chunkSize;
}


/** objek yang MENUTUP sel (x,y) lewat footprint. Periksa chunk sel + tetangga kiri/atas (set-piece sampai 9 lebar).
 *  resolveFn (opsional) = resolveDef dari objectScatter untuk alias defId. */
function getObjectCoveringCell(x, y, getChunkObjectsFn, resolveFn) {
  const cx = Math.floor(x / 32), cy = Math.floor(y / 32);
  for (const dx of [0, -1]) for (const dy of [0, -1]) {
    for (const o of getChunkObjectsFn(cx + dx, cy + dy)) {
      const g = getGrid(resolveFn ? (resolveFn(o.defId) || o.defId) : o.defId); if (!g) continue;
      if (x >= o.x && x < o.x + g.fw && y >= o.y && y < o.y + g.fh) return { o, g };
    }
  }
  return null;
}
function isCellBlocked(x, y, getChunkObjectsFn, resolveFn) {
  const cx = Math.floor(x / 32), cy = Math.floor(y / 32);
  for (const dx of [0, -1]) for (const dy of [0, -1]) {
    for (const o of getChunkObjectsFn(cx + dx, cy + dy)) {
      if (o.collision === 'none' || o.collision === 'open') continue;
      const g = getGrid(resolveFn ? (resolveFn(o.defId) || o.defId) : o.defId);
      if (!g) continue;
      const isSolid = o.collision === 'solid' || g.mode === 'solid';
      if (isSolid && x >= o.x && x < o.x + g.fw && y >= o.y && y < o.y + g.fh) {
        return true;
      }
    }
  }
  return false;
}
function isCellUnderCanopy(x, y, getChunkObjectsFn, resolveFn) {
  const cx = Math.floor(x / 32), cy = Math.floor(y / 32);
  for (const dx of [0, -1]) for (const dy of [0, 1]) {
    for (const o of getChunkObjectsFn(cx + dx, cy + dy)) {
      const g = getGrid(resolveFn ? (resolveFn(o.defId) || o.defId) : o.defId); if (!g || !g.rowsAbove) continue;
      if (x >= o.x && x < o.x + g.fw && y >= o.y - g.rowsAbove && y < o.y) return { o, g };
    }
  }
  return null;
}
/** setPieces = [{x,y,defId,id}] yang rect-nya menyentuh chunk ini */
function reserveSetPieces(occupied, setPieces) {
  for (const sp of setPieces) { const g = getGrid(sp.defId); if (g) mark(sp.x, sp.y, g, occupied, sp.id); }
}

module.exports = { getObjectCoveringCell, isCellBlocked, isCellUnderCanopy, reserveSetPieces, GRID, CANON_GRID: GRID, getGrid, footprintRect, canopyRect, visualRect, cellsOf, isFree, mark, insideChunk, CANOPY_OVERLAP_ALLOWED };
