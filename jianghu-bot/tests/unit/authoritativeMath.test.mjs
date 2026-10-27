import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
    calculateEnergyCost,
    isTileObstructed,
    evaluateAmbush,
    TERRAIN_PROPERTIES
} = require('../../utils/explorationMath');
const {
    getKungfuLevel,
    getXpRequiredForLevel,
    resolveWeaponDiscipline,
    getSkillPointCost,
    getMaxSkillLevel
} = require('../../utils/kungfuMastery');

describe('Authoritative Math & Exploration Specifications', () => {
    describe('Stamina & Energy Calculation (§3.1)', () => {
        it('calculates correct base energy cost for plains', () => {
            const cost = calculateEnergyCost({ terrainType: 'plains' });
            expect(cost).toBe(2);
        });

        it('enforces minimum cost >= 0.2 stamina when mount discount applies', () => {
            const cost = calculateEnergyCost({
                terrainType: 'settlement', // base cost 1
                mountType: 'qilin_celestial' // large reduction
            });
            expect(cost).toBeGreaterThanOrEqual(0.2);
        });

        it('detects impassable terrain for normal walking', () => {
            const mountainBlocked = isTileObstructed({ terrainType: 'mountain' });
            expect(mountainBlocked).toBe(true);

            const oceanBlocked = isTileObstructed({ terrainType: 'ocean' });
            expect(oceanBlocked).toBe(true);
        });

        it('allows flying sword to pass mountains and boats to pass ocean', () => {
            const mountainFlyer = isTileObstructed({
                terrainType: 'mountain',
                mountType: 'flying_sword'
            });
            expect(mountainFlyer).toBe(false);

            const oceanBoat = isTileObstructed({
                terrainType: 'ocean',
                mountType: 'wooden_boat'
            });
            expect(oceanBoat).toBe(false);
        });
    });

    describe('Kungfu Mastery & Long-Term XP Curve (§3.9)', () => {
        it('yields level 0 for 0 XP', () => {
            expect(getKungfuLevel(0).level).toBe(0);
        });

        it('satisfies 49 XP for Level 1 requirement', () => {
            const reqL1 = getXpRequiredForLevel(1);
            expect(reqL1).toBe(49);
            expect(getKungfuLevel(48).level).toBe(0);
            expect(getKungfuLevel(49).level).toBe(1);
        });

        it('satisfies 136 XP for Level 2 requirement', () => {
            const reqL2 = getXpRequiredForLevel(2);
            expect(reqL2).toBe(136);
            expect(getKungfuLevel(94).level).toBe(1); // 94 XP is Level 1
            expect(getKungfuLevel(136).level).toBe(2);
        });

        it('always returns sanitized integer level', () => {
            const res = getKungfuLevel(77.89);
            expect(Number.isInteger(res.level)).toBe(true);
        });
    });

    describe('Weapon Discipline Resolution (§3.8)', () => {
        it('resolves sword discipline for pedang', () => {
            const disc = resolveWeaponDiscipline({ name: 'Pedang Giok Hijau', category: 'weapon' });
            expect(disc).toBe('sword');
        });

        it('resolves saber discipline for golok', () => {
            const disc = resolveWeaponDiscipline({ name: 'Golok Bulan Sabit', category: 'weapon' });
            expect(disc).toBe('saber');
        });

        it('resolves staff discipline for tombak / tongkat', () => {
            const disc = resolveWeaponDiscipline({ name: 'Tombak Naga Merah', category: 'weapon' });
            expect(disc).toBe('staff');
        });

        it('falls back to fist for unarmed', () => {
            const disc = resolveWeaponDiscipline(null);
            expect(disc).toBe('fist');
        });
    });

    describe('Law Skill Tree Tier Scaling', () => {
        it('scales SP costs progressively with tier', () => {
            expect(getSkillPointCost(1)).toBe(1);
            expect(getSkillPointCost(2)).toBe(2);
            expect(getSkillPointCost(3)).toBe(3);
            expect(getSkillPointCost(4)).toBe(5);
            expect(getSkillPointCost(5)).toBe(7);
        });

        it('caps max skill level appropriately per tier', () => {
            expect(getMaxSkillLevel(1)).toBe(3);
            expect(getMaxSkillLevel(2)).toBe(5);
            expect(getMaxSkillLevel(3)).toBe(7);
            expect(getMaxSkillLevel(4)).toBe(9);
            expect(getMaxSkillLevel(5)).toBe(10);
        });
    });
});
