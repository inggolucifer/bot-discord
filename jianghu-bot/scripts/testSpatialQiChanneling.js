/**
 * testSpatialQiChanneling.js
 * Verifikasi Authoritative Kepadatan Qi Spasial & Resonansi Afinitas Wilayah
 */
const { calculateChannelingProgress } = require('../utils/lawCultivationEngine');

console.log('=== TEST INTEGRASI SPASIAL QI MEDITASI & RESONANSI HUKUM ===\n');

// 1. Mock Player di Central Plains (Padang Biasa)
const playerPlains = {
  gridPosition: { tileX: 2500, tileY: 2500 },
  cultivationLaw: {
    activeLawType: 'righteous_pure_yang',
    isChanneling: true,
    lastChannelSyncAt: new Date(Date.now() - 60 * 60 * 1000), // 60 menit lalu
    currentEssence: 100,
    rank: 1,
    qi: 0,
    maxQi: 1000
  }
};

const resultPlains = calculateChannelingProgress(playerPlains);
console.log('1. Central Plains (X=2500, Y=2500):', {
  qiGained: resultPlains.qiGained,
  locationQiMultiplier: resultPlains.locationQiMultiplier,
  resonanceBonus: resultPlains.resonanceBonus,
  totalQiMultiplier: resultPlains.totalQiMultiplier
});

// 2. Mock Player di Azure Mountain Range dengan Law Pedang (Resonansi Afinitas)
const playerAzure = {
  gridPosition: { tileX: 2000, tileY: 3300 },
  cultivationLaw: {
    activeLawType: 'righteous_sword_heart',
    isChanneling: true,
    lastChannelSyncAt: new Date(Date.now() - 60 * 60 * 1000),
    currentEssence: 100,
    rank: 1,
    qi: 0,
    maxQi: 1000
  }
};

const resultAzure = calculateChannelingProgress(playerAzure);
console.log('2. Azure Mountain (X=2000, Y=3300) with Sword Heart Law:', {
  qiGained: resultAzure.qiGained,
  locationQiMultiplier: resultAzure.locationQiMultiplier,
  resonanceBonus: resultAzure.resonanceBonus,
  totalQiMultiplier: resultAzure.totalQiMultiplier
});

if (resultAzure.totalQiMultiplier > resultPlains.totalQiMultiplier) {
  console.log('\n[PASS] Wilayah pegunungan spiritual dan resonansi Law memberikan hasil Qi channeling lebih tinggi secara authoritative!');
} else {
  console.error('\n[FAIL] Kepadatan Qi spasial tidak memberikan multiplier yang diharapkan.');
  process.exit(1);
}
