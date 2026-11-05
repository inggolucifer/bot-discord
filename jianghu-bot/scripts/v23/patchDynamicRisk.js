// scripts/v23/patchDynamicRisk.js
const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../../utils/worldRegionEngine.js');
let code = fs.readFileSync(targetFile, 'utf8').replace(/\r?\n/g, '\r\n');

const oldBlock = `  const region = getRegionAt(x, y);

  // 3. Dataran Terbuka Biasa (Plains/Meadow/Farmland): Selalu AMAN (Zero Ambush) kecuali ada World Event
  if ((terrainType === 'plains' || terrainType === 'meadow' || terrainType === 'farmland' || terrainType === 'herb_field') && !isWorldEventActive) {
    if (region.dangerTier === 5) {
      return { type: 'death_zone', ambushRiskRate: 0.25, dangerTierBase: 5 };
    }
    return {
      type: 'safe_zone',
      ambushRiskRate: 0,
      dangerTierBase: Math.min(region.dangerTier, 2)
    };
  }

  // 4. ZONA BAHAYA ALAM LIAR (HUNTING, FARMING & AMBUSH SUB-ZONES)
  // A. Hutan Bambu & Pohon Roh
  if (terrainType === 'bamboo_forest' || terrainType === 'bamboo_grove' || terrainType === 'bamboo_dense') {
    return {
      type: 'hunting_zone',
      ambushRiskRate: 0.18,
      dangerTierBase: Math.max(2, region.dangerTier)
    };
  }

  // B. Rimba Belantara Purba
  if (terrainType === 'forest' || terrainType === 'spirit_wood' || terrainType === 'dead_wood' || terrainType === 'mist_forest') {
    return {
      type: 'hunting_zone',
      ambushRiskRate: 0.22,
      dangerTierBase: Math.max(2, region.dangerTier)
    };
  }

  // C. Rawa Racun Miasma & Lembah Terlarang
  if (terrainType === 'swamp' || terrainType === 'demonic_swamp' || terrainType === 'venom_mire' || terrainType === 'miasma_waste' || terrainType === 'poison_pool') {
    return {
      type: 'danger_zone',
      ambushRiskRate: 0.32,
      dangerTierBase: Math.max(4, region.dangerTier)
    };
  }

  // D. Tebing Pegunungan Cadas & Bukit
  if (terrainType === 'mountain' || terrainType === 'azure_mountain' || terrainType === 'mountain_rock' || terrainType === 'mountain_peak' || terrainType === 'cliff' || terrainType === 'hill' || terrainType === 'ridge_low') {
    return {
      type: 'danger_zone',
      ambushRiskRate: 0.28,
      dangerTierBase: Math.max(3, region.dangerTier)
    };
  }

  // E. Kawah Magma & Medan Abu Tempur
  if (terrainType === 'volcanic' || terrainType === 'lava_spine' || terrainType === 'lava_flow' || terrainType === 'basalt' || terrainType === 'battlefield_ash' || terrainType === 'abyss_edge' || terrainType === 'crater') {
    return {
      type: 'death_zone',
      ambushRiskRate: 0.40,
      dangerTierBase: 5
    };
  }

  // F. Gurun Pasir Suci & Ngarai
  if (terrainType === 'western_desert' || terrainType === 'desert' || terrainType === 'desert_sand' || terrainType === 'dune' || terrainType === 'canyon' || terrainType === 'canyon_floor' || terrainType === 'lightning_scar') {
    return {
      type: 'hunting_zone',
      ambushRiskRate: 0.25,
      dangerTierBase: Math.max(3, region.dangerTier)
    };
  }

  // G. Gletser Salju Beku
  if (terrainType === 'glacial' || terrainType === 'northern_glacial' || terrainType === 'snow' || terrainType === 'glacier' || terrainType === 'ice_crack') {
    return {
      type: 'danger_zone',
      ambushRiskRate: 0.30,
      dangerTierBase: Math.max(4, region.dangerTier)
    };
  }

  // H. Perairan Ombak Bebas, Danau & Samudra, Pulau Karang
  if (terrainType === 'ocean' || terrainType === 'sea' || terrainType === 'sea_reef' || terrainType === 'island_reef' || terrainType === 'lake' || terrainType === 'lake_deep' || terrainType === 'ice_sea' || terrainType === 'eastern_sea' || terrainType === 'river_shallow') {
    return {
      type: 'hunting_zone',
      ambushRiskRate: 0.18,
      dangerTierBase: Math.max(3, region.dangerTier)
    };
  }

  // H2. Formasi Rusak & Pulau Melayang
  if (terrainType === 'formation_tile' || terrainType === 'floating_stone') {
    return {
      type: 'danger_zone',
      ambushRiskRate: 0.28,
      dangerTierBase: Math.max(3, region.dangerTier)
    };
  }

  // I. Jalur Celah Gerbang Lintasan Gunung (Pass)
  if (terrainType === 'mountain_pass' || terrainType === 'sword_gorge_pass') {
    return {
      type: 'calm_zone',
      ambushRiskRate: 0.05,
      dangerTierBase: 2
    };
  }`.replace(/\r?\n/g, '\r\n');

