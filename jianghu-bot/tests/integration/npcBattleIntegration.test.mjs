import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import Npc from '../../models/Npc.js';
import Player from '../../models/Player.js';
import NpcPlayerRelation from '../../models/NpcPlayerRelation.js';
import {
  convertNpcToBattleEnemy,
  convertNpcToBattleAlly,
  handleNpcBattleResolution
} from '../../services/npcCombatAdapter.js';
import { generateDeterministicNpc } from '../../services/npcGenerator.js';

describe('V27 Living NPC Battle Integration Suite', () => {
  it('converts Living NPC into fully compliant enemy for BattleArena', () => {
    const npcDoc = generateDeterministicNpc({
      name: 'Ouyang Feng',
      role: 'cultivator',
      targetRealmIndex: 2,
      targetStage: 5
    }, 'seed_ouyang_battle');
    const npc = new Npc(npcDoc);
    npc._id = new mongoose.Types.ObjectId();

    const enemy = convertNpcToBattleEnemy(npc, 'npc_spar');

    expect(enemy.id).toBe(`npc_${npc._id}`);
    expect(enemy.name).toBe('Ouyang Feng');
    expect(enemy.hp).toBe(npc.attributes.hp);
    expect(enemy.attack).toBe(npc.attributes.attack);
    expect(enemy.defense).toBe(npc.attributes.defense);
    expect(enemy.speed).toBe(npc.attributes.agility);
    expect(enemy.skills.length).toBeGreaterThanOrEqual(2);
    expect(enemy.tags).toContain('living_npc');
    expect(enemy.tags).toContain('npc_spar');
    expect(enemy.category).toBe('npc_cultivator');
  });

  it('converts Living NPC into compliant companion ally', () => {
    const npcDoc = generateDeterministicNpc({ name: 'Huang Rong' }, 'seed_huang_rong');
    const npc = new Npc(npcDoc);
    npc._id = new mongoose.Types.ObjectId();

    const ally = convertNpcToBattleAlly(npc);

    expect(ally.entityId).toBe(`ally_npc_${npc._id}`);
    expect(ally.entityType).toBe('npc_companion');
    expect(ally.name).toBe('Huang Rong');
    expect(ally.attack).toBe(npc.attributes.attack);
  });

  it('handleNpcBattleResolution spar mode increases affinity non-lethally', async () => {
    const playerId = new mongoose.Types.ObjectId();
    const npcId = new mongoose.Types.ObjectId();

    const player = new Player({ _id: playerId, characterName: 'Pendekar Penguji' });
    const npc = new Npc(generateDeterministicNpc({ name: 'Guru Spar' }, 'seed_spar'));
    npc._id = npcId;

    const relation = new NpcPlayerRelation({
      playerId,
      npcId,
      affinity: 10
    });

    const origNpcFindById = Npc.findById;
    const origRelFindOne = NpcPlayerRelation.findOne;

    Npc.findById = async () => npc;
    NpcPlayerRelation.findOne = async () => relation;
    relation.save = async () => relation;

    try {
      const res = await handleNpcBattleResolution({
        session: { enemies: [{ npcDbId: npcId.toString() }] },
        player,
        isVictory: true,
        npcDbId: npcId.toString(),
        mode: 'npc_spar'
      });

      expect(res.handled).toBe(true);
      expect(res.mode).toBe('npc_spar');
      expect(relation.affinity).toBe(13); // 10 + 3
      expect(npc.vitalStatus.isAlive).toBe(true); // NOT dead!
    } finally {
      Npc.findById = origNpcFindById;
      NpcPlayerRelation.findOne = origRelFindOne;
    }
  });

  it('handleNpcBattleResolution duel mode triggers lethal killNpc and increases wanted level in settlement', async () => {
    const playerId = new mongoose.Types.ObjectId();
    const npcId = new mongoose.Types.ObjectId();

    const player = new Player({
      _id: playerId,
      characterName: 'Pendekar Pedang',
      wantedLevel: 0,
      inventory: []
    });

    const npc = new Npc(generateDeterministicNpc({
      name: 'Musuh Bebuyutan',
      inventory: [{ itemId: new mongoose.Types.ObjectId(), name: 'Pedang Pusaka', quantity: 1 }]
    }, 'seed_duel_lethal'));
    npc._id = npcId;

    const origNpcFindById = Npc.findById;
    const origRelFindOne = NpcPlayerRelation.findOne;
    Npc.findById = async () => npc;
    NpcPlayerRelation.findOne = async () => null;
    npc.save = async () => npc;
    player.save = async () => player;

    try {
      const session = {
        battleConfig: { isSettlement: true, settlementName: 'Kota Canghai' },
        enemies: [{ npcDbId: npcId.toString() }]
      };

      const res = await handleNpcBattleResolution({
        session,
        player,
        isVictory: true,
        npcDbId: npcId.toString(),
        mode: 'npc_duel'
      });

      expect(res.handled).toBe(true);
      expect(res.isLethal).toBe(true);
      expect(res.npcDead).toBe(true);
      expect(npc.vitalStatus.isAlive).toBe(false); // DEAD!
      expect(res.wantedIncrease).toBe(2);
      expect(player.wantedLevel).toBe(2);
      expect(player.inventory.length).toBe(1); // looted sword
    } finally {
      Npc.findById = origNpcFindById;
      NpcPlayerRelation.findOne = origRelFindOne;
    }
  });
});
