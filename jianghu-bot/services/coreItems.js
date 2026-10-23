/**
 * services/coreItems.js
 * Seeder Idempoten Item Inti Dunia & Ikan Regional
 * Menjamin 4 item panen dunia dan seluruh fauna perairan terdaftar di database MongoDB.
 */

const Item = require('../models/Item');

const CORE_ITEMS_DEFINITIONS = [
  // 1. Empat Bahan Pokok Panen Dunia (Fase 14)
  {
    name: 'Herba Roh Bunga Melati',
    category: 'material',
    type: 'material',
    materialSubtype: 'herb',
    rarity: 'common',
    tier: 1,
    buyPrice: 15,
    sellPrice: 8,
    description: 'Bunga melati spiritual dengan aroma menenangkan, bahan dasar alkimia pil pemurni batin.',
    weight: 0.1,
    isTradeable: true
  },
  {
    name: 'Bijih Besi Roh Murni',
    category: 'material',
    type: 'material',
    materialSubtype: 'ore',
    rarity: 'common',
    tier: 1,
    buyPrice: 20,
    sellPrice: 10,
    description: 'Bijih besi murni yang menyerap energi urat bumi, bahan pokok penempaan pedang dan zirah dasar.',
    weight: 0.5,
    isTradeable: true
  },
  {
    name: 'Kayu Cendana Spiritual',
    category: 'material',
    type: 'material',
    materialSubtype: 'wood',
    rarity: 'common',
    tier: 1,
    buyPrice: 18,
    sellPrice: 9,
    description: 'Kayu wangi berkualitas tinggi yang tahan lapuk, digunakan untuk konstruksi pondok dan gagang senjata.',
    weight: 0.4,
    isTradeable: true
  },
  {
    name: 'Ikan Mas Sisik Emas',
    category: 'material',
    type: 'material',
    materialSubtype: 'fish',
    rarity: 'common',
    tier: 1,
    buyPrice: 25,
    sellPrice: 12,
    description: 'Ikan mas dengan sisik berkilau keemasan yang berenang di perairan tenang dataran tengah.',
    weight: 0.3,
    isTradeable: true
  },

  // 2. Fauna Ikan Regional & Kolam Interior
  {
    name: 'Ikan Koi Pelangi',
    category: 'material',
    type: 'material',
    materialSubtype: 'fish',
    rarity: 'rare',
    tier: 2,
    buyPrice: 60,
    sellPrice: 30,
    description: 'Ikan koi anggun pembawa keberuntungan dengan corak lima warna spiritual.',
    weight: 0.35,
    isTradeable: true
  },
  {
    name: 'Ikan Roh Sisik Biru',
    category: 'material',
    type: 'material',
    materialSubtype: 'fish',
    rarity: 'common',
    tier: 1,
    buyPrice: 22,
    sellPrice: 11,
    description: 'Ikan sungai gesit bersisik biru kehijauan, sering diburu untuk santapan bergizi pendekar.',
    weight: 0.25,
    isTradeable: true
  },
  {
    name: 'Belut Listrik Spiritual',
    category: 'material',
    type: 'material',
    materialSubtype: 'fish',
    rarity: 'rare',
    tier: 2,
    buyPrice: 75,
    sellPrice: 40,
    description: 'Belut berlendir yang memancarkan percikan petir halus saat disentuh joran.',
    weight: 0.5,
    isTradeable: true
  },
  {
    name: 'Ikan Salmon Giok Dingin',
    category: 'material',
    type: 'material',
    materialSubtype: 'fish',
    rarity: 'epic',
    tier: 3,
    buyPrice: 180,
    sellPrice: 90,
    description: 'Ikan langka yang hanya hidup di hulu sungai beku pegunungan utara, dagingnya dingin bagai es batu.',
    weight: 0.6,
    isTradeable: true
  },
  {
    name: 'Ikan Mujair Mata Air Delta',
    category: 'material',
    type: 'material',
    materialSubtype: 'fish',
    rarity: 'common',
    tier: 1,
    buyPrice: 24,
    sellPrice: 12,
    description: 'Ikan air tawar gurih yang melimpah ruah di labirin delta sembilan mata air.',
    weight: 0.3,
    isTradeable: true
  },
  {
    name: 'Ikan Lele Purba Danau Cermin',
    category: 'material',
    type: 'material',
    materialSubtype: 'fish',
    rarity: 'rare',
    tier: 2,
    buyPrice: 85,
    sellPrice: 45,
    description: 'Ikan lele berkumis panjang yang hidup di kedalaman danau cermin, memiliki daging padat dan liat.',
    weight: 0.8,
    isTradeable: true
  },
  {
    name: 'Ikan Gabus Rawa Miasma',
    category: 'material',
    type: 'material',
    materialSubtype: 'fish',
    rarity: 'rare',
    tier: 2,
    buyPrice: 70,
    sellPrice: 35,
    description: 'Ikan karnivora rawa berlumpur dengan daya tahan luar biasa terhadap racun dan miasma.',
    weight: 0.45,
    isTradeable: true
  },
  {
    name: 'Ikan Arwana Emas Langit',
    category: 'material',
    type: 'material',
    materialSubtype: 'fish',
    rarity: 'legendary',
    tier: 4,
    buyPrice: 500,
    sellPrice: 250,
    description: 'Ikan legendaris bertanduk naga kecil yang berenang anggun di mata air para dewa abadi.',
    weight: 1.0,
    isTradeable: true
  },
  {
    name: 'Ikan Roh Kolam Kediaman',
    category: 'material',
    type: 'material',
    materialSubtype: 'fish',
    rarity: 'common',
    tier: 1,
    buyPrice: 18,
    sellPrice: 9,
    description: 'Ikan jinak yang dibudidayakan di kolam buatan dalam interior hunian pendekar.',
    weight: 0.2,
    isTradeable: true
  }
];

