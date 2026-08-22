require('dotenv').config();
const mongoose = require('mongoose');

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

    const itemCache = {};

    async function createItems(itemList) {
      for (const data of itemList) {
        let item = await Item.findOne({ guildId, name: data.name });
        if (!item) {
          item = new Item({ guildId, ...data, createdBy: 'System Oracle' });
          await item.save();
        }
        itemCache[data.name] = item;
      }
    }

    // =========================================================================
    // 1. ITEMS: TOOLS (SHOP)
    // =========================================================================
    console.log("\n--- MEMBUAT ITEMS (TOOLS) ---");
    const tools = [
      { name: "Cangkul Besi", rank: "Common", category: "consume", tier: 1, description: "Alat pertanian dasar. Hilang setelah dipakai membangun.", basePrice: 50, priceCurrency: "silver" },
      { name: "Kapak Besi", rank: "Common", category: "consume", tier: 1, description: "Alat penebang pohon. Hilang setelah dipakai membangun.", basePrice: 50, priceCurrency: "silver" },
      { name: "Beliung Besi", rank: "Common", category: "consume", tier: 1, description: "Alat tambang dasar. Hilang setelah dipakai membangun.", basePrice: 50, priceCurrency: "silver" },
      { name: "Sabit Pemotong", rank: "Common", category: "consume", tier: 1, description: "Alat memanen gandum dan kapas.", basePrice: 50, priceCurrency: "silver" },
      { name: "Alat Pancing Kayu", rank: "Common", category: "consume", tier: 1, description: "Kail bambu sederhana.", basePrice: 50, priceCurrency: "silver" },
      { name: "Pisau Jagal", rank: "Common", category: "consume", tier: 1, description: "Pisau untuk memproses hewan ternak.", basePrice: 50, priceCurrency: "silver" },
      { name: "Palu Tempa", rank: "Common", category: "consume", tier: 2, description: "Palu untuk membuat senjata dan batangan logam.", basePrice: 2, priceCurrency: "gold" },
      { name: "Jaring Nelayan", rank: "Common", category: "consume", tier: 2, description: "Jaring besar untuk menangkap ikan laut.", basePrice: 1, priceCurrency: "gold" }
    ];
    await createItems(tools);

    // =========================================================================
    // 2. ITEMS: BIBIT, PAKAN & MAKANAN DASAR (SHOP)
    // =========================================================================
    console.log("\n--- MEMBUAT ITEMS (BIBIT, PAKAN & MAKANAN DASAR) ---");
    const seedsAndFood = [
      // Bibit Agrikultur
      { name: "Bibit Gandum", rank: "Common", category: "material", tier: 1, description: "Biji gandum musim semi.", basePrice: 10, priceCurrency: "silver" },
      { name: "Bibit Padi", rank: "Common", category: "material", tier: 1, description: "Bibit padi untuk area sawah berair.", basePrice: 10, priceCurrency: "silver" },
      { name: "Bibit Kapas", rank: "Common", category: "material", tier: 1, description: "Menghasilkan serat kapas untuk pakaian.", basePrice: 10, priceCurrency: "silver" },
      { name: "Bibit Anggur", rank: "Common", category: "material", tier: 1, description: "Biji anggur untuk fermentasi.", basePrice: 15, priceCurrency: "silver" },
      { name: "Bibit Bambu", rank: "Common", category: "material", tier: 1, description: "Tunas bambu yang tumbuh cepat.", basePrice: 10, priceCurrency: "silver" },

      // Pakan & Peternakan Awal
      { name: "Pakan Ternak", rank: "Common", category: "consume", tier: 1, description: "Makanan untuk sapi, ayam, dan kuda.", basePrice: 15, priceCurrency: "silver" },
      { name: "Gandum", rank: "Common", category: "material", tier: 1, description: "Biji gandum mentah.", basePrice: 5, priceCurrency: "silver" },
      { name: "Padi Mentah", rank: "Common", category: "material", tier: 1, description: "Padi yang belum ditumbuk.", basePrice: 5, priceCurrency: "silver" },
      { name: "Kapas Mentah", rank: "Common", category: "material", tier: 1, description: "Gumpalan kapas putih.", basePrice: 5, priceCurrency: "silver" },
      { name: "Anggur Segar", rank: "Common", category: "consume", tier: 1, description: "Anggur ranum.", basePrice: 5, priceCurrency: "silver" },

      // Hewan & Hasil Alam Fana
      { name: "Daging Mentah", rank: "Common", category: "consume", tier: 1, description: "Daging mentah, harus dimasak.", basePrice: 10, priceCurrency: "silver" },
      { name: "Ikan Air Tawar", rank: "Common", category: "consume", tier: 1, description: "Ikan sungai berukuran sedang.", basePrice: 8, priceCurrency: "silver" },
      { name: "Ikan Laut", rank: "Uncommon", category: "consume", tier: 2, description: "Ikan laut yang bergizi tinggi.", basePrice: 20, priceCurrency: "silver" },
      { name: "Sayur Liar", rank: "Common", category: "consume", tier: 1, description: "Sayuran dari pinggiran hutan.", basePrice: 2, priceCurrency: "silver" },
      { name: "Telur Mentah", rank: "Common", category: "consume", tier: 1, description: "Telur ayam dari peternakan.", basePrice: 8, priceCurrency: "silver" },
      { name: "Susu Sapi", rank: "Common", category: "consume", tier: 1, description: "Susu segar.", basePrice: 10, priceCurrency: "silver" },
      { name: "Kulit Mentah", rank: "Common", category: "material", tier: 1, description: "Kulit hewan hasil buruan/jagal.", basePrice: 10, priceCurrency: "silver" },
    ];
    await createItems(seedsAndFood);

    // =========================================================================
    // 3. ITEMS: MATERIAL TAMBANG & ALAM (RAW)
    // =========================================================================
    console.log("\n--- MEMBUAT ITEMS (RAW MATERIAL ALAM) ---");
    const rawMats = [
      // Tanah & Batu
      { name: "Tanah Liat", rank: "Common", category: "material", tier: 1, description: "Lumpur sungai pembuat bata.", basePrice: 2, priceCurrency: "silver" },
      { name: "Tanah Liat Merah", rank: "Uncommon", category: "material", tier: 2, description: "Tanah liat khusus pembuat genteng keramik.", basePrice: 5, priceCurrency: "silver" },
      { name: "Kayu Mentah", rank: "Common", category: "material", tier: 1, description: "Potongan kayu segar dari hutan.", basePrice: 2, priceCurrency: "silver" },
      { name: "Bambu", rank: "Common", category: "material", tier: 1, description: "Batang bambu serbaguna.", basePrice: 3, priceCurrency: "silver" },
      { name: "Batu Kasar", rank: "Common", category: "material", tier: 1, description: "Batu dari pegunungan fana.", basePrice: 2, priceCurrency: "silver" },
      { name: "Pasir Putih", rank: "Common", category: "material", tier: 1, description: "Bisa dilebur menjadi kaca.", basePrice: 2, priceCurrency: "silver" },
      { name: "Batu Kapur", rank: "Common", category: "material", tier: 1, description: "Bahan pembuat semen.", basePrice: 5, priceCurrency: "silver" },
      { name: "Air Laut", rank: "Common", category: "material", tier: 1, description: "Bisa diproses menjadi garam.", basePrice: 1, priceCurrency: "silver" },

      // Mineral & Logam
      { name: "Batu Bara", rank: "Common", category: "material", tier: 1, description: "Bahan bakar panas tinggi.", basePrice: 10, priceCurrency: "silver" },
      { name: "Bijih Tembaga", rank: "Common", category: "material", tier: 1, description: "Logam kemerahan.", basePrice: 15, priceCurrency: "silver" },
      { name: "Bijih Timah", rank: "Common", category: "material", tier: 1, description: "Logam lunak.", basePrice: 15, priceCurrency: "silver" },
      { name: "Bijih Besi", rank: "Uncommon", category: "material", tier: 2, description: "Logam keras untuk alat dan senjata.", basePrice: 50, priceCurrency: "silver" },
      { name: "Bijih Emas", rank: "Rare", category: "material", tier: 3, description: "Logam sangat berharga.", basePrice: 1, priceCurrency: "gold" },
      { name: "Mutiara", rank: "Rare", category: "material", tier: 3, description: "Permata dari dasar laut.", basePrice: 2, priceCurrency: "gold" },

      // Herbalisme Transisi
      { name: "Rumput Spiritual Dasar", rank: "Uncommon", category: "herb", tier: 2, description: "Menyerap Qi langit dan bumi.", basePrice: 20, priceCurrency: "silver" },
      { name: "Ginseng Liar", rank: "Rare", category: "herb", tier: 3, description: "Akar penyembuh luka dalam.", basePrice: 2, priceCurrency: "gold" },
      { name: "Racun Ular", rank: "Uncommon", category: "material", tier: 2, description: "Ekstrak racun mematikan.", basePrice: 50, priceCurrency: "silver" },
      { name: "Pecahan Batu Roh", rank: "Rare", category: "material", tier: 3, description: "Batu memancarkan Qi murni.", basePrice: 2, priceCurrency: "gold" },
      { name: "Teratai Salju", rank: "Epic", category: "herb", tier: 4, description: "Tumbuh di puncak gunung es.", basePrice: 10, priceCurrency: "gold" },
    ];
    await createItems(rawMats);

    // =========================================================================
    // 4. ITEMS: MATERIAL OLAHAN (PROCESSED)
    // =========================================================================
    console.log("\n--- MEMBUAT ITEMS (PROCESSED MATERIAL & CONSUME) ---");
    const procMats = [
      // Arsitektur Dasar & Lanjutan
      { name: "Batu Bata", rank: "Common", category: "material", tier: 1, description: "Tanah liat yang dibakar.", basePrice: 10, priceCurrency: "silver" },
      { name: "Genteng Keramik", rank: "Uncommon", category: "material", tier: 2, description: "Atap kokoh dari tanah liat merah.", basePrice: 20, priceCurrency: "silver" },
      { name: "Papan Kayu", rank: "Common", category: "material", tier: 1, description: "Kayu yang dihaluskan.", basePrice: 10, priceCurrency: "silver" },
      { name: "Balok Batu", rank: "Common", category: "material", tier: 1, description: "Batu yang dipahat rapi.", basePrice: 10, priceCurrency: "silver" },
      { name: "Kaca Kusam", rank: "Common", category: "material", tier: 1, description: "Pasir yang dilebur.", basePrice: 20, priceCurrency: "silver" },
      { name: "Semen Mentah", rank: "Uncommon", category: "material", tier: 2, description: "Campuran batu kapur dan liat.", basePrice: 50, priceCurrency: "silver" },

      // Tekstil & Kulit
      { name: "Benang", rank: "Common", category: "material", tier: 1, description: "Pintalan kapas.", basePrice: 15, priceCurrency: "silver" },
      { name: "Kain Katun", rank: "Common", category: "material", tier: 1, description: "Tenunan benang.", basePrice: 40, priceCurrency: "silver" },
      { name: "Kulit Samak", rank: "Uncommon", category: "material", tier: 2, description: "Kulit yang diproses menjadi bahan kuat.", basePrice: 40, priceCurrency: "silver" },

      // Logam Olahan
      { name: "Batangan Tembaga", rank: "Common", category: "material", tier: 1, description: "Tembaga murni.", basePrice: 40, priceCurrency: "silver" },
      { name: "Batangan Timah", rank: "Common", category: "material", tier: 1, description: "Timah murni.", basePrice: 40, priceCurrency: "silver" },
      { name: "Perunggu", rank: "Uncommon", category: "material", tier: 2, description: "Paduan tembaga dan timah.", basePrice: 1, priceCurrency: "gold" },
      { name: "Batangan Besi", rank: "Uncommon", category: "material", tier: 2, description: "Besi yang dilebur.", basePrice: 2, priceCurrency: "gold" },
      { name: "Baja Keras", rank: "Rare", category: "material", tier: 3, description: "Besi yang ditempa berkali-kali.", basePrice: 5, priceCurrency: "gold" },
      { name: "Batangan Emas", rank: "Rare", category: "material", tier: 3, description: "Batangan emas berkilau.", basePrice: 10, priceCurrency: "gold" },

      // Pangan & Bumbu Dasar
      { name: "Garam Dapur", rank: "Common", category: "material", tier: 1, description: "Garam pengawet makanan.", basePrice: 10, priceCurrency: "silver" },
      { name: "Tepung Terigu", rank: "Common", category: "material", tier: 1, description: "Gilingan gandum.", basePrice: 15, priceCurrency: "silver" },
      { name: "Beras Putih", rank: "Common", category: "material", tier: 1, description: "Padi yang telah ditumbuk.", basePrice: 15, priceCurrency: "silver" },

      // Masakan (Buff & Stamina)
      { name: "Roti Panggang", rank: "Common", category: "consume", tier: 1, description: "Memulihkan kelaparan.", basePrice: 30, priceCurrency: "silver", effect: "Memulihkan 20 Hunger" },
      { name: "Nasi Putih", rank: "Common", category: "consume", tier: 1, description: "Nasi pulen.", basePrice: 30, priceCurrency: "silver", effect: "Memulihkan 20 Hunger" },
      { name: "Daging Panggang", rank: "Uncommon", category: "consume", tier: 2, description: "Daging panggang lezat.", basePrice: 50, priceCurrency: "silver", effect: "Memulihkan 40 Hunger" },
      { name: "Telur Goreng", rank: "Common", category: "consume", tier: 1, description: "Telur mata sapi.", basePrice: 20, priceCurrency: "silver", effect: "Memulihkan 15 Hunger" },
      { name: "Sup Daging Gurih", rank: "Uncommon", category: "consume", tier: 2, description: "Kombinasi daging, sayur, dan bumbu.", basePrice: 80, priceCurrency: "silver", effect: "Memulihkan 60 Hunger & HP Kecil" },
      { name: "Keju", rank: "Uncommon", category: "consume", tier: 2, description: "Olahan susu fermentasi.", basePrice: 40, priceCurrency: "silver", effect: "Memulihkan 30 Hunger" },
      { name: "Ikan Asin", rank: "Uncommon", category: "consume", tier: 2, description: "Ikan yang diawetkan dengan garam.", basePrice: 40, priceCurrency: "silver", effect: "Memulihkan 30 Hunger, Awet lama" },

      // Minuman
      { name: "Anggur Merah (Wine)", rank: "Uncommon", category: "consume", tier: 2, description: "Fermentasi anggur, menghangatkan tubuh.", basePrice: 60, priceCurrency: "silver", effect: "Buff Moral/Affinity Pet" },
      { name: "Arak Beras (Sake)", rank: "Rare", category: "consume", tier: 3, description: "Minuman favorit pendekar wuxia.", basePrice: 1, priceCurrency: "gold", effect: "Meningkatkan Keberanian sesaat" },

      // Obat & Xianxia
      { name: "Obat Penawar Racun", rank: "Uncommon", category: "pill", tier: 2, description: "Penawar gigitan binatang berbisa.", basePrice: 80, priceCurrency: "silver" },
      { name: "Pil Pengumpul Qi Dasar", rank: "Uncommon", category: "pill", tier: 2, description: "Meningkatkan sirkulasi Qi.", basePrice: 1, priceCurrency: "gold" },
      { name: "Pil Pembersih Sumsum", rank: "Epic", category: "pill", tier: 4, description: "Memperkuat tulang.", basePrice: 25, priceCurrency: "gold" },
      { name: "Pil Peningkat Darah", rank: "Rare", category: "pill", tier: 3, description: "Dibuat dari Ginseng Liar.", basePrice: 5, priceCurrency: "gold" },
    ];
    await createItems(procMats);

    const idOf = (name) => {
      if (!itemCache[name]) throw new Error(`Item ${name} tidak ditemukan di cache!`);
      return itemCache[name]._id;
    };

    // =========================================================================
    // 5. ASSETS: PENGUMPUL (GATHERING) 20+ Aset
    // =========================================================================
    console.log("\n--- MEMBUAT ASET (GATHERING/PENGUMPUL) ---");
    const gatherAssets = [
      // Agrikultur Dasar
      { name: "Lahan Gandum", description: "Menghasilkan 10 Gandum/hari.", rank: "Common", workerOutputItemId: idOf("Gandum"), workerOutputItemName: "Gandum", workerOutputQuantity: 10, constructionTimeHours: 2, buildable: true, buildRequirements: [{ itemId: idOf("Cangkul Besi"), itemName: "Cangkul Besi", quantity: 1 }, { itemId: idOf("Bibit Gandum"), itemName: "Bibit Gandum", quantity: 5 }] },
      { name: "Sawah Padi", description: "Menghasilkan 10 Padi Mentah/hari.", rank: "Common", workerOutputItemId: idOf("Padi Mentah"), workerOutputItemName: "Padi Mentah", workerOutputQuantity: 10, constructionTimeHours: 2, buildable: true, buildRequirements: [{ itemId: idOf("Cangkul Besi"), itemName: "Cangkul Besi", quantity: 1 }, { itemId: idOf("Bibit Padi"), itemName: "Bibit Padi", quantity: 5 }] },
      { name: "Kebun Kapas", description: "Menghasilkan 10 Kapas Mentah/hari.", rank: "Common", workerOutputItemId: idOf("Kapas Mentah"), workerOutputItemName: "Kapas Mentah", workerOutputQuantity: 10, constructionTimeHours: 2, buildable: true, buildRequirements: [{ itemId: idOf("Cangkul Besi"), itemName: "Cangkul Besi", quantity: 1 }, { itemId: idOf("Bibit Kapas"), itemName: "Bibit Kapas", quantity: 5 }] },
      { name: "Kebun Anggur", description: "Menghasilkan 10 Anggur Segar/hari.", rank: "Common", workerOutputItemId: idOf("Anggur Segar"), workerOutputItemName: "Anggur Segar", workerOutputQuantity: 10, constructionTimeHours: 2, buildable: true, buildRequirements: [{ itemId: idOf("Cangkul Besi"), itemName: "Cangkul Besi", quantity: 1 }, { itemId: idOf("Bibit Anggur"), itemName: "Bibit Anggur", quantity: 5 }] },
      { name: "Hutan Bambu Buatan", description: "Menghasilkan 15 Bambu/hari.", rank: "Common", workerOutputItemId: idOf("Bambu"), workerOutputItemName: "Bambu", workerOutputQuantity: 15, constructionTimeHours: 2, buildable: true, buildRequirements: [{ itemId: idOf("Cangkul Besi"), itemName: "Cangkul Besi", quantity: 1 }, { itemId: idOf("Bibit Bambu"), itemName: "Bibit Bambu", quantity: 10 }] },

      // Kehutanan & Tanah
      { name: "Lahan Tanah Liat", description: "Menghasilkan 20 Tanah Liat/hari.", rank: "Common", workerOutputItemId: idOf("Tanah Liat"), workerOutputItemName: "Tanah Liat", workerOutputQuantity: 20, constructionTimeHours: 2, buildable: true, buildRequirements: [{ itemId: idOf("Cangkul Besi"), itemName: "Cangkul Besi", quantity: 1 }] },
      { name: "Galian Tanah Merah", description: "Menghasilkan 10 Tanah Liat Merah/hari.", rank: "Uncommon", workerOutputItemId: idOf("Tanah Liat Merah"), workerOutputItemName: "Tanah Liat Merah", workerOutputQuantity: 10, constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf("Cangkul Besi"), itemName: "Cangkul Besi", quantity: 2 }] },
      { name: "Area Penebangan Kayu", description: "Menghasilkan 20 Kayu Mentah/hari.", rank: "Common", workerOutputItemId: idOf("Kayu Mentah"), workerOutputItemName: "Kayu Mentah", workerOutputQuantity: 20, constructionTimeHours: 2, buildable: true, buildRequirements: [{ itemId: idOf("Kapak Besi"), itemName: "Kapak Besi", quantity: 1 }] },

      // Peternakan & Perburuan
      { name: "Peternakan Ayam", description: "Menghasilkan 10 Telur/hari.", rank: "Common", workerOutputItemId: idOf("Telur Mentah"), workerOutputItemName: "Telur Mentah", workerOutputQuantity: 10, constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 10 }, { itemId: idOf("Pakan Ternak"), itemName: "Pakan Ternak", quantity: 5 }] },
      { name: "Peternakan Sapi", description: "Menghasilkan 5 Susu Sapi/hari.", rank: "Uncommon", workerOutputItemId: idOf("Susu Sapi"), workerOutputItemName: "Susu Sapi", workerOutputQuantity: 5, constructionTimeHours: 8, buildable: true, buildRequirements: [{ itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 20 }, { itemId: idOf("Pakan Ternak"), itemName: "Pakan Ternak", quantity: 10 }] },
      { name: "Jagal Hutan", description: "Menghasilkan 5 Kulit Mentah & Daging/hari.", rank: "Uncommon", workerOutputItemId: idOf("Kulit Mentah"), workerOutputItemName: "Kulit Mentah", workerOutputQuantity: 5, constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf("Pisau Jagal"), itemName: "Pisau Jagal", quantity: 1 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 5 }] },

      // Perairan & Nelayan
      { name: "Kolam Pancing Sungai", description: "Menghasilkan 15 Ikan Air Tawar/hari.", rank: "Common", workerOutputItemId: idOf("Ikan Air Tawar"), workerOutputItemName: "Ikan Air Tawar", workerOutputQuantity: 15, constructionTimeHours: 2, buildable: true, buildRequirements: [{ itemId: idOf("Alat Pancing Kayu"), itemName: "Alat Pancing Kayu", quantity: 2 }] },
      { name: "Dermaga Nelayan Kecil", description: "Menghasilkan 10 Ikan Laut/hari.", rank: "Uncommon", workerOutputItemId: idOf("Ikan Laut"), workerOutputItemName: "Ikan Laut", workerOutputQuantity: 10, constructionTimeHours: 12, buildable: true, buildRequirements: [{ itemId: idOf("Jaring Nelayan"), itemName: "Jaring Nelayan", quantity: 1 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 30 }] },
      { name: "Tambak Garam Tradisional", description: "Menghasilkan 20 Air Laut/hari untuk digaram.", rank: "Common", workerOutputItemId: idOf("Air Laut"), workerOutputItemName: "Air Laut", workerOutputQuantity: 20, constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf("Cangkul Besi"), itemName: "Cangkul Besi", quantity: 1 }, { itemId: idOf("Batu Kasar"), itemName: "Batu Kasar", quantity: 10 }] },

      // Pertambangan
      { name: "Penggalian Pasir", description: "Menghasilkan 20 Pasir Putih/hari.", rank: "Common", workerOutputItemId: idOf("Pasir Putih"), workerOutputItemName: "Pasir Putih", workerOutputQuantity: 20, constructionTimeHours: 2, buildable: true, buildRequirements: [{ itemId: idOf("Cangkul Besi"), itemName: "Cangkul Besi", quantity: 1 }] },
      { name: "Tambang Batu Fana", description: "Menghasilkan 20 Batu Kasar/hari.", rank: "Common", workerOutputItemId: idOf("Batu Kasar"), workerOutputItemName: "Batu Kasar", workerOutputQuantity: 20, constructionTimeHours: 2, buildable: true, buildRequirements: [{ itemId: idOf("Beliung Besi"), itemName: "Beliung Besi", quantity: 1 }] },
      { name: "Tambang Batu Bara", description: "Menghasilkan 15 Batu Bara/hari.", rank: "Common", workerOutputItemId: idOf("Batu Bara"), workerOutputItemName: "Batu Bara", workerOutputQuantity: 15, constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf("Beliung Besi"), itemName: "Beliung Besi", quantity: 2 }, { itemId: idOf("Balok Batu"), itemName: "Balok Batu", quantity: 10 }] },
      { name: "Tambang Tembaga", description: "Menghasilkan 10 Bijih Tembaga/hari.", rank: "Common", workerOutputItemId: idOf("Bijih Tembaga"), workerOutputItemName: "Bijih Tembaga", workerOutputQuantity: 10, constructionTimeHours: 6, buildable: true, buildRequirements: [{ itemId: idOf("Beliung Besi"), itemName: "Beliung Besi", quantity: 2 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 10 }] },
      { name: "Tambang Timah", description: "Menghasilkan 10 Bijih Timah/hari.", rank: "Common", workerOutputItemId: idOf("Bijih Timah"), workerOutputItemName: "Bijih Timah", workerOutputQuantity: 10, constructionTimeHours: 6, buildable: true, buildRequirements: [{ itemId: idOf("Beliung Besi"), itemName: "Beliung Besi", quantity: 2 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 10 }] },
      { name: "Tambang Besi", description: "Menghasilkan 5 Bijih Besi/hari.", rank: "Uncommon", workerOutputItemId: idOf("Bijih Besi"), workerOutputItemName: "Bijih Besi", workerOutputQuantity: 5, constructionTimeHours: 12, buildable: true, buildRequirements: [{ itemId: idOf("Beliung Besi"), itemName: "Beliung Besi", quantity: 3 }, { itemId: idOf("Balok Batu"), itemName: "Balok Batu", quantity: 20 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 20 }] },
      { name: "Tambang Emas", description: "Menghasilkan 2 Bijih Emas/hari.", rank: "Rare", workerOutputItemId: idOf("Bijih Emas"), workerOutputItemName: "Bijih Emas", workerOutputQuantity: 2, constructionTimeHours: 48, buildable: true, buildRequirements: [{ itemId: idOf("Beliung Besi"), itemName: "Beliung Besi", quantity: 5 }, { itemId: idOf("Baja Keras"), itemName: "Baja Keras", quantity: 10 }] }
    ];

    for (const g of gatherAssets) {
      let asset = await Asset.findOne({ guildId, name: g.name });
      if (!asset) {
        await new Asset({ guildId, ...g, createdBy: 'System Oracle' }).save();
      }
    }

    // =========================================================================
    // 6. ASSETS: PENGOLAHAN (CRAFTING STATIONS) 10+ Aset
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
        name: "Pabrik Keramik", description: "Membuat genteng dan vas.", rank: "Uncommon", isCraftingStation: true,
        constructionTimeHours: 24, buildable: true,
        buildRequirements: [{ itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 30 }, { itemId: idOf("Tanah Liat Merah"), itemName: "Tanah Liat Merah", quantity: 20 }],
        recipes: [
          { recipeName: "Bakar Genteng", resultItemId: idOf("Genteng Keramik"), resultItemName: "Genteng Keramik", resultQuantity: 1, materials: [{ itemId: idOf("Tanah Liat Merah"), itemName: "Tanah Liat Merah", quantity: 2 }, { itemId: idOf("Batu Bara"), itemName: "Batu Bara", quantity: 1 }] }
        ]
      },
      {
        name: "Tempat Penyamakan Kulit", description: "Mengolah kulit mentah.", rank: "Uncommon", isCraftingStation: true,
        constructionTimeHours: 12, buildable: true,
        buildRequirements: [{ itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 20 }, { itemId: idOf("Pisau Jagal"), itemName: "Pisau Jagal", quantity: 1 }],
        recipes: [
          { recipeName: "Samak Kulit", resultItemId: idOf("Kulit Samak"), resultItemName: "Kulit Samak", resultQuantity: 1, materials: [{ itemId: idOf("Kulit Mentah"), itemName: "Kulit Mentah", quantity: 2 }] }
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
        name: "Kincir Air", description: "Menggiling biji-bijian. Butuh Balok Batu.", rank: "Common", isCraftingStation: true,
        constructionTimeHours: 8, buildable: true,
        buildRequirements: [{ itemId: idOf("Balok Batu"), itemName: "Balok Batu", quantity: 20 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 10 }],
        recipes: [
          { recipeName: "Giling Gandum", resultItemId: idOf("Tepung Terigu"), resultItemName: "Tepung Terigu", resultQuantity: 1, materials: [{ itemId: idOf("Gandum"), itemName: "Gandum", quantity: 2 }] },
          { recipeName: "Tumbuk Padi", resultItemId: idOf("Beras Putih"), resultItemName: "Beras Putih", resultQuantity: 1, materials: [{ itemId: idOf("Padi Mentah"), itemName: "Padi Mentah", quantity: 2 }] }
        ]
      },
      {
        name: "Dapur Umum Lanjutan", description: "Memasak makanan dan menggarami ikan.", rank: "Uncommon", isCraftingStation: true,
        constructionTimeHours: 12, buildable: true,
        buildRequirements: [{ itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 25 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 15 }],
        recipes: [
          { recipeName: "Rebus Garam", resultItemId: idOf("Garam Dapur"), resultItemName: "Garam Dapur", resultQuantity: 1, materials: [{ itemId: idOf("Air Laut"), itemName: "Air Laut", quantity: 2 }, { itemId: idOf("Kayu Mentah"), itemName: "Kayu Mentah", quantity: 1 }] },
          { recipeName: "Panggang Roti", resultItemId: idOf("Roti Panggang"), resultItemName: "Roti Panggang", resultQuantity: 1, materials: [{ itemId: idOf("Tepung Terigu"), itemName: "Tepung Terigu", quantity: 1 }] },
          { recipeName: "Tanakan Nasi", resultItemId: idOf("Nasi Putih"), resultItemName: "Nasi Putih", resultQuantity: 1, materials: [{ itemId: idOf("Beras Putih"), itemName: "Beras Putih", quantity: 1 }] },
          { recipeName: "Bakar Daging", resultItemId: idOf("Daging Panggang"), resultItemName: "Daging Panggang", resultQuantity: 1, materials: [{ itemId: idOf("Daging Mentah"), itemName: "Daging Mentah", quantity: 1 }, { itemId: idOf("Kayu Mentah"), itemName: "Kayu Mentah", quantity: 1 }] },
          { recipeName: "Goreng Telur", resultItemId: idOf("Telur Goreng"), resultItemName: "Telur Goreng", resultQuantity: 1, materials: [{ itemId: idOf("Telur Mentah"), itemName: "Telur Mentah", quantity: 1 }] },
          { recipeName: "Buat Sup Daging", resultItemId: idOf("Sup Daging Gurih"), resultItemName: "Sup Daging Gurih", resultQuantity: 1, materials: [{ itemId: idOf("Daging Mentah"), itemName: "Daging Mentah", quantity: 1 }, { itemId: idOf("Sayur Liar"), itemName: "Sayur Liar", quantity: 1 }, { itemId: idOf("Garam Dapur"), itemName: "Garam Dapur", quantity: 1 }] },
          { recipeName: "Asinkan Ikan", resultItemId: idOf("Ikan Asin"), resultItemName: "Ikan Asin", resultQuantity: 1, materials: [{ itemId: idOf("Ikan Laut"), itemName: "Ikan Laut", quantity: 1 }, { itemId: idOf("Garam Dapur"), itemName: "Garam Dapur", quantity: 1 }] },
        ]
      },
      {
        name: "Pabrik Fermentasi Dasar", description: "Membuat Wine, Sake, dan Keju.", rank: "Uncommon", isCraftingStation: true,
        constructionTimeHours: 24, buildable: true,
        buildRequirements: [{ itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 30 }, { itemId: idOf("Tanah Liat"), itemName: "Tanah Liat", quantity: 20 }],
        recipes: [
          { recipeName: "Fermentasi Anggur", resultItemId: idOf("Anggur Merah (Wine)"), resultItemName: "Anggur Merah (Wine)", resultQuantity: 1, materials: [{ itemId: idOf("Anggur Segar"), itemName: "Anggur Segar", quantity: 5 }] },
          { recipeName: "Fermentasi Beras (Sake)", resultItemId: idOf("Arak Beras (Sake)"), resultItemName: "Arak Beras (Sake)", resultQuantity: 1, materials: [{ itemId: idOf("Beras Putih"), itemName: "Beras Putih", quantity: 5 }] },
          { recipeName: "Fermentasi Susu (Keju)", resultItemId: idOf("Keju"), resultItemName: "Keju", resultQuantity: 1, materials: [{ itemId: idOf("Susu Sapi"), itemName: "Susu Sapi", quantity: 3 }] }
        ]
      },
      {
        name: "Tungku Peleburan Dasar", description: "Melebur bijih logam & pasir (Smelter).", rank: "Uncommon", isCraftingStation: true,
        constructionTimeHours: 24, buildable: true,
        buildRequirements: [{ itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 40 }, { itemId: idOf("Tanah Liat"), itemName: "Tanah Liat", quantity: 20 }],
        recipes: [
          { recipeName: "Lebur Kaca", resultItemId: idOf("Kaca Kusam"), resultItemName: "Kaca Kusam", resultQuantity: 1, materials: [{ itemId: idOf("Pasir Putih"), itemName: "Pasir Putih", quantity: 2 }, { itemId: idOf("Batu Bara"), itemName: "Batu Bara", quantity: 1 }] },
          { recipeName: "Lebur Tembaga", resultItemId: idOf("Batangan Tembaga"), resultItemName: "Batangan Tembaga", resultQuantity: 1, materials: [{ itemId: idOf("Bijih Tembaga"), itemName: "Bijih Tembaga", quantity: 3 }, { itemId: idOf("Batu Bara"), itemName: "Batu Bara", quantity: 1 }] },
          { recipeName: "Lebur Timah", resultItemId: idOf("Batangan Timah"), resultItemName: "Batangan Timah", resultQuantity: 1, materials: [{ itemId: idOf("Bijih Timah"), itemName: "Bijih Timah", quantity: 3 }, { itemId: idOf("Batu Bara"), itemName: "Batu Bara", quantity: 1 }] },
          { recipeName: "Paduan Perunggu", resultItemId: idOf("Perunggu"), resultItemName: "Perunggu", resultQuantity: 1, materials: [{ itemId: idOf("Batangan Tembaga"), itemName: "Batangan Tembaga", quantity: 1 }, { itemId: idOf("Batangan Timah"), itemName: "Batangan Timah", quantity: 1 }, { itemId: idOf("Batu Bara"), itemName: "Batu Bara", quantity: 2 }] },
          { recipeName: "Lebur Besi", resultItemId: idOf("Batangan Besi"), resultItemName: "Batangan Besi", resultQuantity: 1, materials: [{ itemId: idOf("Bijih Besi"), itemName: "Bijih Besi", quantity: 4 }, { itemId: idOf("Batu Bara"), itemName: "Batu Bara", quantity: 2 }] },
          { recipeName: "Tempa Baja", resultItemId: idOf("Baja Keras"), resultItemName: "Baja Keras", resultQuantity: 1, materials: [{ itemId: idOf("Batangan Besi"), itemName: "Batangan Besi", quantity: 2 }, { itemId: idOf("Batu Bara"), itemName: "Batu Bara", quantity: 3 }, { itemId: idOf("Palu Tempa"), itemName: "Palu Tempa", quantity: 1 }] },
          { recipeName: "Lebur Emas", resultItemId: idOf("Batangan Emas"), resultItemName: "Batangan Emas", resultQuantity: 1, materials: [{ itemId: idOf("Bijih Emas"), itemName: "Bijih Emas", quantity: 5 }, { itemId: idOf("Batu Bara"), itemName: "Batu Bara", quantity: 3 }] },
          { recipeName: "Buat Semen", resultItemId: idOf("Semen Mentah"), resultItemName: "Semen Mentah", resultQuantity: 1, materials: [{ itemId: idOf("Batu Kapur"), itemName: "Batu Kapur", quantity: 2 }, { itemId: idOf("Tanah Liat"), itemName: "Tanah Liat", quantity: 1 }] }
        ]
      }
    ];

    for (const c of craftAssets) {
      let asset = await Asset.findOne({ guildId, name: c.name });
      if (!asset) {
        await new Asset({ guildId, ...c, createdBy: 'System Oracle' }).save();
      }
    }

    // =========================================================================
    // 7. ASSETS: FUNGSIONAL / INCOME / KULTIVASI (10+ Aset)
    // =========================================================================
    console.log("\n--- MEMBUAT ASET (INCOME & KULTIVASI) ---");
    const funcAssets = [
      // Fungsional Duniawi
      {
        name: "Kuil Leluhur Desa", description: "Menghasilkan sumbangan umat (20 Silver/hari).", rank: "Uncommon",
        dailyProfit: 20, profitCurrency: "silver", constructionTimeHours: 48, buildable: true,
        buildRequirements: [{ itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 40 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 20 }, { itemId: idOf("Balok Batu"), itemName: "Balok Batu", quantity: 10 }]
      },
      {
        name: "Kedai Makan Desa", description: "Pusat kuliner (50 Silver/hari).", rank: "Uncommon",
        dailyProfit: 50, profitCurrency: "silver", constructionTimeHours: 48, buildable: true,
        buildRequirements: [{ itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 50 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 30 }, { itemId: idOf("Kaca Kusam"), itemName: "Kaca Kusam", quantity: 5 }, { itemId: idOf("Genteng Keramik"), itemName: "Genteng Keramik", quantity: 10 }]
      },
      {
        name: "Penginapan Mewah (Tavern)", description: "Penginapan musafir (1 Gold/hari).", rank: "Rare",
        dailyProfit: 100, profitCurrency: "silver", constructionTimeHours: 72, buildable: true,
        buildRequirements: [{ itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 80 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 50 }, { itemId: idOf("Kaca Kusam"), itemName: "Kaca Kusam", quantity: 10 }, { itemId: idOf("Kain Katun"), itemName: "Kain Katun", quantity: 20 }]
      },
      {
        name: "Pasar Barter Malam", description: "Pusat perdagangan gelap (2 Gold/hari).", rank: "Rare",
        dailyProfit: 200, profitCurrency: "silver", constructionTimeHours: 96, buildable: true,
        buildRequirements: [{ itemId: idOf("Balok Batu"), itemName: "Balok Batu", quantity: 100 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 100 }, { itemId: idOf("Baja Keras"), itemName: "Baja Keras", quantity: 5 }]
      },
      {
        name: "Balai Desa", description: "Pusat administrasi desa (5 Gold/hari). Membutuhkan material kompleks.", rank: "Rare",
        dailyProfit: 500, profitCurrency: "silver", constructionTimeHours: 96, buildable: true,
        buildRequirements: [{ itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 100 }, { itemId: idOf("Semen Mentah"), itemName: "Semen Mentah", quantity: 40 }, { itemId: idOf("Baja Keras"), itemName: "Baja Keras", quantity: 20 }, { itemId: idOf("Kaca Kusam"), itemName: "Kaca Kusam", quantity: 20 }, { itemId: idOf("Genteng Keramik"), itemName: "Genteng Keramik", quantity: 50 }]
      },
      {
        name: "Rumah Bordil Sutra", description: "Pusat hiburan malam (10 Gold/hari).", rank: "Epic",
        dailyProfit: 1000, profitCurrency: "silver", constructionTimeHours: 120, buildable: true,
        buildRequirements: [{ itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 150 }, { itemId: idOf("Semen Mentah"), itemName: "Semen Mentah", quantity: 50 }, { itemId: idOf("Batangan Emas"), itemName: "Batangan Emas", quantity: 5 }, { itemId: idOf("Kain Katun"), itemName: "Kain Katun", quantity: 50 }]
      },

      // Kultivasi
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
      }
    }

    // =========================================================================
    // 8. SHOP INJECTION (Semua Tools, Bibit & Pakan harus ada di Shop)
    // =========================================================================
    console.log("\n--- MENDAFTARKAN TOOLS, BIBIT & PAKAN KE SHOP ---");
    const shopItems = [...tools, ...seedsAndFood];
    for (const s of shopItems) {
      const item = itemCache[s.name];
      if (!item) continue;

      let shopEntry = await Shop.findOne({ guildId, refId: item._id });
      if (!shopEntry) {
        await new Shop({ guildId, category: 'item', refId: item._id, refModel: 'Item', price: s.basePrice, priceCurrency: s.priceCurrency, stock: -1, addedBy: 'System Oracle' }).save();
      }
    }

    console.log("\n=== SEEDING SELESAI ===");
    console.log("60+ Item dan 30+ Aset dengan rantai Ark/Rust/City-Builder sukses dibuat dan Shop telah diupdate!");

  } catch (err) {
    console.error("Terjadi error saat seeding:", err);
  } finally {
    mongoose.connection.close();
  }
}

seedEconomy();
