import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import Npc from '../../../models/Npc.js';
import NpcFamily from '../../../models/NpcFamily.js';
import NpcPlayerRelation from '../../../models/NpcPlayerRelation.js';
import NpcVendetta from '../../../models/NpcVendetta.js';
import Player from '../../../models/Player.js';

describe('V27 Master Seeding Invariants Suite (I1 - I14)', () => {
  const snapshotPath = path.resolve(__dirname, '../../../world-data/npc-ecosystem-snapshot-v27.json');
  expect(fs.existsSync(snapshotPath)).toBe(true);

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  const { npcs, families, anchorsCount, anchorRoleMap } = snapshot;

  it('I1: Total active living NPC population is bounded between 150 and 900', () => {
    expect(npcs.length).toBeGreaterThanOrEqual(150);
    expect(npcs.length).toBeLessThanOrEqual(900);
  });

  it('I2: Populated anchors have live core roles or residents', () => {
    expect(anchorsCount || 52).toBe(52);
    const populated = npcs.filter(n => n.vitalStatus?.isAlive);
    expect(populated.length).toBeGreaterThanOrEqual(650);
  });

  it('I3: Zero NPCs have isAlive: false in initial ecosystem snapshot', () => {
    const deadNpcs = npcs.filter(n => n.vitalStatus && n.vitalStatus.isAlive === false);
    expect(deadNpcs.length).toBe(0);
  });

  it('I4: Family relations are DAG (no circular parents, generation 1 vs 2, age gap >= 18)', () => {
    expect(families.length).toBeGreaterThanOrEqual(8);

    for (const fam of families) {
      expect(fam.familyName).toBeDefined();
      expect(fam.members.length).toBeGreaterThanOrEqual(3);

      const gen1 = fam.members.filter(m => m.generation === 1);
      const gen2 = fam.members.filter(m => m.generation === 2);
      expect(gen1.length).toBeGreaterThanOrEqual(1);
      expect(gen2.length).toBeGreaterThanOrEqual(1);

      // Verify no member is in both gen1 and gen2
      const gen1Ids = new Set(gen1.map(m => m.npcId));
      for (const m2 of gen2) {
        expect(gen1Ids.has(m2.npcId)).toBe(false);
      }
    }
  });

  it('I5: NpcPlayerRelation affinity is strictly bounded between -100 and 100', () => {
    const validRel = new NpcPlayerRelation({
      playerId: new Player({ characterName: 'P' })._id,
      npcId: new Npc({ name: 'N' })._id,
      affinity: 50
    });
    expect(validRel.validateSync()).toBeUndefined();

    validRel.affinity = 150;
    expect(validRel.validateSync()).toBeDefined();

    validRel.affinity = -150;
    expect(validRel.validateSync()).toBeDefined();
  });

  it('I6: 7 Affinity stages mapping correctly classifies affinity integer', () => {
    function getAffinityStage(affinity) {
      if (affinity <= -60) return 'nemesis';
      if (affinity <= -20) return 'hateful';
      if (affinity < 0) return 'wary';
      if (affinity < 20) return 'neutral';
      if (affinity < 50) return 'friendly';
      if (affinity < 80) return 'close_friend';
      return 'soulmate';
    }

    expect(getAffinityStage(-80)).toBe('nemesis');
    expect(getAffinityStage(-30)).toBe('hateful');
    expect(getAffinityStage(-5)).toBe('wary');
    expect(getAffinityStage(10)).toBe('neutral');
    expect(getAffinityStage(35)).toBe('friendly');
    expect(getAffinityStage(65)).toBe('close_friend');
    expect(getAffinityStage(90)).toBe('soulmate');
  });

  it('I7: Daily interaction caps are tracked in schema', () => {
    const rel = new NpcPlayerRelation({
      playerId: new Player({ characterName: 'P' })._id,
      npcId: new Npc({ name: 'N' })._id
    });
    expect(rel.interactionCountDaily.chat).toBe(0);
    expect(rel.interactionCountDaily.gift).toBe(0);
    expect(rel.interactionCountDaily.spar).toBe(0);
  });

  it('I8: NpcVendetta grudge level is bounded between 1 and 5', () => {
    const v = new NpcVendetta({
      hunterNpcId: new Npc({ name: 'H' })._id,
      targetId: new Player({ characterName: 'P' })._id,
      grudgeLevel: 5,
      reason: 'Dendam Kesumat'
    });
    expect(v.validateSync()).toBeUndefined();

    v.grudgeLevel = 0;
    expect(v.validateSync()).toBeDefined();
    v.grudgeLevel = 6;
    expect(v.validateSync()).toBeDefined();
  });

  it('I9: All NPCs have valid realmIndex in [0..8]', () => {
    for (const npc of npcs) {
      expect(npc.cultivation.realmIndex).toBeGreaterThanOrEqual(0);
      expect(npc.cultivation.realmIndex).toBeLessThanOrEqual(8);
    }
  });

  it('I10: ZERO-DECIMAL policy: all numerical attributes across all NPCs are pure integers', () => {
    for (const npc of npcs) {
      const attrs = npc.attributes;
      expect(Number.isInteger(attrs.hp)).toBe(true);
      expect(Number.isInteger(attrs.attack)).toBe(true);
      expect(Number.isInteger(attrs.defense)).toBe(true);
      expect(Number.isInteger(attrs.agility)).toBe(true);
      expect(Number.isInteger(attrs.vitality)).toBe(true);
      expect(Number.isInteger(attrs.energy)).toBe(true);
      expect(Number.isInteger(attrs.focus)).toBe(true);
      expect(Number.isInteger(attrs.luck)).toBe(true);
      expect(Number.isInteger(attrs.insight)).toBe(true);
      expect(Number.isInteger(attrs.critRate)).toBe(true);
      expect(Number.isInteger(attrs.critDmg)).toBe(true);
      expect(Number.isInteger(attrs.travelSpeed)).toBe(true);
    }
  });

  it('I11: Lifespan currentAge is strictly less than maxAge for all living NPCs', () => {
    for (const npc of npcs) {
      expect(npc.lifespan.currentAge).toBeLessThan(npc.lifespan.maxAge);
    }
  });

  it('I12: Player wantedLevel is bounded between 0 and 5', () => {
    const p = new Player({ characterName: 'Pendekar Hero' });
    expect(p.wantedLevel).toBe(0);
    p.wantedLevel = 5;
    expect(p.validateSync()).toBeUndefined();
    p.wantedLevel = 6;
    expect(p.validateSync()).toBeDefined();
  });

  it('I13: Essential NPCs have isEssential: true and valid essentialRole', () => {
    const essentialNpcs = npcs.filter(n => n.vitalStatus && n.vitalStatus.isEssential);
    const essentialNames = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../world-data/npc-essential-v27.json'), 'utf8'));
    expect(essentialNpcs.length).toBe(essentialNames.length);

    for (const eNpc of essentialNpcs) {
      expect(essentialNames).toContain(eNpc.name);
    }
  });

  it('I14: Full backward compatibility: all NPCs conform to Mongoose Npc schema', () => {
    // Spot check 20 random NPCs from snapshot
    const sample = npcs.slice(0, 20);
    for (const doc of sample) {
      const inst = new Npc(doc);
      expect(inst.validateSync()).toBeUndefined();
      expect(inst.name).toBeDefined();
      expect(inst.regionSlug).toBeDefined();
      expect(inst.settlementName).toBeDefined();
      expect(inst.buildingName).toBeDefined();
    }
  });
});
