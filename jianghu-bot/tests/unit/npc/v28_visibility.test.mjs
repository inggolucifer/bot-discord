import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import Npc from '../../../models/Npc.js';
import Player from '../../../models/Player.js';
import NpcPlayerRelation from '../../../models/NpcPlayerRelation.js';
import { buildVisibleProfile } from '../../../services/npcVisibility.js';

describe('NPC Whitelisted Visible Profile & Cultivation Fog (V28 / A5)', () => {
  it('masks realm as "Tak Terduga" and hides combat stats for realm diff > 2 when insight < 25', () => {
    const player = new Player({
      discordId: '123456789',
      extendedStats: { insight: 10 },
      systemCultivation: { realm: 'Fondasi Fana (Mortal Foundation)' }
    });
    const npc = new Npc({
      name: 'Tetua Agung Shen',
      cultivation: { realmIndex: 5, stage: 3 },
      stats: { baseAtk: 500, baseDef: 350 },
      extendedStats: { critRate: 20 }
    });
    const relation = new NpcPlayerRelation({
      playerId: player._id,
      npcId: npc._id,
      affinity: 0
    });

    const profile = buildVisibleProfile(npc, player, relation);

    expect(profile.cultivation.realm).toBe('Tak Terduga');
    expect(profile.cultivation.stage).toBeNull();
    expect(profile.stats.combat).toBeNull();
  });

  it('reveals true realm and combat stats when player insight >= 35', () => {
    const player = new Player({
      discordId: '123456789',
      extendedStats: { insight: 35 },
      systemCultivation: { realm: 'Fondasi Fana (Mortal Foundation)' }
    });
    const npc = new Npc({
      name: 'Tetua Agung Shen',
      cultivation: { realmIndex: 5, stage: 3 },
      attributes: { attack: 500, defense: 350 }
    });
    const relation = new NpcPlayerRelation({
      playerId: player._id,
      npcId: npc._id,
      affinity: 0
    });

    const profile = buildVisibleProfile(npc, player, relation);

    expect(profile.cultivation.realm).not.toBe('Tak Terduga');
    expect(profile.cultivation.stage).toBe(3);
    expect(profile.stats.combat).not.toBeNull();
    expect(profile.stats.combat.atk).toBe(500);
  });

  it('does not leak unequipped backpack inventory items to strangers (affinity 0, insight 10)', () => {
    const player = new Player({
      discordId: '123456789',
      extendedStats: { insight: 10 }
    });
    const npc = new Npc({
      name: 'Pendekar Rahasia',
      inventory: [
        {
          itemId: new mongoose.Types.ObjectId(),
          name: 'Pedang Azure',
          category: 'weapon',
          equippedSlot: 'weapon',
          quantity: 1
        },
        {
          itemId: new mongoose.Types.ObjectId(),
          name: 'Kitab Terlarang Abyssal',
          category: 'manual',
          equippedSlot: null, // In backpack
          quantity: 1
        }
      ]
    });
    const relation = new NpcPlayerRelation({
      playerId: player._id,
      npcId: npc._id,
      affinity: 0
    });

    const profile = buildVisibleProfile(npc, player, relation);

    expect(profile.inventory.length).toBe(1);
    expect(profile.inventory[0].name).toBe('Pedang Azure');
    expect(profile.inventory.some(i => i.name === 'Kitab Terlarang Abyssal')).toBe(false);
  });

  it('strictly excludes sensitive internal fields (schedule, targetDestination, raw family IDs)', () => {
    const player = new Player({ discordId: '123456789', extendedStats: { insight: 15 } });
    const npc = new Npc({
      name: 'Warga Biasa',
      schedule: {
        targetDestination: { x: 500, y: 500 },
        activityState: 'traveling'
      },
      social: {
        familyId: new mongoose.Types.ObjectId()
      }
    });
    const relation = new NpcPlayerRelation({ playerId: player._id, npcId: npc._id, affinity: 10 });

    const profile = buildVisibleProfile(npc, player, relation);

    expect(profile.schedule).toBeUndefined();
    expect(profile.targetDestination).toBeUndefined();
    expect(profile.social?.familyId).toBeUndefined();
  });
});
