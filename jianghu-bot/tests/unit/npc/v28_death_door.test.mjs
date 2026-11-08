import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import Npc from '../../../models/Npc.js';
import { killNpc } from '../../../services/npcLifecycle.js';

describe('Single Death Door & Essential NPC Protection (V28 / A3)', () => {
  it('protects essential NPC from dying: sets status to downed and isAlive true with downedUntil', async () => {
    const essentialNpc = new Npc({
      name: 'Zhou Haotian',
      vitalStatus: {
        isAlive: true,
        isInjured: false,
        isEssential: true,
        downedUntil: null
      },
      attributes: { hp: 100 }
    });

    const result = await killNpc(essentialNpc, { type: 'player', name: 'Pendekar Hero', id: new mongoose.Types.ObjectId() });

    expect(result.status).toBe('downed');
    expect(essentialNpc.vitalStatus.isAlive).toBe(true);
    expect(essentialNpc.vitalStatus.isInjured).toBe(true);
    expect(essentialNpc.vitalStatus.injurySeverity).toBe(3);
    expect(essentialNpc.vitalStatus.downedUntil).not.toBeNull();
    expect(essentialNpc.vitalStatus.downedUntil instanceof Date).toBe(true);
    expect(essentialNpc.attributes.hp).toBe(1);
    expect(essentialNpc.schedule.activityState).toBe('downed');
  });

  it('kills regular non-essential NPC: sets status to dead and isAlive false', async () => {
    const normalNpc = new Npc({
      name: 'Penebang Kayu Lu',
      vitalStatus: {
        isAlive: true,
        isInjured: false,
        isEssential: false
      },
      attributes: { hp: 50 }
    });

    const result = await killNpc(normalNpc, { type: 'player', name: 'Pendekar Hero', id: new mongoose.Types.ObjectId() });

    expect(result.status).toBe('dead');
    expect(normalNpc.vitalStatus.isAlive).toBe(false);
    expect(normalNpc.schedule.activityState).toBe('dead');
    expect(normalNpc.attributes.hp).toBe(0);
  });

  it('differentiates family grudge: distant kin (relative) does not receive level 5 grudge', async () => {
    const victimId = new mongoose.Types.ObjectId();
    const spouseId = new mongoose.Types.ObjectId();
    const distantKinId = new mongoose.Types.ObjectId();

    const victimNpc = new Npc({
      _id: victimId,
      name: 'Kakek Li',
      vitalStatus: {
        isAlive: true,
        isEssential: false
      }
    });

    const mockFamily = {
      familyName: 'Keluarga Li',
      members: [
        { npcId: spouseId, role: 'spouse' },
        { npcId: distantKinId, role: 'relative' },
        { npcId: victimId, role: 'parent' }
      ]
    };

    const killerId = new mongoose.Types.ObjectId();
    const result = await killNpc(victimNpc, {
      type: 'player',
      id: killerId,
      name: 'Pendekar Jahat',
      familyDoc: mockFamily
    });

    expect(result.status).toBe('dead');
    expect(Array.isArray(result.createdVendettas)).toBe(true);

    const spouseVendetta = result.createdVendettas.find(v => v.hunterNpcId.toString() === spouseId.toString());
    const distantVendetta = result.createdVendettas.find(v => v.hunterNpcId.toString() === distantKinId.toString());

    expect(spouseVendetta).toBeDefined();
    expect(spouseVendetta.grudgeLevel).toBe(5);

    expect(distantVendetta).toBeDefined();
    expect(distantVendetta.grudgeLevel).toBeLessThan(5);
    expect(distantVendetta.grudgeLevel).toBe(2);
  });
});
