/**
 * tests/unit/instancedZonesEnter.test.js
 * Pengujian komprehensif aturan masuk zona instans, cooldown, dan pembatasan sekali-per-lokasi (V26 P3)
 */

const { computeCooldown } = require('../../utils/instancedZoneCosts');

describe('V26 P3 — Instanced Zone Enter Rules & Cooldown Pure Logic', () => {
  const ONE_DAY_MS = 24 * 3600 * 1000;
  const now = new Date('2026-11-06T12:00:00Z').getTime();

  it('1. Zona tanpa cooldownDays (0 atau null) tidak pernah memblokir pemain', () => {
    const recent = { updatedAt: new Date(now - 1000), status: 'completed' };
    const res = computeCooldown(recent, 0, now);
    expect(res.blocked).toBe(false);
    expect(res.sisaHari).toBe(0);
  });

  it('2. Sesi dengan status active tidak diblokir oleh cooldown (diperbolehkan resume)', () => {
    const recent = { updatedAt: new Date(now - 1000), status: 'active' };
    const res = computeCooldown(recent, 3, now);
    expect(res.blocked).toBe(false);
    expect(res.sisaHari).toBe(0);
  });

  it('3. Sesi selesai baru 1 hari lalu dengan cooldown 3 hari terblokir dengan sisa 2 hari', () => {
    const recent = { updatedAt: new Date(now - 1 * ONE_DAY_MS), status: 'claimed' };
    const res = computeCooldown(recent, 3, now);
    expect(res.blocked).toBe(true);
    expect(res.sisaHari).toBe(2);
  });

  it('4. Sesi selesai 12 jam lalu dengan cooldown 1 hari terblokir dengan sisa 1 hari', () => {
    const recent = { updatedAt: new Date(now - 0.5 * ONE_DAY_MS), status: 'claimed' };
    const res = computeCooldown(recent, 1, now);
    expect(res.blocked).toBe(true);
    expect(res.sisaHari).toBe(1);
  });

  it('5. Sesi tepat di batas hari (tepat 3 hari lalu) sudah tidak terblokir lagi', () => {
    const recent = { updatedAt: new Date(now - 3 * ONE_DAY_MS), status: 'claimed' };
    const res = computeCooldown(recent, 3, now);
    expect(res.blocked).toBe(false);
    expect(res.sisaHari).toBe(0);
  });

  it('6. Sesi selesai 5 hari lalu dengan cooldown 3 hari sudah bebas cooldown', () => {
    const recent = { updatedAt: new Date(now - 5 * ONE_DAY_MS), status: 'claimed' };
    const res = computeCooldown(recent, 3, now);
    expect(res.blocked).toBe(false);
    expect(res.sisaHari).toBe(0);
  });

  it('7. Logika land_of_spirits: memblokir jika status claimed atau completed', () => {
    function checkLandOfSpiritsEligible(sessionsForThisZone) {
      const done = sessionsForThisZone.some(s => ['claimed', 'completed'].includes(s.status));
      if (done) return { ok: false, error: 'Tanah Warisan ini sudah pernah kamu selesaikan.' };
      return { ok: true };
    }

    const completedSessions = [{ zoneId: 'los_1', status: 'completed' }];
    expect(checkLandOfSpiritsEligible(completedSessions).ok).toBe(false);

    const claimedSessions = [{ zoneId: 'los_1', status: 'claimed' }];
    expect(checkLandOfSpiritsEligible(claimedSessions).ok).toBe(false);

    const abandonedSessions = [{ zoneId: 'los_1', status: 'abandoned' }];
    expect(checkLandOfSpiritsEligible(abandonedSessions).ok).toBe(true);
  });

  it('8. Status penyelesaian pada satu zona instans tidak mempengaruhi zona lain', () => {
    const playerSessions = [
      { zoneId: 'land_of_spirits_1', status: 'claimed' },
      { zoneId: 'spirit_valley_1', status: 'completed', updatedAt: new Date(now - 10 * ONE_DAY_MS) }
    ];

    // Cek kelayakan untuk land_of_spirits_2 (berbeda zona)
    const sessionsForLos2 = playerSessions.filter(s => s.zoneId === 'land_of_spirits_2');
    const isLos2Done = sessionsForLos2.some(s => ['claimed', 'completed'].includes(s.status));
    expect(isLos2Done).toBe(false);

    // Cek cooldown spirit_valley_2 (berbeda zona)
    const sessionsForSv2 = playerSessions.filter(s => s.zoneId === 'spirit_valley_2');
    expect(sessionsForSv2.length).toBe(0);
    const sv2Cooldown = computeCooldown(sessionsForSv2[0], 3, now);
    expect(sv2Cooldown.blocked).toBe(false);
  });
});
