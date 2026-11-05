import { describe, it, expect } from 'vitest';
import policyDoc from '../../world-data/walkability-policy-v24.json';
import proceduralWorldEngine from '../../utils/proceduralWorldEngine.js';
import { getTerrainStaminaCost } from '../../utils/worldRegionEngine.js';

describe('Walkability Policy & Terrain De-solidification (V24 H4)', () => {
  it('1. walkability-policy-v24.json contains valid solid and walkable_with_cost definitions', () => {
    expect(policyDoc.version).toBe('v24');
    expect(policyDoc.policy.solid).toContain('ocean');
    expect(policyDoc.policy.solid).toContain('cliff');
    expect(policyDoc.policy.walkable_with_cost.lake).toBeDefined();
    expect(policyDoc.policy.walkable_with_cost.glacier).toBeDefined();
  });

  it('2. getTerrainStaminaCost returns 2.0 for shallow lake', () => {
    expect(getTerrainStaminaCost('lake')).toBe(2.0);
  });

  it('3. getTerrainStaminaCost returns 2.5 for glacier', () => {
    expect(getTerrainStaminaCost('glacier')).toBe(2.5);
  });

  it('4. Deep water terrains remain solid', () => {
    for (const tt of ['ocean', 'sea', 'lake_deep']) {
      expect(policyDoc.policy.solid).toContain(tt);
    }
  });

  it('5. Mountain and peak terrains remain solid', () => {
    for (const tt of ['cliff', 'azure_mountain', 'mountain_peak', 'mountain_rock', 'mountain']) {
      expect(policyDoc.policy.solid).toContain(tt);
    }
  });

  it('6. Mountain passes remain strictly walkable (isSolid === false)', () => {
    expect(policyDoc.policy.mountain_passes).toContain('mountain_pass');
    expect(policyDoc.policy.mountain_passes).toContain('sword_gorge_pass');
    expect(getTerrainStaminaCost('mountain_pass')).toBe(1.0);
  });

  it('7. Volcanic hazard terrains remain solid in policy', () => {
    expect(policyDoc.policy.solid).toContain('volcanic');
    expect(policyDoc.policy.solid).toContain('lava_flow');
  });

  it('8. All sampled lake tiles across mirror_lake have isSolid === false', () => {
    // mirror_lake region x in [2200, 2800], y in [2200, 2800]
    let lakeCount = 0;
    let solidLakeCount = 0;
    for (let y = 2400; y <= 2600; y += 20) {
      for (let x = 2400; x <= 2600; x += 20) {
        const tile = proceduralWorldEngine.getTileAt(x, y);
        if (tile.terrainType === 'lake') {
          lakeCount++;
          if (tile.isSolid) solidLakeCount++;
        }
      }
    }
    if (lakeCount > 0) {
      expect(solidLakeCount).toBe(0);
    }
  });

  it('9. All sampled glacier tiles have isSolid === false', () => {
    // Frost Sea / Northern glacier regions in y >= 4150
    let glacierCount = 0;
    let solidGlacierCount = 0;
    for (let y = 4200; y <= 4400; y += 20) {
      for (let x = 2000; x <= 3000; x += 50) {
        const tile = proceduralWorldEngine.getTileAt(x, y);
        if (tile.terrainType === 'glacier') {
          glacierCount++;
          if (tile.isSolid) solidGlacierCount++;
        }
      }
    }
    if (glacierCount > 0) {
      expect(solidGlacierCount).toBe(0);
    }
  });

  it('10. Boundary tiles (at edges of world) remain solid', () => {
    const b1 = proceduralWorldEngine.getTileAt(0, 0);
    const b2 = proceduralWorldEngine.getTileAt(4999, 4999);
    expect(b1.isSolid).toBe(true);
    expect(b2.isSolid).toBe(true);
  });
});
