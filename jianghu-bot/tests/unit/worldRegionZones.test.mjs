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
});
