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
      description: 'Lahan tempat penebang kayu fana menebang pohon liar. Diambil dan disetor oleh pengawas setiap 2 jam sekali agar kayu tidak lapuk.',
      rank: 'Common',
      workerOutputItemName: 'Kayu Mentah',
      workerOutputQuantity: 10,
      workerInputMaterials: [
        makeInput('Kapak Batu', 1, 24),
        makeInput('Air Bersih', 1, 1),
      ],
      constructionTimeHours: 2,
      buildable: true,
      buildRequirements: [],
      basePrice: 50,
      priceCurrency: 'copper'
    },
    {
      name: 'Kotak Amal Tua',
      description: 'Hanya orang lewat yang sesekali memberi koin receh karena kasihan. Koin biasanya ditinggalkan dan diambil pengemis setiap 8 jam sekali supaya tidak dicuri preman.',
      rank: 'Common',
      dailyProfit: 10, // Max 10 copper per jam
      profitCurrency: 'copper',
      workerInputMaterials: [],
      constructionTimeHours: 1,
      buildable: true,
      buildRequirements: [],
      basePrice: 100,
      priceCurrency: 'copper'
    },
    {
      name: 'Lahan Padi Sederhana',
      description: 'Sawah tadah hujan primitif. Petani memanen padinya secara lambat dan menyimpannya ke gudang kecil setiap 12 jam sekali di penghujung hari.',
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
    {
      name: 'Tambang Batu Dangkal',
      description: 'Galian tanah untuk mencari batuan dasar. Para budak kasar mengangkat hasil bongkahan batu setiap 4 jam sekali di bawah sengatan matahari.',
      rank: 'Common',
      workerOutputItemName: 'Batu Kasar',
      workerOutputQuantity: 15, // Output value = 15 * 5 copper = 75 copper
      workerInputMaterials: [
        makeInput('Beliung Batu', 1, 24), // cost ~ 1 copper/hr
        makeInput('Air Bersih', 3, 1), // cost 15 copper/hr
        makeInput('Daging Mentah', 1, 1), // cost 15 copper/hr
      ],
      constructionTimeHours: 6,
      buildable: true,
      buildRequirements: [],
      basePrice: 300,
      priceCurrency: 'copper'
    },
    {
      name: 'Peternakan Kelinci Liar',
      description: 'Kandang sederhana berpagar kayu yang menampung kelinci buruan. Dagingnya dipanen pada pagi buta setiap 24 jam sekali.',
      rank: 'Common',
      workerOutputItemName: 'Daging Mentah',
      workerOutputQuantity: 3, // 3 * 15 = 45 copper output/hr
      workerInputMaterials: [
        makeInput('Daun Kering', 10, 1), // 20 copper/hr
        makeInput('Air Bersih', 2, 1), // 10 copper/hr
      ],
      constructionTimeHours: 8,
      buildable: true,
      buildRequirements: [
        makeInput('Kayu Mentah', 50),
        makeInput('Serat Tumbuhan', 20)
      ],
      basePrice: 400,
      priceCurrency: 'copper'
    },
    {
      name: 'Gubuk Anyam Penenun',
      description: 'Tempat duduk wanita tua yang menenun serat menjadi tali rami. Membutuhkan waktu lama, tali dikumpulkan hanya 1 kali dalam 2 hari.',
      rank: 'Common',
      isCraftingStation: true,
      recipes: [
        {
          recipeName: 'Pintal Tali Rami',
          resultItemId: idOf('Tali Rami'),
          resultItemName: 'Tali Rami',
          resultQuantity: 2,
          materials: [
            { itemId: idOf('Serat Tumbuhan'), itemName: 'Serat Tumbuhan', quantity: 15, durabilityHours: 1 }
          ]
        }
      ],
      constructionTimeHours: 12,
      buildable: true,
      buildRequirements: [
        makeInput('Kayu Mentah', 100),
        makeInput('Batu Kasar', 50)
      ],
      basePrice: 500,
      priceCurrency: 'copper'
    },
    {
      name: 'Pembakaran Gerabah',
      description: 'Tungku tanah liat awal. Mengeringkan wadah dan periuk dalam api lambat. Membakar tumpukan kayu kering tiada henti.',
      rank: 'Common',
      isCraftingStation: true,
      recipes: [
        {
          recipeName: 'Bakar Wadah Tanah Liat',
          resultItemId: idOf('Wadah Tanah Liat'),
          resultItemName: 'Wadah Tanah Liat',
          resultQuantity: 2,
          materials: [
            { itemId: idOf('Tanah Liat'), itemName: 'Tanah Liat', quantity: 10, durabilityHours: 1 },
            { itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 5, durabilityHours: 1 }
          ]
        }
      ],
      constructionTimeHours: 14,
      buildable: true,
      buildRequirements: [
        makeInput('Tanah Liat', 150),
        makeInput('Lumpur Basah', 100)
      ],
      basePrice: 600,
      priceCurrency: 'copper'
    },
    {
      name: 'Bilik Pengrajin Senjata Tulang',
      description: 'Ruang rahasia di mana pemburu meracik belati dan jarum dari tulang hewan buas. Keahlian brutal era prasejarah.',
      rank: 'Common',
      isCraftingStation: true,
      recipes: [
        {
          recipeName: 'Asah Pisau Tulang',
          resultItemId: idOf('Pisau Tulang'),
          resultItemName: 'Pisau Tulang',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Tulang Hewan'), itemName: 'Tulang Hewan', quantity: 3, durabilityHours: 1 },
            { itemId: idOf('Batu Tajam'), itemName: 'Batu Tajam', quantity: 1, durabilityHours: 12 }
          ]
        },
        {
          recipeName: 'Rakit Tombak Bambu',
          resultItemId: idOf('Tombak Bambu'),
          resultItemName: 'Tombak Bambu',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Bambu Hijau'), itemName: 'Bambu Hijau', quantity: 5, durabilityHours: 1 },
            { itemId: idOf('Tali Rami'), itemName: 'Tali Rami', quantity: 1, durabilityHours: 1 },
            { itemId: idOf('Batu Api'), itemName: 'Batu Api', quantity: 1, durabilityHours: 72 }
          ]
        }
      ],
      constructionTimeHours: 24,
      buildable: true,
      buildRequirements: [
        makeInput('Kayu Mentah', 300),
        makeInput('Tulang Hewan', 50)
      ],
      basePrice: 800,
      priceCurrency: 'copper'
    },
    {
      name: 'Pemancingan Muara',
      description: 'Jaring ikan statis di ujung sungai. Pengecekan perangkap ikan hanya dilakukan setiap 8 jam sekali saat air laut pasang surut.',
      rank: 'Common',
      workerOutputItemName: 'Ikan Segar',
      workerOutputQuantity: 8, // 8 * 12 = 96 copper
      workerInputMaterials: [
        makeInput('Pancingan Bambu', 1, 36), // 30/36 = ~1 copper
        makeInput('Bibit Padi', 10, 1), // umpan 50 copper
      ],
      constructionTimeHours: 10,
      buildable: true,
      buildRequirements: [
        makeInput('Bambu Hijau', 100),
        makeInput('Tali Rami', 20)
      ],
      basePrice: 500,
      priceCurrency: 'copper'
    },
    {
      name: 'Kios Buah Liar',
      description: 'Sebuah tenda kecil tempat pejalan kaki fana membeli buah-buahan hutan. Uangnya disimpan dalam kantung kulit dan dikosongkan ke brankas setiap 12 jam.',
      rank: 'Common',
      dailyProfit: 8, // 8 copper/jam
      profitCurrency: 'copper',
      workerInputMaterials: [
        makeInput('Buah Liar', 2, 1) // cost 16 copper/jam. Netto minus? Tunggu, npc buy buah? Ya ini menukarkan 2 buah liar jadi 8 copper (sebenarnya rugi dari base price, tapi asumsikan ini convert ke uang murni)
      ],
      constructionTimeHours: 16,
      buildable: true,
      buildRequirements: [
        makeInput('Papan Kayu', 50),
        makeInput('Daun Kering', 200)
      ],
      basePrice: 10,
      priceCurrency: 'silver'
    },

    // =====================================================================
    // ERA BESI (Pertanian & Pertambangan Lanjut) - Menantang
    // =====================================================================
    {
      name: 'Pabrik Penggergajian Papan',
      description: 'Mengubah kayu balok menjadi papan siap bangun. Suara bising gergaji tidak pernah berhenti, papan dikirimkan ke pasar lokal setiap 6 jam.',
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
        },
        {
          recipeName: 'Gergaji Papan Besi',
          resultItemId: idOf('Papan Kayu'),
          resultItemName: 'Papan Kayu',
          resultQuantity: 5,
          materials: [
            { itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 6, durabilityHours: 1 },
            { itemId: idOf('Gergaji Tangan Besi'), itemName: 'Gergaji Tangan Besi', quantity: 1, durabilityHours: 60 }
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
      description: 'Memanaskan batu menjadi bata merah padat. Proses pendinginannya butuh waktu, sehingga bata yang matang hanya bisa dikeluarkan 24 jam sekali.',
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
        },
        {
          recipeName: 'Bakar Bata Suhu Tinggi (Batu Bara)',
          resultItemId: idOf('Batu Bata'),
          resultItemName: 'Batu Bata',
          resultQuantity: 15,
          materials: [
            { itemId: idOf('Batu Kasar'), itemName: 'Batu Kasar', quantity: 25, durabilityHours: 1 },
            { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 5, durabilityHours: 1 }
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
      description: 'Tempat singgah pengembara dan kultivator muda. Kasir warung sibuk dan menghitung omset uang koin mereka setiap 4 jam saat pertukaran shift.',
      rank: 'Uncommon',
      dailyProfit: 3, // 3 Silver per jam
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
      name: 'Lorong Penambangan Bijih',
      description: 'Gua buatan manusia menembus bukit batu berburu bijih besi. Para kuli berlumur debu hitam menarik kereta lori penuh bijih dari kedalaman bumi setiap 8 jam.',
      rank: 'Uncommon',
      workerOutputItemName: 'Bijih Besi',
      workerOutputQuantity: 10, // 10 * 30 copper = 300 copper (3 silver) output value / hr
      workerInputMaterials: [
        makeInput('Beliung Besi', 1, 48),
        makeInput('Air Bersih', 5, 1),
        makeInput('Pil Pekerja Keras', 1, 1), // cost 2 silver
      ],
      constructionTimeHours: 72,
      buildable: true,
      buildRequirements: [
        makeInput('Batu Bata', 1500),
        makeInput('Papan Kayu', 800),
        makeInput('Paku Besi', 200)
      ],
      basePrice: 2,
      priceCurrency: 'gold'
    },
    {
      name: 'Peleburan Besi',
      description: 'Suhu ekstrem merubah bijih menjadi batangan besi murni. Tungku raksasa menyala mengerikan, cairan besi memerah dituang ke cetakan dan didinginkan sehari penuh (24 jam) sebelum bisa diambil.',
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
        },
        {
          recipeName: 'Tempa Kapak Besi',
          resultItemId: idOf('Kapak Besi'),
          resultItemName: 'Kapak Besi',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 3, durabilityHours: 1 },
            { itemId: idOf('Palu Besi'), itemName: 'Palu Besi', quantity: 1, durabilityHours: 48 }
          ]
        },
        {
          recipeName: 'Cetak Paku Besi',
          resultItemId: idOf('Paku Besi'),
          resultItemName: 'Paku Besi',
          resultQuantity: 10,
          materials: [
            { itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 2, durabilityHours: 1 },
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
    {
      name: 'Kebun Gandum Komersil',
      description: 'Ladang luas bersistem irigasi kincir air, dikelola untuk menyuplai bangsawan. Panen raya hanya terjadi seminggu sekali (168 jam) dan sangat meriah.',
      rank: 'Uncommon',
      workerOutputItemName: 'Kapas',
      workerOutputQuantity: 15, // 15 * 12 copper = 180 copper (1.8 silver) output value / hr
      workerInputMaterials: [
        makeInput('Cangkul Besi', 1, 72),
        makeInput('Air Bersih', 10, 1),
      ],
      constructionTimeHours: 96,
      buildable: true,
      buildRequirements: [
        makeInput('Papan Kayu', 2000),
        makeInput('Batu Bata', 500),
        makeInput('Paku Besi', 500)
      ],
      basePrice: 3,
      priceCurrency: 'gold'
    },
    {
      name: 'Butik Penjahit Kota',
      description: 'Rumah penenun profesional yang sibuk mengubah kapas dan sutra menjadi mahakarya. Produksi mereka selesai dalam tumpukan rapi setiap 2 hari sekali (48 jam).',
      rank: 'Uncommon',
      isCraftingStation: true,
      recipes: [
        {
          recipeName: 'Pintal Benang Halus',
          resultItemId: idOf('Benang Halus'),
          resultItemName: 'Benang Halus',
          resultQuantity: 5,
          materials: [
            { itemId: idOf('Kapas'), itemName: 'Kapas', quantity: 10, durabilityHours: 1 }
          ]
        },
        {
          recipeName: 'Tenun Kain Halus',
          resultItemId: idOf('Kain Tenun'),
          resultItemName: 'Kain Tenun',
          resultQuantity: 3,
          materials: [
            { itemId: idOf('Benang Halus'), itemName: 'Benang Halus', quantity: 10, durabilityHours: 1 },
            { itemId: idOf('Alat Tenun Sederhana'), itemName: 'Alat Tenun Sederhana', quantity: 1, durabilityHours: 120 }
          ]
        }
      ],
      constructionTimeHours: 60,
      buildable: true,
      buildRequirements: [
        makeInput('Papan Kayu', 1200),
        makeInput('Batu Bata', 800)
      ],
      basePrice: 4,
      priceCurrency: 'gold'
    },
    {
      name: 'Rumah Makan Daging Asap',
      description: 'Restoran terkenal di kota lapis kedua yang khusus menyajikan hidangan dari daging yang diasap. Laporan keuangan disetorkan ke sekte tiap 12 jam.',
      rank: 'Uncommon',
      dailyProfit: 5, // 5 silver/hr
      profitCurrency: 'silver',
      workerInputMaterials: [
        makeInput('Daging Asap', 2, 1), // cost 4 silver/hr
        makeInput('Kayu Mentah', 10, 1) // cost 50 copper (0.5 silver)/hr
      ],
      constructionTimeHours: 80,
      buildable: true,
      buildRequirements: [
        makeInput('Batu Bata', 2000),
        makeInput('Papan Kayu', 1000),
        makeInput('Kaca Kasar', 100)
      ],
      basePrice: 5,
      priceCurrency: 'gold'
    },
    {
      name: 'Peternakan Sapi Perah',
      description: 'Barisan sapi unggulan yang diberi pakan ternak pilihan. Pemerahan massal secara hati-hati selalu di jadwal pagi dan sore (setiap 12 jam).',
      rank: 'Uncommon',
      workerOutputItemName: 'Susu Sapi Steril',
      workerOutputQuantity: 8, // 8 * 1 silver = 8 silver/hr
      workerInputMaterials: [
        makeInput('Makanan Matang', 5, 1), // 125 copper (1.25 silver)/hr
        makeInput('Air Bersih', 15, 1),
      ],
      constructionTimeHours: 100,
      buildable: true,
      buildRequirements: [
        makeInput('Papan Kayu', 3000),
        makeInput('Paku Besi', 1000),
        makeInput('Batu Bata', 1000)
      ],
      basePrice: 6,
      priceCurrency: 'gold'
    },
    {
      name: 'Penggalian Tambang Batu Bara',
      description: 'Lubang galian kelam yang panas dan penuh gas beracun. Pekerja shift siang dan malam menarik keluar emas hitam ke permukaan setiap 24 jam.',
      rank: 'Uncommon',
      workerOutputItemName: 'Batu Bara',
      workerOutputQuantity: 12, // 12 * 20 = 240 copper (2.4 silver)/hr
      workerInputMaterials: [
        makeInput('Beliung Besi', 2, 48),
        makeInput('Pil Pemulih Tulang', 1, 1), // cost 5 silver
      ],
      constructionTimeHours: 120,
      buildable: true,
      buildRequirements: [
        makeInput('Batangan Besi', 100),
        makeInput('Papan Kayu', 4000)
      ],
      basePrice: 7,
      priceCurrency: 'gold'
    },

    // =====================================================================
    // ERA TEKNOLOGI (Industri, Minyak, Baja) - Gila-gilaan
    // =====================================================================
    {
      name: 'Kilang Minyak Darat',
      description: 'Menyedot darah bumi dengan pompa angguk raksasa. Mesin bekerja siang dan malam menghasilkan minyak mentah yang dimuat ke tangki penampung setiap 24 jam.',
      rank: 'Rare',
      workerOutputItemName: 'Minyak Mentah',
      workerOutputQuantity: 10, // 10 * 15 = 150 silver (1.5 gold)/hr
      workerInputMaterials: [
        makeInput('Alat Bor Berat', 1, 96), // cost 1 gold/96 = minor
        makeInput('Batu Bara', 20, 1), // 400 copper (4 silver)
        makeInput('Karet Sintetis', 1, 1) // 20 silver
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
      description: 'Pabrik raksasa pembakar baja, mencetak alat elektronik dan senjata militer. Material super padat ini dicetak dari conveyor belt tiada henti, lalu diinspeksi keamanannya tiap 48 jam.',
      rank: 'Rare',
      isCraftingStation: true,
      recipes: [
        {
          recipeName: 'Proses Baja Murni',
          resultItemId: idOf('Baja Murni'),
          resultItemName: 'Baja Murni',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Batangan Besi'), itemName: 'Batangan Besi', quantity: 10, durabilityHours: 1 }, // cost 800 copper (8 silver)
            { itemId: idOf('Batu Bara'), itemName: 'Batu Bara', quantity: 15, durabilityHours: 1 } // 300 copper (3 silver)
          ]
        },
        {
          recipeName: 'Tempa Pedang Baja',
          resultItemId: idOf('Pedang Baja'),
          resultItemName: 'Pedang Baja',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Baja Murni'), itemName: 'Baja Murni', quantity: 3, durabilityHours: 1 },
            { itemId: idOf('Las Listrik'), itemName: 'Las Listrik', quantity: 1, durabilityHours: 120 }
          ]
        },
        {
          recipeName: 'Rakit Alat Bor Berat',
          resultItemId: idOf('Alat Bor Berat'),
          resultItemName: 'Alat Bor Berat',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Baja Murni'), itemName: 'Baja Murni', quantity: 15, durabilityHours: 1 },
            { itemId: idOf('Komponen Elektronik'), itemName: 'Komponen Elektronik', quantity: 5, durabilityHours: 1 },
            { itemId: idOf('Kunci Inggris Hidrolik'), itemName: 'Kunci Inggris Hidrolik', quantity: 1, durabilityHours: 150 }
          ]
        },
        {
          recipeName: 'Cetak Peluru .45',
          resultItemId: idOf('Peluru Kaliber .45'),
          resultItemName: 'Peluru Kaliber .45',
          resultQuantity: 20,
          materials: [
            { itemId: idOf('Baja Murni'), itemName: 'Baja Murni', quantity: 2, durabilityHours: 1 },
            { itemId: idOf('Bahan Kimia Asam'), itemName: 'Bahan Kimia Asam', quantity: 1, durabilityHours: 1 }
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
    {
      name: 'Fasilitas Pengeboran Laut Dalam',
      description: 'Rig lepas pantai mutakhir yang merobek cangkang bumi di dasar samudra. Helikopter mengangkut logistik dan membawa pulang minyak kualitas tertinggi sekali dalam seminggu (168 jam).',
      rank: 'Rare',
      workerOutputItemName: 'Minyak Mentah',
      workerOutputQuantity: 25, // 25 * 15 = 375 silver (3.75 gold)
      workerInputMaterials: [
        makeInput('Alat Bor Berat', 2, 96),
        makeInput('Bahan Bakar Mesin', 10, 1), // cost 250 silver (2.5 gold)
        makeInput('Makanan Kemasan Instan', 5, 1) // 125 silver
      ],
      constructionTimeHours: 672, // 28 Hari
      buildable: true,
      buildRequirements: [
        makeInput('Baja Murni', 5000),
        makeInput('Semen Campuran', 10000),
        makeInput('Kawat Tembaga', 3000) // fallback to Kawat Tembaga below
      ],
      basePrice: 150,
      priceCurrency: 'gold'
    },
    {
      name: 'Pusat Manufaktur Elektronik',
      description: 'Ruang steril serba putih tempat robot merakit sirkuit mikro dengan laser presisi. Batch pengiriman microchip didistribusikan ke konglomerat setiap 3 hari sekali (72 jam).',
      rank: 'Rare',
      isCraftingStation: true,
      recipes: [
        {
          recipeName: 'Cetak Komponen Elektronik',
          resultItemId: idOf('Komponen Elektronik'),
          resultItemName: 'Komponen Elektronik',
          resultQuantity: 5,
          materials: [
            { itemId: idOf('Silikon'), itemName: 'Silikon', quantity: 10, durabilityHours: 1 },
            { itemId: idOf('Kawat Tembaga'), itemName: 'Kawat Tembaga', quantity: 5, durabilityHours: 1 },
            { itemId: idOf('Solder Presisi'), itemName: 'Solder Presisi', quantity: 1, durabilityHours: 100 }
          ]
        },
        {
          recipeName: 'Rakit Baterai Lithium',
          resultItemId: idOf('Baterai Lithium'),
          resultItemName: 'Baterai Lithium',
          resultQuantity: 2,
          materials: [
            { itemId: idOf('Bahan Kimia Asam'), itemName: 'Bahan Kimia Asam', quantity: 5, durabilityHours: 1 },
            { itemId: idOf('Komponen Elektronik'), itemName: 'Komponen Elektronik', quantity: 2, durabilityHours: 1 }
          ]
        }
      ],
      constructionTimeHours: 480, // 20 Hari
      buildable: true,
      buildRequirements: [
        makeInput('Baja Murni', 3000),
        makeInput('Plastik Tahan Panas', 10000),
        makeInput('Kaca Anti Peluru', 2000)
      ],
      basePrice: 120,
      priceCurrency: 'gold'
    },
    {
      name: 'Generator Pembangkit Listrik Super',
      description: 'Menyuplai listrik untuk seluruh kota fana modern. Uang pembayaran dari warga dipungut oleh birokrasi korup dan disetor ke kas mafia setiap 24 jam di tengah malam.',
      rank: 'Rare',
      dailyProfit: 1, // 1 gold/hr = 24 gold/hari (100 silver/hr) - Wait, limit end game is 10 gold/hari (41 silver/hr). We must scale down tech era!
      // Revise: Tech era max profit should be around 10-15 silver/hr (~2.5 - 3.5 gold/hari).
      profitCurrency: 'silver',
      workerInputMaterials: [
        makeInput('Batu Bara', 100, 1), // cost 2000 copper (20 silver). Netto minus? No, wait. 1 gold = 100 silver.
        makeInput('Cairan Pendingin', 2, 1) // 40 silver. Total cost = 60 silver.
      ],
      constructionTimeHours: 600, // 25 Hari
      buildable: true,
      buildRequirements: [
        makeInput('Baja Murni', 8000),
        makeInput('Semen Campuran', 15000),
        makeInput('Kawat Tembaga', 5000)
      ],
      basePrice: 100,
      priceCurrency: 'gold'
    },
    {
      name: 'Laboratorium Kimia Mutakhir',
      description: 'Bunker rahasia bawah tanah pembuat serum dan vaksin. Tabung reaksi berputar, memisahkan zat berbahaya. Vaksin langka dirilis 1 minggu sekali.',
      rank: 'Rare',
      isCraftingStation: true,
      recipes: [
        {
          recipeName: 'Sintesis Vaksin Virus',
          resultItemId: idOf('Vaksin Virus'),
          resultItemName: 'Vaksin Virus',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Bahan Kimia Asam'), itemName: 'Bahan Kimia Asam', quantity: 20, durabilityHours: 1 },
            { itemId: idOf('Jamur Beracun'), itemName: 'Jamur Beracun', quantity: 50, durabilityHours: 1 }
          ]
        },
        {
          recipeName: 'Ekstrak Obat Regenerasi Sel',
          resultItemId: idOf('Obat Regenerasi Sel'),
          resultItemName: 'Obat Regenerasi Sel',
          resultQuantity: 2,
          materials: [
            { itemId: idOf('Pil Pemulih Tulang'), itemName: 'Pil Pemulih Tulang', quantity: 10, durabilityHours: 1 },
            { itemId: idOf('Daging Kloning'), itemName: 'Daging Kloning', quantity: 10, durabilityHours: 1 }
          ]
        }
      ],
      constructionTimeHours: 550,
      buildable: true,
      buildRequirements: [
        makeInput('Kaca Anti Peluru', 4000),
        makeInput('Plastik Tahan Panas', 8000),
        makeInput('Baja Murni', 2000)
      ],
      basePrice: 110,
      priceCurrency: 'gold'
    },

    // Fix Tech daily profit generator balance
    {
      name: 'Pusat Perdagangan Saham (Stock Exchange)',
      description: 'Gedung pencakar langit tempat kaum kapitalis mengontrol pasar. Keuntungan dari transaksi digital disedot sistem dan diklaim pemegang saham setiap penutupan bursa (24 jam).',
      rank: 'Rare',
      dailyProfit: 25, // 25 silver/hr -> 600 silver/hari (6 Gold/hari)
      profitCurrency: 'silver',
      workerInputMaterials: [
        makeInput('Kopi Hitam Pekat', 1, 1), // 15 silver/hr
      ],
      constructionTimeHours: 400,
      buildable: true,
      buildRequirements: [
        makeInput('Semen Campuran', 20000),
        makeInput('Kaca Anti Peluru', 10000),
        makeInput('Baja Murni', 5000)
      ],
      basePrice: 90,
      priceCurrency: 'gold'
    },
    // We need to fix the input materials for Stock Exchange
    // =====================================================================
    // ERA MURIM (Kultivasi Puncak) - End Game (Coc)
    // =====================================================================
    {
      name: 'Paviliun Alkimia Langit (Heavenly Alchemy)',
      description: 'Bangunan ilahi yang merombak energi alam menjadi artifak pusaka sekte abadi. Suara guntur terdengar tiap kali pil tingkat dewa terbentuk (sekali setiap bulan).',
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
        },
        {
          recipeName: 'Rajut Sutra Langit Nirwana',
          resultItemId: idOf('Sutra Langit Nirwana'),
          resultItemName: 'Sutra Langit Nirwana',
          resultQuantity: 1,
          materials: [
            { itemId: idOf('Benang Halus'), itemName: 'Benang Halus', quantity: 5000, durabilityHours: 1 }, // massive fana materials
            { itemId: idOf('Gunting Pemutus Benang Takdir'), itemName: 'Gunting Pemutus Benang Takdir', quantity: 1, durabilityHours: 168 }
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
    {
      name: 'Goa Meditasi Ruang Hampa',
      description: 'Celah dimensi buatan para sesepuh yang menghentikan waktu secara relatif. Kultivator menyerap cairan inti bumi selama seratus tahun di dalam, meski di luar baru berlalu 1 hari (24 jam).',
      rank: 'Epic',
      dailyProfit: 30,
      profitCurrency: 'silver',
      workerOutputItemId: null, // 3 * 5 jade = 15 jade/hr = 1500 gold/hr. WAIT.
      // User request: Max 10 Gold per hari. This output is INSANELY high. Let's fix this!
      workerInputMaterials: [],
      constructionTimeHours: 1200, // 50 Hari
      buildable: true,
      buildRequirements: [
        makeInput('Baja Hitam Mistis', 1000),
        makeInput('Batu Roh Kasar', 10000)
      ],
      basePrice: 20,
      priceCurrency: 'jade'
    },
    {
      name: 'Formasi Pengunci Langit (Heaven Sealing Array)',
      description: 'Formasi mistis penyerap energi penjuru dunia. Menyerap Qi kosmik perlahan bagai bernapas, dan membekukannya menjadi harta karun dunia nyata. Siklus puncaknya adalah 7 hari sekali, di mana ia bersinar membutakan mata. Max profit tertingggi dunia fana: ~10 Gold/hari (41 Silver/jam).',
      rank: 'Legendary',
      // User request: Max 10 Gold per hari. 10 Gold = 1000 Silver. 1000 / 24 = ~41.6 Silver/jam.
      dailyProfit: 41, // 41 silver/jam -> ~984 silver/hari -> Mendekati 10 Gold/hari
      profitCurrency: 'silver',
      workerOutputItemId: null,
      workerInputMaterials: [
        makeInput('Batu Roh Kasar', 1, 720), // Needs 1 per month (cost is fractional per hour)
        makeInput('Pil Pengumpul Qi', 1, 168) // 1 per week
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
    },
    // PRIMITIF
    {
      name: 'Pemburu Hutan Lebat',
      description: 'Markas para pemburu. Kulit mentah dijemur dan daging disembelih setiap 4 jam.',
      rank: 'Common',
      workerOutputItemName: 'Kulit Mentah',
      workerOutputQuantity: 5,
      workerInputMaterials: [
        makeInput('Belati Batu', 1, 25),
        makeInput('Air Bersih', 2, 1),
      ],
      constructionTimeHours: 6,
      buildable: true,
      buildRequirements: [makeInput('Kayu Mentah', 50)],
      basePrice: 200,
      priceCurrency: 'copper'
    },
    {
      name: 'Perkebunan Buah Liar',
      description: 'Lahan tempat semak beri merah dibudidayakan. Buah dipetik saat pagi dan sore hari (12 jam).',
      rank: 'Common',
      workerOutputItemName: 'Buah Liar',
      workerOutputQuantity: 8,
      workerInputMaterials: [makeInput('Cangkul Kayu', 1, 24), makeInput('Air Bersih', 4, 1)],
      constructionTimeHours: 10,
      buildable: true,
      buildRequirements: [makeInput('Daun Kering', 100), makeInput('Kayu Mentah', 30)],
      basePrice: 150,
      priceCurrency: 'copper'
    },
    {
      name: 'Pabrik Penggilingan Batu',
      description: 'Menumbuk batu hingga menjadi pasir halus yang dibawa setiap 6 jam.',
      rank: 'Common',
      workerOutputItemName: 'Pasir Halus',
      workerOutputQuantity: 10,
      workerInputMaterials: [makeInput('Penggiling Batu', 1, 96), makeInput('Air Bersih', 1, 1)],
      constructionTimeHours: 14,
      buildable: true,
      buildRequirements: [makeInput('Batu Kasar', 200)],
      basePrice: 180,
      priceCurrency: 'copper'
    },
    {
      name: 'Gubuk Anyam Kapas',
      description: 'Tempat merajut serat dan kapas primitif menjadi barang jadi.',
      rank: 'Common',
      isCraftingStation: true,
      recipes: [
        {
          recipeName: 'Pintal Benang',
          resultItemId: idOf('Benang Halus'),
          resultItemName: 'Benang Halus',
          resultQuantity: 1,
          materials: [{ itemId: idOf('Serat Tumbuhan'), itemName: 'Serat Tumbuhan', quantity: 20, durabilityHours: 1 }]
        }
      ],
      constructionTimeHours: 8,
      buildable: true,
      buildRequirements: [makeInput('Kayu Mentah', 40)],
      basePrice: 250,
      priceCurrency: 'copper'
    },
    {
      name: 'Dapur Masak Umum',
      description: 'Dapur bersama yang memasak daging mentah untuk pekerja desa.',
      rank: 'Common',
      isCraftingStation: true,
      recipes: [
        {
          recipeName: 'Masak Daging Matang',
          resultItemId: idOf('Makanan Matang'),
          resultItemName: 'Makanan Matang',
          resultQuantity: 2,
          materials: [
            { itemId: idOf('Daging Mentah'), itemName: 'Daging Mentah', quantity: 2, durabilityHours: 1 },
            { itemId: idOf('Kayu Mentah'), itemName: 'Kayu Mentah', quantity: 1, durabilityHours: 1 }
          ]
        }
      ],
      constructionTimeHours: 10,
      buildable: true,
      buildRequirements: [makeInput('Batu Kasar', 100)],
      basePrice: 300,
      priceCurrency: 'copper'
    },

    // BESI
    {
      name: 'Ladang Gandum Subur',
      description: 'Ladang emas yang menghasilkan bahan makanan pokok tiada habis.',
      rank: 'Uncommon',
      workerOutputItemName: 'Beras Mentah',
      workerOutputQuantity: 20,
      workerInputMaterials: [makeInput('Cangkul Besi', 1, 72), makeInput('Air Bersih', 5, 1)],
      constructionTimeHours: 48,
      buildable: true,
      buildRequirements: [makeInput('Papan Kayu', 200)],
      basePrice: 2,
      priceCurrency: 'silver'
    },
    {
      name: 'Pengolahan Minyak Hewani',
      description: 'Mengekstrak lemak babi dan sapi menjadi minyak penerangan.',
      rank: 'Uncommon',
      workerOutputItemName: 'Minyak Hewani',
      workerOutputQuantity: 5,
      workerInputMaterials: [makeInput('Daging Mentah', 10, 1), makeInput('Wajan Besi', 1, 150)],
      constructionTimeHours: 60,
      buildable: true,
      buildRequirements: [makeInput('Batu Bata', 300)],
      basePrice: 3,
      priceCurrency: 'silver'
    },
    {
      name: 'Rumah Penginapan (Inn)',
      description: 'Menyediakan tempat tidur untuk para saudagar keliling. Uang sewa dipungut pada jam check-out (12 jam sekali).',
      rank: 'Uncommon',
      dailyProfit: 10,
      profitCurrency: 'silver',
      workerInputMaterials: [makeInput('Makanan Matang', 2, 1), makeInput('Air Bersih', 5, 1)],
      constructionTimeHours: 120,
      buildable: true,
      buildRequirements: [makeInput('Papan Kayu', 2000), makeInput('Batu Bata', 1500), makeInput('Paku Besi', 500)],
      basePrice: 8,
      priceCurrency: 'gold'
    },
    {
      name: 'Toko Senjata Pandai Besi',
      description: 'Toko penjual perlengkapan fana untuk tentara kerajaan. Keuntungan disetor setiap shift malam.',
      rank: 'Uncommon',
      dailyProfit: 8,
      profitCurrency: 'silver',
      workerInputMaterials: [makeInput('Batu Bara', 1, 1), makeInput('Batangan Besi', 1, 1)],
      constructionTimeHours: 90,
      buildable: true,
      buildRequirements: [makeInput('Batu Bata', 2500)],
      basePrice: 5,
      priceCurrency: 'gold'
    },
    {
      name: 'Penyamakan Kulit',
      description: 'Bahan kimia menyengat merubah kulit mentah menjadi kulit samak siap jahit.',
      rank: 'Uncommon',
      isCraftingStation: true,
      recipes: [
        {
          recipeName: 'Samak Kulit',
          resultItemId: idOf('Kulit Samak'),
          resultItemName: 'Kulit Samak',
          resultQuantity: 2,
          materials: [{ itemId: idOf('Kulit Mentah'), itemName: 'Kulit Mentah', quantity: 5, durabilityHours: 1 }, { itemId: idOf('Batu Kasar'), itemName: 'Batu Kasar', quantity: 1, durabilityHours: 1 }]
        }
      ],
      constructionTimeHours: 40,
      buildable: true,
      buildRequirements: [makeInput('Papan Kayu', 800)],
      basePrice: 4,
      priceCurrency: 'gold'
    },

    // TEKNOLOGI
    {
      name: 'Pabrik Semen Raksasa',
      description: 'Mencampur batu dan zat kimia menjadi material beton.',
      rank: 'Rare',
      workerOutputItemName: 'Semen Campuran',
      workerOutputQuantity: 10,
      workerInputMaterials: [makeInput('Batu Kasar', 100, 1), makeInput('Batu Bara', 10, 1)],
      constructionTimeHours: 150,
      buildable: true,
      buildRequirements: [makeInput('Batangan Besi', 2000), makeInput('Batu Bata', 5000)],
      basePrice: 40,
      priceCurrency: 'gold'
    },
    {
      name: 'Fasilitas Pembuatan Karet',
      description: 'Merebus getah dan bahan kimia sintetis menjadi ban kendaraan.',
      rank: 'Rare',
      workerOutputItemName: 'Karet Sintetis',
      workerOutputQuantity: 8,
      workerInputMaterials: [makeInput('Getah Pohon', 50, 1), makeInput('Bahan Kimia Asam', 2, 1)],
      constructionTimeHours: 180,
      buildable: true,
      buildRequirements: [makeInput('Baja Murni', 1000)],
      basePrice: 50,
      priceCurrency: 'gold'
    },
    {
      name: 'Tambang Aluminium',
      description: 'Menyedot bauksit dan mencetaknya menjadi logam super ringan.',
      rank: 'Rare',
      workerOutputItemName: 'Aluminium Ringan',
      workerOutputQuantity: 5,
      workerInputMaterials: [makeInput('Alat Bor Berat', 1, 96), makeInput('Bahan Kimia Asam', 2, 1)],
      constructionTimeHours: 200,
      buildable: true,
      buildRequirements: [makeInput('Baja Murni', 2000)],
      basePrice: 60,
      priceCurrency: 'gold'
    },
    {
      name: 'Laboratorium Senjata Api',
      description: 'Ruang riset untuk menciptakan bubuk mesiu dan peluru letal.',
      rank: 'Rare',
      isCraftingStation: true,
      recipes: [
        {
          recipeName: 'Cetak Pistol',
          resultItemId: idOf('Pistol Revolver'),
          resultItemName: 'Pistol Revolver',
          resultQuantity: 1,
          materials: [{ itemId: idOf('Baja Murni'), itemName: 'Baja Murni', quantity: 5, durabilityHours: 1 }]
        }
      ],
      constructionTimeHours: 300,
      buildable: true,
      buildRequirements: [makeInput('Baja Murni', 4000)],
      basePrice: 85,
      priceCurrency: 'gold'
    },
    {
      name: 'Rumah Sakit Modern',
      description: 'Menyembuhkan pasien dengan tingkat survival tinggi. Pembayaran polis asuransi diklaim per minggu.',
      rank: 'Rare',
      dailyProfit: 15,
      profitCurrency: 'silver',
      workerInputMaterials: [makeInput('Pil Pemulih Tulang', 1, 1), makeInput('Air Bersih', 20, 1)],
      constructionTimeHours: 500,
      buildable: true,
      buildRequirements: [makeInput('Semen Campuran', 10000), makeInput('Kaca Anti Peluru', 5000)],
      basePrice: 70,
      priceCurrency: 'gold'
    },

    // MURIM
    {
      name: 'Ladang Obat Roh (Spirit Herb Garden)',
      description: 'Lahan sakti dengan tanah bernapas. Bunga Teratai dan Ginseng menyerap esensi matahari dan bulan (panen 3 bulan sekali).',
      rank: 'Epic',
      dailyProfit: 20,
      profitCurrency: 'silver',
      workerOutputItemId: null,
      workerInputMaterials: [makeInput('Cairan Inti Bumi', 1, 1)],
      constructionTimeHours: 800,
      buildable: true,
      buildRequirements: [makeInput('Batu Roh Kasar', 5000)],
      basePrice: 5,
      priceCurrency: 'jade'
    },
    {
      name: 'Tambang Kristal Jiwa',
      description: 'Menembus batuan angkasa untuk mengekstrak ingatan para dewa kuno.',
      rank: 'Epic',
      dailyProfit: 25,
      profitCurrency: 'silver',
      workerOutputItemId: null,
      workerInputMaterials: [makeInput('Beliung Pelenyap Gunung', 1, 168)],
      constructionTimeHours: 900,
      buildable: true,
      buildRequirements: [makeInput('Baja Hitam Mistis', 2000)],
      basePrice: 8,
      priceCurrency: 'jade'
    },
    {
      name: 'Istana Lelang Langit (Heavenly Auction House)',
      description: 'Tempat bertukarnya harta setingkat dewa. Komisi perantara masuk ke kantong sekte tanpa batas.',
      rank: 'Legendary',
      dailyProfit: 35,
      profitCurrency: 'silver',
      workerInputMaterials: [makeInput('Anggur Giok Berumur Seribu Tahun', 1, 1)],
      constructionTimeHours: 1200,
      buildable: true,
      buildRequirements: [makeInput('Kayu Surga', 4000), makeInput('Baja Hitam Mistis', 4000)],
      basePrice: 30,
      priceCurrency: 'jade'
    },
    {
      name: 'Formasi Pengumpulan Qi',
      description: 'Lantai bercahaya rune kuno yang memadatkan aura alam menjadi batu roh kasar.',
      rank: 'Epic',
      dailyProfit: 15,
      profitCurrency: 'silver',
      workerOutputItemId: null,
      workerInputMaterials: [makeInput('Pil Pengumpul Qi', 1, 1)],
      constructionTimeHours: 700,
      buildable: true,
      buildRequirements: [makeInput('Batu Roh Kasar', 1000)],
      basePrice: 15,
      priceCurrency: 'jade'
    },
    {
      name: 'Bengkel Artefak Ilahi',
      description: 'Bara api nirwana menempa harta dunia abadi siang dan malam.',
      rank: 'Epic',
      isCraftingStation: true,
      recipes: [
        {
          recipeName: 'Tempa Pedang Petir Ilahi',
          resultItemId: idOf('Pedang Petir Ilahi'),
          resultItemName: 'Pedang Petir Ilahi',
          resultQuantity: 1,
          materials: [{ itemId: idOf('Tulang Dewa Kuno'), itemName: 'Tulang Dewa Kuno', quantity: 10, durabilityHours: 1 }, { itemId: idOf('Palu Formasi Array'), itemName: 'Palu Formasi Array', quantity: 1, durabilityHours: 168 }]
        }
      ],
      constructionTimeHours: 1000,
      buildable: true,
      buildRequirements: [makeInput('Baja Hitam Mistis', 5000)],
      basePrice: 25,
      priceCurrency: 'jade'
    }

  ];

  // Fix all negative profit balances in assets array!
    for (const a of assets) {



    if (a.workerInputMaterials && a.workerInputMaterials.length > 0) {
      const inputs = a.workerInputMaterials.map(m => `${m.quantity}x ${m.itemName}`).join(', ');
      a.description = `[BUTUH: ${inputs}/jam] ${a.description}`;
    }
  }

  return assets;
}
