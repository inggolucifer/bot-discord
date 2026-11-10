import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { snapWalkable, runJourneyTick } = require('../../../services/npcJourneyTick');
const Npc = require('../../../models/Npc');

describe('snapWalkable Unit & Coordinate Protection Tests (V31 F2)', () => {
  it('1. Returns walkable tile as is with ok: true', () => {
    const isWalkableFn = (x, y) => x === 100 && y === 100;
    const res = snapWalkable(100, 100, isWalkableFn);
    expect(res).toEqual({ x: 100, y: 100, ok: true });
  });

  it('2. Finds walkable neighbor at distance 25 with ok: true', () => {
    // Only tile at (125, 100) is walkable (distance = 25)
    const isWalkableFn = (x, y) => x === 125 && y === 100;
    const res = snapWalkable(100, 100, isWalkableFn);
    expect(res.ok).toBe(true);
    expect(res.x).toBe(125);
    expect(res.y).toBe(100);
  });

  it('3. Returns ok: false when entire neighborhood within radius 40 is non-walkable', () => {
    // Only tile at distance 45 is walkable (beyond radius 40)
    const isWalkableFn = (x, y) => x === 145 && y === 100;
    const res = snapWalkable(100, 100, isWalkableFn);
    expect(res.ok).toBe(false);
    expect(res.x).toBe(100);
    expect(res.y).toBe(100);
  });

  it('4. Coordinates returned are pure integers', () => {
    const isWalkableFn = (x, y) => x === 105 && y === 105;
    const res = snapWalkable(100.4, 100.8, isWalkableFn);
    expect(Number.isInteger(res.x)).toBe(true);
    expect(Number.isInteger(res.y)).toBe(true);
  });

  describe('Integration: NPC on ok: false tile preserves existing coordinates', () => {
    let mongoServer;

    beforeAll(async () => {
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
    });

    afterAll(async () => {
      await mongoose.disconnect();
      await mongoServer.stop();
    });

    beforeEach(async () => {
      await Npc.deleteMany({});
    });

    it('5. NPC does not write raw coordinates when snapWalkable returns ok: false', async () => {
      const now = 100000;
      const npc = await Npc.create({
        name: 'Pengelana Laut',
        gender: 'male',
        vitalStatus: { isAlive: true, isEssential: false },
        cultivation: { realmIndex: 1 },
        tileX: 50,
        tileY: 50,
        schedule: {
          tileX: 50,
          tileY: 50,
          currentAnchorId: 'desa_a',
          homeAnchorId: 'desa_a',
          wanderLevel: 1,
          activityState: 'traveling',
          targetDestination: {
            type: 'journey',
            fromId: 'desa_a',
            toId: 'desa_b',
            startedAt: 100000,
            etaAt: 200000,
            totalTiles: 100,
            legs: [
              { ax: 50, ay: 50, bx: 150, by: 50, len: 100 }
            ]
          }
        }
      });

      // Walkability function where everything in journey path is NOT walkable
      const neverWalkable = () => false;

      // Tick at mid-point (50% journey)
      await runJourneyTick({
        Npc,
        now: 150000,
        anchorMap: {},
        graph: {},
        isWalkableFn: neverWalkable
      });

      const updated = await Npc.findById(npc._id);
      expect(updated.schedule.activityState).toBe('traveling');
      // Coordinates must NOT be updated to the non-walkable tile (100, 50); must stay at (50, 50)
      expect(updated.schedule.tileX).toBe(50);
      expect(updated.schedule.tileY).toBe(50);
      expect(updated.tileX).toBe(50);
      expect(updated.tileY).toBe(50);
    });
  });
});
