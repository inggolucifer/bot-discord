import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const monsterSpawnEngine = require('../../utils/monsterSpawnEngine');
const { CORE_ITEMS_DEFINITIONS } = require('../../services/coreItems');

describe('V23 G4 — Mesin Spawn, Jimat Penolak/Penarik, Gerbang Boss & Simulasi Encounters', () => {

  describe('1. Sistem Jimat Mitigasi & Penarik Monster (R7)', () => {
    it('mengembalikan base risk jika tidak ada jimat aktif', () => {
      expect(monsterSpawnEngine.calculateEffectiveAmbushRisk(0.15, {})).toBe(0.15);
      expect(monsterSpawnEngine.calculateEffectiveAmbushRisk(0.04, null)).toBe(0.04);
    });

    it('jimat pengusir monster mengurangi risiko ambush 50%', () => {
      expect(monsterSpawnEngine.calculateEffectiveAmbushRisk(0.15, { repellentActive: true })).toBe(0.075);
      expect(monsterSpawnEngine.calculateEffectiveAmbushRisk(0.25, { repellentActive: true })).toBe(0.125);
    });

    it('jimat penarik monster meningkatkan risiko ambush 75%', () => {
      expect(monsterSpawnEngine.calculateEffectiveAmbushRisk(0.15, { attractionActive: true })).toBe(0.2625);
      expect(monsterSpawnEngine.calculateEffectiveAmbushRisk(0.04, { attractionActive: true })).toBe(0.07);
    });

    it('menggabungkan kedua jimat secara multiplikatif (0.5 * 1.75 = 0.875)', () => {
      const eff = monsterSpawnEngine.calculateEffectiveAmbushRisk(0.20, { repellentActive: true, attractionActive: true });
      expect(eff).toBe(0.175);
    });

    it('membatasi nilai risiko minimum pada 0', () => {
      expect(monsterSpawnEngine.calculateEffectiveAmbushRisk(0, { repellentActive: true })).toBe(0);
    });

    it('membatasi nilai risiko maksimum pada 1.0', () => {
      expect(monsterSpawnEngine.calculateEffectiveAmbushRisk(0.80, { attractionActive: true })).toBe(1.0);
    });

    it('memastikan item jimat pengusir terdaftar di coreItems', () => {
      const repellentItem = CORE_ITEMS_DEFINITIONS.find(i => i.itemKey === 'item_monster_repellent_charm');
      expect(repellentItem).toBeDefined();
      expect(repellentItem.category).toBe('talisman');
      expect(repellentItem.effectType).toBe('repellent_charm');
      expect(repellentItem.effectValue).toBe(0.50);
    });

    it('memastikan item jimat penarik terdaftar di coreItems', () => {
      const attractionItem = CORE_ITEMS_DEFINITIONS.find(i => i.itemKey === 'item_monster_attraction_charm');
      expect(attractionItem).toBeDefined();
      expect(attractionItem.category).toBe('talisman');
      expect(attractionItem.effectType).toBe('attraction_charm');
      expect(attractionItem.effectValue).toBe(0.75);
    });
  });

  describe('2. Aturan Drop Tingkat Material Monster (R6, R10)', () => {
    it('monster biasa menjatuhkan material Grade 3', () => {
      expect(monsterSpawnEngine.getMonsterMaterialDropGrade('common')).toBe(3);
      expect(monsterSpawnEngine.getMonsterMaterialDropGrade('normal')).toBe(3);
    });

    it('monster elite menjatuhkan material Grade 2', () => {
      expect(monsterSpawnEngine.getMonsterMaterialDropGrade('elite')).toBe(2);
    });

    it('world boss menjatuhkan material Grade 1 (Breakthrough)', () => {
      expect(monsterSpawnEngine.getMonsterMaterialDropGrade('boss')).toBe(1);
      expect(monsterSpawnEngine.getMonsterMaterialDropGrade('world_boss')).toBe(1);
    });
  });

  describe('3. Gerbang World Boss & Mode Chaos Semesta (R9)', () => {
    const mockBoss = {
      name: 'Raja Kera Api Kuno',
      requiredRealmIndex: 3,
      hp: 10000,
      atk: 500
    };

    it('mengizinkan kultivator dengan ranah mencukupi tanpa peringatan fatal', () => {
      const res = monsterSpawnEngine.checkBossLairGate(mockBoss, 3);
      expect(res.allowed).toBe(true);
      expect(res.requiresWarning).toBe(false);
      expect(res.warningMessage).toBeNull();
    });

    it('memberikan peringatan konfirmasi jika ranah kultivator di bawah syarat', () => {
      const res = monsterSpawnEngine.checkBossLairGate(mockBoss, 1);
      expect(res.allowed).toBe(true);
      expect(res.requiresWarning).toBe(true);
      expect(typeof res.warningMessage).toBe('string');
      expect(res.warningMessage).toContain('Syarat Ranah: Index 3');
    });

    it('tidak mengubah status boss saat mode chaos tidak aktif', () => {
      const normalBoss = monsterSpawnEngine.applyChaosModeToBoss(mockBoss, false);
      expect(normalBoss.hp).toBe(10000);
      expect(normalBoss.atk).toBe(500);
      expect(normalBoss.isChaosMode).toBeUndefined();
    });

    it('menerapkan pengganda HP x 1.35 dan DMG x 1.25 saat mode chaos aktif', () => {
      const chaosBoss = monsterSpawnEngine.applyChaosModeToBoss(mockBoss, true);
      expect(chaosBoss.hp).toBe(13500);
      expect(chaosBoss.atk).toBe(625);
      expect(chaosBoss.isChaosMode).toBe(true);
    });
  });

  describe('4. Deteksi Bahaya Radius 14 Petak (Nearby Hazards)', () => {
    it('mengembalikan daftar bahaya terdekat dalam radius 14 petak', () => {
      // Ambil satu zona dari zones-v23.json
      const zonesData = require('../../world-data/zones-v23.json');
      const sampleZone = zonesData.zones[0];
      const zx = sampleZone.x + 1;
      const zy = sampleZone.y + 1;

      // Cek titik di dekatnya (jarak 5 petak)
      const hazards = monsterSpawnEngine.getNearbyHazards(zx + 5, zy, 14);
      expect(hazards.length).toBeGreaterThan(0);
      expect(hazards.some(h => h.id === sampleZone.id)).toBe(true);
    });

    it('mengurutkan bahaya berdasarkan jarak terdekat', () => {
      const hazards = monsterSpawnEngine.getNearbyHazards(2600, 3350, 20);
      for (let i = 1; i < hazards.length; i++) {
        expect(hazards[i].distance).toBeGreaterThanOrEqual(hazards[i - 1].distance);
      }
    });

    it('menyediakan label arah kualitatif dan label jarak teks', () => {
      const hazards = monsterSpawnEngine.getNearbyHazards(2600, 3350, 14);
      if (hazards.length > 0) {
        const h = hazards[0];
        expect(typeof h.direction).toBe('string');
        expect(typeof h.distanceLabel).toBe('string');
        expect(['sangat dekat', 'dekat', 'sedang']).toContain(h.distanceLabel);
      }
    });
  });

  describe('5. Interpolasi Level Monster Spasial', () => {
    it('mengembalikan integer level valid >= 1', () => {
      const lvl = monsterSpawnEngine.getInterpolatedMonsterLevel(2500, 2500, 20);
      expect(typeof lvl).toBe('number');
      expect(lvl).toBeGreaterThanOrEqual(1);
    });

    it('level terinterpolasi konsisten dengan level dasar di pusat wilayah', () => {
      const lvl = monsterSpawnEngine.getInterpolatedMonsterLevel(2000, 2600, 10);
      expect(lvl).toBeGreaterThanOrEqual(10);
    });
  });
});
