import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('V27 Static Data Integrity Suite', () => {
  const worldDataDir = path.resolve(__dirname, '../../../world-data');

  it('validates npc-personalities-v27.json structure and completeness', () => {
    const filePath = path.join(worldDataDir, 'npc-personalities-v27.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const personalities = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(Array.isArray(personalities)).toBe(true);
    expect(personalities.length).toBe(8);

    const expectedIds = [
      'righteous', 'honest', 'free_spirited', 'pragmatic',
      'aloof', 'ambitious', 'ruthless', 'eccentric'
    ];

    const foundIds = personalities.map(p => p.id);
    expect(foundIds.sort()).toEqual(expectedIds.sort());

    personalities.forEach(p => {
      expect(typeof p.name).toBe('string');
      expect(typeof p.description).toBe('string');
      expect(Array.isArray(p.moralityRange)).toBe(true);
      expect(p.moralityRange.length).toBe(2);
      expect(p.moralityRange[0]).toBeLessThanOrEqual(p.moralityRange[1]);
      expect(Array.isArray(p.temperamentRange)).toBe(true);
      expect(p.temperamentRange.length).toBe(2);
      expect(p.temperamentRange[0]).toBeLessThanOrEqual(p.temperamentRange[1]);
      expect(typeof p.affinityModifiers).toBe('object');
      expect(Array.isArray(p.preferredGiftCategories)).toBe(true);
      expect(Array.isArray(p.dislikedGiftCategories)).toBe(true);
      expect(typeof p.dialogueTone).toBe('string');
    });
  });

  it('validates npc-dao-traits-v27.json contains exactly 16 traits', () => {
    const filePath = path.join(worldDataDir, 'npc-dao-traits-v27.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const traits = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(Array.isArray(traits)).toBe(true);
    expect(traits.length).toBe(16);

    traits.forEach(t => {
      expect(typeof t.id).toBe('string');
      expect(typeof t.name).toBe('string');
      expect(typeof t.description).toBe('string');
      expect(['martial', 'spiritual', 'physique', 'mental']).toContain(t.category);
      expect(typeof t.statModifiers).toBe('object');
      expect(typeof t.rootAffinities).toBe('object');
    });
  });

  it('validates npc-destinies-v27.json contains innate and acquired destinies across tiers', () => {
    const filePath = path.join(worldDataDir, 'npc-destinies-v27.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const destinies = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(Array.isArray(destinies.innate)).toBe(true);
    expect(Array.isArray(destinies.acquired)).toBe(true);
    expect(destinies.innate.length).toBeGreaterThanOrEqual(8);
    expect(destinies.acquired.length).toBeGreaterThanOrEqual(6);

    const validTiers = ['gray', 'green', 'blue', 'purple', 'gold', 'red'];

    [...destinies.innate, ...destinies.acquired].forEach(d => {
      expect(typeof d.id).toBe('string');
      expect(typeof d.name).toBe('string');
      expect(validTiers).toContain(d.tier);
      expect(typeof d.description).toBe('string');
      expect(typeof d.statModifiers).toBe('object');
    });
  });

  it('validates npc-surnames-v27.json contains at least 80 surnames', () => {
    const filePath = path.join(worldDataDir, 'npc-surnames-v27.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const surnames = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(Array.isArray(surnames)).toBe(true);
    expect(surnames.length).toBeGreaterThanOrEqual(80);

    surnames.forEach(s => {
      expect(typeof s.pinyin).toBe('string');
      expect(typeof s.hanzi).toBe('string');
      expect(typeof s.isCompound).toBe('boolean');
      expect(typeof s.weight).toBe('number');
      expect(s.weight).toBeGreaterThan(0);
    });
  });

  it('validates npc-given-names-v27.json contains at least 150 categorized names', () => {
    const filePath = path.join(worldDataDir, 'npc-given-names-v27.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const names = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(Array.isArray(names.male)).toBe(true);
    expect(Array.isArray(names.female)).toBe(true);
    expect(Array.isArray(names.neutral)).toBe(true);

    expect(names.male.length).toBeGreaterThanOrEqual(50);
    expect(names.female.length).toBeGreaterThanOrEqual(50);
    expect(names.neutral.length).toBeGreaterThanOrEqual(30);

    const total = names.male.length + names.female.length + names.neutral.length;
    expect(total).toBeGreaterThanOrEqual(150);
  });

  it('validates npc-dialogue-scripts-v27.json covers greetings and 15 interaction actions', () => {
    const filePath = path.join(worldDataDir, 'npc-dialogue-scripts-v27.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const scripts = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(typeof scripts.greetings).toBe('object');
    expect(typeof scripts.actions).toBe('object');

    const expectedActions = [
      'chat', 'inquire', 'spar', 'duel', 'gift',
      'bribe', 'recruit', 'confess', 'propose', 'divorce',
      'adopt', 'steal', 'threaten', 'request_favor', 'break_relations'
    ];

    expectedActions.forEach(action => {
      expect(scripts.actions[action]).toBeDefined();
    });
  });
});
