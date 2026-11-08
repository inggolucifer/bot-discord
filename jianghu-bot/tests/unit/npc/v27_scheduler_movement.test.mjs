import { describe, it, expect } from 'vitest';
import Npc from '../../../models/Npc.js';
import { resolveCurrentActivity, updateNpcScheduleState } from '../../../services/npcScheduler.js';
import { simulateNearTick, simulateAbstractTick } from '../../../services/npcMovementSimulator.js';
import { generateDeterministicNpc } from '../../../services/npcGenerator.js';

describe('V27 Scheduler & Spatial Movement Simulation Suite', () => {
  it('resolves correct activities according to Jianghu Shichen', () => {
    const blacksmith = new Npc(generateDeterministicNpc({
      role: 'blacksmith',
      isEssential: true,
      essentialRole: 'blacksmith'
    }, 'bs_test'));

    // 02:00 -> Jam Chou -> Sleeping at residences
    const nightActivity = resolveCurrentActivity(blacksmith, { hour: 2, shichenId: 'chou' });
    expect(nightActivity.activityState).toBe('sleeping');
    expect(nightActivity.targetFacility).toBe('residences');

    // 08:00 -> Jam Chen -> Working at workshop
    const morningActivity = resolveCurrentActivity(blacksmith, { hour: 8, shichenId: 'chen' });
    expect(morningActivity.activityState).toBe('working');
    expect(morningActivity.targetFacility).toBe('workshop');

    // 12:00 -> Jam Wu -> Socializing at tavern
    const middayActivity = resolveCurrentActivity(blacksmith, { hour: 12, shichenId: 'wu' });
    expect(middayActivity.activityState).toBe('socializing');
    expect(middayActivity.targetFacility).toBe('tavern');
  });

  it('updateNpcScheduleState updates NPC state and handles deceased status', () => {
    const npc = new Npc(generateDeterministicNpc({}, 'npc_sched_test'));
    updateNpcScheduleState(npc, { hour: 8, shichenId: 'chen' });

    expect(npc.schedule.activityState).toBe('working');
    expect(npc.buildingName).toBe(npc.schedule.currentFacility);

    // Dead NPC
    npc.vitalStatus.isAlive = false;
    updateNpcScheduleState(npc, { hour: 8, shichenId: 'chen' });
    expect(npc.schedule.activityState).toBe('dead');
  });

  it('simulateNearTick moves NPC 1 step at a time towards target coordinates', () => {
    const npc = new Npc(generateDeterministicNpc({
      tileX: 100,
      tileY: 200
    }, 'mover_test'));

    // Move towards (105, 200)
    const tick1 = simulateNearTick(npc, { x: 105, y: 200 }, 5, () => 0.9);
    expect(tick1.moved).toBe(true);
    expect(npc.schedule.tileX).toBe(101);
    expect(npc.schedule.tileY).toBe(200);

    // Move again
    const tick2 = simulateNearTick(npc, { x: 105, y: 200 }, 5, () => 0.9);
    expect(tick2.moved).toBe(true);
    expect(npc.schedule.tileX).toBe(102);
  });

  it('simulateAbstractTick instantly positions NPC and regenerates health', () => {
    const npc = new Npc(generateDeterministicNpc({
      tileX: 100,
      tileY: 200
    }, 'abstract_test'));

    npc.attributes.hp = 20; // low hp

    const result = simulateAbstractTick(npc, { x: 500, y: 600 }, 5);
    expect(result.updated).toBe(true);
    expect(npc.schedule.tileX).toBe(500);
    expect(npc.schedule.tileY).toBe(600);
    expect(npc.attributes.hp).toBe(npc.attributes.maxHp);
  });
});
