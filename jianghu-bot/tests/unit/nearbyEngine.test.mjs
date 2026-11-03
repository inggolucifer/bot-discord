import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  calculateDirection,
  classifyDistance,
  filterVisibility,
  computeNearbyEntities,
  generateNearbyDelta
} = require('../../utils/nearbyEngine');

describe('V21 F3 — Nearby Spatial Engine & Anti-Lag Broadcaster', () => {
  describe('8 Compass Directions Calculation', () => {
    it('identifies identical coordinate as Pusat', () => {
      expect(calculateDirection(10, 10, 10, 10)).toBe('Pusat');
    });

    it('identifies pure East and West correctly', () => {
      expect(calculateDirection(10, 10, 20, 10)).toBe('Timur');
      expect(calculateDirection(10, 10, 0, 10)).toBe('Barat');
    });

    it('identifies pure North and South correctly (grid Y+ is downwards)', () => {
      expect(calculateDirection(10, 10, 10, 0)).toBe('Utara');
      expect(calculateDirection(10, 10, 10, 20)).toBe('Selatan');
    });

    it('identifies diagonal quadrants correctly', () => {
      expect(calculateDirection(10, 10, 20, 20)).toBe('Tenggara');
      expect(calculateDirection(10, 10, 0, 20)).toBe('Barat Daya');
      expect(calculateDirection(10, 10, 20, 0)).toBe('Timur Laut');
      expect(calculateDirection(10, 10, 0, 0)).toBe('Barat Laut');
    });
  });

  describe('Qualitative Distance Classification', () => {
    it('classifies <= 5 as dekat', () => {
      expect(classifyDistance(0)).toBe('dekat');
      expect(classifyDistance(3)).toBe('dekat');
      expect(classifyDistance(5)).toBe('dekat');
    });

    it('classifies 6..15 as sedang', () => {
      expect(classifyDistance(6)).toBe('sedang');
      expect(classifyDistance(12)).toBe('sedang');
      expect(classifyDistance(15)).toBe('sedang');
    });

    it('classifies > 15 as jauh', () => {
      expect(classifyDistance(16)).toBe('jauh');
      expect(classifyDistance(50)).toBe('jauh');
    });
  });

  describe('Entity Visibility Access Control', () => {
    it('allows public entities for any viewer', () => {
      const publicBuilding = { visibility: 'public', ownerId: 'user_1' };
      expect(filterVisibility(publicBuilding, { id: 'user_2' })).toBe(true);
      expect(filterVisibility(publicBuilding, {})).toBe(true);
    });

    it('restricts private entities to the owner only', () => {
      const privateBuilding = { visibility: 'private', ownerId: 'user_owner' };
      expect(filterVisibility(privateBuilding, { id: 'user_owner' })).toBe(true);
      expect(filterVisibility(privateBuilding, { id: 'stranger_user' })).toBe(false);
      expect(filterVisibility(privateBuilding, {})).toBe(false);
    });

    it('restricts sect entities to sect members only', () => {
      const sectPavilion = { visibility: 'sect', sectId: 'sect_shaolin' };
      expect(filterVisibility(sectPavilion, { id: 'disciple_1', sectId: 'sect_shaolin' })).toBe(true);
      expect(filterVisibility(sectPavilion, { id: 'disciple_2', sectId: 'sect_wudang' })).toBe(false);
      expect(filterVisibility(sectPavilion, { id: 'mortal_wanderer' })).toBe(false);
    });
  });

  describe('Spatial List Computation & Sorting', () => {
    it('sorts entities by Chebyshev distance ascending and applies max limit of 30', () => {
      const entities = [];
      for (let i = 1; i <= 40; i++) {
        entities.push({
          id: `entity_${i}`,
          name: `Objek ${i}`,
          x: 100 + i,
          y: 100 + i,
          visibility: 'public'
        });
      }

      const res = computeNearbyEntities({
        fromX: 100,
        fromY: 100,
        entities,
        viewer: { id: 'player_me' },
        maxResults: 30
      });

      expect(res.totalCount).toBe(40);
      expect(res.items.length).toBe(30);
      expect(res.countOthers).toBe(10);
      expect(res.items[0].dist).toBe(1);
      expect(res.items[29].dist).toBe(30);
    });
  });

  describe('Socket.io Delta Batch Generator', () => {
    it('detects entered, moved, and left entities accurately', () => {
      const prevMap = new Map([
        ['e1', { id: 'e1', name: 'Kultivator A', x: 10, y: 10, status: 'idle' }],
        ['e2', { id: 'e2', name: 'Kultivator B', x: 20, y: 20, status: 'idle' }]
      ]);

      const currentEntities = [
        { id: 'e1', name: 'Kultivator A', x: 11, y: 10, status: 'walking' }, // moved
        { id: 'e3', name: 'Kultivator C', x: 15, y: 15, status: 'idle' }     // entered
        // e2 is omitted -> left
      ];

      const { delta, nextMap } = generateNearbyDelta({
        previousMap: prevMap,
        currentEntities,
        chunkKey: '77:77',
        timestamp: 1700000000
      });

      expect(delta.entered.length).toBe(1);
      expect(delta.entered[0].id).toBe('e3');
      expect(delta.moved.length).toBe(1);
      expect(delta.moved[0].id).toBe('e1');
      expect(delta.left).toEqual(['e2']);
      expect(nextMap.size).toBe(2);
      expect(nextMap.has('e1')).toBe(true);
      expect(nextMap.has('e3')).toBe(true);

      // Verify payload is well under 8 KB
      const payloadSize = Buffer.byteLength(JSON.stringify(delta), 'utf8');
      expect(payloadSize).toBeLessThan(8192);
    });
  });
});