// Tabel Ikan per Region (Katalog Ekologis Dunia Jianghu)
const REGIONAL_FISH_TABLES = {
  // Region Air & Delta
  nine_springs_delta: [
    { name: 'Ikan Mujair Mata Air Delta', weight: 45, difficulty: 1 },
    { name: 'Ikan Mas Sisik Emas', weight: 30, difficulty: 2 },
    { name: 'Ikan Koi Pelangi', weight: 18, difficulty: 3 },
    { name: 'Belut Listrik Spiritual', weight: 7, difficulty: 4 }
  ],
  mirror_lake: [
    { name: 'Ikan Mas Sisik Emas', weight: 40, difficulty: 1 },
    { name: 'Ikan Roh Sisik Biru', weight: 35, difficulty: 2 },
    { name: 'Ikan Lele Purba Danau Cermin', weight: 20, difficulty: 3 },
    { name: 'Ikan Arwana Emas Langit', weight: 5, difficulty: 5 }
  ],
  // Region Dataran Rendah
  central_plains: [
    { name: 'Ikan Mas Sisik Emas', weight: 50, difficulty: 1 },
    { name: 'Ikan Roh Sisik Biru', weight: 35, difficulty: 2 },
    { name: 'Ikan Koi Pelangi', weight: 15, difficulty: 3 }
  ],
  // Region Pegunungan & Tebing
  azure_mountain_range: [
    { name: 'Ikan Roh Sisik Biru', weight: 50, difficulty: 2 },
    { name: 'Belut Listrik Spiritual', weight: 35, difficulty: 3 },
    { name: 'Ikan Salmon Giok Dingin', weight: 15, difficulty: 4 }
  ],
  // Region Es & Salju Utara
  northern_desolate: [
    { name: 'Ikan Roh Sisik Biru', weight: 40, difficulty: 2 },
    { name: 'Ikan Salmon Giok Dingin', weight: 50, difficulty: 3 },
    { name: 'Ikan Arwana Emas Langit', weight: 10, difficulty: 5 }
  ],
  // Region Rawa & Racun
  venom_mire: [
    { name: 'Ikan Gabus Rawa Miasma', weight: 65, difficulty: 2 },
    { name: 'Belut Listrik Spiritual', weight: 30, difficulty: 3 },
    { name: 'Ikan Arwana Emas Langit', weight: 5, difficulty: 5 }
  ],
  // Kolam Interior Properti
  interior: [
    { name: 'Ikan Roh Kolam Kediaman', weight: 70, difficulty: 1 },
    { name: 'Ikan Mas Sisik Emas', weight: 25, difficulty: 2 },
    { name: 'Ikan Koi Pelangi', weight: 5, difficulty: 3 }
  ],
  // Default Perairan Umum
  default: [
    { name: 'Ikan Mas Sisik Emas', weight: 50, difficulty: 1 },
    { name: 'Ikan Roh Sisik Biru', weight: 35, difficulty: 2 },
    { name: 'Ikan Koi Pelangi', weight: 15, difficulty: 3 }
  ]
};

/**
 * Menjamin keberadaan seluruh item inti panen dan ikan secara idempoten
 */
async function ensureCoreItems() {
  console.log('[CORE-ITEMS] Memeriksa dan menyelaraskan katalog item inti dunia...');
  let createdCount = 0;
  let updatedCount = 0;

  for (const def of CORE_ITEMS_DEFINITIONS) {
    const existing = await Item.findOne({ name: def.name });
    if (!existing) {
      await Item.create({
        guildId: 'global',
        ...def
      });
      createdCount++;
    } else {
      // Pastikan kategori dan tipe sinkron
      let needSave = false;
      if (!existing.type || existing.type !== def.type) {
        existing.type = def.type;
        needSave = true;
      }
      if (!existing.category || existing.category !== def.category) {
        existing.category = def.category;
        needSave = true;
      }
      if (!existing.rarity || existing.rarity !== def.rarity) {
        existing.rarity = def.rarity;
        needSave = true;
      }
      if (needSave) {
        await existing.save();
        updatedCount++;
      }
    }
  }

  console.log(`[CORE-ITEMS] Selesai: +${createdCount} baru dibuat, ${updatedCount} diselaraskan, ${CORE_ITEMS_DEFINITIONS.length} total item aktif.`);
  return { ok: true, createdCount, updatedCount, total: CORE_ITEMS_DEFINITIONS.length };
}

/**
 * Memilih ikan secara berbobot berdasarkan region dan status lubuk
 */
function pickFishForRegion(regionId, isFishSpot = false) {
  const table = REGIONAL_FISH_TABLES[regionId] || REGIONAL_FISH_TABLES.default;
  
  // Jika di lubuk ikan (fish resource node), bobot ikan langka/epic dinaikkan 2x lipat
  const adjustedTable = table.map(entry => {
    let w = entry.weight;
    if (isFishSpot && entry.difficulty >= 3) {
      w = w * 2.5;
    }
    return { ...entry, weight: w };
  });

  const totalWeight = adjustedTable.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of adjustedTable) {
    if (roll < entry.weight) {
      return entry;
    }
    roll -= entry.weight;
  }

  return adjustedTable[0];
}

module.exports = {
  ensureCoreItems,
  pickFishForRegion,
  CORE_ITEMS_DEFINITIONS,
  REGIONAL_FISH_TABLES
};
