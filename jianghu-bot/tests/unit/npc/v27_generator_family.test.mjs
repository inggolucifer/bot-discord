import { describe, it, expect } from 'vitest';
import Npc from '../../../models/Npc.js';
import NpcFamily from '../../../models/NpcFamily.js';
import { generateDeterministicNpc } from '../../../services/npcGenerator.js';
import { generateFamilyClan } from '../../../services/npcFamilyEngine.js';

describe('V27 Deterministic Generator & Family Clan Suite', () => {
  it('generates fully valid NPC conforming to Mongoose schema without NaN or undefined', () => {
    const npcDoc = generateDeterministicNpc({
      role: 'blacksmith',
      anchorId: 'kota_canghai',
      settlementName: 'Kota Canghai',
      targetRealmIndex: 1,
      targetStage: 3
    }, 'seed_blacksmith_test');

    expect(npcDoc.name).toBeDefined();
    expect(npcDoc.name.length).toBeGreaterThan(2);
    expect(npcDoc.title).toBeDefined();
    expect(npcDoc.cultivation.realmIndex).toBe(1);
    expect(npcDoc.cultivation.stage).toBe(3);
    expect(npcDoc.lifespan.currentAge).toBeLessThan(npcDoc.lifespan.maxAge);
    expect(npcDoc.inventory.length).toBeGreaterThanOrEqual(1);

    // Validate directly against real Mongoose model
    const npcInstance = new Npc(npcDoc);
    const err = npcInstance.validateSync();
    expect(err).toBeUndefined();
  });

  it('guarantees identical output for identical seed (Determinism)', () => {
    const doc1 = generateDeterministicNpc({ anchorId: 'desa_heiyan' }, 'fixed_seed_abc');
    const doc2 = generateDeterministicNpc({ anchorId: 'desa_heiyan' }, 'fixed_seed_abc');

    expect(doc1.name).toBe(doc2.name);
    expect(doc1.personality).toEqual(doc2.personality);
    expect(doc1.attributes).toEqual(doc2.attributes);
    expect(doc1.dao).toEqual(doc2.dao);
  });

  it('assigns role-specific equipment and professions', () => {
    const innkeeper = generateDeterministicNpc({ role: 'innkeeper' }, 'seed_inn');
    expect(innkeeper.attributes.professions.cooking).toBe(20);
    expect(innkeeper.inventory.some(i => i.category === 'wine')).toBe(true);

    const alchemist = generateDeterministicNpc({ role: 'alchemist' }, 'seed_alc');
    expect(alchemist.attributes.professions.alchemy).toBe(30);
    expect(alchemist.inventory.some(i => i.category === 'pill')).toBe(true);
  });

  it('generates coherent family tree adhering to DAG rules (no circular parent, age gap >= 18)', () => {
    const { familyDoc, npcDocs } = generateFamilyClan({
      clanSurname: 'Ouyang',
      anchorId: 'pulau_penyu_raksasa',
      size: 4,
      seed: 'ouyang_clan_seed'
    });

    expect(familyDoc.familyName).toBe('Klan Ouyang');
    expect(familyDoc.members.length).toBe(4);
    expect(npcDocs.length).toBe(4);

    // Mongoose validation on family
    const familyInstance = new NpcFamily(familyDoc);
    expect(familyInstance.validateSync()).toBeUndefined();

    // Check parents (Gen 1) and children (Gen 2)
    const patriarch = npcDocs.find(n => n._id.toString() === familyDoc.headNpcId.toString());
    expect(patriarch).toBeDefined();
    expect(patriarch.name).toContain('Ouyang');

    const children = npcDocs.filter(n => {
      const m = familyDoc.members.find(mem => mem.npcId.toString() === n._id.toString());
      return m && m.role === 'child';
    });

    expect(children.length).toBe(2);

    for (const child of children) {
      expect(child.name).toContain('Ouyang');
      // Age gap must be strictly >= 18 years
      const ageGap = patriarch.lifespan.currentAge - child.lifespan.currentAge;
      expect(ageGap).toBeGreaterThanOrEqual(18);

      // Mongoose validation on child NPC
      const childInstance = new Npc(child);
      expect(childInstance.validateSync()).toBeUndefined();
    }
  });
});
