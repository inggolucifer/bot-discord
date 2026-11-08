import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import Npc from '../../../models/Npc.js';
import Player from '../../../models/Player.js';
import NpcPlayerRelation from '../../../models/NpcPlayerRelation.js';
import { evaluateAction } from '../../../services/npcActions.js';

describe('Server-Authoritative Safe NPC Actions (V28 / A4)', () => {
  it('schema integrity: persists new fields in toObject() without silent drop', () => {
    const npc = new Npc({ name: 'Pedagang Zhang', tradeCoins: 75 });
    expect(npc.toObject().tradeCoins).toBe(75);

    const player = new Player({
      discordId: '112233445566778899',
      npcDaily: { stealCount: 3, date: '2026-11-09' }
    });
    expect(player.toObject().npcDaily?.stealCount).toBe(3);

    const relation = new NpcPlayerRelation({
      playerId: new mongoose.Types.ObjectId(),
      npcId: new mongoose.Types.ObjectId(),
      dailyLimits: { steal: 2, threaten: 1, date: '2026-11-09' }
    });
    expect(relation.toObject().dailyLimits?.steal).toBe(2);
  });

  it('steal: fails when NPC has 0 tradeCoins and no valuable inventory (no free money from thin air)', () => {
    const player = new Player({
      discordId: '112233445566778899',
      extendedStats: { agility: 50 },
      currency: { copper: 100 }
    });
    const npc = new Npc({
      name: 'Pengemis Ding',
      tradeCoins: 0,
      inventory: []
    });
    const relation = new NpcPlayerRelation({
      playerId: player._id,
      npcId: npc._id,
      affinity: 0
    });

    const res = evaluateAction('steal', {
      player,
      npc,
      relation,
      payload: {},
      rng: () => 0.01 // High roll / success roll
    });

    expect(res.success).toBe(false);
    expect(res.message).toMatch(/tidak membawa|kosong/i);
    expect(player.currency.copper).toBe(100);
  });

  it('threaten: fails against higher realm cultivator, inflicts -15 HP backlash to player', () => {
    const player = new Player({
      discordId: '112233445566778899',
      systemCultivation: { realm: 'Mortal' },
      stats: { baseHp: 100, baseAtk: 25 },
      hp: 100
    });
    const npc = new Npc({
      name: 'Tetua Bai',
      cultivation: { realmIndex: 3, stage: 5 }, // Jin Dan / Golden Core
      stats: { baseAtk: 150 }
    });
    const relation = new NpcPlayerRelation({
      playerId: player._id,
      npcId: npc._id,
      affinity: 0
    });

    const res = evaluateAction('threaten', {
      player,
      npc,
      relation,
      payload: {},
      rng: () => 0.5
    });

    expect(res.success).toBe(false);
    expect(player.hp).toBe(85); // 100 - 15 = 85
    expect(relation.affinity).toBeLessThanOrEqual(-40);
  });

  it('gift: strictly rejects when payload.itemId is missing (error 400)', () => {
    const player = new Player({
      discordId: '112233445566778899',
      inventory: [{ itemId: new mongoose.Types.ObjectId(), quantity: 1 }]
    });
    const npc = new Npc({ name: 'Gadis Li' });
    const relation = new NpcPlayerRelation({ playerId: player._id, npcId: npc._id });

    const res = evaluateAction('gift', {
      player,
      npc,
      relation,
      payload: {}, // Missing itemId
      rng: () => 0.5
    });

    expect(res.success).toBe(false);
    expect(res.status).toBe(400);
    expect(res.message).toMatch(/itemId/i);
    // Crucial check: does not touch first inventory item
    expect(player.inventory.length).toBe(1);
  });

  it('request_favor: on success, transfers an authentic item from NPC to Player inventory', () => {
    const sampleItemId = new mongoose.Types.ObjectId();
    const player = new Player({
      discordId: '112233445566778899',
      inventory: []
    });
    const npc = new Npc({
      name: 'Sahabat Wang',
      inventory: [
        { itemId: sampleItemId, name: 'Pil Pemulih Qi', category: 'pill', quantity: 2, qualityTier: 'common' }
      ]
    });
    const relation = new NpcPlayerRelation({
      playerId: player._id,
      npcId: npc._id,
      affinity: 70
    });

    const res = evaluateAction('request_favor', {
      player,
      npc,
      relation,
      payload: {},
      rng: () => 0.1 // Success
    });

    expect(res.success).toBe(true);
    // Transferred item must be in player inventory
    expect(player.inventory.length).toBe(1);
    expect(player.inventory[0].itemId.toString()).toBe(sampleItemId.toString());
    expect(player.inventory[0].quantity).toBe(1);
    // NPC inventory must have decreased
    expect(npc.inventory[0].quantity).toBe(1);
  });
});
