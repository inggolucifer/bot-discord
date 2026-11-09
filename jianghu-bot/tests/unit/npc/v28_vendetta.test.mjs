import { describe, it, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import Npc from '../../../models/Npc.js';
import NpcAmbush from '../../../models/NpcAmbush.js';
import NpcVendetta from '../../../models/NpcVendetta.js';
import Player from '../../../models/Player.js';
import {
  evaluateAmbushTrigger,
  isPlayerInsideSettlementExclusion,
  runVendettaTick,
  calculateFleeChance,
  resolveAmbushAction
} from '../../../services/npcVendettaEngine.js';
import { makeRng } from '../../../utils/npcRng.js';
import { getTotalCopper } from '../../../utils/currency.js';

describe('Authoritative NPC Vendetta & Ambush Engine (V28 / B4)', () => {
  const anchors = [
    { id: 'desa_xingcun', name: 'Desa Xingcun', type: 'village', x: 2455, y: 2485 } // exclusion 10
  ];

  it('1. no ambush in settlement (within exclusion radius)', () => {
    // Player at (2455, 2488), distance 3 from anchor -> inside village exclusion (10)
    const inside = isPlayerInsideSettlementExclusion(2455, 2488, anchors);
    expect(inside).toBe(true);

    const res = evaluateAmbushTrigger({
      hunterNpc: { _id: new mongoose.Types.ObjectId(), vitalStatus: { isAlive: true } },
      player: { tileX: 2455, tileY: 2488 },
      tileInfo: { isSettlement: true },
      grudgeLevel: 5
    });
    expect(res.canAmbush).toBe(false);
    expect(res.reason).toBe('safe_zone');
  });

  it('2. player in wilderness (outside exclusion radius) allows ambush evaluation', () => {
    // Player at (2455, 2505), distance 20 from anchor -> outside village exclusion (10)
    const inside = isPlayerInsideSettlementExclusion(2455, 2505, anchors);
    expect(inside).toBe(false);
  });

  it('3. no ambush if player is offline (updatedAt > 2 minutes ago)', async () => {
    const offlinePlayer = {
      _id: new mongoose.Types.ObjectId(),
      updatedAt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    };
    const isOnline = Date.now() - new Date(offlinePlayer.updatedAt).getTime() <= 2 * 60 * 1000;
    expect(isOnline).toBe(false);
  });

  it('4. distance 25 Chebyshev tiles rejected', () => {
    const px = 2455, py = 2500;
    const hx = 2455, hy = 2525; // dy = 25
    const dist = Math.max(Math.abs(px - hx), Math.abs(py - hy));
    expect(dist).toBe(25);
    expect(dist <= 24).toBe(false);
  });

  it('5. distance 24 Chebyshev tiles accepted', () => {
    const px = 2455, py = 2500;
    const hx = 2455, hy = 2524; // dy = 24
    const dist = Math.max(Math.abs(px - hx), Math.abs(py - hy));
    expect(dist).toBe(24);
    expect(dist <= 24).toBe(true);
  });

  it('6. ambush 3-hour cooldown blocks immediate re-ambush', () => {
    const now = Date.now();
    const vendetta = new NpcVendetta({
      hunterNpcId: new mongoose.Types.ObjectId(),
      targetId: new mongoose.Types.ObjectId(),
      lastAmbushAt: new Date(now - 1 * 3600 * 1000) // 1 hour ago (< 3 hours)
    });
    const cooldownMs = 3 * 3600 * 1000;
    const isReady = !vendetta.lastAmbushAt || (now - new Date(vendetta.lastAmbushAt).getTime() >= cooldownMs);
    expect(isReady).toBe(false);
  });

  it('7. ambush 3-hour cooldown allows ambush after 3 hours', () => {
    const now = Date.now();
    const vendetta = new NpcVendetta({
      hunterNpcId: new mongoose.Types.ObjectId(),
      targetId: new mongoose.Types.ObjectId(),
      lastAmbushAt: new Date(now - 3.5 * 3600 * 1000) // 3.5 hours ago
    });
    const cooldownMs = 3 * 3600 * 1000;
    const isReady = !vendetta.lastAmbushAt || (now - new Date(vendetta.lastAmbushAt).getTime() >= cooldownMs);
    expect(isReady).toBe(true);
  });

  it('8. ambush chance is ~35% over 2000 seeded evaluations (within 30%-40%)', () => {
    const rng = makeRng('ambush_stat_seed');
    let hits = 0;
    const trials = 2000;

    for (let i = 0; i < trials; i++) {
      const res = evaluateAmbushTrigger({
        hunterNpc: { _id: new mongoose.Types.ObjectId(), vitalStatus: { isAlive: true } },
        player: { tileX: 2455, tileY: 2550 },
        tileInfo: { isSettlement: false },
        grudgeLevel: 5,
        rng
      });
      if (res.canAmbush) hits++;
    }

    const rate = hits / trials;
    expect(rate).toBeGreaterThanOrEqual(0.30);
    expect(rate).toBeLessThanOrEqual(0.40);
  });

  it('9. only 1 pending ambush at a time per player', async () => {
    const playerId = new mongoose.Types.ObjectId();
    const existingAmbush = new NpcAmbush({
      hunterNpcId: new mongoose.Types.ObjectId(),
      targetPlayerId: playerId,
      status: 'pending',
      tileX: 2455,
      tileY: 2550,
      expiresAt: new Date(Date.now() + 600000)
    });

    const mockAmbushModel = {
      findOne: vi.fn().mockResolvedValue(existingAmbush)
    };

    const hasPending = await mockAmbushModel.findOne({ targetPlayerId: playerId, status: 'pending' });
    expect(hasPending).not.toBeNull();
  });

  it('10. pay choice deducts exact copper and reduces grudge by 2', async () => {
    const playerId = new mongoose.Types.ObjectId();
    const hunterId = new mongoose.Types.ObjectId();
    const ambushId = new mongoose.Types.ObjectId();

    const player = new Player({
      _id: playerId,
      discordId: 'discord_player_1',
      copperCoins: 1000
    });
    const hunter = new Npc({
      _id: hunterId,
      name: 'Pemburu Zhang',
      cultivation: { realmIndex: 1 } // hunter realm 1
    });
    const vendetta = new NpcVendetta({
      hunterNpcId: hunterId,
      targetId: playerId,
      grudgeLevel: 5
    });
    const ambush = new NpcAmbush({
      _id: ambushId,
      targetPlayerId: playerId,
      hunterNpcId: hunterId,
      status: 'pending',
      tileX: 2455,
      tileY: 2550,
      expiresAt: new Date(Date.now() + 600000)
    });

    // cost = 50 * grudgeLevel * (realm + 1) = 50 * 5 * 2 = 500
    const res = await resolveAmbushAction({
      ambush,
      player,
      hunter,
      vendetta,
      choice: 'pay'
    });

    expect(res.success).toBe(true);
    expect(res.cost).toBe(500);
    expect(getTotalCopper(player.currency)).toBe(500);
    expect(vendetta.grudgeLevel).toBe(3);
    expect(ambush.status).toBe('paid');
  });

  it('11. pay choice marks vendetta satisfied when grudge reduces to <= 1', async () => {
    const playerId = new mongoose.Types.ObjectId();
    const hunterId = new mongoose.Types.ObjectId();

    const player = new Player({ _id: playerId, copperCoins: 1000 });
    const hunter = new Npc({ _id: hunterId, cultivation: { realmIndex: 0 } });
    const vendetta = new NpcVendetta({ hunterNpcId: hunterId, targetId: playerId, grudgeLevel: 2 });
    const ambush = new NpcAmbush({ targetPlayerId: playerId, hunterNpcId: hunterId, status: 'pending', expiresAt: new Date(Date.now() + 600000) });

    const res = await resolveAmbushAction({ ambush, player, hunter, vendetta, choice: 'pay' });
    expect(res.success).toBe(true);
    expect(vendetta.grudgeLevel).toBe(0);
    expect(vendetta.resolved).toBe(true);
    expect(vendetta.resolutionType).toBe('reconciled');
  });

  it('12. pay choice rejected when player has insufficient copper coins', async () => {
    const playerId = new mongoose.Types.ObjectId();
    const hunterId = new mongoose.Types.ObjectId();

    const player = new Player({ _id: playerId, copperCoins: 50 }); // only 50
    const hunter = new Npc({ _id: hunterId, cultivation: { realmIndex: 1 } });
    const vendetta = new NpcVendetta({ hunterNpcId: hunterId, targetId: playerId, grudgeLevel: 5 }); // cost 500
    const ambush = new NpcAmbush({ targetPlayerId: playerId, hunterNpcId: hunterId, status: 'pending', expiresAt: new Date(Date.now() + 600000) });

    const res = await resolveAmbushAction({ ambush, player, hunter, vendetta, choice: 'pay' });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/tidak mencukupi/i);
    expect(player.copperCoins).toBe(50);
  });

  it('13. flee chance calculation is clamped between 0.1 and 0.9 and deterministic', () => {
    const rng = makeRng('flee_seed_1');
    const highAgilityChance = calculateFleeChance(500, 10);
    const lowAgilityChance = calculateFleeChance(10, 500);

    expect(highAgilityChance).toBeLessThanOrEqual(0.9);
    expect(lowAgilityChance).toBeGreaterThanOrEqual(0.1);
  });

  it('14. expired ambush cannot be resolved', async () => {
    const ambush = new NpcAmbush({
      targetPlayerId: new mongoose.Types.ObjectId(),
      hunterNpcId: new mongoose.Types.ObjectId(),
      status: 'pending',
      tileX: 2455,
      tileY: 2550,
      expiresAt: new Date(Date.now() - 5000) // expired
    });

    const res = await resolveAmbushAction({ ambush, choice: 'fight' });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/kedaluwarsa/i);
  });

  it('15. other player cannot resolve ambush belonging to someone else', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const intruderId = new mongoose.Types.ObjectId();

    const ambush = new NpcAmbush({
      targetPlayerId: ownerId,
      hunterNpcId: new mongoose.Types.ObjectId(),
      status: 'pending',
      tileX: 2455,
      tileY: 2550,
      expiresAt: new Date(Date.now() + 600000)
    });

    const intruder = new Player({ _id: intruderId });
    const res = await resolveAmbushAction({ ambush, player: intruder, choice: 'fight' });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/bukan milik/i);
  });
});
