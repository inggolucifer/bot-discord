/**
 * starterKits.js
 * Konfigurasi 7 Titik Kelahiran Karakter Baru (Origin Spawn Biome/Faction) & Starter Kits Otoritatif
 * Sesuai Master Plan docs/WORLD_MAP_MASTER_PLAN.md §4.2
 */

const ORIGIN_SPAWNS = {
  central_plains: {
    id: 'central_plains',
    name: 'Dataran Tengah (Desa Xingcun)',
    title: 'Anak Petani Bunga Aprikot',
    description: 'Terlahir di desa petani yang damai dan asri di tengah benua. Wilayah paling aman untuk pemula tanpa ancaman binatang buas buas.',
    difficulty: 'Sangat Mudah (Pemula)',
    dangerTier: 1,
    spawnCoords: { zoneId: 'tianyuan_world_map', tileX: 2455, tileY: 2485 },
    regionSlug: 'central_plains',
    settlementName: 'Desa Xingcun',
    starterKit: {
      copper: 100,
      silver: 0,
      stamina: 100,
      hp: 100,
      bonusStats: { sta: 2, con: 1 },
      items: [
        { key: 'herb_healing_minor', name: 'Herba Penyembuh', quantity: 3 },
        { key: 'iron_ore_coarse', name: 'Batu Besi Mentah', quantity: 2 }
      ]
    }
  },
  azure_foothills: {
    id: 'azure_foothills',
    name: 'Kaki Pegunungan Azure (Tri-Sect Outpost)',
    title: 'Murid Luar Pegunungan Pedang',
    description: 'Terlahir di pondok lereng pegunungan batu tempat murid sekte pedang bertapa. Udara sejuk dan penuh energi pedang tajam.',
    difficulty: 'Normal',
    dangerTier: 2,
    spawnCoords: { zoneId: 'tianyuan_world_map', tileX: 1820, tileY: 2320 },
    regionSlug: 'azure_mountain_range',
    settlementName: 'Tri-Sect Mountain Outpost',
    starterKit: {
      copper: 50,
      silver: 1,
      stamina: 100,
      hp: 105,
      bonusStats: { str: 2, agi: 1 },
      items: [
        { key: 'azure_iron_shard', name: 'Pecahan Besi Azure', quantity: 2 },
        { key: 'spirit_bamboo_tea', name: 'Teh Bambu Roh', quantity: 2 }
      ]
    }
  },
  northern_ice: {
    id: 'northern_ice',
    name: 'Tundra Salju Abadi (Pos Salju Utara)',
    title: 'Pengembara Badai Salju',
    description: 'Terlahir di pos karavan beku berselimutkan badai es. Tubuh ditempa oleh hawa dingin ekstrem sejak dini.',
    difficulty: 'Menantang',
    dangerTier: 3,
    spawnCoords: { zoneId: 'tianyuan_world_map', tileX: 2120, tileY: 4180 },
    regionSlug: 'northern_desolate',
    settlementName: 'Pos Tundra Utara',
    starterKit: {
      copper: 40,
      silver: 0,
      stamina: 110,
      hp: 110,
      bonusStats: { con: 3, sta: 1 },
      items: [
        { key: 'warming_wine', name: 'Arak Penghangat Tubuh', quantity: 3 },
        { key: 'glacial_ice_flake', name: 'Serpihan Es Abadi', quantity: 1 }
      ]
    }
  },
  western_desert: {
    id: 'western_desert',
    name: 'Gurun Suci Barat (Oasis Barat)',
    title: 'Penjelajah Lautan Pasir',
    description: 'Terlahir di tepi oasis air jernih yang dikelilingi badai debu emas dan kuil pemujaan matahari.',
    difficulty: 'Menantang',
    dangerTier: 3,
    spawnCoords: { zoneId: 'tianyuan_world_map', tileX: 820, tileY: 2220 },
    regionSlug: 'western_sacred_desert',
    settlementName: 'Oasis Barat',
    starterKit: {
      copper: 60,
      silver: 0,
      stamina: 115,
      hp: 95,
      bonusStats: { agi: 2, sta: 2 },
      items: [
        { key: 'water_skin_fresh', name: 'Kantung Air Dingin', quantity: 3 },
        { key: 'sun_sand_ore', name: 'Pasir Kristal Emas', quantity: 2 }
      ]
    }
  },
  eastern_sea_port: {
    id: 'eastern_sea_port',
    name: 'Pesisir Samudra Timur (Pelabuhan Timur)',
    title: 'Pelaut Ombak Karang',
    description: 'Terlahir di kota dermaga kayu yang ramai dengan aroma garam laut, suara burung camar, dan rakit bambu penyeberangan.',
    difficulty: 'Normal',
    dangerTier: 2,
    spawnCoords: { zoneId: 'tianyuan_world_map', tileX: 3900, tileY: 2500 },
    regionSlug: 'eastern_sea',
    settlementName: 'Pelabuhan Timur',
    starterKit: {
      copper: 80,
      silver: 1,
      stamina: 100,
      hp: 100,
      bonusStats: { int: 2, agi: 1 },
      items: [
        { key: 'sea_fish_cured', name: 'Ikan Kering Asin', quantity: 3 },
        { key: 'pearl_powder_vial', name: 'Serbuk Mutiara Laut', quantity: 1 }
      ]
    }
  },
  southern_demon_border: {
    id: 'southern_demon_border',
    name: 'Batas Domain Iblis (Scar of Heaven Camp)',
    title: 'Pewaris Lembah Kabut Gelap',
    description: 'Terlahir di benteng pengawas tepi luka langit. Tempat bertemunya murid faksi sesat dan kultivator liar yang menguji nyali.',
    difficulty: 'Keras / Bahaya',
    dangerTier: 4,
    spawnCoords: { zoneId: 'tianyuan_world_map', tileX: 2300, tileY: 1900 },
    regionSlug: 'southern_demon_domain',
    settlementName: 'Scar of Heaven Camp',
    starterKit: {
      copper: 30,
      silver: 2,
      stamina: 95,
      hp: 115,
      bonusStats: { str: 2, con: 2 },
      items: [
        { key: 'miasma_antidote', name: 'Pil Penangkal Miasma', quantity: 2 },
        { key: 'demon_bone_shard', name: 'Serpihan Tulang Iblis', quantity: 1 }
      ]
    }
  },
  mist_insect_valley: {
    id: 'mist_insect_valley',
    name: 'Lembah Kabut Racun (Lembah Kabut Merah)',
    title: 'Kolektor Herba Beracun',
    description: 'Terlahir di pondok tersembunyi berawa lembap tempat tumbuhnya herba eksotis dan serangga berbisa.',
    difficulty: 'Menantang',
    dangerTier: 3,
    spawnCoords: { zoneId: 'tianyuan_world_map', tileX: 2350, tileY: 2420 },
    regionSlug: 'central_plains',
    settlementName: 'Lembah Kabut Merah',
    starterKit: {
      copper: 50,
      silver: 0,
      stamina: 100,
      hp: 100,
      bonusStats: { int: 3, sta: 1 },
      items: [
        { key: 'toxic_herb_stalk', name: 'Batang Herba Beracun', quantity: 3 },
        { key: 'detox_pill_coarse', name: 'Pil Pembersih Racun', quantity: 2 }
      ]
    }
  }
};

function getOriginSpawn(originId) {
  return ORIGIN_SPAWNS[originId] || ORIGIN_SPAWNS.central_plains;
}

module.exports = {
  ORIGIN_SPAWNS,
  getOriginSpawn
};
