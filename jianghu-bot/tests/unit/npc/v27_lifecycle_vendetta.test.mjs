import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import Npc from '../../../models/Npc.js';
import NpcFamily from '../../../models/NpcFamily.js';
import { killNpc, advanceNpcLifeTick } from '../../../services/npcLifecycle.js';
import { evaluateAmbushTrigger } from '../../../services/npcVendettaEngine.js';
import { checkAnchorCoreRoles, replenishMissingRoles } from '../../../services/npcPopulationManager.js';
import { generateDeterministicNpc } from '../../../services/npcGenerator.js';

describe('V27 Lifecycle, Death Door & Vendetta Suite', () => {
  it('killNpc updates NPC status, generates death event and triggers family vendetta', async () => {
    const victimId = new mongoose.Types.ObjectId();
    const brotherId = new mongoose.Types.ObjectId();
    const familyId = new mongoose.Types.ObjectId();
    const killerPlayerId = new mongoose.Types.ObjectId();

    const victimNpc = new Npc(generateDeterministicNpc({
      name: 'Li Chen',
      familyId
    }, 'victim_seed'));
    victimNpc._id = victimId;
    victimNpc.social.familyId = familyId;

    const familyDoc = {
      _id: familyId,
      familyName: 'Klan Li',
      members: [
        { npcId: victimId, role: 'child' },
        { npcId: brotherId, role: 'sibling' }
      ]
    };

    const result = await killNpc(victimNpc, {
      id: killerPlayerId,
      type: 'player',
      name: 'Pendekar Pedang Bayangan',
      familyDoc
    });

    expect(victimNpc.vitalStatus.isAlive).toBe(false);
    expect(victimNpc.schedule.activityState).toBe('dead');
    expect(victimNpc.lifespan.deathTimestamp).toBeDefined();

    expect(result.deathEvent).toBeDefined();
    expect(result.deathEvent.eventType).toBe('death');
    expect(result.deathEvent.description).toContain('Pendekar Pedang Bayangan');

    expect(result.createdVendettas.length).toBe(1);
    const vendetta = result.createdVendettas[0];
    expect(vendetta.hunterNpcId.toString()).toBe(brotherId.toString());
    expect(vendetta.targetId.toString()).toBe(killerPlayerId.toString());
    expect(vendetta.grudgeLevel).toBe(5);
  });

  it('advanceNpcLifeTick processes aging, breakthrough, and natural death', () => {
    const npc = new Npc(generateDeterministicNpc({
      currentAge: 99,
      targetRealmIndex: 0
    }, 'elder_seed'));
    npc.lifespan.maxAge = 100;

    // Aging 6 months -> age becomes 99
    let tickRes = advanceNpcLifeTick(npc, 6, () => 0.9);
    expect(tickRes.status).toBe('alive');

    // Aging 12 months -> age becomes 100 -> triggers death of old age
    tickRes = advanceNpcLifeTick(npc, 12, () => 0.9);
    expect(tickRes.status).toBe('died_of_old_age');
    expect(npc.vitalStatus.isAlive).toBe(false);
  });

  it('evaluateAmbushTrigger strictly enforces safe zone invariant', () => {
    const hunter = new Npc(generateDeterministicNpc({}, 'hunter_seed'));
    const player = { tileX: 2450, tileY: 2480 };

    // In settlement safe zone -> CANNOT AMBUSH
    const inSettlement = evaluateAmbushTrigger({
      hunterNpc: hunter,
      player,
      tileInfo: { isSettlement: true, isSafeZone: true },
      grudgeLevel: 5,
      rng: () => 0.05
    });
    expect(inSettlement.canAmbush).toBe(false);
    expect(inSettlement.reason).toBe('safe_zone');

    // In wilderness with grudge 5 and roll 0.10 (< 0.35 threshold) -> CAN AMBUSH
    const inWilderness = evaluateAmbushTrigger({
      hunterNpc: hunter,
      player,
      tileInfo: { isSettlement: false, isSafeZone: false },
      grudgeLevel: 5,
      rng: () => 0.10
    });
    expect(inWilderness.canAmbush).toBe(true);
    expect(inWilderness.hunterName).toBe(hunter.name);
  });

  it('population manager checks and replenishes missing anchor core roles', () => {
    const anchorId = 'desa_heiyan';
    const existingNpcs = [
      new Npc(generateDeterministicNpc({ role: 'innkeeper', anchorId }, 'inn_seed'))
    ];

    const check = checkAnchorCoreRoles(anchorId, existingNpcs);
    expect(check.existingRoles).toContain('innkeeper');
    expect(check.missingRoles).toContain('blacksmith');
    expect(check.missingRoles).toContain('alchemist');

    const replacements = replenishMissingRoles({
      anchorId,
      settlementName: 'Desa Heiyan',
      missingRoles: check.missingRoles,
      seed: 'heiyan_fix'
    });

    expect(replacements.length).toBe(2);
    expect(replacements.some(r => r.vitalStatus.essentialRole === 'blacksmith')).toBe(true);
    expect(replacements.some(r => r.vitalStatus.essentialRole === 'alchemist')).toBe(true);

    for (const rep of replacements) {
      const inst = new Npc(rep);
      expect(inst.validateSync()).toBeUndefined();
    }
  });
});
