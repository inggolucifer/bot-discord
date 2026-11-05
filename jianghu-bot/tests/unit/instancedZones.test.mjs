import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const instancedEngine = require('../../services/instancedZoneEngine');

describe('V23 G5 — Area Khusus Berinstans Otoritatif (R8)', () => {

  describe('1. Lembah Roh (spirit_valley)', () => {
    const session = instancedEngine.createSpiritValleySession('player123', 'zone_sv_1', 3, 1700000000000);

    it('membuat sesi instans dengan tepat 9 kamar (grid 3x3)', () => {
      expect(session.type).toBe('spirit_valley');
      expect(session.rooms.length).toBe(9);
      for (let i = 0; i < 9; i++) {
        expect(session.rooms[i].index).toBe(i);
        expect(session.rooms[i].x).toBe(i % 3);
        expect(session.rooms[i].y).toBe(Math.floor(i / 3));
      }
    });

    it('biaya masuk membutuhkan 1 item kunci token dan 5 hari game', () => {
      expect(session.cost.item).toBe('item_spirit_key');
      expect(session.cost.quantity).toBe(1);
      expect(session.cost.gameDays).toBe(5);
    });

    it('memiliki durasi cooldown penyelesaian 7 hari waktu game', () => {
      expect(session.cooldownDays).toBe(7);
    });

    it('setiap kamar dijaga 1 monster elite dengan stat terskala tier', () => {
      for (const room of session.rooms) {
        expect(room.eliteMonster).toBeDefined();
        expect(room.eliteMonster.hp).toBeGreaterThanOrEqual(1500);
        expect(room.eliteMonster.atk).toBeGreaterThanOrEqual(120);
        expect(room.eliteMonster.defeated).toBe(false);
      }
    });

    it('jebakan memberikan damage 8% s/d 15% dari Max HP', () => {
      const maxHp = 5000;
      for (let s = 1; s <= 50; s++) {
        const dmg = instancedEngine.calculateTrapDamage(maxHp, 1000 + s);
        expect(dmg).toBeGreaterThanOrEqual(Math.round(maxHp * 0.08));
        expect(dmg).toBeLessThanOrEqual(Math.round(maxHp * 0.15));
      }
    });

    it('damage jebakan mengabaikan DEF dan hanya bersumber dari Max HP', () => {
      const dmgLowHp = instancedEngine.calculateTrapDamage(1000, 1618);
      const dmgHighHp = instancedEngine.calculateTrapDamage(10000, 1618);
      expect(dmgHighHp).toBe(dmgLowHp * 10);
    });

    it('perhitungan jebakan bersifat deterministik dari seed yang sama', () => {
      const d1 = instancedEngine.calculateTrapDamage(2000, 9999);
      const d2 = instancedEngine.calculateTrapDamage(2000, 9999);
      expect(d1).toBe(d2);
    });

    it('gangguan batin (inner demon event) memiliki peluang 10%', () => {
      let count = 0;
      for (let s = 1; s <= 1000; s++) {
        if (instancedEngine.checkInnerDemonEvent(s)) count++;
      }
      // Peluang ~10% (toleransi 7% s/d 13%)
      expect(count).toBeGreaterThanOrEqual(70);
      expect(count).toBeLessThanOrEqual(130);
    });

    it('menyelesaikan aksi trigger_trap pada kamar aktif', () => {
      const testSession = instancedEngine.createSpiritValleySession('p1', 'z1', 3, 1000);
      testSession.rooms[0].hasTrap = true;
      const res = instancedEngine.resolveStepAction(testSession, 'trigger_trap', { playerMaxHp: 2000 });
      expect(res.ok).toBe(true);
      expect(res.damageIgnoringDef).toBeGreaterThanOrEqual(160);
      expect(testSession.rooms[0].trapTriggered).toBe(true);
    });

    it('membersihkan kamar menaikkan roomIndex hingga selesai', () => {
      const testSession = instancedEngine.createSpiritValleySession('p1', 'z1', 3, 1000);
      for (let i = 0; i < 8; i++) {
        const res = instancedEngine.resolveStepAction(testSession, 'clear_room');
        expect(res.ok).toBe(true);
        expect(res.completed).toBe(false);
      }
      const finalRes = instancedEngine.resolveStepAction(testSession, 'clear_room');
      expect(finalRes.ok).toBe(true);
      expect(finalRes.completed).toBe(true);
      expect(testSession.status).toBe('completed');
    });
  });

  describe('2. Tanah Roh (land_of_spirits)', () => {
    const session = instancedEngine.createLandOfSpiritsSession('p2', 'z_los_1', 2, 2000);

    it('biaya masuk membutuhkan 500 Batu Roh dan 10 stamina', () => {
      expect(session.cost.spiritStones).toBe(500);
      expect(session.cost.stamina).toBe(10);
    });

    it('memiliki 5 ruang berurutan dengan ruang ke-5 sebagai Boss Penjaga Roh', () => {
      expect(session.chambers.length).toBe(5);
      expect(session.chambers[0].enemyType).toBe('guardian');
      expect(session.chambers[4].enemyType).toBe('boss');
      expect(session.chambers[4].hp).toBeGreaterThanOrEqual(4000);
    });

    it('hadiah penyelesaian milestone terdefinisi transparan', () => {
      expect(session.milestoneReward).toBeDefined();
      expect(session.milestoneReward.silver).toBe(1500);
      expect(session.milestoneReward.spiritStones).toBe(250);
      expect(session.milestoneReward.breakthroughPillGrade).toBe(2);
    });

    it('progres chamber meningkat berurutan dari 1 ke 5', () => {
      const testSession = instancedEngine.createLandOfSpiritsSession('p2', 'z_los_1', 2, 2000);
      expect(testSession.currentChamber).toBe(1);

      for (let c = 1; c <= 4; c++) {
        const res = instancedEngine.resolveStepAction(testSession, 'clear_chamber');
        expect(res.ok).toBe(true);
        expect(res.currentChamber).toBe(c + 1);
        expect(res.completed).toBe(false);
      }

      const finalRes = instancedEngine.resolveStepAction(testSession, 'clear_chamber');
      expect(finalRes.ok).toBe(true);
      expect(finalRes.completed).toBe(true);
      expect(finalRes.milestoneReward).toBeDefined();
      expect(testSession.status).toBe('completed');
    });
  });

  describe('3. Lingkaran Pertahanan (defense_circle)', () => {
    const session = instancedEngine.createDefenseCircleSession('p3', 'z_dc_1', 3, 3000);

    it('biaya masuk membutuhkan 3 buah roh dan 10 stamina', () => {
      expect(session.cost.spiritFruits).toBe(3);
      expect(session.cost.stamina).toBe(10);
    });

    it('memiliki 5 gelombang monster berurutan dengan eskalasi musuh', () => {
      expect(session.waves.length).toBe(5);
      expect(session.waves[0].enemiesCount).toBe(3);
      expect(session.waves[4].isBossWave).toBe(true);
      expect(session.waves[4].enemyHp).toBeGreaterThan(session.waves[0].enemyHp);
    });

    it('durasi bertahan setara 120 detik pertempuran', () => {
      expect(session.estimatedDurationSeconds).toBe(120);
    });

    it('progres gelombang bertahan hidup dari 1 hingga 5', () => {
      const testSession = instancedEngine.createDefenseCircleSession('p3', 'z_dc_1', 3, 3000);
      for (let w = 1; w <= 4; w++) {
        const res = instancedEngine.resolveStepAction(testSession, 'clear_wave');
        expect(res.ok).toBe(true);
        expect(res.currentWave).toBe(w + 1);
        expect(res.completed).toBe(false);
      }

      const finalRes = instancedEngine.resolveStepAction(testSession, 'clear_wave');
      expect(finalRes.ok).toBe(true);
      expect(finalRes.completed).toBe(true);
      expect(testSession.status).toBe('completed');
    });
  });

  describe('4. Tanah Elemen (elemental_land)', () => {
    const elements = ['api', 'air', 'kayu', 'logam', 'tanah'];

    it('menghasilkan keping intisari roh untuk seluruh 5 elemen', () => {
      for (const el of elements) {
        const loot = instancedEngine.createElementalLandLoot(el, 3, 1618);
        expect(loot.element).toBe(el);
        expect(loot.shardKey).toBe(instancedEngine.ELEMENT_SHARDS[el].key);
        expect(loot.quantity).toBeGreaterThanOrEqual(2);
        expect(loot.quantity).toBeLessThanOrEqual(4);
      }
    });

    it('terhubung dengan fasilitas bengkel di pemukiman V20 untuk penempaan kristal roh', () => {
      const loot = instancedEngine.createElementalLandLoot('api', 3, 1618);
      expect(loot.workshopRecipe.facilityRequired).toBe('workshop');
      expect(loot.workshopRecipe.requiredShards).toBe(10);
      expect(loot.workshopRecipe.resultItem).toContain('Kristal Roh Api');
    });
  });

  describe('5. Prinsip Otoritatif & Deterministik Server', () => {
    it('sesi dengan parameter identik menghasilkan seed dan struktur kamar identik', () => {
      const s1 = instancedEngine.createSpiritValleySession('p_det', 'z_det', 3, 55555);
      const s2 = instancedEngine.createSpiritValleySession('p_det', 'z_det', 3, 55555);
      expect(s1.sessionSeed).toBe(s2.sessionSeed);
      expect(s1.rooms[0].hasTrap).toBe(s2.rooms[0].hasTrap);
      expect(s1.rooms[0].hasInnerDemon).toBe(s2.rooms[0].hasInnerDemon);
    });

    it('sesi dengan playerId berbeda menghasilkan seed sesi yang berbeda', () => {
      const s1 = instancedEngine.createSpiritValleySession('p_alpha', 'z_det', 3, 55555);
      const s2 = instancedEngine.createSpiritValleySession('p_beta', 'z_det', 3, 55555);
      expect(s1.sessionSeed).not.toBe(s2.sessionSeed);
    });

    it('resolveStepAction menolak aksi jika sesi instans sudah tidak aktif', () => {
      const s = instancedEngine.createSpiritValleySession('p_done', 'z_done', 3, 1000);
      s.status = 'completed';
      const res = instancedEngine.resolveStepAction(s, 'clear_room');
      expect(res.ok).toBe(false);
      expect(res.error).toContain('tidak aktif');
    });

    it('resolveStepAction menolak jenis aksi yang tidak valid', () => {
      const s = instancedEngine.createSpiritValleySession('p_invalid', 'z_invalid', 3, 1000);
      const res = instancedEngine.resolveStepAction(s, 'unknown_action');
      expect(res.ok).toBe(false);
      expect(res.error).toBeDefined();
    });
  });
});
