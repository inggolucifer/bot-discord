import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOT_ROOT = path.resolve(__dirname, '../..');

// Authoritative modules
import proceduralWorldEngine from '../../utils/proceduralWorldEngine.js';
import worldRegionEngine from '../../utils/worldRegionEngine.js';

describe('V25 K0 — Target Behavior Tests (Currently Red at HEAD)', () => {
  it('T1: nearby includes instanced zone entries with id starting with inst_', () => {
    const nearbyRouteCode = fs.readFileSync(path.join(BOT_ROOT, 'web-api/routes/nearby.js'), 'utf8');
    // Must import zones-v23.json and produce inst_ IDs
    expect(nearbyRouteCode.includes('zones-v23.json')).toBe(true);
    expect(nearbyRouteCode.includes('inst_')).toBe(true);
  });

  it('T2: instancedZones POST /enter does not read dangerTier from req.body and does not use in-memory Map', () => {
    const routeCode = fs.readFileSync(path.join(BOT_ROOT, 'web-api/routes/instancedZones.js'), 'utf8');
    // POST /enter should not extract dangerTier or zoneType from req.body
    const readsBodyTier = /req\.body\.(dangerTier|zoneType)/.test(routeCode) || /\{\s*[^}]*(dangerTier|zoneType)[^}]*\}\s*=\s*req\.body/.test(routeCode);
    expect(readsBodyTier).toBe(false);
    expect(routeCode.includes('const activeSessions = new Map()')).toBe(false);
  });

  it('T4: inventory use-item handles repellent_charm and Player model enum supports repellent_charm', () => {
    const invCode = fs.readFileSync(path.join(BOT_ROOT, 'web-api/routes/inventory.js'), 'utf8');
    const playerModelCode = fs.readFileSync(path.join(BOT_ROOT, 'models/Player.js'), 'utf8');
    expect(invCode.includes("item.effectType === 'repellent_charm'")).toBe(true);
    expect(playerModelCode.includes("'repellent_charm'")).toBe(true);
  });

  it('T5: settlement ring tier does not exceed settlement.tier + 1 on target settlements', () => {
    const anchors = JSON.parse(fs.readFileSync(path.join(BOT_ROOT, 'world-data/anchors.json'), 'utf8'));
    const targetIds = ['kota_canghai', 'desa_heiyan', 'pulau_penyu_raksasa', 'dusun_pondok_karang', 'kota_leiyin'];
    let violations = 0;

    for (const id of targetIds) {
      const anc = anchors.find(a => a.id === id);
      const R = anc.v20?.exclusionRadius || 10;
      const allowedMax = (anc.tier || 1) + 1;
      const t = proceduralWorldEngine.getTileAt(anc.x + R + 3, anc.y);
      const eff = worldRegionEngine.getEffectiveDanger(anc.x + R + 3, anc.y);
      if (t.dangerTier > allowedMax || eff > allowedMax) {
        violations++;
      }
    }
    expect(violations).toBe(0);
  });

  it('T6: route move does not contain legacy tebing message', () => {
    const worldCode = fs.readFileSync(path.join(BOT_ROOT, 'web-api/routes/world.js'), 'utf8');
    const legacyStr = 'Jalur terhalang rintangan tebing batu yang mustahil ditembus! Dibutuhkan artefak terbang spiritual.';
    expect(worldCode.includes(legacyStr)).toBe(false);
  });

  it('T7: docs and scripts do not contain hallucinated region tokens', () => {
    const regions = JSON.parse(fs.readFileSync(path.join(BOT_ROOT, 'world-data/regions.json'), 'utf8'));
    const canonicalIds = new Set(regions.map(r => r.id));
    const hallucinated = ['kunlun_foothills', 'hundred_thousand_hills', 'lei_ze_wasteland', 'everfrost_glacier', 'lost_desert', 'primordial_abyss'];
    const files = [
      path.join(BOT_ROOT, 'docs/SISTEM_ZONA_V23.md'),
      path.join(BOT_ROOT, 'scripts/v23/gateRunner.js'),
      path.join(BOT_ROOT, 'review/report_v23.md')
    ];
    let found = 0;
    for (const f of files) {
      if (fs.existsSync(f)) {
        const text = fs.readFileSync(f, 'utf8');
        for (const h of hallucinated) {
          if (text.includes(h) && !canonicalIds.has(h)) found++;
        }
      }
    }
    expect(found).toBe(0);
  });
});
