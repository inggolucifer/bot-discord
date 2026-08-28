module.exports = function buildAssetsDataExport(itemCache) {
function makeInput(itemName, quantity = 1, durabilityHours = 1) {
  const doc = itemCache.get(itemName);
  if (!doc) throw new Error(`[SEED] Input item belum di-cache: ${itemName}`);
  return {
    itemId: doc._id,
    itemName,
    quantity,
    durabilityHours,
  };
}

function idOf(name) {
  const doc = itemCache.get(name);
  if (!doc) throw new Error(`[SEED] Item belum ada di cache: "${name}".`);
  return doc._id;
}
  const assets = [
    // =====================================================================
    // ERA PRIMITIF (Batu & Kayu) - Mudah (Max ~10 copper/jam atau setara)
    // =====================================================================
    {
      name: 'Pusat Pemotongan Kayu Liar',
      description: 'Lahan tempat menebang kayu liar. Pekerja shift lambat.',
      rank: 'Common',
      workerOutputItemName: 'Kayu Mentah',
      workerOutputQuantity: 10,
      workerInputMaterials: [
        makeInput('Kapak Batu', 1, 24),
        makeInput('Air Bersih', 1, 1), // 1 air minum per jam
      ],
      constructionTimeHours: 2,
      buildable: true,
      buildRequirements: [],
      basePrice: 50,
      priceCurrency: 'copper'
    },
    {
      name: 'Kotak Amal Tua',
      description: 'Hanya orang lewat yang sesekali memberi koin receh. Ditinggalkan dan diambil setiap 8 jam.',
      rank: 'Common',
      dailyProfit: 10, // Max asset primitif max profit 10 copper per jam. Di sini tepat 10 copper/jam
      profitCurrency: 'copper',
      workerInputMaterials: [], // Passive income sangat kecil
      constructionTimeHours: 1,
      buildable: true,
      buildRequirements: [],
      basePrice: 100,
      priceCurrency: 'copper'
    },
    {
      name: 'Lahan Padi Sederhana',
      description: 'Sawah tadah hujan primitif. Panen bervariasi bergantung kondisi alam.',
      rank: 'Common',
      workerOutputItemName: 'Beras Mentah',
      workerOutputQuantity: 5,
      workerInputMaterials: [
        makeInput('Batu Tajam', 1, 12),
        makeInput('Air Bersih', 2, 1),
        makeInput('Bibit Padi', 1, 1),
      ],
      constructionTimeHours: 4,
      buildable: true,
      buildRequirements: [],
      basePrice: 200,
      priceCurrency: 'copper'
    },

    // =====================================================================
    // ERA BESI (Pertanian & Pertambangan Lanjut) - Menantang
    // =====================================================================
    {
      name: 'Pabrik Penggergajian Papan',
      description: 'Mengubah kayu balok menjadi papan siap bangun.',
      rank: 'Uncommon',
      isCraftingStation: true,
      recipes: [
        {
          recipeName: 'Gergaji Papan',
          resultItemId: idOf('Papan Kayu'),
          resultItemName: 'Papan Kayu',
          resultQuantity: 2,
          materials: [
            { itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 3, durabilityHours: 1 },
            { itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1, durabilityHours: 24 }
          ]
        }
      ],
      constructionTimeHours: 24,
      buildable: true,
      buildRequirements: [
        makeInput('Kayu Mentah', 500),
        makeInput('Batu Kasar', 300)
      ],
      basePrice: 5,
      priceCurrency: 'silver'
    },
    {
      name: 'Tungku Pembakaran Bata',
      description: 'Memanaskan batu menjadi bata merah padat.',
      rank: 'Uncommon',
      isCraftingStation: true,
      recipes: [
        {
          recipeName: 'Bakar Batu Bata',
          resultItemId: idOf('Batu Bata'),
          resultItemName: 'Batu Bata',
          resultQuantity: 5,
          materials: [
            { itemId: idOf('Batu Kasar'), itemName: 'Batu Kasar', quantity: 10, durabilityHours: 1 },
            { itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 5, durabilityHours: 1 }
          ]
        }
      ],
      constructionTimeHours: 24,
      buildable: true,
      buildRequirements: [
        makeInput('Batu Kasar', 800),
        makeInput('Kayu Mentah', 200)
      ],
      basePrice: 5,
      priceCurrency: 'silver'
    },
    {
      name: 'Warung Teh Pinggir Jalan',
      description: 'Tempat singgah pengembara. Ramai siang hari.',
      rank: 'Uncommon',
      dailyProfit: 3, // 3 Silver per jam (setara 300 copper/jam)
      profitCurrency: 'silver',
      workerInputMaterials: [
        makeInput('Beras Mentah', 5, 1),
        makeInput('Air Bersih', 10, 1),
      ],
      constructionTimeHours: 48,
      buildable: true,
      buildRequirements: [
        makeInput('Papan Kayu', 800),
        makeInput('Batu Bata', 500)
      ],
      basePrice: 1,
      priceCurrency: 'gold'
    },
    {
      name: 'Peleburan Besi',
      description: 'Suhu ekstrem merubah bijih menjadi batangan besi murni.',
      rank: 'Uncommon',
      isCraftingStation: true,
      recipes: [
        {
          recipeName: 'Lebur Besi',
          resultItemId: idOf('Batangan Besi'),
          resultItemName: 'Batangan Besi',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Bijih Besi'), itemName: 'Bijih Besi', quantity: 5, durabilityHours: 1 },
            { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 3, durabilityHours: 1 }
          ]
        },
        {
          recipeName: 'Tempa Pedang Besi Biasa',
          resultItemId: idOf('Pedang Besi Biasa'),
          resultItemName: 'Pedang Besi Biasa',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 5, durabilityHours: 1 },
            { itemId: idOf('Palu Besi'), itemName: 'Palu Besi', quantity: 1, durabilityHours: 48 }
          ]
        }
      ],
      constructionTimeHours: 120, // 5 hari
      buildable: true,
      buildRequirements: [
        makeInput('Batu Bata', 3000),
        makeInput('Papan Kayu', 1000)
      ],
      basePrice: 2,
      priceCurrency: 'gold'
    },

    // =====================================================================
    // ERA TEKNOLOGI (Industri, Minyak, Baja) - Gila-gilaan
    // =====================================================================
    {
      name: 'Kilang Minyak Darat',
      description: 'Menyedot darah bumi. Mesin bekerja siang dan malam menghasilkan minyak mentah.',
      rank: 'Rare',
      workerOutputItemName: 'Minyak Mentah',
      workerOutputQuantity: 10,
      workerInputMaterials: [
        makeInput('Alat Bor Berat', 1, 96),
        makeInput('Batu Bara', 10, 1),
        makeInput('Pil Pekerja Keras', 1, 1)
      ],
      constructionTimeHours: 336, // 14 HARI (2 minggu)
      buildable: true,
      buildRequirements: [
        makeInput('Batangan Besi', 5000),
        makeInput('Semen Campuran', 2000),
        makeInput('Papan Kayu', 10000)
      ],
      basePrice: 50,
      priceCurrency: 'gold'
    },
    {
      name: 'Pabrik Baja Karbon & Manufaktur',
      description: 'Pabrik raksasa pembakar baja, mencetak alat elektronik dan senjata kelas militer.',
      rank: 'Rare',
      isCraftingStation: true,
      recipes: [
        {
          recipeName: 'Proses Baja Murni',
          resultItemId: idOf('Baja Murni'),
          resultItemName: 'Baja Murni',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 10, durabilityHours: 1 },
            { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 15, durabilityHours: 1 }
          ]
        },
        {
          recipeName: 'Tempa Pedang Baja',
          resultItemId: idOf('Pedang Baja'),
          resultItemName: 'Pedang Baja',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Baja Murni'), itemName: 'Baja Murni', quantity: 3, durabilityHours: 1 },
            { itemId: idOf('Palu Besi'), itemName: 'Palu Besi', quantity: 1, durabilityHours: 48 }
          ]
        },
        {
          recipeName: 'Rakit Alat Bor Berat',
          resultItemId: idOf('Alat Bor Berat'),
          resultItemName: 'Alat Bor Berat',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Baja Murni'), itemName: 'Baja Murni', quantity: 15, durabilityHours: 1 },
            { itemId: idOf('Komponen Elektronik'), itemName: 'Komponen Elektronik', quantity: 5, durabilityHours: 1 }
          ]
        }
      ],
      constructionTimeHours: 504, // 21 HARI
      buildable: true,
      buildRequirements: [
        makeInput('Batangan Besi', 10000),
        makeInput('Batu Bata', 50000), // Butuh 50,000 bata
        makeInput('Papan Kayu', 20000)
      ],
      basePrice: 80,
      priceCurrency: 'gold'
    },

    // =====================================================================
    // ERA MURIM (Kultivasi Puncak) - End Game (Coc)
    // =====================================================================
    {
      name: 'Paviliun Alkimia Langit (Heavenly Alchemy)',
      description: 'Bangunan ilahi yang merombak energi alam menjadi artifak pusaka sekte abadi.',
      rank: 'Epic',
      isCraftingStation: true,
      recipes: [
        {
          recipeName: 'Tempa Pedang Hitam Mistis',
          resultItemId: idOf('Pedang Hitam Mistis'),
          resultItemName: 'Pedang Hitam Mistis',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Baja Hitam Mistis'), itemName: 'Baja Hitam Mistis', quantity: 10, durabilityHours: 1 },
            { itemId: idOf('Palu Formasi Array'), itemName: 'Palu Formasi Array', quantity: 1, durabilityHours: 168 }
          ]
        },
        {
          recipeName: 'Suling Pil Pengumpul Qi',
          resultItemId: idOf('Pil Pengumpul Qi'),
          resultItemName: 'Pil Pengumpul Qi',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Beras Mentah'), itemName: 'Beras Mentah', quantity: 500, durabilityHours: 1 },
            { itemId: idOf('Batu Roh Kasar'), itemName: 'Batu Roh Kasar', quantity: 5, durabilityHours: 1 }
          ]
        }
      ],
      constructionTimeHours: 1080, // 45 HARI
      buildable: true,
      buildRequirements: [
        makeInput('Baja Murni', 50000),
        makeInput('Semen Campuran', 200000), // 200k semen
        makeInput('Komponen Elektronik', 15000)
      ],
      basePrice: 10,
      priceCurrency: 'jade'
    },

    // =====================================================================
    // FORMATION (INCOME GENERATOR TERTINGGI - END GAME)
    // =====================================================================
    {
      name: 'Formasi Pengunci Langit (Heaven Sealing Array)',
      description: 'Formasi mistis penyerap energi. Max profit tertingggi dunia fana: ~10 Gold/hari (41 Silver/jam).',
      rank: 'Legendary',
      // User request: Max 10 Gold per hari. 10 Gold = 1000 Silver. 1000 / 24 = ~41.6 Silver/jam.
      dailyProfit: 41, // 41 silver/jam -> ~984 silver/hari -> Mendekati 10 Gold/hari
      profitCurrency: 'silver',
      workerOutputItemId: null,
      workerInputMaterials: [
        makeInput('Batu Roh Kasar', 5, 1),
        makeInput('Pil Pengumpul Qi', 1, 1) // 1 pil sejam
      ],
      constructionTimeHours: 1440, // 60 HARI (2 Bulan)
      buildable: true,
      buildRequirements: [
        makeInput('Baja Hitam Mistis', 5000), // 5k baja mistis
        makeInput('Kayu Surga', 2500),
        makeInput('Cairan Inti Bumi', 1000)
      ],
      basePrice: 50,
      priceCurrency: 'jade'
    }
  ];

  for (const a of assets) {
    if (a.workerInputMaterials && a.workerInputMaterials.length > 0) {
      const inputs = a.workerInputMaterials.map(m => `${m.quantity}x ${m.itemName}`).join(', ');
      a.description = `[BUTUH: ${inputs}/jam] ${a.description}`;
    }
  }

  return assets;
}
