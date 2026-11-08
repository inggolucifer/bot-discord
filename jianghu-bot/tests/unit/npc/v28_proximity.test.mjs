import { describe, it, expect } from 'vitest';
import { checkNpcProximity } from '../../../services/npcProximity.js';

describe('NPC Proximity Checker (V28 / A4)', () => {
  it('rejects interaction when player is currently traveling', () => {
    const player = {
      travelState: { isTraveling: true },
      gridPosition: { tileX: 100, tileY: 100 }
    };
    const npc = {
      tileX: 100,
      tileY: 100
    };

    const res = checkNpcProximity(player, npc);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('traveling');
  });

  it('rejects interaction when distance in wilderness exceeds 3 tiles', () => {
    const player = {
      travelState: { isTraveling: false },
      gridPosition: { tileX: 100, tileY: 100 }
    };
    const npc = {
      tileX: 104,
      tileY: 100
    };

    const res = checkNpcProximity(player, npc);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('too_far');
    expect(res.distance).toBe(4);
  });

  it('accepts interaction when within 3 tiles in wilderness', () => {
    const player = {
      travelState: { isTraveling: false },
      gridPosition: { tileX: 100, tileY: 100 }
    };
    const npc = {
      tileX: 102,
      tileY: 103
    };

    const res = checkNpcProximity(player, npc);
    expect(res.ok).toBe(true);
    expect(res.distance).toBe(3);
  });

  it('accepts interaction inside the same settlement regardless of coordinate spread', () => {
    const player = {
      travelState: { isTraveling: false },
      currentLocation: { settlementName: 'Kota Wuxian' },
      gridPosition: { tileX: 200, tileY: 200 }
    };
    const npc = {
      settlementName: 'Kota Wuxian',
      tileX: 215,
      tileY: 220
    };

    const res = checkNpcProximity(player, npc);
    expect(res.ok).toBe(true);
  });
});
