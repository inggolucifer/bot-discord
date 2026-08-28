// Bagian definisi asset untuk seed-economy-3
module.exports = function buildAssetsDataExport(itemCache) {
function makeInput(itemName, quantity = 1, durabilityHours = 1) {
  const doc = itemCache.get(itemName);
  if (!doc) throw new Error(`[SEED] Input item belum di-cache: ${itemName}`);
  return {
    itemId: doc._id,
    itemName,
    quantity,
    durabilityHours, // Kalo 1 artinya abis per jam. Kalau 24, artinya alat tahan 24 jam.
  };
}

function idOf(name) {
  const doc = itemCache.get(name);
  if (!doc) throw new Error(`[SEED] Item belum ada di cache: "${name}".`);
  return doc._id;
}
  const assets = [
    // =====================================================================
    // ERA PRIMITIF (Batu & Kayu) - Mudah
    // =====================================================================
    {
      name: 'Pusat Pemotongan Kayu Liar',
      description: 'Lahan tempat menebang kayu liar. Mengandalkan tenaga manual yang keras.',
      rank: 'Common',
      workerOutputItemName: 'Kayu Mentah',
      workerOutputQuantity: 20,
      workerInputMaterials: [
        makeInput('Kapak Batu', 1, 24), // kapak batu tahan 24 jam
        makeInput('Air Bersih', 2, 1),   // minum 2 botol air per jam
      ],
      constructionTimeHours: 2, // 2 jam aja buat pemanasan
      buildable: true,
      buildRequirements: [], // aset awal tidak butuh material bangunan, beli langsung
      basePrice: 50,
      priceCurrency: 'silver'
    },
    {
      name: 'Tambang Batu Permukaan',
      description: 'Lubang galian dangkal untuk mengambil bebatuan dasar.',
      rank: 'Common',
      workerOutputItemName: 'Batu Kasar',
      workerOutputQuantity: 20,
      workerInputMaterials: [
        makeInput('Beliung Batu', 1, 24),
        makeInput('Air Bersih', 2, 1),
      ],
      constructionTimeHours: 2,
      buildable: true,
      buildRequirements: [],
      basePrice: 50,
      priceCurrency: 'silver'
    },
    {
      name: 'Lahan Padi Sederhana',
      description: 'Sawah tadah hujan primitif untuk bertani.',
      rank: 'Common',
      workerOutputItemName: 'Beras Mentah',
      workerOutputQuantity: 10,
      workerInputMaterials: [
        makeInput('Batu Tajam', 1, 12),
        makeInput('Air Bersih', 5, 1),
        makeInput('Bibit Padi', 1, 1),
      ],
      constructionTimeHours: 4,
      buildable: true,
      buildRequirements: [],
      basePrice: 100,
      priceCurrency: 'silver'
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
      constructionTimeHours: 24, // 1 hari
      buildable: true,
      buildRequirements: [
        makeInput('Kayu Mentah', 500),
        makeInput('Batu Kasar', 300)
      ],
      basePrice: 2,
      priceCurrency: 'gold'
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
            { itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 5, durabilityHours: 1 } // Butuh kayu sbg bahan bakar pembakaran bata
          ]
        }
      ],
      constructionTimeHours: 24, // 1 hari
      buildable: true,
      buildRequirements: [
        makeInput('Batu Kasar', 800),
        makeInput('Kayu Mentah', 200)
      ],
      basePrice: 2,
      priceCurrency: 'gold'
    },
    {
      name: 'Tambang Besi Dalam',
      description: 'Terowongan bawah tanah yang butuh penyangga untuk mengeruk bijih besi.',
      rank: 'Uncommon',
      workerOutputItemName: 'Bijih Besi',
      workerOutputQuantity: 15,
      workerInputMaterials: [
        makeInput('Beliung Besi', 1, 48), // beliung tahan lama
        makeInput('Kayu Mentah', 5, 1),   // Butuh kayu penyangga tiap jam
        makeInput('Makanan Matang', 2, 1) // Butuh makanan layak
      ],
      constructionTimeHours: 72, // 3 hari
      buildable: true,
      buildRequirements: [
        makeInput('Papan Kayu', 1000),
        makeInput('Batu Bata', 1500)
      ],
      basePrice: 5,
      priceCurrency: 'gold'
    },
    {
      name: 'Tambang Batu Bara',
      description: 'Galian panas dan kotor untuk mengambil bahan bakar utama.',
      rank: 'Uncommon',
      workerOutputItemName: 'Batu Bara',
      workerOutputQuantity: 20,
      workerInputMaterials: [
        makeInput('Beliung Besi', 1, 48),
        makeInput('Kayu Mentah', 3, 1),
        makeInput('Makanan Matang', 2, 1)
      ],
      constructionTimeHours: 72, // 3 hari
      buildable: true,
      buildRequirements: [
        makeInput('Papan Kayu', 1200),
        makeInput('Batu Bata', 1000)
      ],
      basePrice: 5,
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
          recipeName: 'Tempa Beliung Besi',
          resultItemId: idOf('Beliung Besi'),
          resultItemName: 'Beliung Besi',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 2, durabilityHours: 1 },
            { itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 1, durabilityHours: 1 }
          ]
        },
        {
          recipeName: 'Tempa Kapak Besi',
          resultItemId: idOf('Kapak Besi'),
          resultItemName: 'Kapak Besi',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 2, durabilityHours: 1 },
            { itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 1, durabilityHours: 1 }
          ]
        },
        {
          recipeName: 'Tempa Palu Besi',
          resultItemId: idOf('Palu Besi'),
          resultItemName: 'Palu Besi',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 3, durabilityHours: 1 },
            { itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 1, durabilityHours: 1 }
          ]
        }
      ],
      constructionTimeHours: 120, // 5 hari
      buildable: true,
      buildRequirements: [
        makeInput('Batu Bata', 3000),
        makeInput('Papan Kayu', 1000)
      ],
      basePrice: 8,
      priceCurrency: 'gold'
    },

    // =====================================================================
    // ERA TEKNOLOGI (Industri, Minyak, Baja) - Gila-gilaan
    // =====================================================================
    {
      name: 'Kilang Minyak Darat',
      description: 'Menyedot darah bumi. Menghasilkan minyak mentah pembawa energi kotor.',
      rank: 'Rare',
      workerOutputItemName: 'Minyak Mentah',
      workerOutputQuantity: 10,
      workerInputMaterials: [
        makeInput('Alat Bor Berat', 1, 96), // Bor alat berat
        makeInput('Batu Bara', 10, 1),      // Butuh energi buat pompa
        makeInput('Pil Pekerja Keras', 1, 1)// 1 pil per jam per pekerja
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
      name: 'Pabrik Baja Karbon',
      description: 'Membakar besi dengan suhu luar biasa untuk menghasilkan baja modern.',
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
          recipeName: 'Olah Bahan Bakar',
          resultItemId: idOf('Bahan Bakar Mesin'),
          resultItemName: 'Bahan Bakar Mesin',
          resultQuantity: 5,
          materials: [
            { itemId: idOf('Minyak Mentah'), itemName: 'Minyak Mentah', quantity: 2, durabilityHours: 1 }
          ]
        },
        {
          recipeName: 'Buat Komponen Elektronik',
          resultItemId: idOf('Komponen Elektronik'),
          resultItemName: 'Komponen Elektronik',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 5, durabilityHours: 1 },
            { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 2, durabilityHours: 1 }
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
        },
        {
          recipeName: 'Rakit Gergaji Mesin',
          resultItemId: idOf('Gergaji Mesin'),
          resultItemName: 'Gergaji Mesin',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Baja Murni'), itemName: 'Baja Murni', quantity: 10, durabilityHours: 1 },
            { itemId: idOf('Komponen Elektronik'), itemName: 'Komponen Elektronik', quantity: 2, durabilityHours: 1 }
          ]
        },
        {
          recipeName: 'Aduk Semen Campuran',
          resultItemId: idOf('Semen Campuran'),
          resultItemName: 'Semen Campuran',
          resultQuantity: 10,
          materials: [
            { itemId: idOf('Batu Kasar'), itemName: 'Batu Kasar', quantity: 50, durabilityHours: 1 },
            { itemId: idOf('Air Bersih'), itemName: 'Air Bersih', quantity: 20, durabilityHours: 1 }
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
      name: 'Nadi Bumi Kuno (Earth Vein)',
      description: 'Menyadap aura purba pegunungan untuk mengkristalkan batu fana menjadi Batu Roh Kasar.',
      rank: 'Epic',
      workerOutputItemName: 'Batu Roh Kasar',
      workerOutputQuantity: 5,
      workerInputMaterials: [
        makeInput('Beliung Pelenyap Gunung', 1, 168), // 1 minggu
        makeInput('Bahan Bakar Mesin', 20, 1),       // Gabungan teknologi & magis
        makeInput('Cairan Inti Bumi', 1, 1)          // Super langka
      ],
      constructionTimeHours: 720, // 30 HARI
      buildable: true,
      buildRequirements: [
        makeInput('Baja Murni', 25000),
        makeInput('Semen Campuran', 100000), // 100k semen
        makeInput('Komponen Elektronik', 5000)
      ],
      basePrice: 5,
      priceCurrency: 'jade'
    },
    {
      name: 'Paviliun Alkimia Langit (Heavenly Alchemy)',
      description: 'Bangunan ilahi yang merombak energi alam dan baja menjadi benda-benda dari dongeng.',
      rank: 'Epic',
      isCraftingStation: true,
      recipes: [
        {
          recipeName: 'Suling Cairan Inti Bumi',
          resultItemId: idOf('Cairan Inti Bumi'),
          resultItemName: 'Cairan Inti Bumi',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Minyak Mentah'), itemName: 'Minyak Mentah', quantity: 100, durabilityHours: 1 },
            { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 500, durabilityHours: 1 }
          ]
        },
        {
          recipeName: 'Tempa Baja Hitam Mistis',
          resultItemId: idOf('Baja Hitam Mistis'),
          resultItemName: 'Baja Hitam Mistis',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Baja Murni'), itemName: 'Baja Murni', quantity: 50, durabilityHours: 1 },
            { itemId: idOf('Batu Roh Kasar'), itemName: 'Batu Roh Kasar', quantity: 10, durabilityHours: 1 }
          ]
        },
        {
          recipeName: 'Tumbuhkan Kayu Surga',
          resultItemId: idOf('Kayu Surga'),
          resultItemName: 'Kayu Surga',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 1000, durabilityHours: 1 },
            { itemId: idOf('Cairan Inti Bumi'), itemName: 'Cairan Inti Bumi', quantity: 2, durabilityHours: 1 }
          ]
        },
        {
          recipeName: 'Tempa Beliung Pelenyap Gunung',
          resultItemId: idOf('Beliung Pelenyap Gunung'),
          resultItemName: 'Beliung Pelenyap Gunung',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Baja Hitam Mistis'), itemName: 'Baja Hitam Mistis', quantity: 50, durabilityHours: 1 },
            { itemId: idOf('Kayu Surga'), itemName: 'Kayu Surga', quantity: 20, durabilityHours: 1 },
            { itemId: idOf('Palu Formasi Array'), itemName: 'Palu Formasi Array', quantity: 1, durabilityHours: 168 }
          ]
        },
        {
          recipeName: 'Tempa Kapak Penembus Surga',
          resultItemId: idOf('Kapak Penembus Surga'),
          resultItemName: 'Kapak Penembus Surga',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Baja Hitam Mistis'), itemName: 'Baja Hitam Mistis', quantity: 50, durabilityHours: 1 },
            { itemId: idOf('Kayu Surga'), itemName: 'Kayu Surga', quantity: 20, durabilityHours: 1 },
            { itemId: idOf('Palu Formasi Array'), itemName: 'Palu Formasi Array', quantity: 1, durabilityHours: 168 }
          ]
        },
        {
          recipeName: 'Rakit Palu Formasi Array',
          resultItemId: idOf('Palu Formasi Array'),
          resultItemName: 'Palu Formasi Array',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Baja Hitam Mistis'), itemName: 'Baja Hitam Mistis', quantity: 20, durabilityHours: 1 },
            { itemId: idOf('Batu Roh Kasar'), itemName: 'Batu Roh Kasar', quantity: 50, durabilityHours: 1 }
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
    // FORMATION (INCOME GENERATOR TERTINGGI)
    // =====================================================================
    {
      name: 'Formasi Pengunci Langit (Heaven Sealing Array)',
      description: 'Menarik kekayaan dari dimensi lain. Pendapatan terbesar di dunia Jianghu.',
      rank: 'Legendary',
      dailyProfit: 130, // 130 silver/jam -> 3120 silver/hari (~1 Jade/3hari per 1 pekerja)
      profitCurrency: 'silver',
      workerOutputItemId: null,
      workerInputMaterials: [
        makeInput('Batu Roh Kasar', 5, 1), // 5 batu roh sejam
        makeInput('Pil Pengumpul Qi', 1, 1) // 1 pil sejam per pekerja
      ],
      constructionTimeHours: 1440, // 60 HARI (2 Bulan) - Puncak kesabaran
      buildable: true,
      buildRequirements: [
        makeInput('Baja Hitam Mistis', 5000), // 5k baja mistis gila2an
        makeInput('Kayu Surga', 2500),
        makeInput('Cairan Inti Bumi', 1000)
      ],
      basePrice: 50,
      priceCurrency: 'jade'
    }
  ];

  // Append prefix ke description jika butuh material
  for (const a of assets) {
    if (a.workerInputMaterials && a.workerInputMaterials.length > 0) {
      const inputs = a.workerInputMaterials.map(m => `${m.quantity}x ${m.itemName}`).join(', ');
      a.description = `[BUTUH: ${inputs}/jam] ${a.description}`;
    }
  }

  return assets;
}
