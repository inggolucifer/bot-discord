/**
 * resourceProfiles.js
 * Konfigurasi Pemetaan Sumber Daya Alam Bioma 22 Wilayah & Tag 20 Hukum Semesta (Law Cultivation)
 * Sesuai Master Plan docs/WORLD_MAP_MASTER_PLAN.md §4.5 (Bug B4 Fix)
 */

const REGION_RESOURCE_PROFILES = {
  central_plains: {
    primaryMaterials: ['Kayu Mentah', 'Serat Tumbuhan', 'Bijih Besi'],
    lawDrop: { key: 'merit_crystal', name: 'Kristal Kebajikan Murni', lawTag: 'righteous_heavenly_merit', chance: 0.15 }
  },
  azure_mountain_range: {
    primaryMaterials: ['Bambu Hijau Roh', 'Batu Bijih Azure', 'Pecahan Besi Kuno'],
    lawDrop: { key: 'sword_shard_essence', name: 'Serpihan Niat Pedang', lawTag: 'righteous_sword_heart', chance: 0.20 }
  },
  northern_desolate: {
    primaryMaterials: ['Akar Herba Beku', 'Batu Es Padat', 'Lumut Tundra'],
    lawDrop: { key: 'glacial_ice_core', name: 'Inti Es Glasial', lawTag: 'element_frozen_glacial', chance: 0.20 }
  },
  western_sacred_desert: {
    primaryMaterials: ['Pasir Emas Kristal', 'Batu Obsidian Panas', 'Akar Kaktus Suci'],
    lawDrop: { key: 'sun_flame_crystal', name: 'Kristal Api Surya', lawTag: 'righteous_pure_yang', chance: 0.20 }
  },
  eastern_sea: {
    primaryMaterials: ['Mutiara Laut Dalam', 'Karang Biru Roh', 'Sisik Ikan Arwana'],
    lawDrop: { key: 'azure_water_pearl', name: 'Mutiara Samudra Azure', lawTag: 'element_azure_water', chance: 0.20 }
  },
  southern_demon_domain: {
    primaryMaterials: ['Herba Beracun Gelap', 'Batu Tulang Iblis', 'Jamur Miasma'],
    lawDrop: { key: 'nether_shadow_essence', name: 'Intisari Bayangan Nether', lawTag: 'demonic_nether_darkness', chance: 0.20 }
  },
  floating_wind_isles: {
    primaryMaterials: ['Batu Angin Melayang', 'Bulu Burung Rajawali', 'Giok Awan'],
    lawDrop: { key: 'roc_wind_feather', name: 'Bulu Angin Burung Roc', lawTag: 'element_roc_wind', chance: 0.25 }
  }
};

function getRegionResourceProfile(regionSlug) {
  return REGION_RESOURCE_PROFILES[regionSlug] || REGION_RESOURCE_PROFILES.central_plains;
}

module.exports = {
  REGION_RESOURCE_PROFILES,
  getRegionResourceProfile
};
