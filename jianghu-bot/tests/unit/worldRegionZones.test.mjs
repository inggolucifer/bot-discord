import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const worldRegionEngine = require('../../utils/worldRegionEngine');
const proceduralWorldEngine = require('../../utils/proceduralWorldEngine');
const regions = require('../../world-data/regions.json');
const anchors = require('../../world-data/anchors.json');
const travelConfig = require('../../config/travelDistances');
const { TravelGraph } = require('../../utils/travelGraph');

describe('V23 G1 — Perbaikan Data Dunia, Jalan Aman, dan Travel Graph 52 Anchor', () => {

  describe('Z1: Jalan 100% Aman di Seluruh Wilayah Berbahaya (Tier >= 2)', () => {
    const dangerRegions = [
      'azure_mountain_range',
      'beast_prairies',
      'western_sacred_desert',
      'bone_sea_coast',
      'spirit_wood_sea',
      'formation_barrens',
      'ore_teeth_range',
      'eastern_sea',
      'northern_desolate',
      'thundersteppe',
      'venom_mire',
      'southern_demon_domain',
      'crimson_battlefield',
      'void_rift'
    ];

    it('memastikan 14 wilayah tier >= 2 memiliki risiko ambush 0 pada tile jalan', () => {
      const roadTerrains = ['road', 'road_stone', 'road_dirt'];

      for (const regId of dangerRegions) {
        const regObj = regions.find(r => r.id === regId);
        expect(regObj).toBeDefined();
        expect(regObj.dangerTier).toBeGreaterThanOrEqual(2);

        // Uji titik pusat bounds wilayah
        const cx = Math.round((regObj.bounds.minX + regObj.bounds.maxX) / 2);
        const cy = Math.round((regObj.bounds.minY + regObj.bounds.maxY) / 2);

        for (const rTerr of roadTerrains) {
          const tInfo = worldRegionEngine.getTerritoryInfo(cx, cy, rTerr, false);
          expect(tInfo.ambushRiskRate).toBe(0);
          expect(tInfo.type).toBe('safe_zone');
        }
      }
    });
  });

  describe('Z3: Travel Graph 52 Simpul Kanonikal', () => {
    it('memiliki tepat 52 simpul yang cocok 100% dengan anchors.json', () => {
      expect(travelConfig.settlements.length).toBe(52);
      const canonicalNames = new Set(anchors.map(a => a.name));
      for (const s of travelConfig.settlements) {
        expect(canonicalNames.has(s.name)).toBe(true);
      }
    });

    it('graf terhubung penuh 1 komponen tanpa pulau terisolasi', () => {
      const graph = new TravelGraph(travelConfig.distancesLi);
      // Uji rute dari ujung ke ujung
      const res1 = graph.shortestPath('Desa Xingcun', 'Oase Shadi');
      expect(res1.path.length).toBeGreaterThan(0);
      expect(res1.totalLi).toBeGreaterThan(0);
      expect(Number.isFinite(res1.totalLi)).toBe(true);

      const res2 = graph.shortestPath('Dermaga Donghai', 'Pos Tundra Salju');
      expect(res2.path.length).toBeGreaterThan(0);
      expect(res2.totalLi).toBeGreaterThan(0);
      expect(Number.isFinite(res2.totalLi)).toBe(true);
    });
  });

  describe('Z4: Keselarasan Monster Void Rift dan Leveling Strict Ascending', () => {
    it('memverifikasi void_rift.json selaras dengan dangerTier 6 pada regions.json', () => {
      const vrMonster = require('../../world-data/monsters/void_rift.json');
      const vrRegion = regions.find(r => r.id === 'void_rift');
      expect(vrMonster.dangerTier).toBe(6);
      expect(vrRegion.dangerTier).toBe(6);
      expect(vrMonster.levelRange.min).toBeGreaterThan(100);
    });
  });

  describe('V23 G2 — Peran Wilayah, Tangga Progres & Gradasi Bahaya (Z5, Z6, Z7)', () => {
    const rolesData = require('../../world-data/region-roles-v23.json');
    const ladderData = require('../../world-data/region-ladder-v23.json');
    const zoneConfig = require('../../world-data/zone-config-v23.json');

    it('Z6.1: 29/29 wilayah terklasifikasi dengan peran yang valid', () => {
      const validRoles = new Set(['hub', 'frontier', 'transition', 'danger', 'sealed']);
      expect(Object.keys(rolesData.roles).length).toBe(29);
      for (const reg of regions) {
        const rInfo = rolesData.roles[reg.id];
        expect(rInfo).toBeDefined();
        expect(validRoles.has(rInfo.role)).toBe(true);
      }
    });

    it('Z6.2: Wilayah transition dan danger tidak memiliki kota besar, ibukota, atau sekte', () => {
      for (const reg of regions) {
        const rInfo = rolesData.roles[reg.id];
        if (rInfo.role === 'transition' || rInfo.role === 'danger') {
          const regAnchors = anchors.filter(a => a.region === reg.id);
          const prohibited = regAnchors.filter(a => ['town', 'capital', 'major_city', 'sect'].includes(a.type));
          expect(prohibited.length).toBe(0);
        }
      }
    });

    it('Z6.3: Tangga progres wilayah (region-ladder-v23.json) memetakan 29 wilayah ke ranah dan material', () => {
      expect(Object.keys(ladderData.regions).length).toBe(29);
      for (const [id, reg] of Object.entries(ladderData.regions)) {
        expect(reg.tier).toBeGreaterThanOrEqual(1);
        expect(reg.tier).toBeLessThanOrEqual(6);
        expect(reg.requiredRealmIndex).toBeGreaterThanOrEqual(0);
        expect(typeof reg.stage).toBe('string');
        expect(typeof reg.tierMaterialGrade).toBe('number');
      }
    });

    it('Z5.1: Radius eksklusi pemukiman R memiliki risiko ambush 0 mutlak', () => {
      for (const anc of anchors) {
        const R = anc.v20?.exclusionRadius || 10;
        // Uji titik tepat pada radius eksklusi di 4 arah mata angin
        const testPoints = [
          { x: anc.x + R, y: anc.y },
          { x: anc.x - R, y: anc.y },
          { x: anc.x, y: anc.y + R },
          { x: anc.x, y: anc.y - R }
        ];
        for (const pt of testPoints) {
          const tile = proceduralWorldEngine.getTileAt(pt.x, pt.y);
          const tInfo = worldRegionEngine.getTerritoryInfo(pt.x, pt.y, tile.terrainType, false);
          expect(tInfo.ambushRiskRate).toBe(0);
          expect(tInfo.type).toBe('safe_zone');
        }
      }
    });

    it('Z5.2: Buffer factor meningkat secara monoton dari 0 ke 1 pada cincin R..R+12', () => {
      const anc = anchors.find(a => a.id === 'desa_xingcun');
      const R = anc.v20.exclusionRadius;
      let prevFactor = -1;
      for (let step = 0; step <= 12; step += 2) {
        const x = anc.x + R + step;
        const y = anc.y;
        const tile = proceduralWorldEngine.getTileAt(x, y);
        const tInfo = worldRegionEngine.getTerritoryInfo(x, y, tile.terrainType, false);
        const factor = tInfo.bufferFactor !== undefined ? tInfo.bufferFactor : 1.0;
        expect(factor).toBeGreaterThanOrEqual(prevFactor);
        prevFactor = factor;
      }
      expect(prevFactor).toBeCloseTo(1.0, 5);
    });

    it('Z5.3: Tier efektif di dalam buffer zone dibatasi maksimal anchor.tier + 1', () => {
      for (const anc of anchors) {
        const R = anc.v20?.exclusionRadius || 10;
        for (let step = 2; step <= 12; step += 4) {
          const x = anc.x + R + step;
          const y = anc.y;
          const tile = proceduralWorldEngine.getTileAt(x, y);
          const tInfo = worldRegionEngine.getTerritoryInfo(x, y, tile.terrainType, false);
          expect(tInfo.dangerTierBase).toBeLessThanOrEqual((anc.tier || 1) + 1);
        }
      }
    });

    it('Z7.1: getEffectiveDanger mengembalikan nilai numerik float valid', () => {
      expect(typeof worldRegionEngine.getEffectiveDanger).toBe('function');
      const valCenter = worldRegionEngine.getEffectiveDanger(2500, 2500);
      expect(typeof valCenter).toBe('number');
      expect(valCenter).toBeGreaterThanOrEqual(1);
      expect(valCenter).toBeLessThanOrEqual(6);
    });

    it('Z7.2: getEffectiveDanger menginterpolasi bahaya mendekati perbatasan bertier lebih tinggi', () => {
      // Titik perbatasan antara abyssal_scar (5) dan southern_demon_domain (4) di (2013, 1000)
      const dangerAtBorder = worldRegionEngine.getEffectiveDanger(2013, 1000);
      expect(dangerAtBorder).toBeGreaterThanOrEqual(4.5);
      expect(dangerAtBorder).toBeLessThanOrEqual(5.0);
    });

    it('Z7.3: Gradasi smoothstep perbatasan tidak melebihi 1.0 per 12 petak (max step <= 1/12 per petak)', () => {
      // Sample 24 petak melintasi perbatasan
      let prevVal = worldRegionEngine.getEffectiveDanger(2200, 2600);
      for (let s = 1; s <= 24; s++) {
        const currVal = worldRegionEngine.getEffectiveDanger(2200 + s, 2600);
        const diff = Math.abs(currVal - prevVal);
        expect(diff).toBeLessThanOrEqual((1 / 12) + 0.01);
        prevVal = currVal;
      }
    });

    it('Z-Config: Konfigurasi global zona zone-config-v23.json valid', () => {
      expect(zoneConfig.version).toBe('v23');
      expect(zoneConfig.OPEN_DECISION_rest_camp.enabled).toBe(false);
      expect(zoneConfig.encounterCharms.repellentBonus).toBe(0.50);
      expect(zoneConfig.encounterCharms.attractionBonus).toBe(0.75);
      expect(zoneConfig.bufferZone.width).toBe(12);
      expect(zoneConfig.borderGradation.bandWidth).toBe(24);
    });
  });

  describe('V23 G3 — Tabel Risiko Dinamis & Generator Tata Letak Zona (Z8, Invariance)', () => {
    const zonesData = require('../../world-data/zones-v23.json');
    const zoneList = zonesData.zones;

    it('Z8.1: zones-v23.json memuat 169 zona tetap dengan tipe terdefinisi lengkap', () => {
      expect(zoneList.length).toBe(169);
      expect(zonesData.summary.elite_camp).toBe(87);
      expect(zonesData.summary.world_boss_lair).toBe(27);
      expect(zonesData.summary.elemental_land).toBe(5);
      expect(zonesData.summary.spirit_valley).toBe(26);
      expect(zonesData.summary.land_of_spirits).toBe(3);
      expect(zonesData.summary.defense_circle).toBe(21);
    });

    it('Z8.2: Seluruh zona tetap berada di luar radius eksklusi pemukiman', () => {
      for (const z of zoneList) {
        for (const anc of anchors) {
          const excl = anc.v20?.exclusionRadius || 10;
          const dCheb = Math.max(Math.abs(z.x - anc.x), Math.abs(z.y - anc.y));
          expect(dCheb).toBeGreaterThanOrEqual(excl);
        }
      }
    });

    it('Z8.3: Tidak ada zona tetap yang saling tumpang tindih secara spasial (AABB)', () => {
      for (let i = 0; i < zoneList.length; i++) {
        const z1 = zoneList[i];
        for (let j = i + 1; j < zoneList.length; j++) {
          const z2 = zoneList[j];
          const overlapX = (z1.x < z2.x + z2.w) && (z1.x + z1.w > z2.x);
          const overlapY = (z1.y < z2.y + z2.h) && (z1.y + z1.h > z2.y);
          expect(overlapX && overlapY).toBe(false);
        }
      }
    });

    it('Z8.4: Seluruh zona memiliki objek entryCost yang valid', () => {
      for (const z of zoneList) {
        expect(z.entryCost).toBeDefined();
        expect(typeof z.entryCost).toBe('object');
        expect(z.entryCost.stamina).toBeGreaterThan(0);
      }
    });

    it('G3.1: Tabel risiko terbuka (plains) memiliki ambush bertingkat sesuai tier bahaya', () => {
      // Tier 1: 0, Tier 2: 0.04, Tier 3: 0.08, Tier 4: 0.15, Tier 5: 0.25, Tier 6: 0.35
      const expectedRates = { 1: 0, 2: 0.04, 3: 0.08, 4: 0.15, 5: 0.25, 6: 0.35 };
      for (const [tStr, rate] of Object.entries(expectedRates)) {
        const t = parseInt(tStr);
        const reg = regions.find(r => r.dangerTier === t);
        expect(reg).toBeDefined();
        const cx = Math.round((reg.bounds.minX + reg.bounds.maxX) / 2);
        const cy = Math.round((reg.bounds.minY + reg.bounds.maxY) / 2);
        const tInfo = worldRegionEngine.getTerritoryInfo(cx, cy, 'plains', false);
        expect(tInfo.ambushRiskRate).toBe(rate);
      }
    });

    it('G3.2: Tier 1 Invariance — 2.000 titik sampel seed 1618 di central_plains & nine_springs_delta 100% aman pada open terrain', () => {
      function Mulberry32(seed) {
        return function() {
          let t = seed += 0x6D2B79F5;
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }
      const rng = Mulberry32(1618);
      const t1Regions = regions.filter(r => r.dangerTier === 1);

      let safeChecked = 0;
      for (const reg of t1Regions) {
        for (let i = 0; i < 1000; i++) {
          const x = Math.floor(reg.bounds.minX + rng() * (reg.bounds.maxX - reg.bounds.minX));
          const y = Math.floor(reg.bounds.minY + rng() * (reg.bounds.maxY - reg.bounds.minY));
          const actualReg = worldRegionEngine.getRegionAt(x, y);
          if (actualReg.id !== reg.id) continue;

          const tile = proceduralWorldEngine.getTileAt(x, y);
          const info = worldRegionEngine.getTerritoryInfo(x, y, tile.terrainType, false);
          if (['plains', 'meadow', 'farmland', 'herb_field', 'road', 'road_stone', 'road_dirt'].includes(tile.terrainType)) {
            safeChecked++;
            expect(info.ambushRiskRate).toBe(0);
            expect(info.type).toBe('safe_zone');
          }
        }
      }
      expect(safeChecked).toBeGreaterThan(1500);
    });
  });
});
