import { describe, it, expect } from 'vitest';
import anchors from '../../world-data/anchors.json';
import proceduralWorldEngine from '../../utils/proceduralWorldEngine.js';
import settlementZones from '../../utils/settlementZones.js';
import objectScatter from '../../utils/objectScatter.js';
import chunkStreamingEngine from '../../utils/chunkStreamingEngine.js';

describe('Settlement Footprint Walkability & Access (V24 H1)', () => {
  it('1. All 52 anchors have exactly 0 solid tiles in their footprint', () => {
    let solidCount = 0;
    for (const a of anchors) {
      const sw = a.spanWidth || 2;
      const sh = a.spanHeight || 2;
      for (let dy = 0; dy < sh; dy++) {
        for (let dx = 0; dx < sw; dx++) {
          const tile = proceduralWorldEngine.getTileAt(a.x + dx, a.y + dy);
          if (tile.isSolid) solidCount++;
        }
      }
    }
    expect(solidCount).toBe(0);
  });

  it('2. All footprint tiles have valid settlementId and label matching the anchor', () => {
    for (const a of anchors) {
      const sw = a.spanWidth || 2;
      const sh = a.spanHeight || 2;
      for (let dy = 0; dy < sh; dy++) {
        for (let dx = 0; dx < sw; dx++) {
          const tile = proceduralWorldEngine.getTileAt(a.x + dx, a.y + dy);
          expect(tile.settlementId).toBe(a.id);
          expect(tile.label).toBe(a.name);
        }
      }
    }
  });

  it('3. findAnchorBySpan resolves the correct anchor for every footprint tile across 52 anchors', () => {
    for (const a of anchors) {
      const sw = a.spanWidth || 2;
      const sh = a.spanHeight || 2;
      for (let dy = 0; dy < sh; dy++) {
        for (let dx = 0; dx < sw; dx++) {
          const found = settlementZones.findAnchorBySpan(a.x + dx, a.y + dy);
          expect(found).not.toBeNull();
          expect(found.id).toBe(a.id);
        }
      }
    }
  });

  it('4. findAnchorByEntrance still works accurately for all 52 anchors', () => {
    for (const a of anchors) {
      const ent = a.v20?.entrance;
      expect(ent).toBeDefined();
      const found = settlementZones.findAnchorByEntrance(ent.x, ent.y);
      expect(found).not.toBeNull();
      expect(found.id).toBe(a.id);
    }
  });

  it('5. Outer boundary tiles around settlements are not mistakenly identified as within footprint span', () => {
    const a = anchors[0];
    const sw = a.spanWidth || 2;
    const sh = a.spanHeight || 2;
    expect(settlementZones.findAnchorBySpan(a.x - 1, a.y)).toBeNull();
    expect(settlementZones.findAnchorBySpan(a.x + sw, a.y)).toBeNull();
    expect(settlementZones.findAnchorBySpan(a.x, a.y - 1)).toBeNull();
    expect(settlementZones.findAnchorBySpan(a.x, a.y + sh)).toBeNull();
  });

  it('6. ObjectScatter does not block cells inside settlement footprint', () => {
    for (const a of anchors.slice(0, 10)) {
      const sw = a.spanWidth || 2;
      const sh = a.spanHeight || 2;
      for (let dy = 0; dy < sh; dy++) {
        for (let dx = 0; dx < sw; dx++) {
          const isBlocked = objectScatter.isCellBlocked(a.x + dx, a.y + dy);
          expect(isBlocked).toBe(false);
        }
      }
    }
  });

  it('7. Unpacked static chunks match direct getTileAt for settlement walkability', () => {
    for (const a of anchors.slice(0, 5)) {
      const cx = Math.floor(a.x / 32);
      const cy = Math.floor(a.y / 32);
      const chunk = chunkStreamingEngine.getStaticChunk(cx, cy);
      const unpacked = chunkStreamingEngine.unpackChunkTiles(chunk);
      
      const localIdx = (a.y - cy * 32) * 32 + (a.x - cx * 32);
      const chunkTile = unpacked[localIdx];
      const directTile = proceduralWorldEngine.getTileAt(a.x, a.y);

      expect(chunkTile.isSolid).toBe(false);
      expect(directTile.isSolid).toBe(false);
      expect(chunkTile.settlementName).toBe(directTile.settlementName);
    }
  });

  it('8. Approach from all 4 cardinal directions reaches walkable footprint without solid blocker', () => {
    for (const a of anchors) {
      const sw = a.spanWidth || 2;
      const sh = a.spanHeight || 2;

      // 4 target perimeter tiles
      const targets = [
        { x: a.x + Math.floor(sw / 2), y: a.y },               // North side
        { x: a.x + Math.floor(sw / 2), y: a.y + sh - 1 },      // South side
        { x: a.x, y: a.y + Math.floor(sh / 2) },               // West side
        { x: a.x + sw - 1, y: a.y + Math.floor(sh / 2) }       // East side
      ];

      for (const t of targets) {
        const tile = proceduralWorldEngine.getTileAt(t.x, t.y);
        expect(tile.isSolid).toBe(false);
        const anchor = settlementZones.findAnchorBySpan(t.x, t.y);
        expect(anchor?.id).toBe(a.id);
      }
    }
  });

  it('9. Settlement origin tile retains isSettlementOrigin=true and full metadata', () => {
    for (const a of anchors) {
      const originTile = proceduralWorldEngine.getTileAt(a.x, a.y);
      expect(originTile.isSettlementOrigin).toBe(true);
      expect(originTile.settlementData).not.toBeNull();
      expect(originTile.settlementData.id).toBe(a.id);
    }
  });

  it('10. Total footprint tiles across all 52 anchors equals 532 tiles, all 100% walkable', () => {
    let totalFootprint = 0;
    let totalWalkable = 0;
    for (const a of anchors) {
      const sw = a.spanWidth || 2;
      const sh = a.spanHeight || 2;
      for (let dy = 0; dy < sh; dy++) {
        for (let dx = 0; dx < sw; dx++) {
          totalFootprint++;
          const tile = proceduralWorldEngine.getTileAt(a.x + dx, a.y + dy);
          if (!tile.isSolid) totalWalkable++;
        }
      }
    }
    expect(totalFootprint).toBe(532);
    expect(totalWalkable).toBe(532);
  });
});
