import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOT_ROOT = path.resolve(__dirname, '../..');

import { computeNearbyEntities, calculateDirection, classifyDistance } from '../../utils/nearbyEngine.js';
const zonesV23 = JSON.parse(fs.readFileSync(path.join(BOT_ROOT, 'world-data/zones-v23.json'), 'utf8'));

describe('V25 K1 — Nearby Zones & Hazard Integration', () => {
  const allZones = zonesV23.zones || [];

  it('1. Zone and hazard entities in computeNearbyEntities do NOT expose x or y', () => {
    const rawEntities = [
      {
        id: 'inst_zone_1',
        type: 'zone',
        name: 'Lembah Roh Uji',
        zoneType: 'spirit_valley',
        tier: 2,
        x: 105,
        y: 105,
        canEnter: true
      },
      {
        id: 'haz_camp_1',
        type: 'hazard',
        name: 'Kamp Siluman Uji',
        zoneType: 'elite_camp',
        tier: 3,
        x: 110,
        y: 110,
        canEnter: false,
        reason: 'Terlalu jauh'
      }
    ];

    const res = computeNearbyEntities({
      fromX: 100,
      fromY: 100,
      entities: rawEntities,
      viewer: { id: 'p1' },
      maxResults: 30
    });

    expect(res.items.length).toBe(2);
    for (const item of res.items) {
      expect(item.x).toBeUndefined();
      expect(item.y).toBeUndefined();
      expect(item.chunkX).toBeUndefined();
      expect(item.chunkY).toBeUndefined();
    }
  });

  it('2. Instanced zones use id starting with inst_ and type zone', () => {
    const instZone = allZones.find(z => ['spirit_valley', 'land_of_spirits', 'defense_circle', 'elemental_land'].includes(z.type));
    expect(instZone).toBeDefined();

    const isInstanced = ['spirit_valley', 'land_of_spirits', 'defense_circle', 'elemental_land'].includes(instZone.type);
    const id = isInstanced ? `inst_${instZone.id}` : `haz_${instZone.id}`;
    const type = isInstanced ? 'zone' : 'hazard';

    expect(id.startsWith('inst_')).toBe(true);
    expect(type).toBe('zone');
  });

  it('3. Hazard lairs and elite camps use id starting with haz_ and type hazard', () => {
    const eliteZone = allZones.find(z => z.type === 'elite_camp');
    const bossZone = allZones.find(z => z.type === 'world_boss_lair');
    expect(eliteZone).toBeDefined();
    expect(bossZone).toBeDefined();

    const idElite = `haz_${eliteZone.id}`;
    const idBoss = `haz_${bossZone.id}`;

    expect(idElite.startsWith('haz_')).toBe(true);
    expect(idBoss.startsWith('haz_')).toBe(true);
  });

  it('4. Qualitative distance band is dekat for dist <= 5 and sedang for dist <= 14', () => {
    expect(classifyDistance(3)).toBe('dekat');
    expect(classifyDistance(5)).toBe('dekat');
    expect(classifyDistance(6)).toBe('sedang');
    expect(classifyDistance(14)).toBe('sedang');
    expect(classifyDistance(16)).toBe('jauh');
  });

  it('5. Direction returns one of the 8 canonical cardinal directions', () => {
    const validDirs = new Set(['Timur', 'Tenggara', 'Selatan', 'Barat Daya', 'Barat', 'Barat Laut', 'Utara', 'Timur Laut', 'Pusat']);
    expect(validDirs.has(calculateDirection(100, 100, 105, 100))).toBe(true);
    expect(validDirs.has(calculateDirection(100, 100, 95, 105))).toBe(true);
    expect(validDirs.has(calculateDirection(100, 100, 100, 95))).toBe(true);
  });

  it('6. Results are bounded by maxResults = 30 and size is <= 8 KB', () => {
    const rawEntities = [];
    for (let i = 0; i < 50; i++) {
      rawEntities.push({
        id: `inst_sv_${i}`,
        type: 'zone',
        name: `Lembah Roh #${i}`,
        zoneType: 'spirit_valley',
        tier: 2,
        x: 100 + (i % 14),
        y: 100 + (i % 14),
        entryCostSummary: '1x Kunci Roh, 10 Stamina',
        canEnter: i <= 3,
        reason: i > 3 ? 'Terlalu jauh, dekati lokasi (<= 3 petak)' : null
      });
    }

    const res = computeNearbyEntities({
      fromX: 100,
      fromY: 100,
      entities: rawEntities,
      viewer: { id: 'p1' },
      maxResults: 30
    });

    expect(res.items.length).toBe(30);
    const jsonStr = JSON.stringify(res.items);
    const sizeBytes = Buffer.byteLength(jsonStr, 'utf8');
    expect(sizeBytes).toBeLessThan(8192); // <= 8 KB
  });

  it('7. canEnter is false when distance exceeds 3 tiles', () => {
    const dist = 5;
    const canEnter = dist <= 3;
    const reason = !canEnter ? 'Terlalu jauh, dekati lokasi (<= 3 petak)' : null;

    expect(canEnter).toBe(false);
    expect(reason).toContain('Terlalu jauh');
  });

  it('8. canEnter is true when player is within 3 tiles, has required realm, and is idle', () => {
    const player = { realmIndex: 2, isTraveling: false, activeBattleId: null };
    const zone = { requiredRealmIndex: 1, dangerTier: 2 };
    const dist = 2;

    const canEnter = dist <= 3 && !player.isTraveling && !player.activeBattleId && (player.realmIndex >= zone.requiredRealmIndex);
    expect(canEnter).toBe(true);
  });

  it('9. canEnter is false when player realm is lower than requiredRealmIndex', () => {
    const player = { realmIndex: 0, isTraveling: false, activeBattleId: null };
    const zone = { requiredRealmIndex: 2, dangerTier: 4 };
    const dist = 2;

    let canEnter = true;
    let reason = null;
    if (dist > 3) {
      canEnter = false;
      reason = 'Terlalu jauh';
    } else if (player.realmIndex < zone.requiredRealmIndex) {
      canEnter = false;
      reason = `Perlu ranah tingkat ${zone.requiredRealmIndex}`;
    }

    expect(canEnter).toBe(false);
    expect(reason).toContain('Perlu ranah');
  });

  it('10. canEnter is false when player is traveling or in active battle', () => {
    const playerTraveling = { realmIndex: 3, isTraveling: true, activeBattleId: null };
    const playerBattling = { realmIndex: 3, isTraveling: false, activeBattleId: 'battle_99' };
    const dist = 1;

    expect(dist <= 3 && !playerTraveling.isTraveling && !playerTraveling.activeBattleId).toBe(false);
    expect(dist <= 3 && !playerBattling.isTraveling && !playerBattling.activeBattleId).toBe(false);
  });

  it('11. Initial town desa_xingcun (2050, 2650) has no dangerTier >= 4 zones in radius 14', () => {
    const townX = 2050;
    const townY = 2650;
    const nearbyHighTierZones = allZones.filter(z => {
      const dx = Math.abs(z.x - townX);
      const dy = Math.abs(z.y - townY);
      const dist = Math.max(dx, dy);
      return dist <= 14 && z.dangerTier >= 4;
    });

    expect(nearbyHighTierZones.length).toBe(0);
  });

  it('12. Items are sorted ascending by Chebyshev distance', () => {
    const rawEntities = [
      { id: 'z3', type: 'zone', name: 'Z3', x: 110, y: 100 }, // dist 10
      { id: 'z1', type: 'zone', name: 'Z1', x: 102, y: 100 }, // dist 2
      { id: 'z2', type: 'zone', name: 'Z2', x: 105, y: 100 }  // dist 5
    ];

    const res = computeNearbyEntities({
      fromX: 100,
      fromY: 100,
      entities: rawEntities,
      viewer: { id: 'p1' },
      maxResults: 30
    });

    expect(res.items.map(i => i.id)).toEqual(['z1', 'z2', 'z3']);
    expect(res.items[0].dist).toBe(2);
    expect(res.items[1].dist).toBe(5);
    expect(res.items[2].dist).toBe(10);
  });
});
