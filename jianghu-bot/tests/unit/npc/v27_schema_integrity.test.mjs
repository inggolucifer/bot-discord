import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';

// Load real schemas
import Npc from '../../../models/Npc.js';
import NpcPlayerRelation from '../../../models/NpcPlayerRelation.js';
import NpcRelation from '../../../models/NpcRelation.js';
import NpcFamily from '../../../models/NpcFamily.js';
import NpcVendetta from '../../../models/NpcVendetta.js';
import NpcAmbush from '../../../models/NpcAmbush.js';
import NpcEvent from '../../../models/NpcEvent.js';
import Player from '../../../models/Player.js';

describe('V27 Schema Integrity Suite (Zero Mock Models)', () => {
  it('instantiates Npc model with defaults and validates legacy + V27 fields', () => {
    const npc = new Npc({
      name: 'Li Qing',
      regionSlug: 'donghai_coastal_plain',
      settlementName: 'Kota Canghai'
    });

    // Legacy fields
    expect(npc.name).toBe('Li Qing');
    expect(npc.title).toBe('Warga Jianghu');
    expect(npc.regionSlug).toBe('donghai_coastal_plain');
    expect(npc.settlementName).toBe('Kota Canghai');
    expect(npc.isActive).toBe(true);

    // V27 Living NPC fields
    expect(npc.personality.primary).toBe('righteous');
    expect(npc.personality.secondary).toBe('honest');
    expect(npc.personality.morality).toBe(75);
    expect(npc.personality.temperament).toBe(50);

    expect(npc.cultivation.realmIndex).toBe(0);
    expect(npc.cultivation.stage).toBe(1);

    expect(npc.lifespan.currentAge).toBe(20);
    expect(npc.lifespan.maxAge).toBe(100);
    expect(npc.vitalStatus.isAlive).toBe(true);
    expect(npc.vitalStatus.isEssential).toBe(false);

    expect(npc.attributes.hp).toBe(100);
    expect(npc.attributes.attack).toBe(15);
    expect(npc.attributes.defense).toBe(10);
    expect(npc.attributes.roots.fire).toBe(0);
    expect(npc.attributes.kungfuSkills.sword).toBe(0);
    expect(npc.attributes.professions.alchemy).toBe(0);

    const err = npc.validateSync();
    expect(err).toBeUndefined();
  });

  it('validates Player schema has wantedLevel field', () => {
    const player = new Player({
      userId: 'test_user_v27_123',
      characterName: 'Pendekar Penguji'
    });

    expect(player.wantedLevel).toBe(0);
    player.wantedLevel = 3;
    let err = player.validateSync();
    expect(err).toBeUndefined();

    player.wantedLevel = 6; // exceeds max: 5
    err = player.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.wantedLevel).toBeDefined();
  });

  it('validates NpcPlayerRelation bounds and defaults', () => {
    const playerId = new mongoose.Types.ObjectId();
    const npcId = new mongoose.Types.ObjectId();

    const relation = new NpcPlayerRelation({
      playerId,
      npcId,
      affinity: 25
    });

    expect(relation.affinity).toBe(25);
    expect(relation.interactionCountDaily.chat).toBe(0);
    expect(relation.specialStatus.isDaoCompanion).toBe(false);
    let err = relation.validateSync();
    expect(err).toBeUndefined();

    // Test bounds [-100, 100]
    relation.affinity = 101;
    err = relation.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.affinity).toBeDefined();

    relation.affinity = -101;
    err = relation.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.affinity).toBeDefined();
  });

  it('validates NpcRelation schema and enum', () => {
    const sourceNpcId = new mongoose.Types.ObjectId();
    const targetNpcId = new mongoose.Types.ObjectId();

    const rel = new NpcRelation({
      sourceNpcId,
      targetNpcId,
      relationType: 'friend',
      affinity: 60
    });

    expect(rel.relationType).toBe('friend');
    expect(rel.affinity).toBe(60);
    let err = rel.validateSync();
    expect(err).toBeUndefined();

    rel.relationType = 'invalid_type';
    err = rel.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.relationType).toBeDefined();
  });

  it('validates NpcFamily schema', () => {
    const headNpcId = new mongoose.Types.ObjectId();
    const childNpcId = new mongoose.Types.ObjectId();

    const family = new NpcFamily({
      familyName: 'Klan Murong',
      headNpcId,
      members: [
        { npcId: headNpcId, role: 'patriarch', generation: 1 },
        { npcId: childNpcId, role: 'child', generation: 2 }
      ],
      homeAnchorId: 'kota_canghai'
    });

    expect(family.familyName).toBe('Klan Murong');
    expect(family.members.length).toBe(2);
    expect(family.clanPrestige).toBe(100);
    const err = family.validateSync();
    expect(err).toBeUndefined();
  });

  it('validates NpcVendetta schema and grudgeLevel bounds', () => {
    const hunterNpcId = new mongoose.Types.ObjectId();
    const targetId = new mongoose.Types.ObjectId();

    const vendetta = new NpcVendetta({
      hunterNpcId,
      targetId,
      targetType: 'player',
      grudgeLevel: 5,
      reason: 'Pembunuhan ayah kandung di gerbang kota'
    });

    expect(vendetta.grudgeLevel).toBe(5);
    expect(vendetta.resolved).toBe(false);
    let err = vendetta.validateSync();
    expect(err).toBeUndefined();

    vendetta.grudgeLevel = 6; // max is 5
    err = vendetta.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.grudgeLevel).toBeDefined();
  });

  it('validates NpcAmbush and NpcEvent models', () => {
    const npcId = new mongoose.Types.ObjectId();
    const playerId = new mongoose.Types.ObjectId();

    const ambush = new NpcAmbush({
      hunterNpcId: npcId,
      targetPlayerId: playerId,
      tileX: 2450,
      tileY: 2480
    });

    expect(ambush.status).toBe('stalking');
    expect(ambush.tileX).toBe(2450);
    expect(ambush.validateSync()).toBeUndefined();

    const event = new NpcEvent({
      npcId,
      eventType: 'breakthrough',
      description: 'Menembus tahap Foundation Establishment tingkat 3'
    });

    expect(event.eventType).toBe('breakthrough');
    expect(event.validateSync()).toBeUndefined();
  });
});
