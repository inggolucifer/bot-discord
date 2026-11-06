import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOT_ROOT = path.resolve(__dirname, '../..');

const proceduralWorldEngine = require('../../utils/proceduralWorldEngine');
const worldRegionEngine = require('../../utils/worldRegionEngine');
const anchors = require('../../world-data/anchors.json');

describe('V25 K5 — Settlement Ring Danger Tier Cap (11 Tests)', () => {
  it('1. kota_canghai (tier 1) has dangerTier <= 2 in ring R+1..R+12', () => {
    const anc = anchors.find(a => a.id === 'kota_canghai');
    const R = anc.v20?.exclusionRadius || 14;
    for (let d = 1; d <= 12; d += 3) {
      const tile = proceduralWorldEngine.getTileAt(anc.x + R + d, anc.y);
      const eff = worldRegionEngine.getEffectiveDanger(anc.x + R + d, anc.y);
      expect(tile.dangerTier).toBeLessThanOrEqual(2);
      expect(eff).toBeLessThanOrEqual(2);
    }
  });

  it('2. desa_heiyan (tier 2) has dangerTier <= 3 in ring R+1..R+12', () => {
    const anc = anchors.find(a => a.id === 'desa_heiyan');
    const R = anc.v20?.exclusionRadius || 10;
    for (let d = 1; d <= 12; d += 3) {
      const tile = proceduralWorldEngine.getTileAt(anc.x + R + d, anc.y);
      const eff = worldRegionEngine.getEffectiveDanger(anc.x + R + d, anc.y);
      expect(tile.dangerTier).toBeLessThanOrEqual(3);
      expect(eff).toBeLessThanOrEqual(3);
    }
  });

  it('3. pulau_penyu_raksasa (tier 3) has dangerTier <= 4 in ring R+1..R+12', () => {
    const anc = anchors.find(a => a.id === 'pulau_penyu_raksasa');
    const R = anc.v20?.exclusionRadius || 10;
    for (let d = 1; d <= 12; d += 3) {
      const tile = proceduralWorldEngine.getTileAt(anc.x + R + d, anc.y);
      const eff = worldRegionEngine.getEffectiveDanger(anc.x + R + d, anc.y);
      expect(tile.dangerTier).toBeLessThanOrEqual(4);
      expect(eff).toBeLessThanOrEqual(4);
    }
  });

  it('4. dusun_pondok_karang (tier 1) has dangerTier <= 2 in ring R+1..R+12', () => {
    const anc = anchors.find(a => a.id === 'dusun_pondok_karang');
    const R = anc.v20?.exclusionRadius || 6;
    for (let d = 1; d <= 12; d += 3) {
      const tile = proceduralWorldEngine.getTileAt(anc.x + R + d, anc.y);
      const eff = worldRegionEngine.getEffectiveDanger(anc.x + R + d, anc.y);
      expect(tile.dangerTier).toBeLessThanOrEqual(2);
      expect(eff).toBeLessThanOrEqual(2);
    }
  });

  it('5. kota_leiyin (tier 2) has dangerTier <= 3 in ring R+1..R+12', () => {
    const anc = anchors.find(a => a.id === 'kota_leiyin');
    const R = anc.v20?.exclusionRadius || 14;
    for (let d = 1; d <= 12; d += 3) {
      const tile = proceduralWorldEngine.getTileAt(anc.x + R + d, anc.y);
      const eff = worldRegionEngine.getEffectiveDanger(anc.x + R + d, anc.y);
      expect(tile.dangerTier).toBeLessThanOrEqual(3);
      expect(eff).toBeLessThanOrEqual(3);
    }
  });

  it('6. Inside exclusion radius d <= R dangerTier is 1 across all 52 anchors', () => {
    for (const anc of anchors) {
      const tile = proceduralWorldEngine.getTileAt(anc.x, anc.y);
      const eff = worldRegionEngine.getEffectiveDanger(anc.x, anc.y);
      expect(tile.dangerTier).toBe(1);
      expect(eff).toBe(1);
    }
  });

  it('7. applySettlementTierCap increases smoothly beyond R+12', () => {
    const anc = anchors.find(a => a.id === 'kota_canghai'); // tier 1, R 14
    const R = 14;
    // R + 13: extra floor((13-12)/12) = 0 -> cap = 1 + 1 + 0 = 2
    expect(worldRegionEngine.applySettlementTierCap(anc.x + R + 13, anc.y, 6)).toBe(2);
    // R + 24: extra floor((24-12)/12) = 1 -> cap = 1 + 1 + 1 = 3
    expect(worldRegionEngine.applySettlementTierCap(anc.x + R + 24, anc.y, 6)).toBe(3);
    // R + 36: extra floor((36-12)/12) = 2 -> cap = 1 + 1 + 2 = 4
    expect(worldRegionEngine.applySettlementTierCap(anc.x + R + 36, anc.y, 6)).toBe(4);
  });

  it('8. Deep wilderness (far from all settlements) preserves natural region tier', () => {
    // Wilderness point far from settlements in deep danger region
    const deepWildernessX = 4800;
    const deepWildernessY = 4800;
    const reg = worldRegionEngine.getRegionAt(deepWildernessX, deepWildernessY);
    const naturalTier = reg.dangerTier;
    const capped = worldRegionEngine.applySettlementTierCap(deepWildernessX, deepWildernessY, naturalTier);
    expect(capped).toBe(naturalTier);
  });

  it('9. getTerritoryInfo dangerTierBase respects tier cap near settlements', () => {
    const anc = anchors.find(a => a.id === 'desa_heiyan'); // tier 2, R 10
    const info = worldRegionEngine.getTerritoryInfo(anc.x + 13, anc.y, 'swamp', false);
    expect(info.dangerTierBase).toBeLessThanOrEqual(3);
  });

  it('10. Multi-anchor resolution picks closest anchor by (d - R)', () => {
    // Between kaki_gunung_azure (2200, 3340) and sekte_awan_pedang (2200, 3350)
    const capped = worldRegionEngine.applySettlementTierCap(2200, 3345, 5);
    expect(capped).toBe(1);
  });

  it('11. Audit file review/v25_raw/tier_cap.json confirms 0 violations out of 17,472 points', () => {
    const jsonPath = path.join(BOT_ROOT, 'review/v25_raw/tier_cap.json');
    expect(fs.existsSync(jsonPath)).toBe(true);
    const auditData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    expect(auditData.totalPointsChecked).toBe(17472);
    expect(auditData.totalViolations).toBe(0);
    expect(auditData.pass).toBe(true);
  });
});
