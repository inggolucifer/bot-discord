import { describe, it, expect } from 'vitest';
import { makeRng, rangeInt, rangeFloat, pickOne, pickWeighted, diceRoll, shuffle } from '../../../utils/npcRng.js';
import { getShichenFromHour, getJianghuTime, isNightTime, isWorkTime, formatWuxiaDate } from '../../../utils/npcTime.js';
import { computeNpcMaxLifespan, computeNpcAttributes } from '../../../utils/npcStats.js';

describe('V27 Math, Time & Stats Engine Suite', () => {
  describe('Mulberry32 PRNG Determinism', () => {
    it('produces identical sequences for identical seeds', () => {
      const rng1 = makeRng('canghai_seed_999');
      const rng2 = makeRng('canghai_seed_999');

      const seq1 = [rng1(), rng1(), rng1(), rng1(), rng1()];
      const seq2 = [rng2(), rng2(), rng2(), rng2(), rng2()];

      expect(seq1).toEqual(seq2);
    });

    it('produces different sequences for different seeds', () => {
      const rng1 = makeRng(11111);
      const rng2 = makeRng(22222);

      const seq1 = [rng1(), rng1(), rng1()];
      const seq2 = [rng2(), rng2(), rng2()];

      expect(seq1).not.toEqual(seq2);
    });

    it('rangeInt returns bounded integers', () => {
      const rng = makeRng('test_bounds');
      for (let i = 0; i < 50; i++) {
        const val = rangeInt(rng, 10, 20);
        expect(Number.isInteger(val)).toBe(true);
        expect(val).toBeGreaterThanOrEqual(10);
        expect(val).toBeLessThanOrEqual(20);
      }
    });

    it('shuffle deterministically shuffles without loss', () => {
      const rng1 = makeRng('shuffle_seed');
      const rng2 = makeRng('shuffle_seed');
      const arr = [1, 2, 3, 4, 5, 6, 7, 8];

      const res1 = shuffle(rng1, arr);
      const res2 = shuffle(rng2, arr);

      expect(res1).toEqual(res2);
      expect(res1.slice().sort()).toEqual(arr);
    });
  });

  describe('Wuxia Calendar & Shichen Engine', () => {
    it('correctly maps hours to 12 Shichen', () => {
      expect(getShichenFromHour(0).id).toBe('zi');
      expect(getShichenFromHour(23).id).toBe('zi');
      expect(getShichenFromHour(6).id).toBe('mao');
      expect(getShichenFromHour(12).id).toBe('wu');
      expect(getShichenFromHour(18).id).toBe('you');
    });

    it('identifies day/night and work hours', () => {
      expect(isNightTime(23)).toBe(true);
      expect(isNightTime(2)).toBe(true);
      expect(isNightTime(12)).toBe(false);

      expect(isWorkTime(10)).toBe(true);
      expect(isWorkTime(14)).toBe(true);
      expect(isWorkTime(2)).toBe(false);
    });

    it('generates complete Jianghu time object and formatted string', () => {
      const testDate = new Date('2026-05-15T10:30:00Z');
      const jTime = getJianghuTime(testDate);

      expect(jTime.year).toBe(2026);
      expect(typeof jTime.yearName).toBe('string');
      expect(jTime.season).toBe('Musim Semi');
      expect(typeof jTime.shichenName).toBe('string');

      const formatted = formatWuxiaDate(jTime);
      expect(formatted).toContain('Musim Semi');
    });
  });

  describe('Attribute Calculator & Zero-Decimal Policy', () => {
    it('computes lifespan with realm scaling and destiny bonus', () => {
      const mortalLifespan = computeNpcMaxLifespan(0);
      expect(mortalLifespan).toBe(100);

      const foundationLifespan = computeNpcMaxLifespan(2);
      expect(foundationLifespan).toBe(250);

      const boostedLifespan = computeNpcMaxLifespan(0, [], ['crane_longevity']);
      expect(boostedLifespan).toBe(130); // 100 + 30
    });

    it('scales attributes across realms and applies Dao traits', () => {
      const mortalStats = computeNpcAttributes({
        realmIndex: 0,
        stage: 1
      });

      const foundationStats = computeNpcAttributes({
        realmIndex: 2,
        stage: 3,
        daoTraits: ['sword_heart']
      });

      expect(foundationStats.hp).toBeGreaterThan(mortalStats.hp);
      expect(foundationStats.attack).toBeGreaterThan(mortalStats.attack);
      expect(foundationStats.defense).toBeGreaterThan(mortalStats.defense);
      expect(foundationStats.roots.wind).toBe(25); // from sword_heart
      expect(foundationStats.critRate).toBeGreaterThan(mortalStats.critRate);
    });

    it('enforces ZERO-DECIMAL policy (all attributes strictly integer)', () => {
      const stats = computeNpcAttributes({
        realmIndex: 3,
        stage: 7,
        daoTraits: ['phoenix_blood', 'thunder_soul'],
        innateDestinies: ['dragon_spine'],
        acquiredDestinies: ['ancient_inheritance']
      });

      const checkAllIntegers = (obj) => {
        for (const [key, val] of Object.entries(obj)) {
          if (typeof val === 'number') {
            expect(Number.isInteger(val), `Stat ${key} must be an integer, got ${val}`).toBe(true);
          } else if (typeof val === 'object' && val !== null) {
            checkAllIntegers(val);
          }
        }
      };

      checkAllIntegers(stats);
    });
  });
});