const newBlock = `  const region = getRegionAt(x, y);
  const tier = Math.max(1, Math.min(6, region.dangerTier));

  // 3. Dataran Terbuka (Plains/Meadow/Farmland/Herb_field) — V23 Tabel Risiko Terbuka per Tier (R4, R8)
  if (terrainType === 'plains' || terrainType === 'meadow' || terrainType === 'farmland' || terrainType === 'herb_field') {
    if (isWorldEventActive) {
      return {
        type: 'danger_zone',
        ambushRiskRate: 0.25,
        dangerTierBase: Math.max(2, tier)
      };
    }
    // Tier 1: 0 (wilayah pemula tetap 100% aman), Tier 2: 0.04, Tier 3: 0.08, Tier 4: 0.15, Tier 5: 0.25, Tier 6: 0.35
    const OPEN_TERRAIN_AMBUSH = { 1: 0, 2: 0.04, 3: 0.08, 4: 0.15, 5: 0.25, 6: 0.35 };
    const ambushRate = OPEN_TERRAIN_AMBUSH[tier] || 0;
    if (ambushRate === 0) {
      return {
        type: 'safe_zone',
        ambushRiskRate: 0,
        dangerTierBase: 1
      };
    }
    const zoneType = tier >= 5 ? 'death_zone' : (tier >= 3 ? 'danger_zone' : 'hunting_zone');
    return {
      type: zoneType,
      ambushRiskRate: ambushRate,
      dangerTierBase: tier
    };
  }

  // 4. ZONA BAHAYA ALAM LIAR (HUNTING, FARMING & AMBUSH SUB-ZONES)
  // Koefisien tier lebat: [1.0, 1.0, 1.1, 1.2, 1.3, 1.4], batas maksimal <= 0.50
  const TIER_COEFFS = [1.0, 1.0, 1.1, 1.2, 1.3, 1.4];
  const coeff = TIER_COEFFS[tier - 1];
  const scaleAmbush = (baseRate) => Math.min(0.50, Math.round(baseRate * coeff * 10000) / 10000);

  // A. Hutan Bambu & Pohon Roh
  if (terrainType === 'bamboo_forest' || terrainType === 'bamboo_grove' || terrainType === 'bamboo_dense') {
    return {
      type: 'hunting_zone',
      ambushRiskRate: scaleAmbush(0.18),
      dangerTierBase: Math.max(2, tier)
    };
  }

  // B. Rimba Belantara Purba
  if (terrainType === 'forest' || terrainType === 'spirit_wood' || terrainType === 'dead_wood' || terrainType === 'mist_forest') {
    return {
      type: 'hunting_zone',
      ambushRiskRate: scaleAmbush(0.22),
      dangerTierBase: Math.max(2, tier)
    };
  }

  // C. Rawa Racun Miasma & Lembah Terlarang
  if (terrainType === 'swamp' || terrainType === 'demonic_swamp' || terrainType === 'venom_mire' || terrainType === 'miasma_waste' || terrainType === 'poison_pool') {
    return {
      type: 'danger_zone',
      ambushRiskRate: scaleAmbush(0.32),
      dangerTierBase: Math.max(4, tier)
    };
  }

  // D. Tebing Pegunungan Cadas & Bukit
  if (terrainType === 'mountain' || terrainType === 'azure_mountain' || terrainType === 'mountain_rock' || terrainType === 'mountain_peak' || terrainType === 'cliff' || terrainType === 'hill' || terrainType === 'ridge_low') {
    return {
      type: 'danger_zone',
      ambushRiskRate: scaleAmbush(0.28),
      dangerTierBase: Math.max(3, tier)
    };
  }

  // E. Kawah Magma & Medan Abu Tempur
  if (terrainType === 'volcanic' || terrainType === 'lava_spine' || terrainType === 'lava_flow' || terrainType === 'basalt' || terrainType === 'battlefield_ash' || terrainType === 'abyss_edge' || terrainType === 'crater') {
    return {
      type: 'death_zone',
      ambushRiskRate: scaleAmbush(0.40),
      dangerTierBase: Math.max(5, tier)
    };
  }

  // F. Gurun Pasir Suci & Ngarai
  if (terrainType === 'western_desert' || terrainType === 'desert' || terrainType === 'desert_sand' || terrainType === 'dune' || terrainType === 'canyon' || terrainType === 'canyon_floor' || terrainType === 'lightning_scar') {
    return {
      type: 'hunting_zone',
      ambushRiskRate: scaleAmbush(0.25),
      dangerTierBase: Math.max(3, tier)
    };
  }

  // G. Gletser Salju Beku
  if (terrainType === 'glacial' || terrainType === 'northern_glacial' || terrainType === 'snow' || terrainType === 'glacier' || terrainType === 'ice_crack') {
    return {
      type: 'danger_zone',
      ambushRiskRate: scaleAmbush(0.30),
      dangerTierBase: Math.max(4, tier)
    };
  }

  // H. Perairan Ombak Bebas, Danau & Samudra, Pulau Karang
  if (terrainType === 'ocean' || terrainType === 'sea' || terrainType === 'sea_reef' || terrainType === 'island_reef' || terrainType === 'lake' || terrainType === 'lake_deep' || terrainType === 'ice_sea' || terrainType === 'eastern_sea' || terrainType === 'river_shallow') {
    return {
      type: 'hunting_zone',
      ambushRiskRate: scaleAmbush(0.18),
      dangerTierBase: Math.max(3, tier)
    };
  }

  // H2. Formasi Rusak & Pulau Melayang
  if (terrainType === 'formation_tile' || terrainType === 'floating_stone') {
    return {
      type: 'danger_zone',
      ambushRiskRate: scaleAmbush(0.28),
      dangerTierBase: Math.max(3, tier)
    };
  }

  // I. Jalur Celah Gerbang Lintasan Gunung (Pass)
  if (terrainType === 'mountain_pass' || terrainType === 'sword_gorge_pass') {
    return {
      type: 'calm_zone',
      ambushRiskRate: 0.05,
      dangerTierBase: 2
    };
  }`.replace(/\r?\n/g, '\r\n');

if (code.includes(oldBlock)) {
  code = code.replace(oldBlock, newBlock);
  fs.writeFileSync(targetFile, code, 'utf8');
  console.log('[SUCCESS] worldRegionEngine.js updated with dynamic risk table per tier.');
} else {
  console.error('[ERROR] oldBlock not found in worldRegionEngine.js');
  process.exit(1);
}
