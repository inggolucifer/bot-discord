import { describe, it, expect } from 'vitest';
import { huntStep } from '../../../services/npcHuntEngine';

describe('V30 NPC Hunt Engine (npcHuntEngine.js)', () => {
  const dummyAnchors = [
    { id: 'kota_aman', name: 'Kota Aman', type: 'city', x: 500, y: 500 }
  ];

  const baseHunter = {
    _id: '507f1f77bcf86cd799439020',
    vitalStatus: { isAlive: true, isEssential: false, isInjured: false },
    schedule: { tileX: 100, tileY: 100, activityState: 'hunting' }
  };

  const isWalkableFn = () => true;

  it('1. Distance 300 (> 200) does not move, returns state idle', () => {
    const player = { gridPosition: { tileX: 400, tileY: 100 } }; // dist = 300
    const res = huntStep({
      hunter: baseHunter,
      player,
      anchors: dummyAnchors,
      isWalkableFn
    });
    expect(res.moved).toBe(false);
    expect(res.dist).toBe(300);
    expect(res.newX).toBe(100);
    expect(res.newY).toBe(100);
    expect(res.state).toBe('idle');
  });

  it('2. Distance 100 moves closer (new distance < old distance, state hunting)', () => {
    const player = { gridPosition: { tileX: 200, tileY: 100 } }; // dist = 100
    const res = huntStep({
      hunter: baseHunter,
      player,
      anchors: dummyAnchors,
      isWalkableFn
    });
    expect(res.moved).toBe(true);
    expect(res.newX).toBeGreaterThan(100);
    expect(res.dist).toBeLessThan(100);
    expect(res.state).toBe('hunting');
  });

  it('3. Distance 20 (<= 24) does not move, stays hunting ready to ambush', () => {
    const player = { gridPosition: { tileX: 120, tileY: 100 } }; // dist = 20
    const res = huntStep({
      hunter: baseHunter,
      player,
      anchors: dummyAnchors,
      isWalkableFn
    });
    expect(res.moved).toBe(false);
    expect(res.dist).toBe(20);
    expect(res.newX).toBe(100);
    expect(res.newY).toBe(100);
    expect(res.state).toBe('hunting');
  });

  it('4. Never passes the 24-tile threshold (e.g. dist 30, step = 6, new dist >= 24)', () => {
    const player = { gridPosition: { tileX: 130, tileY: 100 } }; // dist = 30
    const res = huntStep({
      hunter: baseHunter,
      player,
      anchors: dummyAnchors,
      isWalkableFn
    });
    expect(res.moved).toBe(true);
    expect(res.dist).toBeGreaterThanOrEqual(24);
  });

  it('5. Cancels movement if candidate tile enters a settlement exclusion zone', () => {
    // Player is at (500, 500) inside Kota Aman.
    // Hunter is at (400, 500), dist = 100.
    // Moving towards (500, 500) will place hunter inside Kota Aman exclusion zone (radius 20).
    const player = { gridPosition: { tileX: 500, tileY: 500 } };
    const hunterNearCity = {
      ...baseHunter,
      schedule: { tileX: 470, tileY: 500 } // dist = 30. Step = 6 -> candidate 476, dist to city = 24 <= city exclusion (usually 20+)
    };
    const cityAnchor = [{ id: 'kota_aman', name: 'Kota Aman', type: 'city', x: 500, y: 500, v20: { exclusionRadius: 36 } }];
    const res = huntStep({
      hunter: hunterNearCity,
      player,
      anchors: cityAnchor,
      isWalkableFn
    });
    // Movement cancelled due to exclusion
    expect(res.moved).toBe(false);
    expect(res.state).toBe('hunting');
  });

  it('6. Essential NPCs never hunt (returns moved: false, state: idle)', () => {
    const essentialHunter = {
      ...baseHunter,
      vitalStatus: { ...baseHunter.vitalStatus, isEssential: true }
    };
    const player = { gridPosition: { tileX: 150, tileY: 100 } };
    const res = huntStep({
      hunter: essentialHunter,
      player,
      anchors: dummyAnchors,
      isWalkableFn
    });
    expect(res.moved).toBe(false);
    expect(res.state).toBe('idle');
  });

  it('7. Injured NPCs never hunt (returns moved: false, state: idle)', () => {
    const injuredHunter = {
      ...baseHunter,
      vitalStatus: { ...baseHunter.vitalStatus, isInjured: true }
    };
    const player = { gridPosition: { tileX: 150, tileY: 100 } };
    const res = huntStep({
      hunter: injuredHunter,
      player,
      anchors: dummyAnchors,
      isWalkableFn
    });
    expect(res.moved).toBe(false);
    expect(res.state).toBe('idle');
  });

  it('8. Returned coordinates are always integers (Math.round / integer)', () => {
    const player = { gridPosition: { tileX: 187, tileY: 143 } };
    const res = huntStep({
      hunter: baseHunter,
      player,
      anchors: dummyAnchors,
      isWalkableFn
    });
    expect(Number.isInteger(res.newX)).toBe(true);
    expect(Number.isInteger(res.newY)).toBe(true);
    expect(Number.isInteger(res.dist)).toBe(true);
  });

  it('9. Deterministic: consecutive calls with identical inputs produce identical coordinates', () => {
    const player = { gridPosition: { tileX: 175, tileY: 125 } };
    const res1 = huntStep({ hunter: baseHunter, player, anchors: dummyAnchors, isWalkableFn });
    const res2 = huntStep({ hunter: baseHunter, player, anchors: dummyAnchors, isWalkableFn });
    expect(res1).toEqual(res2);
  });
});
