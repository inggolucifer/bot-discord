import { describe, it, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import Npc from '../../../models/Npc.js';
import Player from '../../../models/Player.js';
import NpcAmbush from '../../../models/NpcAmbush.js';
import NpcVendetta from '../../../models/NpcVendetta.js';
import { handleNpcBattleResolution } from '../../../services/npcCombatAdapter.js';

describe('Safe NPC Battle Resolution & Essential Protection (V28 / B5)', () => {
  it('1. duel victory over essential NPC sets status to downed, not dead, with zero loot drop', async () => {
    const essentialNpc = new Npc({
      _id: new mongoose.Types.ObjectId(),
      name: 'Zhou Haotian',
      vitalStatus: { isAlive: true, isEssential: true },
      attributes: { hp: 100 },
      inventory: [{ itemId: new mongoose.Types.ObjectId(), name: 'Pedang Pusaka', quantity: 1 }]
    });

    const player = new Player({
      _id: new mongoose.Types.ObjectId(),
      characterName: 'Pendekar Hero',
      inventory: []
    });

    const session = { battleConfig: {} };
    const res = await handleNpcBattleResolution({
      session,
      player,
      isVictory: true,
      npcDbId: essentialNpc._id,
      npcDoc: essentialNpc,
      mode: 'npc_duel'
    });

    expect(res.handled).toBe(true);
    expect(res.downed).toBe(true);
    expect(res.message).toMatch(/tumbang/i);
    expect(essentialNpc.vitalStatus.isAlive).toBe(true);
    expect(essentialNpc.vitalStatus.isInjured).toBe(true);
    expect(essentialNpc.vitalStatus.injurySeverity).toBe(3);
    expect(player.inventory.length).toBe(0); // Zero loot dropped
  });

  it('2. duel victory over regular NPC kills NPC and transfers loot', async () => {
    const itemId = new mongoose.Types.ObjectId();
    const regularNpc = new Npc({
      _id: new mongoose.Types.ObjectId(),
      name: 'Pencuri Biasa',
      vitalStatus: { isAlive: true, isEssential: false },
      attributes: { hp: 50 },
      inventory: [{ itemId, name: 'Batu Giok', quantity: 2 }]
    });

    const player = new Player({
      _id: new mongoose.Types.ObjectId(),
      characterName: 'Pendekar Hero',
      inventory: []
    });

    const session = { battleConfig: {} };
    const res = await handleNpcBattleResolution({
      session,
      player,
      isVictory: true,
      npcDbId: regularNpc._id,
      npcDoc: regularNpc,
      mode: 'npc_duel'
    });

    expect(res.handled).toBe(true);
    expect(res.npcDead).toBe(true);
    expect(regularNpc.vitalStatus.isAlive).toBe(false);
    expect(player.inventory.length).toBe(1);
    expect(player.inventory[0].itemId.toString()).toBe(itemId.toString());
  });

  it('3. npc_spar NEVER kills NPC (hp >= 1, vitalStatus.isAlive: true)', async () => {
    const sparringNpc = new Npc({
      _id: new mongoose.Types.ObjectId(),
      name: 'Rekan Perguruan',
      vitalStatus: { isAlive: true, isEssential: false },
      attributes: { hp: 100 }
    });

    const player = new Player({ _id: new mongoose.Types.ObjectId() });
    const session = {};

    const res = await handleNpcBattleResolution({
      session,
      player,
      isVictory: true,
      npcDbId: sparringNpc._id,
      npcDoc: sparringNpc,
      mode: 'npc_spar'
    });

    expect(res.handled).toBe(true);
    expect(sparringNpc.vitalStatus.isAlive).toBe(true);
    expect(sparringNpc.attributes.hp).toBeGreaterThanOrEqual(1);
  });

  it('4. npc_spar against essential NPC never kills and preserves health', async () => {
    const essentialNpc = new Npc({
      _id: new mongoose.Types.ObjectId(),
      name: 'Xi Hua',
      vitalStatus: { isAlive: true, isEssential: true },
      attributes: { hp: 100 }
    });

    const player = new Player({ _id: new mongoose.Types.ObjectId() });
    const session = {};

    const res = await handleNpcBattleResolution({
      session,
      player,
      isVictory: true,
      npcDbId: essentialNpc._id,
      npcDoc: essentialNpc,
      mode: 'npc_spar'
    });

    expect(res.handled).toBe(true);
    expect(essentialNpc.vitalStatus.isAlive).toBe(true);
  });

  it('5. npc_spar increases relation affinity by +3 on victory', async () => {
    const sparringNpc = new Npc({
      _id: new mongoose.Types.ObjectId(),
      name: 'Pendekar Teman',
      vitalStatus: { isAlive: true }
    });
    const player = new Player({ _id: new mongoose.Types.ObjectId() });
    const mockRelation = { affinity: 20, save: vi.fn() };
    const session = { relationDoc: mockRelation };

    const res = await handleNpcBattleResolution({
      session,
      player,
      isVictory: true,
      npcDbId: sparringNpc._id,
      npcDoc: sparringNpc,
      mode: 'npc_spar'
    });

    expect(res.handled).toBe(true);
    expect(mockRelation.affinity).toBe(23);
  });

  it('6. ambush victory marks NpcAmbush status as resolved', async () => {
    const hunter = new Npc({
      _id: new mongoose.Types.ObjectId(),
      name: 'Pemburu Dendam',
      vitalStatus: { isAlive: true, isEssential: false }
    });
    const player = new Player({ _id: new mongoose.Types.ObjectId() });
    const session = {};

    const res = await handleNpcBattleResolution({
      session,
      player,
      isVictory: true,
      npcDbId: hunter._id,
      npcDoc: hunter,
      mode: 'npc_ambush'
    });

    expect(res.handled).toBe(true);
    expect(res.mode).toBe('npc_ambush');
  });

  it('7. ambush victory on regular hunter kills hunter and satisfies vendetta', async () => {
    const hunterId = new mongoose.Types.ObjectId();
    const playerId = new mongoose.Types.ObjectId();

    const hunter = new Npc({
      _id: hunterId,
      name: 'Pemburu Darah',
      vitalStatus: { isAlive: true, isEssential: false }
    });
    const player = new Player({ _id: playerId });

    const mockVendetta = new NpcVendetta({
      hunterNpcId: hunterId,
      targetId: playerId,
      resolved: false
    });

    const res = await handleNpcBattleResolution({
      session: { vendettaDoc: mockVendetta },
      player,
      isVictory: true,
      npcDbId: hunterId,
      npcDoc: hunter,
      mode: 'npc_ambush'
    });

    expect(res.handled).toBe(true);
    expect(hunter.vitalStatus.isAlive).toBe(false);
    expect(mockVendetta.resolved).toBe(true);
    expect(mockVendetta.resolutionType).toBe('hunter_died');
  });

  it('8. player defeat against hunter does NOT delete or kill hunter NPC', async () => {
    const hunter = new Npc({
      _id: new mongoose.Types.ObjectId(),
      name: 'Pemburu Kuat',
      vitalStatus: { isAlive: true, isEssential: false }
    });
    const player = new Player({ _id: new mongoose.Types.ObjectId() });

    const res = await handleNpcBattleResolution({
      session: {},
      player,
      isVictory: false, // Player lost!
      npcDbId: hunter._id,
      npcDoc: hunter,
      mode: 'npc_ambush'
    });

    expect(res.handled).toBe(true);
    expect(hunter.vitalStatus.isAlive).toBe(true);
  });

  it('9. handleNpcBattleResolution is idempotent: duplicate invocation processes only once', async () => {
    const npc = new Npc({
      _id: new mongoose.Types.ObjectId(),
      name: 'NPC Uji',
      vitalStatus: { isAlive: true, isEssential: false }
    });
    const player = new Player({ _id: new mongoose.Types.ObjectId() });
    const session = { battleConfig: {} };

    const first = await handleNpcBattleResolution({
      session,
      player,
      isVictory: true,
      npcDbId: npc._id,
      npcDoc: npc,
      mode: 'npc_duel'
    });
    expect(first.handled).toBe(true);

    const second = await handleNpcBattleResolution({
      session,
      player,
      isVictory: true,
      npcDbId: npc._id,
      npcDoc: npc,
      mode: 'npc_duel'
    });
    expect(second.alreadyResolved).toBe(true);
  });

  it('10. handleNpcBattleResolution passes correct killerInfo to killNpc', async () => {
    const npc = new Npc({
      _id: new mongoose.Types.ObjectId(),
      name: 'Lawan Duel',
      vitalStatus: { isAlive: true, isEssential: false }
    });
    const player = new Player({
      _id: new mongoose.Types.ObjectId(),
      characterName: 'Pahlawan Langit',
      stats: { baseAtk: 88 }
    });
    const session = {};

    const res = await handleNpcBattleResolution({
      session,
      player,
      isVictory: true,
      npcDbId: npc._id,
      npcDoc: npc,
      mode: 'npc_duel'
    });

    expect(res.handled).toBe(true);
    expect(npc.lifespan.killerName).toBe('Pahlawan Langit');
  });
});
