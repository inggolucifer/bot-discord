import { describe, it, expect } from 'vitest';
import { calculateEffectiveAmbushRisk } from '../../utils/monsterSpawnEngine.js';

describe('Active Charms Ambush Mitigation (V24 H6)', () => {
  it('1. Returns base risk exactly when no charms are active', () => {
    const base = 0.20;
    const res = calculateEffectiveAmbushRisk(base, {});
    expect(res).toBe(0.20);
  });

  it('2. Repellent charm reduces ambush risk by 50%', () => {
    const base = 0.30;
    const res = calculateEffectiveAmbushRisk(base, { repellentActive: true });
    expect(res).toBe(0.15);
  });

  it('3. Attraction charm increases ambush risk by 75%', () => {
    const base = 0.20;
    const res = calculateEffectiveAmbushRisk(base, { attractionActive: true });
    expect(res).toBe(0.35); // 0.20 * 1.75 = 0.35
  });

  it('4. Both charms active produce compound effect (1 - 0.50) * (1 + 0.75)', () => {
    const base = 0.40;
    const res = calculateEffectiveAmbushRisk(base, { repellentActive: true, attractionActive: true });
    // 0.40 * 0.50 * 1.75 = 0.35
    expect(res).toBe(0.35);
  });

  it('5. Custom repellent rate is respected', () => {
    const base = 0.50;
    const res = calculateEffectiveAmbushRisk(base, { repellentActive: true, repellentRate: 0.80 });
    // 0.50 * (1 - 0.80) = 0.10
    expect(res).toBe(0.10);
  });

  it('6. Ambush risk clamps to 0.0 minimum and 1.0 maximum', () => {
    const zeroRes = calculateEffectiveAmbushRisk(0, { attractionActive: true });
    expect(zeroRes).toBe(0);

    const maxRes = calculateEffectiveAmbushRisk(0.90, { attractionActive: true });
    // 0.90 * 1.75 = 1.575 -> clamps to 1.0
    expect(maxRes).toBe(1.0);
  });
});
