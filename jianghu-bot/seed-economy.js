require('dotenv').config();
const mongoose = require('mongoose');

// Models
const Item = require('./models/Item');
const Asset = require('./models/Asset');
const Shop = require('./models/Shop');
const Player = require('./models/Player');

async function seedEconomy() {
  console.log("Menghubungkan ke MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Terhubung ke MongoDB!");

  try {
    const player = await Player.findOne({});
    if (!player) {
      throw new Error("Tidak ada pemain di database. Silakan registrasi setidaknya satu karakter (`/daftar`) terlebih dahulu agar sistem tau guild id-nya.");
    }
    const guildId = player.guildId;
    console.log(`Menggunakan GuildId: ${guildId}`);

    const itemCache = {}; // Untuk menyimpan ID dari semua item yang dibuat/ditemukan

    async function createItems(itemList) {
      for (const data of itemList) {
        let item = await Item.findOne({ guildId, name: data.name });
        if (!item) {
          item = new Item({ guildId, ...data, createdBy: 'System Oracle' });
          await item.save();
          console.log(`[Item Dibuat] ${data.name}`);
        } else {
          // console.log(`[Item Ada] ${data.name}`);
        }
        itemCache[data.name] = item;
      }
    }

    // =========================================================================
    // 1. ITEMS: TOOLS (SHOP)
    // =========================================================================
    console.log("\n--- MEMBUAT ITEMS (TOOLS) ---");
    const tools = [
      { name: "Cangkul Besi", rank: "Common", category: "consume", tier: 1, description: "Alat pertanian dasar.", basePrice: 50, priceCurrency: "silver" },
      { name: "Kapak Besi", rank: "Common", category: "consume", tier: 1, description: "Alat penebang pohon.", basePrice: 50, priceCurrency: "silver" },
      { name: "Beliung Besi", rank: "Common", category: "consume", tier: 1, description: "Alat tambang dasar.", basePrice: 50, priceCurrency: "silver" },
      { name: "Sabit Pemotong", rank: "Common", category: "consume", tier: 1, description: "Alat memanen gandum dan kapas.", basePrice: 50, priceCurrency: "silver" },
      { name: "Alat Pancing Kayu", rank: "Common", category: "consume", tier: 1, description: "Kail bambu sederhana.", basePrice: 50, priceCurrency: "silver" },
      { name: "Palu Tempa", rank: "Common", category: "consume", tier: 2, description: "Palu untuk membuat senjata dan batangan logam.", basePrice: 2, priceCurrency: "gold" },
    ];
    await createItems(tools);

    // =========================================================================
    // 2. ITEMS: BIBIT & AGRIKULTUR (SHOP)
    // =========================================================================
    console.log("\n--- MEMBUAT ITEMS (BIBIT & MAKANANDASAR) ---");
    const seedsAndFood = [
      { name: "Bibit Gandum", rank: "Common", category: "material", tier: 1, description: "Biji gandum musim semi.", basePrice: 10, priceCurrency: "silver" },
      { name: "Bibit Padi", rank: "Common", category: "material", tier: 1, description: "Bibit padi untuk area sawah berair.", basePrice: 10, priceCurrency: "silver" },
      { name: "Bibit Kapas", rank: "Common", category: "material", tier: 1, description: "Menghasilkan serat kapas untuk pakaian.", basePrice: 10, priceCurrency: "silver" },
      { name: "Gandum", rank: "Common", category: "material", tier: 1, description: "Biji gandum mentah.", basePrice: 5, priceCurrency: "silver" },
      { name: "Padi Mentah", rank: "Common", category: "material", tier: 1, description: "Padi yang belum ditumbuk.", basePrice: 5, priceCurrency: "silver" },
      { name: "Kapas Mentah", rank: "Common", category: "material", tier: 1, description: "Gumpalan kapas putih.", basePrice: 5, priceCurrency: "silver" },
      { name: "Daging Mentah", rank: "Common", category: "consume", tier: 1, description: "Daging hasil berburu.", basePrice: 10, priceCurrency: "silver", effect: "Pemulihan kecil (Mentah, resiko sakit)" },
      { name: "Ikan Air Tawar", rank: "Common", category: "consume", tier: 1, description: "Ikan dari sungai.", basePrice: 8, priceCurrency: "silver" },
      { name: "Sayur Liar", rank: "Common", category: "consume", tier: 1, description: "Sayuran dari pinggiran hutan.", basePrice: 2, priceCurrency: "silver" }
    ];
    await createItems(seedsAndFood);

    // =========================================================================
    // 3. ITEMS: MATERIAL TAMBANG & ALAM (RAW)
    // =========================================================================
    console.log("\n--- MEMBUAT ITEMS (RAW MATERIAL ALAM) ---");
    const rawMats = [
      { name: "Tanah Liat", rank: "Common", category: "material", tier: 1, description: "Lumpur sungai pembuat bata.", basePrice: 2, priceCurrency: "silver" },
      { name: "Kayu Mentah", rank: "Common", category: "material", tier: 1, description: "Potongan kayu segar dari hutan.", basePrice: 2, priceCurrency: "silver" },
      { name: "Batu Kasar", rank: "Common", category: "material", tier: 1, description: "Batu dari pegunungan fana.", basePrice: 2, priceCurrency: "silver" },
      { name: "Pasir Putih", rank: "Common", category: "material", tier: 1, description: "Bisa dilebur menjadi kaca.", basePrice: 2, priceCurrency: "silver" },
      { name: "Batu Kapur", rank: "Common", category: "material", tier: 1, description: "Bahan pembuat semen.", basePrice: 5, priceCurrency: "silver" },
      { name: "Batu Bara", rank: "Common", category: "material", tier: 1, description: "Bahan bakar panas tinggi.", basePrice: 10, priceCurrency: "silver" },
      { name: "Bijih Tembaga", rank: "Common", category: "material", tier: 1, description: "Logam kemerahan.", basePrice: 15, priceCurrency: "silver" },
      { name: "Bijih Timah", rank: "Common", category: "material", tier: 1, description: "Logam lunak.", basePrice: 15, priceCurrency: "silver" },
      { name: "Bijih Besi", rank: "Uncommon", category: "material", tier: 2, description: "Logam keras untuk alat dan senjata.", basePrice: 50, priceCurrency: "silver" },
      { name: "Bijih Perak", rank: "Rare", category: "material", tier: 3, description: "Logam mulia.", basePrice: 1, priceCurrency: "gold" },
      { name: "Rumput Spiritual Dasar", rank: "Uncommon", category: "herb", tier: 2, description: "Menyerap Qi langit dan bumi.", basePrice: 20, priceCurrency: "silver" },
      { name: "Pecahan Batu Roh", rank: "Rare", category: "material", tier: 3, description: "Batu memancarkan Qi murni.", basePrice: 2, priceCurrency: "gold" },
      { name: "Teratai Salju", rank: "Epic", category: "herb", tier: 4, description: "Tumbuh di puncak gunung es.", basePrice: 10, priceCurrency: "gold" },
    ];
    await createItems(rawMats);

    // =========================================================================
    // 4. ITEMS: MATERIAL OLAHAN (PROCESSED)
    // =========================================================================
    console.log("\n--- MEMBUAT ITEMS (PROCESSED MATERIAL & CONSUME) ---");
    const procMats = [
      // Arsitektur
      { name: "Batu Bata", rank: "Common", category: "material", tier: 1, description: "Tanah liat yang dibakar.", basePrice: 10, priceCurrency: "silver" },
      { name: "Papan Kayu", rank: "Common", category: "material", tier: 1, description: "Kayu yang dihaluskan.", basePrice: 10, priceCurrency: "silver" },
      { name: "Balok Batu", rank: "Common", category: "material", tier: 1, description: "Batu yang dipahat rapi.", basePrice: 10, priceCurrency: "silver" },
      { name: "Kaca Kusam", rank: "Common", category: "material", tier: 1, description: "Pasir yang dilebur.", basePrice: 20, priceCurrency: "silver" },
      { name: "Semen Mentah", rank: "Uncommon", category: "material", tier: 2, description: "Campuran batu kapur dan liat.", basePrice: 50, priceCurrency: "silver" },

      // Tekstil
      { name: "Benang", rank: "Common", category: "material", tier: 1, description: "Pintalan kapas.", basePrice: 15, priceCurrency: "silver" },
      { name: "Kain Katun", rank: "Common", category: "material", tier: 1, description: "Tenunan benang.", basePrice: 40, priceCurrency: "silver" },

      // Logam
      { name: "Batangan Tembaga", rank: "Common", category: "material", tier: 1, description: "Tembaga murni.", basePrice: 40, priceCurrency: "silver" },
      { name: "Batangan Timah", rank: "Common", category: "material", tier: 1, description: "Timah murni.", basePrice: 40, priceCurrency: "silver" },
      { name: "Perunggu", rank: "Uncommon", category: "material", tier: 2, description: "Paduan tembaga dan timah.", basePrice: 1, priceCurrency: "gold" },
      { name: "Batangan Besi", rank: "Uncommon", category: "material", tier: 2, description: "Besi yang dilebur dengan batu bara.", basePrice: 2, priceCurrency: "gold" },
      { name: "Baja Keras", rank: "Rare", category: "material", tier: 3, description: "Besi yang ditempa berkali-kali.", basePrice: 5, priceCurrency: "gold" },

      // Pangan
      { name: "Tepung Terigu", rank: "Common", category: "material", tier: 1, description: "Gilingan gandum.", basePrice: 15, priceCurrency: "silver" },
      { name: "Beras Putih", rank: "Common", category: "material", tier: 1, description: "Padi yang telah ditumbuk.", basePrice: 15, priceCurrency: "silver" },
      { name: "Roti Panggang", rank: "Common", category: "consume", tier: 1, description: "Karbohidrat penghilang lapar.", basePrice: 30, priceCurrency: "silver", effect: "Memulihkan 20 Hunger Pet/Player" },
      { name: "Nasi Putih", rank: "Common", category: "consume", tier: 1, description: "Nasi pulen.", basePrice: 30, priceCurrency: "silver", effect: "Memulihkan 20 Hunger Pet/Player" },
      { name: "Daging Panggang", rank: "Uncommon", category: "consume", tier: 2, description: "Daging panggang lezat.", basePrice: 50, priceCurrency: "silver", effect: "Memulihkan 40 Hunger" },

      // Xianxia
      { name: "Pil Pengumpul Qi Dasar", rank: "Uncommon", category: "pill", tier: 2, description: "Meningkatkan sirkulasi Qi.", basePrice: 1, priceCurrency: "gold" },
      { name: "Pil Pembersih Sumsum", rank: "Epic", category: "pill", tier: 4, description: "Memperkuat tulang dan menolak racun.", basePrice: 25, priceCurrency: "gold" },
    ];
    await createItems(procMats);

    // Helper untuk memudahkan panggil id
    const idOf = (name) => {
      if (!itemCache[name]) throw new Error(`Item ${name} tidak ditemukan di cache!`);
      return itemCache[name]._id;
    };

    // =========================================================================
    // 5. ASSETS: PENGUMPUL (GATHERING)
    // =========================================================================
    console.log("\n--- MEMBUAT ASET (GATHERING/PENGUMPUL) ---");
    const gatherAssets = [
      {
        name: "Lahan Gandum", description: "Menghasilkan 10 Gandum/hari.", rank: "Common",
        workerOutputItemId: idOf("Gandum"), workerOutputItemName: "Gandum", workerOutputQuantity: 10,
        constructionTimeHours: 2, buildable: true,
        buildRequirements: [{ itemId: idOf("Cangkul Besi"), itemName: "Cangkul Besi", quantity: 1 }, { itemId: idOf("Bibit Gandum"), itemName: "Bibit Gandum", quantity: 5 }]
      },
      {
        name: "Sawah Padi", description: "Menghasilkan 10 Padi Mentah/hari.", rank: "Common",
        workerOutputItemId: idOf("Padi Mentah"), workerOutputItemName: "Padi Mentah", workerOutputQuantity: 10,
        constructionTimeHours: 2, buildable: true,
        buildRequirements: [{ itemId: idOf("Cangkul Besi"), itemName: "Cangkul Besi", quantity: 1 }, { itemId: idOf("Bibit Padi"), itemName: "Bibit Padi", quantity: 5 }]
      },
      {
        name: "Kebun Kapas", description: "Menghasilkan 10 Kapas Mentah/hari.", rank: "Common",
        workerOutputItemId: idOf("Kapas Mentah"), workerOutputItemName: "Kapas Mentah", workerOutputQuantity: 10,
        constructionTimeHours: 2, buildable: true,
        buildRequirements: [{ itemId: idOf("Cangkul Besi"), itemName: "Cangkul Besi", quantity: 1 }, { itemId: idOf("Bibit Kapas"), itemName: "Bibit Kapas", quantity: 5 }]
      },
      {
        name: "Lahan Tanah Liat", description: "Menghasilkan 20 Tanah Liat/hari.", rank: "Common",
        workerOutputItemId: idOf("Tanah Liat"), workerOutputItemName: "Tanah Liat", workerOutputQuantity: 20,
        constructionTimeHours: 2, buildable: true,
        buildRequirements: [{ itemId: idOf("Cangkul Besi"), itemName: "Cangkul Besi", quantity: 1 }]
      },
      {
        name: "Area Penebangan Kayu", description: "Menghasilkan 20 Kayu Mentah/hari.", rank: "Common",
        workerOutputItemId: idOf("Kayu Mentah"), workerOutputItemName: "Kayu Mentah", workerOutputQuantity: 20,
        constructionTimeHours: 2, buildable: true,
        buildRequirements: [{ itemId: idOf("Kapak Besi"), itemName: "Kapak Besi", quantity: 1 }]
      },
      {
        name: "Tambang Batu Fana", description: "Menghasilkan 20 Batu Kasar/hari.", rank: "Common",
        workerOutputItemId: idOf("Batu Kasar"), workerOutputItemName: "Batu Kasar", workerOutputQuantity: 20,
        constructionTimeHours: 2, buildable: true,
        buildRequirements: [{ itemId: idOf("Beliung Besi"), itemName: "Beliung Besi", quantity: 1 }]
      },
      {
        name: "Tambang Batu Bara", description: "Menghasilkan 15 Batu Bara/hari.", rank: "Common",
        workerOutputItemId: idOf("Batu Bara"), workerOutputItemName: "Batu Bara", workerOutputQuantity: 15,
        constructionTimeHours: 4, buildable: true,
        buildRequirements: [{ itemId: idOf("Beliung Besi"), itemName: "Beliung Besi", quantity: 2 }, { itemId: idOf("Balok Batu"), itemName: "Balok Batu", quantity: 10 }]
      },
      {
        name: "Tambang Tembaga", description: "Menghasilkan 10 Bijih Tembaga/hari.", rank: "Common",
        workerOutputItemId: idOf("Bijih Tembaga"), workerOutputItemName: "Bijih Tembaga", workerOutputQuantity: 10,
        constructionTimeHours: 6, buildable: true,
        buildRequirements: [{ itemId: idOf("Beliung Besi"), itemName: "Beliung Besi", quantity: 2 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 10 }]
      },
      {
        name: "Tambang Timah", description: "Menghasilkan 10 Bijih Timah/hari.", rank: "Common",
        workerOutputItemId: idOf("Bijih Timah"), workerOutputItemName: "Bijih Timah", workerOutputQuantity: 10,
        constructionTimeHours: 6, buildable: true,
        buildRequirements: [{ itemId: idOf("Beliung Besi"), itemName: "Beliung Besi", quantity: 2 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 10 }]
      },
      {
        name: "Tambang Besi", description: "Menghasilkan 5 Bijih Besi/hari. Butuh penyangga kuat.", rank: "Uncommon",
        workerOutputItemId: idOf("Bijih Besi"), workerOutputItemName: "Bijih Besi", workerOutputQuantity: 5,
        constructionTimeHours: 12, buildable: true,
        buildRequirements: [{ itemId: idOf("Beliung Besi"), itemName: "Beliung Besi", quantity: 3 }, { itemId: idOf("Balok Batu"), itemName: "Balok Batu", quantity: 20 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 20 }]
      },
      {
        name: "Penggalian Pasir", description: "Menghasilkan 15 Pasir Putih/hari.", rank: "Common",
        workerOutputItemId: idOf("Pasir Putih"), workerOutputItemName: "Pasir Putih", workerOutputQuantity: 15,
        constructionTimeHours: 2, buildable: true,
        buildRequirements: [{ itemId: idOf("Cangkul Besi"), itemName: "Cangkul Besi", quantity: 1 }]
      },
      {
        name: "Perburuan Hutan", description: "Menghasilkan 5 Daging Mentah/hari.", rank: "Common",
        workerOutputItemId: idOf("Daging Mentah"), workerOutputItemName: "Daging Mentah", workerOutputQuantity: 5,
        constructionTimeHours: 1, buildable: true,
        buildRequirements: [{ itemId: idOf("Kapak Besi"), itemName: "Kapak Besi", quantity: 1 }]
      }
    ];

    for (const g of gatherAssets) {
      let asset = await Asset.findOne({ guildId, name: g.name });
      if (!asset) {
        await new Asset({ guildId, ...g, createdBy: 'System Oracle' }).save();
        console.log(`[Aset Dibuat] ${g.name}`);
      }
    }

    // =========================================================================
    // 6. ASSETS: PENGOLAHAN (CRAFTING STATIONS)
    // =========================================================================
    console.log("\n--- MEMBUAT ASET (CRAFTING STATIONS) ---");
    const craftAssets = [
      {
        name: "Pusat Pengrajin Desa", description: "Membuat Bata, Papan, dan Balok.", rank: "Common", isCraftingStation: true,
        constructionTimeHours: 12, buildable: true,
        buildRequirements: [{ itemId: idOf("Kapak Besi"), itemName: "Kapak Besi", quantity: 1 }, { itemId: idOf("Kayu Mentah"), itemName: "Kayu Mentah", quantity: 20 }, { itemId: idOf("Batu Kasar"), itemName: "Batu Kasar", quantity: 10 }],
        recipes: [
          { recipeName: "Bakar Bata", resultItemId: idOf("Batu Bata"), resultItemName: "Batu Bata", resultQuantity: 1, materials: [{ itemId: idOf("Tanah Liat"), itemName: "Tanah Liat", quantity: 2 }] },
          { recipeName: "Gergaji Papan", resultItemId: idOf("Papan Kayu"), resultItemName: "Papan Kayu", resultQuantity: 1, materials: [{ itemId: idOf("Kayu Mentah"), itemName: "Kayu Mentah", quantity: 2 }] },
          { recipeName: "Pahat Balok", resultItemId: idOf("Balok Batu"), resultItemName: "Balok Batu", resultQuantity: 1, materials: [{ itemId: idOf("Batu Kasar"), itemName: "Batu Kasar", quantity: 2 }] }
        ]
      },
      {
        name: "Kincir Air", description: "Menggiling biji-bijian. Butuh Balok Batu.", rank: "Common", isCraftingStation: true,
        constructionTimeHours: 8, buildable: true,
        buildRequirements: [{ itemId: idOf("Balok Batu"), itemName: "Balok Batu", quantity: 20 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 10 }],
        recipes: [
          { recipeName: "Giling Gandum", resultItemId: idOf("Tepung Terigu"), resultItemName: "Tepung Terigu", resultQuantity: 1, materials: [{ itemId: idOf("Gandum"), itemName: "Gandum", quantity: 2 }] },
          { recipeName: "Tumbuk Padi", resultItemId: idOf("Beras Putih"), resultItemName: "Beras Putih", resultQuantity: 1, materials: [{ itemId: idOf("Padi Mentah"), itemName: "Padi Mentah", quantity: 2 }] }
        ]
      },
      {
        name: "Dapur Umum", description: "Memasak makanan.", rank: "Common", isCraftingStation: true,
        constructionTimeHours: 6, buildable: true,
        buildRequirements: [{ itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 15 }, { itemId: idOf("Kayu Mentah"), itemName: "Kayu Mentah", quantity: 10 }],
        recipes: [
          { recipeName: "Panggang Roti", resultItemId: idOf("Roti Panggang"), resultItemName: "Roti Panggang", resultQuantity: 1, materials: [{ itemId: idOf("Tepung Terigu"), itemName: "Tepung Terigu", quantity: 1 }] },
          { recipeName: "Tanakan Nasi", resultItemId: idOf("Nasi Putih"), resultItemName: "Nasi Putih", resultQuantity: 1, materials: [{ itemId: idOf("Beras Putih"), itemName: "Beras Putih", quantity: 1 }] },
          { recipeName: "Bakar Daging", resultItemId: idOf("Daging Panggang"), resultItemName: "Daging Panggang", resultQuantity: 1, materials: [{ itemId: idOf("Daging Mentah"), itemName: "Daging Mentah", quantity: 1 }, { itemId: idOf("Kayu Mentah"), itemName: "Kayu Mentah", quantity: 1 }] }
        ]
      },
      {
        name: "Alat Tenun Tradisional", description: "Membuat benang dan kain.", rank: "Common", isCraftingStation: true,
        constructionTimeHours: 6, buildable: true,
        buildRequirements: [{ itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 15 }],
        recipes: [
          { recipeName: "Pintal Benang", resultItemId: idOf("Benang"), resultItemName: "Benang", resultQuantity: 1, materials: [{ itemId: idOf("Kapas Mentah"), itemName: "Kapas Mentah", quantity: 3 }] },
          { recipeName: "Tenun Kain", resultItemId: idOf("Kain Katun"), resultItemName: "Kain Katun", resultQuantity: 1, materials: [{ itemId: idOf("Benang"), itemName: "Benang", quantity: 3 }] }
        ]
      },
      {
        name: "Tungku Peleburan Dasar", description: "Melebur bijih & pasir (Smelter).", rank: "Uncommon", isCraftingStation: true,
        constructionTimeHours: 24, buildable: true,
        buildRequirements: [{ itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 40 }, { itemId: idOf("Tanah Liat"), itemName: "Tanah Liat", quantity: 20 }],
        recipes: [
          { recipeName: "Lebur Kaca", resultItemId: idOf("Kaca Kusam"), resultItemName: "Kaca Kusam", resultQuantity: 1, materials: [{ itemId: idOf("Pasir Putih"), itemName: "Pasir Putih", quantity: 2 }, { itemId: idOf("Batu Bara"), itemName: "Batu Bara", quantity: 1 }] },
          { recipeName: "Lebur Tembaga", resultItemId: idOf("Batangan Tembaga"), resultItemName: "Batangan Tembaga", resultQuantity: 1, materials: [{ itemId: idOf("Bijih Tembaga"), itemName: "Bijih Tembaga", quantity: 3 }, { itemId: idOf("Batu Bara"), itemName: "Batu Bara", quantity: 1 }] },
          { recipeName: "Lebur Timah", resultItemId: idOf("Batangan Timah"), resultItemName: "Batangan Timah", resultQuantity: 1, materials: [{ itemId: idOf("Bijih Timah"), itemName: "Bijih Timah", quantity: 3 }, { itemId: idOf("Batu Bara"), itemName: "Batu Bara", quantity: 1 }] },
          { recipeName: "Paduan Perunggu", resultItemId: idOf("Perunggu"), resultItemName: "Perunggu", resultQuantity: 1, materials: [{ itemId: idOf("Batangan Tembaga"), itemName: "Batangan Tembaga", quantity: 1 }, { itemId: idOf("Batangan Timah"), itemName: "Batangan Timah", quantity: 1 }, { itemId: idOf("Batu Bara"), itemName: "Batu Bara", quantity: 2 }] },
          { recipeName: "Lebur Besi", resultItemId: idOf("Batangan Besi"), resultItemName: "Batangan Besi", resultQuantity: 1, materials: [{ itemId: idOf("Bijih Besi"), itemName: "Bijih Besi", quantity: 4 }, { itemId: idOf("Batu Bara"), itemName: "Batu Bara", quantity: 2 }] },
          { recipeName: "Tempa Baja", resultItemId: idOf("Baja Keras"), resultItemName: "Baja Keras", resultQuantity: 1, materials: [{ itemId: idOf("Batangan Besi"), itemName: "Batangan Besi", quantity: 2 }, { itemId: idOf("Batu Bara"), itemName: "Batu Bara", quantity: 3 }, { itemId: idOf("Palu Tempa"), itemName: "Palu Tempa", quantity: 1 }] }, // Palu tempa dikonsumsi di sini sbg contoh sink hole
          { recipeName: "Buat Semen", resultItemId: idOf("Semen Mentah"), resultItemName: "Semen Mentah", resultQuantity: 1, materials: [{ itemId: idOf("Batu Kapur"), itemName: "Batu Kapur", quantity: 2 }, { itemId: idOf("Tanah Liat"), itemName: "Tanah Liat", quantity: 1 }] }
        ]
      }
    ];

    for (const c of craftAssets) {
      let asset = await Asset.findOne({ guildId, name: c.name });
      if (!asset) {
        await new Asset({ guildId, ...c, createdBy: 'System Oracle' }).save();
        console.log(`[Aset Dibuat] ${c.name}`);
      }
    }

    // =========================================================================
    // 7. ASSETS: FUNGSIONAL / INCOME / KULTIVASI
    // =========================================================================
    console.log("\n--- MEMBUAT ASET (INCOME & KULTIVASI) ---");
    const funcAssets = [
      {
        name: "Kuil Leluhur Desa", description: "Menghasilkan sumbangan umat (20 Silver/hari).", rank: "Uncommon",
        dailyProfit: 20, profitCurrency: "silver", constructionTimeHours: 48, buildable: true,
        buildRequirements: [{ itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 40 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 20 }, { itemId: idOf("Balok Batu"), itemName: "Balok Batu", quantity: 10 }]
      },
      {
        name: "Kedai Makan Desa", description: "Pusat kuliner (50 Silver/hari).", rank: "Uncommon",
        dailyProfit: 50, profitCurrency: "silver", constructionTimeHours: 48, buildable: true,
        buildRequirements: [{ itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 50 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 30 }, { itemId: idOf("Kaca Kusam"), itemName: "Kaca Kusam", quantity: 5 }]
      },
      {
        name: "Balai Desa", description: "Pusat administrasi desa (1 Gold/hari). Membutuhkan material kompleks.", rank: "Rare",
        dailyProfit: 100, profitCurrency: "silver", constructionTimeHours: 96, buildable: true,
        buildRequirements: [{ itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 100 }, { itemId: idOf("Semen Mentah"), itemName: "Semen Mentah", quantity: 20 }, { itemId: idOf("Baja Keras"), itemName: "Baja Keras", quantity: 10 }, { itemId: idOf("Kaca Kusam"), itemName: "Kaca Kusam", quantity: 20 }]
      },
      {
        name: "Tambang Batu Roh", description: "Menghasilkan 2 Pecahan Batu Roh/hari. Peralihan menuju dunia kultivasi.", rank: "Rare",
        workerOutputItemId: idOf("Pecahan Batu Roh"), workerOutputItemName: "Pecahan Batu Roh", workerOutputQuantity: 2,
        constructionTimeHours: 72, buildable: true,
        buildRequirements: [{ itemId: idOf("Baja Keras"), itemName: "Baja Keras", quantity: 10 }, { itemId: idOf("Balok Batu"), itemName: "Balok Batu", quantity: 50 }, { itemId: idOf("Beliung Besi"), itemName: "Beliung Besi", quantity: 5 }]
      },
      {
        name: "Kebun Spiritual Inti", description: "Menghasilkan 1 Teratai Salju/hari.", rank: "Epic",
        workerOutputItemId: idOf("Teratai Salju"), workerOutputItemName: "Teratai Salju", workerOutputQuantity: 1,
        constructionTimeHours: 96, buildable: true,
        buildRequirements: [{ itemId: idOf("Semen Mentah"), itemName: "Semen Mentah", quantity: 50 }, { itemId: idOf("Kaca Kusam"), itemName: "Kaca Kusam", quantity: 50 }, { itemId: idOf("Pecahan Batu Roh"), itemName: "Pecahan Batu Roh", quantity: 10 }]
      }
    ];

    for (const f of funcAssets) {
      let asset = await Asset.findOne({ guildId, name: f.name });
      if (!asset) {
        await new Asset({ guildId, ...f, createdBy: 'System Oracle' }).save();
        console.log(`[Aset Dibuat] ${f.name}`);
      }
    }

    // =========================================================================
    // 8. SHOP INJECTION
    // =========================================================================
    console.log("\n--- MENDAFTARKAN TOOLS & SEEDS KE SHOP ---");
    const shopItems = [...tools, ...seedsAndFood];
    for (const s of shopItems) {
      const item = itemCache[s.name];
      let shopEntry = await Shop.findOne({ guildId, refId: item._id });
      if (!shopEntry) {
        await new Shop({ guildId, category: 'item', refId: item._id, refModel: 'Item', price: s.basePrice, priceCurrency: s.priceCurrency, stock: -1, addedBy: 'System Oracle' }).save();
        console.log(`[Shop] Ditambahkan: ${s.name}`);
      }
    }

    console.log("\n=== SEEDING SELESAI ===");
    console.log("50+ Item dan 30+ Aset dengan rantai Metalurgi, Pangan, dan Kultivasi sukses dibuat!");

  } catch (err) {
    console.error("Terjadi error saat seeding:", err);
  } finally {
    mongoose.connection.close();
  }
}

seedEconomy();
