import { describe, it, expect } from 'vitest';
import { describeBlocker, MOUNTAIN_TERRAINS, WATER_TERRAINS } from '../../utils/blockerDescriber.js';

describe('Contextual Blocker Describer (V24 H2)', () => {
  it('1. Detects world_edge for out-of-bounds coordinates and boundary terrain', () => {
    const oob1 = describeBlocker({}, -1, 100);
    expect(oob1.cause).toBe('world_edge');
    expect(oob1.hint).toContain('ujung dunia');

    const oob2 = describeBlocker({}, 5000, 200);
    expect(oob2.cause).toBe('world_edge');

    const boundary = describeBlocker({ terrainType: 'boundary' }, 10, 10);
    expect(boundary.cause).toBe('world_edge');
  });

  it('2. Detects water for ocean, sea, and lake_deep with boat/ship hint', () => {
    for (const tt of ['ocean', 'sea', 'lake_deep']) {
      const res = describeBlocker({ terrainType: tt }, 100, 100);
      expect(res.cause).toBe('water');
      expect(res.hint).toContain('perahu');
      expect(res.hint).not.toContain('pedang terbang untuk melintasi');
    }
  });

  it('3. Detects terrain for cliffs, mountains, and peaks with flying sword hint', () => {
    for (const tt of ['cliff', 'azure_mountain', 'mountain_peak', 'mountain_rock', 'mountain', 'abyss_edge']) {
      const res = describeBlocker({ terrainType: tt }, 200, 200);
      expect(res.cause).toBe('terrain');
      expect(res.hint).toContain('pedang terbang');
    }
  });

  it('4. Non-mountain solid obstacles never return "pedang terbang" hint or "Tebing" label', () => {
    const nonMountain = describeBlocker({ terrainType: 'plains', label: 'Pohon Bambu Kuno' }, 300, 300);
    expect(nonMountain.cause).not.toBe('terrain');
    expect(nonMountain.label).not.toContain('Tebing');
    expect(nonMountain.hint).not.toContain('pedang terbang');
  });

  it('5. Object cause returns friendly Indonesian object name and "Cari jalan lain" hint', () => {
    // Coordinate 2432, 2466 has resource_ancient_herb_garden
    const res = describeBlocker({ terrainType: 'plains' }, 2432, 2466);
    expect(res.cause).toBe('object');
    expect(res.label).toBe('Sumber Daya Nine Springs Delta');
    expect(res.hint).toBe('Cari jalan lain di sekeliling rintangan.');
  });

  it('6. Detects barrier for barrier corridors and barrier formations', () => {
    const res = describeBlocker({ terrainType: 'stone_barrier', isBarrier: true }, 500, 500);
    expect(res.cause).toBe('barrier');
    expect(res.hint).toContain('celah formasi');
  });

  it('7. Detects wall for private properties', () => {
    const res = describeBlocker({ terrainType: 'plains', propertyId: 'prop_001', buildingName: 'Rumah Paviliun' }, 600, 600);
    expect(res.cause).toBe('wall');
    expect(res.label).toBe('Rumah Paviliun');
  });

  it('8. Fallback custom returns non-empty Indonesian label and valid message', () => {
    const res = describeBlocker({ terrainType: 'unknown_special' }, 700, 700);
    expect(res.cause).toBe('custom');
    expect(res.label).toBeTruthy();
    expect(res.message).toContain('Jalur terhalang oleh');
  });

  it('9. Determinism: repeated calls with same input produce identical cause and message', () => {
    const a = describeBlocker({ terrainType: 'cliff' }, 800, 800);
    const b = describeBlocker({ terrainType: 'cliff' }, 800, 800);
    expect(a).toEqual(b);
  });

  it('10. Never produces empty string or undefined in cause, label, hint, or message', () => {
    const samples = [
      { tileInfo: {}, x: 0, y: 0 },
      { tileInfo: { terrainType: 'ocean' }, x: 10, y: 10 },
      { tileInfo: { terrainType: 'cliff' }, x: 20, y: 20 },
      { tileInfo: { isSolid: true }, x: 2432, y: 2466 }
    ];
    for (const s of samples) {
      const res = describeBlocker(s.tileInfo, s.x, s.y);
      expect(res.cause).toBeTruthy();
      expect(res.label).toBeTruthy();
      expect(res.hint).toBeTruthy();
      expect(res.message).toBeTruthy();
    }
  });
});
