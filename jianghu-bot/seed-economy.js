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
        } else {
          // Optional: Update existing items if needed (disabled to prevent overwriting user changes)
          // await Item.updateOne({ _id: item._id }, { $set: data });
        }
        itemCache[data.name] = item;
      }
    }

    // =========================================================================
    // 1. ITEMS: TOOLS & CONSUMABLES (SHOP)
    // =========================================================================
    console.log("\n--- MEMBUAT ITEMS (TOOLS) ---");
    const tools = [
      // Era Primitif (Survival)
      { name: "Batu Tajam", rank: "Common", category: "material", tier: 1, description: "Batu biasa yang ditajamkan. Bisa dipakai sebagai alat dasar.", basePrice: 1, priceCurrency: "silver" },
      { name: "Kapak Batu", rank: "Common", category: "consume", tier: 1, description: "Alat penebang pohon primitif.", basePrice: 2, priceCurrency: "silver" },
      { name: "Tombak Kayu", rank: "Common", category: "consume", tier: 1, description: "Alat berburu hewan kecil.", basePrice: 2, priceCurrency: "silver" },

      // Era Desa
      { name: "Cangkul Besi", rank: "Common", category: "consume", tier: 1, description: "Alat pertanian dasar.", basePrice: 50, priceCurrency: "silver" },
      { name: "Kapak Besi", rank: "Common", category: "consume", tier: 1, description: "Alat penebang pohon kokoh.", basePrice: 50, priceCurrency: "silver" },
      { name: "Beliung Besi", rank: "Common", category: "consume", tier: 1, description: "Alat tambang dasar.", basePrice: 50, priceCurrency: "silver" },
      { name: "Alat Pancing Kayu", rank: "Common", category: "consume", tier: 1, description: "Kail bambu sederhana.", basePrice: 30, priceCurrency: "silver" },
      { name: "Pisau Jagal", rank: "Common", category: "consume", tier: 1, description: "Pisau untuk memproses hewan ternak.", basePrice: 40, priceCurrency: "silver" },
      { name: "Palu Tempa", rank: "Uncommon", category: "consume", tier: 2, description: "Palu untuk membuat batangan logam.", basePrice: 2, priceCurrency: "gold" },

      // Era Murim (Wuxia)
      { name: "Beliung Baja Hitam", rank: "Rare", category: "consume", tier: 3, description: "Alat tambang untuk mineral mistis.", basePrice: 10, priceCurrency: "gold" },
      { name: "Pisau Bedah Qi", rank: "Rare", category: "consume", tier: 3, description: "Pisau untuk memanen organ spirit beast.", basePrice: 15, priceCurrency: "gold" },

      // Era Kultivasi (Xianxia)
      { name: "Kapak Petir Surgawi", rank: "Epic", category: "consume", tier: 5, description: "Kapak peninggalan dewa, untuk menebang pohon roh.", basePrice: 1, priceCurrency: "jade" },
      { name: "Palu Formasi Array", rank: "Epic", category: "consume", tier: 5, description: "Alat penempa pusaka kultivasi.", basePrice: 2, priceCurrency: "jade" }
    ];
    await createItems(tools);

    // =========================================================================
    // 2. ITEMS: BIBIT, PAKAN & MAKANAN DASAR (SHOP & RAW)
    // =========================================================================
    console.log("\n--- MEMBUAT ITEMS (BIBIT, PAKAN & MAKANAN) ---");
    const seedsAndFood = [
      // Primitif
      { name: "Buah Liar", rank: "Common", category: "consume", tier: 1, description: "Buah-buahan dari hutan.", basePrice: 1, priceCurrency: "silver", effect: "Memulihkan 5 Hunger" },
      { name: "Daging Mentah", rank: "Common", category: "consume", tier: 1, description: "Daging hasil buruan.", basePrice: 2, priceCurrency: "silver" },
      { name: "Kayu Bakar", rank: "Common", category: "consume", tier: 1, description: "Ranting kering untuk menyalakan api.", basePrice: 1, priceCurrency: "silver" },

      // Desa (Agrikultur)
      { name: "Bibit Gandum", rank: "Common", category: "material", tier: 1, description: "Biji gandum musim semi.", basePrice: 5, priceCurrency: "silver" },
      { name: "Bibit Padi", rank: "Common", category: "material", tier: 1, description: "Bibit padi untuk area sawah berair.", basePrice: 5, priceCurrency: "silver" },
      { name: "Bibit Kapas", rank: "Common", category: "material", tier: 1, description: "Menghasilkan serat kapas untuk pakaian.", basePrice: 5, priceCurrency: "silver" },
      { name: "Bibit Anggur", rank: "Common", category: "material", tier: 1, description: "Biji anggur untuk fermentasi.", basePrice: 10, priceCurrency: "silver" },
      { name: "Bibit Bambu", rank: "Common", category: "material", tier: 1, description: "Tunas bambu.", basePrice: 5, priceCurrency: "silver" },

      { name: "Pakan Ternak", rank: "Common", category: "consume", tier: 1, description: "Makanan ternak biasa.", basePrice: 10, priceCurrency: "silver" },
      { name: "Roti Panggang", rank: "Common", category: "consume", tier: 1, description: "Roti sederhana untuk pekerja.", basePrice: 20, priceCurrency: "silver", effect: "Memulihkan 20 Hunger" },

      // Murim / Xianxia (Bibit Mistis & Pakan Roh)
      { name: "Bibit Ginseng Darah", rank: "Rare", category: "material", tier: 3, description: "Bibit herbal penguat darah.", basePrice: 2, priceCurrency: "gold" },
      { name: "Bibit Teratai Roh", rank: "Epic", category: "material", tier: 5, description: "Benih teratai penyerap energi surga.", basePrice: 10, priceCurrency: "gold" },
      { name: "Pakan Spirit Beast", rank: "Rare", category: "consume", tier: 3, description: "Makanan berenergi tinggi untuk pet mistis.", basePrice: 5, priceCurrency: "gold" },
      { name: "Pil Nutrisi Pekerja", rank: "Epic", category: "consume", tier: 5, description: "Pil agar pekerja kultivator tidak perlu tidur/makan.", basePrice: 1, priceCurrency: "jade", effect: "Memulihkan 100 Hunger" }
    ];
    await createItems(seedsAndFood);

    // =========================================================================
    // 3. ITEMS: MATERIAL RAW (TAMBANG & ALAM)
    // =========================================================================
    console.log("\n--- MEMBUAT ITEMS (RAW MATERIAL) ---");
    const rawMats = [
      // Desa
      { name: "Gandum", rank: "Common", category: "material", tier: 1, description: "Biji gandum mentah.", basePrice: 2, priceCurrency: "silver" },
      { name: "Padi Mentah", rank: "Common", category: "material", tier: 1, description: "Padi yang belum ditumbuk.", basePrice: 2, priceCurrency: "silver" },
      { name: "Kapas Mentah", rank: "Common", category: "material", tier: 1, description: "Gumpalan kapas putih.", basePrice: 2, priceCurrency: "silver" },
      { name: "Anggur Segar", rank: "Common", category: "consume", tier: 1, description: "Anggur ranum.", basePrice: 2, priceCurrency: "silver" },
      { name: "Telur Mentah", rank: "Common", category: "consume", tier: 1, description: "Telur ayam dari peternakan.", basePrice: 3, priceCurrency: "silver" },
      { name: "Susu Sapi", rank: "Common", category: "consume", tier: 1, description: "Susu segar.", basePrice: 5, priceCurrency: "silver" },
      { name: "Kulit Mentah", rank: "Common", category: "material", tier: 1, description: "Kulit hewan hasil buruan/jagal.", basePrice: 5, priceCurrency: "silver" },
      { name: "Ikan Air Tawar", rank: "Common", category: "consume", tier: 1, description: "Ikan sungai berukuran sedang.", basePrice: 4, priceCurrency: "silver" },
      { name: "Ikan Laut", rank: "Uncommon", category: "consume", tier: 2, description: "Ikan laut yang bergizi tinggi.", basePrice: 10, priceCurrency: "silver" },

      { name: "Tanah Liat", rank: "Common", category: "material", tier: 1, description: "Lumpur sungai pembuat bata.", basePrice: 1, priceCurrency: "silver" },
      { name: "Tanah Liat Merah", rank: "Uncommon", category: "material", tier: 2, description: "Tanah liat khusus pembuat genteng.", basePrice: 2, priceCurrency: "silver" },
      { name: "Kayu Mentah", rank: "Common", category: "material", tier: 1, description: "Potongan kayu segar dari hutan.", basePrice: 1, priceCurrency: "silver" },
      { name: "Bambu", rank: "Common", category: "material", tier: 1, description: "Batang bambu serbaguna.", basePrice: 2, priceCurrency: "silver" },
      { name: "Batu Kasar", rank: "Common", category: "material", tier: 1, description: "Batu dari pegunungan fana.", basePrice: 1, priceCurrency: "silver" },
      { name: "Pasir Putih", rank: "Common", category: "material", tier: 1, description: "Bisa dilebur menjadi kaca.", basePrice: 1, priceCurrency: "silver" },
      { name: "Batu Kapur", rank: "Common", category: "material", tier: 1, description: "Bahan pembuat semen.", basePrice: 2, priceCurrency: "silver" },
      { name: "Air Laut", rank: "Common", category: "material", tier: 1, description: "Bisa diproses menjadi garam.", basePrice: 1, priceCurrency: "silver" },

      { name: "Batu Bara", rank: "Common", category: "material", tier: 1, description: "Bahan bakar panas tinggi.", basePrice: 5, priceCurrency: "silver" },
      { name: "Bijih Tembaga", rank: "Common", category: "material", tier: 1, description: "Logam kemerahan.", basePrice: 8, priceCurrency: "silver" },
      { name: "Bijih Timah", rank: "Common", category: "material", tier: 1, description: "Logam lunak.", basePrice: 8, priceCurrency: "silver" },
      { name: "Bijih Besi", rank: "Uncommon", category: "material", tier: 2, description: "Logam keras untuk alat dan senjata.", basePrice: 20, priceCurrency: "silver" },
      { name: "Bijih Emas", rank: "Rare", category: "material", tier: 3, description: "Logam sangat berharga.", basePrice: 1, priceCurrency: "gold" },

      // Murim
      { name: "Kayu Ulin (Ironwood)", rank: "Rare", category: "material", tier: 3, description: "Kayu sekeras besi, kebal api biasa.", basePrice: 5, priceCurrency: "gold" },
      { name: "Batu Meteor Api", rank: "Rare", category: "material", tier: 3, description: "Batu panas dari langit.", basePrice: 10, priceCurrency: "gold" },
      { name: "Darah Spirit Beast", rank: "Rare", category: "material", tier: 3, description: "Tinta untuk jimat/talisman.", basePrice: 15, priceCurrency: "gold" },
      { name: "Ginseng Darah", rank: "Rare", category: "herb", tier: 3, description: "Ginseng merah menyala.", basePrice: 20, priceCurrency: "gold" },

      // Xianxia
      { name: "Pecahan Batu Roh", rank: "Epic", category: "material", tier: 5, description: "Mata uang dunia kultivasi.", basePrice: 50, priceCurrency: "gold" },
      { name: "Kayu Surga (Heavenly Wood)", rank: "Legendary", category: "material", tier: 7, description: "Bahan pilar istana dewa.", basePrice: 2, priceCurrency: "jade" },
      { name: "Kristal Roh Ilahi", rank: "Legendary", category: "material", tier: 7, description: "Inti tenaga raksasa formasi.", basePrice: 5, priceCurrency: "jade" },
      { name: "Teratai Roh Langit", rank: "Legendary", category: "herb", tier: 7, description: "Membentuk ulang fondasi kultivasi.", basePrice: 10, priceCurrency: "jade" }
    ];
    await createItems(rawMats);

    // =========================================================================
    // 4. ITEMS: MATERIAL OLAHAN & CRAFTED (PROCESSED)
    // =========================================================================
    console.log("\n--- MEMBUAT ITEMS (PROCESSED) ---");
    const procMats = [
      // Primitif
      { name: "Daging Bakar", rank: "Common", category: "consume", tier: 1, description: "Daging yang dibakar di api unggun.", basePrice: 5, priceCurrency: "silver", effect: "Memulihkan 15 Hunger" },

      // Desa
      { name: "Batu Bata", rank: "Common", category: "material", tier: 1, description: "Tanah liat yang dibakar.", basePrice: 5, priceCurrency: "silver" },
      { name: "Genteng Keramik", rank: "Uncommon", category: "material", tier: 2, description: "Atap kokoh dari tanah liat merah.", basePrice: 10, priceCurrency: "silver" },
      { name: "Papan Kayu", rank: "Common", category: "material", tier: 1, description: "Kayu yang dihaluskan.", basePrice: 5, priceCurrency: "silver" },
      { name: "Balok Batu", rank: "Common", category: "material", tier: 1, description: "Batu yang dipahat rapi.", basePrice: 5, priceCurrency: "silver" },
      { name: "Kaca Kusam", rank: "Common", category: "material", tier: 1, description: "Pasir yang dilebur.", basePrice: 10, priceCurrency: "silver" },
      { name: "Semen Mentah", rank: "Uncommon", category: "material", tier: 2, description: "Campuran batu kapur dan liat.", basePrice: 25, priceCurrency: "silver" },
      { name: "Benang", rank: "Common", category: "material", tier: 1, description: "Pintalan kapas.", basePrice: 5, priceCurrency: "silver" },
      { name: "Kain Katun", rank: "Common", category: "material", tier: 1, description: "Tenunan benang.", basePrice: 20, priceCurrency: "silver" },
      { name: "Kulit Samak", rank: "Uncommon", category: "material", tier: 2, description: "Kulit yang diproses menjadi bahan kuat.", basePrice: 20, priceCurrency: "silver" },
      { name: "Batangan Tembaga", rank: "Common", category: "material", tier: 1, description: "Tembaga murni.", basePrice: 20, priceCurrency: "silver" },
      { name: "Batangan Timah", rank: "Common", category: "material", tier: 1, description: "Timah murni.", basePrice: 20, priceCurrency: "silver" },
      { name: "Perunggu", rank: "Uncommon", category: "material", tier: 2, description: "Paduan tembaga dan timah.", basePrice: 50, priceCurrency: "silver" },
      { name: "Batangan Besi", rank: "Uncommon", category: "material", tier: 2, description: "Besi yang dilebur.", basePrice: 80, priceCurrency: "silver" },
      { name: "Baja Keras", rank: "Rare", category: "material", tier: 3, description: "Besi yang ditempa berkali-kali.", basePrice: 2, priceCurrency: "gold" },
      { name: "Batangan Emas", rank: "Rare", category: "material", tier: 3, description: "Batangan emas berkilau.", basePrice: 5, priceCurrency: "gold" },

      { name: "Garam Dapur", rank: "Common", category: "material", tier: 1, description: "Garam pengawet makanan.", basePrice: 5, priceCurrency: "silver" },
      { name: "Tepung Terigu", rank: "Common", category: "material", tier: 1, description: "Gilingan gandum.", basePrice: 8, priceCurrency: "silver" },
      { name: "Beras Putih", rank: "Common", category: "material", tier: 1, description: "Padi yang telah ditumbuk.", basePrice: 8, priceCurrency: "silver" },
      { name: "Nasi Putih", rank: "Common", category: "consume", tier: 1, description: "Nasi pulen.", basePrice: 15, priceCurrency: "silver", effect: "Memulihkan 20 Hunger" },
      { name: "Keju", rank: "Uncommon", category: "consume", tier: 2, description: "Olahan susu fermentasi.", basePrice: 20, priceCurrency: "silver", effect: "Memulihkan 30 Hunger" },
      { name: "Ikan Asin", rank: "Uncommon", category: "consume", tier: 2, description: "Ikan awet.", basePrice: 20, priceCurrency: "silver", effect: "Memulihkan 30 Hunger" },
      { name: "Anggur Merah (Wine)", rank: "Uncommon", category: "consume", tier: 2, description: "Fermentasi anggur.", basePrice: 30, priceCurrency: "silver" },
      { name: "Arak Beras (Sake)", rank: "Rare", category: "consume", tier: 3, description: "Minuman murim.", basePrice: 1, priceCurrency: "gold" },

      // Murim & Xianxia Processed
      { name: "Baja Hitam Mistis", rank: "Epic", category: "material", tier: 5, description: "Logam terkuat untuk senjata roh.", basePrice: 20, priceCurrency: "gold" },
      { name: "Kain Sutra Laba-laba", rank: "Epic", category: "material", tier: 5, description: "Kain tahan tebasan.", basePrice: 20, priceCurrency: "gold" },
      { name: "Kertas Jimat", rank: "Rare", category: "material", tier: 3, description: "Kertas roh untuk talisman.", basePrice: 10, priceCurrency: "gold" },
      { name: "Pil Pengumpul Qi", rank: "Epic", category: "pill", tier: 5, description: "Meningkatkan sirkulasi Qi besar.", basePrice: 1, priceCurrency: "jade" },
      { name: "Batu Roh Utuh", rank: "Legendary", category: "material", tier: 7, description: "Pemadatan 100 pecahan batu roh.", basePrice: 10, priceCurrency: "jade" }
    ];
    await createItems(procMats);

    const idOf = (name) => {
      if (!itemCache[name]) throw new Error(`Item ${name} tidak ditemukan di cache!`);
      return itemCache[name]._id;
    };

    // =========================================================================
    // 5. ASSETS: PENGUMPUL (GATHERING)
    // Format Hour: Input & Output ditarik PER JAM
    // =========================================================================
    console.log("\n--- MEMBUAT ASET (GATHERING) ---");
    const gatherAssets = [
      // Era Primitif (Tanpa Input, atau Input sangat murah, hasil lambat. Mencegah Soft-lock)
      { name: "Pohon Buah Liar", description: "Menghasilkan 5 Buah Liar/jam. (Gratis / Tidak butuh input)", rank: "Common", workerOutputItemId: idOf("Buah Liar"), workerOutputItemName: "Buah Liar", workerOutputQuantity: 5, workerInputMaterials: [], constructionTimeHours: 0, buildable: true, buildRequirements: [{ itemId: idOf("Batu Tajam"), itemName: "Batu Tajam", quantity: 1 }] },
      { name: "Area Buruan Primitif", description: "Menghasilkan 2 Daging Mentah/jam. (Tidak butuh input)", rank: "Common", workerOutputItemId: idOf("Daging Mentah"), workerOutputItemName: "Daging Mentah", workerOutputQuantity: 2, workerInputMaterials: [], constructionTimeHours: 1, buildable: true, buildRequirements: [{ itemId: idOf("Tombak Kayu"), itemName: "Tombak Kayu", quantity: 1 }] },
      { name: "Lahan Tanah Liat Primitif", description: "Menghasilkan 5 Tanah Liat/jam. (Tidak butuh input)", rank: "Common", workerOutputItemId: idOf("Tanah Liat"), workerOutputItemName: "Tanah Liat", workerOutputQuantity: 5, workerInputMaterials: [], constructionTimeHours: 1, buildable: true, buildRequirements: [{ itemId: idOf("Batu Tajam"), itemName: "Batu Tajam", quantity: 1 }] },
      { name: "Tambang Batu Kasar Primitif", description: "Menghasilkan 5 Batu Kasar/jam. (Tidak butuh input)", rank: "Common", workerOutputItemId: idOf("Batu Kasar"), workerOutputItemName: "Batu Kasar", workerOutputQuantity: 5, workerInputMaterials: [], constructionTimeHours: 1, buildable: true, buildRequirements: [{ itemId: idOf("Batu Tajam"), itemName: "Batu Tajam", quantity: 1 }] },
      { name: "Galian Pasir Putih", description: "Menghasilkan 10 Pasir Putih/jam. (Tidak butuh input)", rank: "Common", workerOutputItemId: idOf("Pasir Putih"), workerOutputItemName: "Pasir Putih", workerOutputQuantity: 10, workerInputMaterials: [], constructionTimeHours: 1, buildable: true, buildRequirements: [{ itemId: idOf("Batu Tajam"), itemName: "Batu Tajam", quantity: 1 }] },
      { name: "Galian Batu Kapur", description: "Menghasilkan 5 Batu Kapur/jam. (Tidak butuh input)", rank: "Common", workerOutputItemId: idOf("Batu Kapur"), workerOutputItemName: "Batu Kapur", workerOutputQuantity: 5, workerInputMaterials: [], constructionTimeHours: 1, buildable: true, buildRequirements: [{ itemId: idOf("Batu Tajam"), itemName: "Batu Tajam", quantity: 1 }] },
      { name: "Area Penebangan Kayu", description: "Menghasilkan 20 Kayu Mentah/jam. (Tidak butuh input)", rank: "Common", workerOutputItemId: idOf("Kayu Mentah"), workerOutputItemName: "Kayu Mentah", workerOutputQuantity: 20, workerInputMaterials: [], constructionTimeHours: 2, buildable: true, buildRequirements: [{ itemId: idOf("Kapak Batu"), itemName: "Kapak Batu", quantity: 1 }] },

      // Era Desa (Agrikultur & Tambang) - Mulai memakai sistem worker auto cron
      { name: "Lahan Gandum", description: "Menghasilkan 10 Gandum/jam. (Butuh 1 Bibit/jam)", rank: "Common", workerOutputItemId: idOf("Gandum"), workerOutputItemName: "Gandum", workerOutputQuantity: 10, workerInputMaterials: [{ itemId: idOf("Bibit Gandum"), itemName: "Bibit Gandum", quantity: 1 }], constructionTimeHours: 2, buildable: true, buildRequirements: [{ itemId: idOf("Cangkul Besi"), itemName: "Cangkul Besi", quantity: 1 }, { itemId: idOf("Bibit Gandum"), itemName: "Bibit Gandum", quantity: 5 }] },
      { name: "Sawah Padi", description: "Menghasilkan 10 Padi Mentah/jam. (Butuh 1 Bibit/jam)", rank: "Common", workerOutputItemId: idOf("Padi Mentah"), workerOutputItemName: "Padi Mentah", workerOutputQuantity: 10, workerInputMaterials: [{ itemId: idOf("Bibit Padi"), itemName: "Bibit Padi", quantity: 1 }], constructionTimeHours: 2, buildable: true, buildRequirements: [{ itemId: idOf("Cangkul Besi"), itemName: "Cangkul Besi", quantity: 1 }, { itemId: idOf("Bibit Padi"), itemName: "Bibit Padi", quantity: 5 }] },
      { name: "Kebun Kapas", description: "Menghasilkan 10 Kapas Mentah/jam. (Butuh 1 Bibit/jam)", rank: "Common", workerOutputItemId: idOf("Kapas Mentah"), workerOutputItemName: "Kapas Mentah", workerOutputQuantity: 10, workerInputMaterials: [{ itemId: idOf("Bibit Kapas"), itemName: "Bibit Kapas", quantity: 1 }], constructionTimeHours: 2, buildable: true, buildRequirements: [{ itemId: idOf("Cangkul Besi"), itemName: "Cangkul Besi", quantity: 1 }, { itemId: idOf("Bibit Kapas"), itemName: "Bibit Kapas", quantity: 5 }] },
      { name: "Hutan Bambu", description: "Menghasilkan 15 Bambu/jam. (Butuh 1 Bibit/jam)", rank: "Common", workerOutputItemId: idOf("Bambu"), workerOutputItemName: "Bambu", workerOutputQuantity: 15, workerInputMaterials: [{ itemId: idOf("Bibit Bambu"), itemName: "Bibit Bambu", quantity: 1 }], constructionTimeHours: 2, buildable: true, buildRequirements: [{ itemId: idOf("Cangkul Besi"), itemName: "Cangkul Besi", quantity: 1 }, { itemId: idOf("Bibit Bambu"), itemName: "Bibit Bambu", quantity: 5 }] },
      { name: "Tambak Garam", description: "Menghasilkan 20 Air Laut/jam. (Butuh 1 Roti Panggang/jam)", rank: "Common", workerOutputItemId: idOf("Air Laut"), workerOutputItemName: "Air Laut", workerOutputQuantity: 20, workerInputMaterials: [{ itemId: idOf("Roti Panggang"), itemName: "Roti Panggang", quantity: 1 }], constructionTimeHours: 2, buildable: true, buildRequirements: [{ itemId: idOf("Cangkul Besi"), itemName: "Cangkul Besi", quantity: 1 }] },
      { name: "Peternakan Ayam", description: "Menghasilkan 10 Telur/jam. (Butuh 1 Pakan Ternak/jam)", rank: "Common", workerOutputItemId: idOf("Telur Mentah"), workerOutputItemName: "Telur Mentah", workerOutputQuantity: 10, workerInputMaterials: [{ itemId: idOf("Pakan Ternak"), itemName: "Pakan Ternak", quantity: 1 }], constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 10 }, { itemId: idOf("Pakan Ternak"), itemName: "Pakan Ternak", quantity: 5 }] },
      { name: "Peternakan Sapi", description: "Menghasilkan 5 Susu Sapi/jam. (Butuh 1 Pakan Ternak/jam)", rank: "Uncommon", workerOutputItemId: idOf("Susu Sapi"), workerOutputItemName: "Susu Sapi", workerOutputQuantity: 5, workerInputMaterials: [{ itemId: idOf("Pakan Ternak"), itemName: "Pakan Ternak", quantity: 1 }], constructionTimeHours: 8, buildable: true, buildRequirements: [{ itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 20 }, { itemId: idOf("Pakan Ternak"), itemName: "Pakan Ternak", quantity: 10 }] },
      { name: "Dermaga Nelayan", description: "Menghasilkan 15 Ikan Laut/jam. (Butuh 1 Roti Panggang/jam)", rank: "Common", workerOutputItemId: idOf("Ikan Laut"), workerOutputItemName: "Ikan Laut", workerOutputQuantity: 15, workerInputMaterials: [{ itemId: idOf("Roti Panggang"), itemName: "Roti Panggang", quantity: 1 }], constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf("Alat Pancing Kayu"), itemName: "Alat Pancing Kayu", quantity: 2 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 20 }] },
      { name: "Galian Batu Bara", description: "Menghasilkan 15 Batu Bara/jam. (Butuh 1 Roti Panggang/jam)", rank: "Common", workerOutputItemId: idOf("Batu Bara"), workerOutputItemName: "Batu Bara", workerOutputQuantity: 15, workerInputMaterials: [{ itemId: idOf("Roti Panggang"), itemName: "Roti Panggang", quantity: 1 }], constructionTimeHours: 4, buildable: true, buildRequirements: [{ itemId: idOf("Beliung Besi"), itemName: "Beliung Besi", quantity: 1 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 10 }] },
      { name: "Tambang Tembaga", description: "Menghasilkan 10 Bijih Tembaga/jam. (Butuh 1 Roti Panggang/jam)", rank: "Common", workerOutputItemId: idOf("Bijih Tembaga"), workerOutputItemName: "Bijih Tembaga", workerOutputQuantity: 10, workerInputMaterials: [{ itemId: idOf("Roti Panggang"), itemName: "Roti Panggang", quantity: 1 }], constructionTimeHours: 6, buildable: true, buildRequirements: [{ itemId: idOf("Beliung Besi"), itemName: "Beliung Besi", quantity: 1 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 15 }] },
      { name: "Tambang Timah", description: "Menghasilkan 10 Bijih Timah/jam. (Butuh 1 Roti Panggang/jam)", rank: "Common", workerOutputItemId: idOf("Bijih Timah"), workerOutputItemName: "Bijih Timah", workerOutputQuantity: 10, workerInputMaterials: [{ itemId: idOf("Roti Panggang"), itemName: "Roti Panggang", quantity: 1 }], constructionTimeHours: 6, buildable: true, buildRequirements: [{ itemId: idOf("Beliung Besi"), itemName: "Beliung Besi", quantity: 1 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 15 }] },
      { name: "Tambang Besi", description: "Menghasilkan 5 Bijih Besi/jam. (Butuh 1 Roti Panggang/jam)", rank: "Uncommon", workerOutputItemId: idOf("Bijih Besi"), workerOutputItemName: "Bijih Besi", workerOutputQuantity: 5, workerInputMaterials: [{ itemId: idOf("Roti Panggang"), itemName: "Roti Panggang", quantity: 1 }], constructionTimeHours: 12, buildable: true, buildRequirements: [{ itemId: idOf("Beliung Besi"), itemName: "Beliung Besi", quantity: 3 }, { itemId: idOf("Balok Batu"), itemName: "Balok Batu", quantity: 20 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 20 }] },
      { name: "Tambang Emas", description: "Menghasilkan 2 Bijih Emas/jam. (Butuh 1 Roti Panggang/jam)", rank: "Rare", workerOutputItemId: idOf("Bijih Emas"), workerOutputItemName: "Bijih Emas", workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf("Roti Panggang"), itemName: "Roti Panggang", quantity: 1 }], constructionTimeHours: 48, buildable: true, buildRequirements: [{ itemId: idOf("Beliung Besi"), itemName: "Beliung Besi", quantity: 5 }, { itemId: idOf("Baja Keras"), itemName: "Baja Keras", quantity: 10 }] },

      // Era Murim & Xianxia (Tambang Lanjutan)
      { name: "Hutan Kayu Ulin", description: "Menghasilkan 2 Kayu Ulin/jam. (Butuh 1 Roti Panggang/jam)", rank: "Rare", workerOutputItemId: idOf("Kayu Ulin (Ironwood)"), workerOutputItemName: "Kayu Ulin (Ironwood)", workerOutputQuantity: 2, workerInputMaterials: [{ itemId: idOf("Roti Panggang"), itemName: "Roti Panggang", quantity: 1 }], constructionTimeHours: 24, buildable: true, buildRequirements: [{ itemId: idOf("Kapak Besi"), itemName: "Kapak Besi", quantity: 5 }, { itemId: idOf("Baja Keras"), itemName: "Baja Keras", quantity: 10 }] },
      { name: "Kawah Api Meteor", description: "Menghasilkan 1 Batu Meteor Api/jam. (Butuh 1 Roti Panggang/jam)", rank: "Epic", workerOutputItemId: idOf("Batu Meteor Api"), workerOutputItemName: "Batu Meteor Api", workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf("Roti Panggang"), itemName: "Roti Panggang", quantity: 1 }], constructionTimeHours: 72, buildable: true, buildRequirements: [{ itemId: idOf("Beliung Baja Hitam"), itemName: "Beliung Baja Hitam", quantity: 1 }, { itemId: idOf("Baja Keras"), itemName: "Baja Keras", quantity: 20 }] },
      { name: "Area Buruan Mistis", description: "Menghasilkan 1 Darah Spirit Beast/jam. (Butuh 1 Pisau Bedah Qi/jam)", rank: "Epic", workerOutputItemId: idOf("Darah Spirit Beast"), workerOutputItemName: "Darah Spirit Beast", workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf("Pisau Bedah Qi"), itemName: "Pisau Bedah Qi", quantity: 1 }], constructionTimeHours: 72, buildable: true, buildRequirements: [{ itemId: idOf("Pisau Bedah Qi"), itemName: "Pisau Bedah Qi", quantity: 1 }, { itemId: idOf("Kayu Ulin (Ironwood)"), itemName: "Kayu Ulin (Ironwood)", quantity: 20 }] },
      { name: "Kebun Ginseng Darah", description: "Menghasilkan 1 Ginseng Darah/jam. (Butuh 1 Bibit Ginseng/jam)", rank: "Rare", workerOutputItemId: idOf("Ginseng Darah"), workerOutputItemName: "Ginseng Darah", workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf("Bibit Ginseng Darah"), itemName: "Bibit Ginseng Darah", quantity: 1 }], constructionTimeHours: 48, buildable: true, buildRequirements: [{ itemId: idOf("Baja Keras"), itemName: "Baja Keras", quantity: 10 }, { itemId: idOf("Semen Mentah"), itemName: "Semen Mentah", quantity: 20 }] },

      { name: "Tambang Batu Roh Lapis Luar", description: "Menghasilkan 1 Pecahan Batu Roh/jam. (Butuh 1 Roti Panggang/jam)", rank: "Epic", workerOutputItemId: idOf("Pecahan Batu Roh"), workerOutputItemName: "Pecahan Batu Roh", workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf("Roti Panggang"), itemName: "Roti Panggang", quantity: 1 }], constructionTimeHours: 72, buildable: true, buildRequirements: [{ itemId: idOf("Beliung Baja Hitam"), itemName: "Beliung Baja Hitam", quantity: 1 }, { itemId: idOf("Baja Keras"), itemName: "Baja Keras", quantity: 50 }, { itemId: idOf("Balok Batu"), itemName: "Balok Batu", quantity: 100 }] },
      { name: "Kebun Teratai Surgawi", description: "Menghasilkan 1 Teratai Roh/jam. (Butuh 1 Pil Nutrisi Pekerja/jam)", rank: "Legendary", workerOutputItemId: idOf("Teratai Roh Langit"), workerOutputItemName: "Teratai Roh Langit", workerOutputQuantity: 1, workerInputMaterials: [{ itemId: idOf("Pil Nutrisi Pekerja"), itemName: "Pil Nutrisi Pekerja", quantity: 1 }], constructionTimeHours: 120, buildable: true, buildRequirements: [{ itemId: idOf("Pecahan Batu Roh"), itemName: "Pecahan Batu Roh", quantity: 100 }, { itemId: idOf("Baja Hitam Mistis"), itemName: "Baja Hitam Mistis", quantity: 50 }] }
    ];

    for (const g of gatherAssets) {
      let asset = await Asset.findOne({ guildId, name: g.name });
      if (!asset) {
        await new Asset({ guildId, ...g, createdBy: 'System Oracle' }).save();
      }
    }

    // =========================================================================
    // 6. ASSETS: PENGOLAHAN (CRAFTING STATIONS)
    // =========================================================================
    console.log("\n--- MEMBUAT ASET (CRAFTING STATIONS) ---");
    const craftAssets = [
      // Primitif
      {
        name: "Api Unggun", description: "Memasak daging mentah.", rank: "Common", isCraftingStation: true,
        constructionTimeHours: 0.5, buildable: true,
        buildRequirements: [{ itemId: idOf("Kayu Bakar"), itemName: "Kayu Bakar", quantity: 5 }],
        recipes: [
          { recipeName: "Bakar Daging Mentah", resultItemId: idOf("Daging Bakar"), resultItemName: "Daging Bakar", resultQuantity: 1, materials: [{ itemId: idOf("Daging Mentah"), itemName: "Daging Mentah", quantity: 1 }, { itemId: idOf("Kayu Bakar"), itemName: "Kayu Bakar", quantity: 1 }] }
        ]
      },

      // Desa
      {
        name: "Alat Tenun Tradisional", description: "Membuat benang dan kain.", rank: "Common", isCraftingStation: true,
        constructionTimeHours: 6, buildable: true,
        buildRequirements: [{ itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 15 }],
        recipes: [
          { recipeName: "Pintal Benang", resultItemId: idOf("Benang"), resultItemName: "Benang", resultQuantity: 1, materials: [{ itemId: idOf("Kapas Mentah"), itemName: "Kapas Mentah", quantity: 3 }] },
          { recipeName: "Tenun Kain Katun", resultItemId: idOf("Kain Katun"), resultItemName: "Kain Katun", resultQuantity: 1, materials: [{ itemId: idOf("Benang"), itemName: "Benang", quantity: 3 }] }
        ]
      },
      {
        name: "Tempat Penyamakan Kulit", description: "Mengolah kulit hewan.", rank: "Common", isCraftingStation: true,
        constructionTimeHours: 6, buildable: true,
        buildRequirements: [{ itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 15 }, { itemId: idOf("Batu Kasar"), itemName: "Batu Kasar", quantity: 10 }],
        recipes: [
          { recipeName: "Samak Kulit", resultItemId: idOf("Kulit Samak"), resultItemName: "Kulit Samak", resultQuantity: 1, materials: [{ itemId: idOf("Kulit Mentah"), itemName: "Kulit Mentah", quantity: 2 }] }
        ]
      },
      {
        name: "Pusat Pengrajin Desa", description: "Membuat Bata, Papan, dan Balok.", rank: "Common", isCraftingStation: true,
        constructionTimeHours: 12, buildable: true,
        buildRequirements: [{ itemId: idOf("Kapak Besi"), itemName: "Kapak Besi", quantity: 1 }, { itemId: idOf("Kayu Mentah"), itemName: "Kayu Mentah", quantity: 20 }, { itemId: idOf("Batu Kasar"), itemName: "Batu Kasar", quantity: 10 }],
        recipes: [
          { recipeName: "Bakar Bata", resultItemId: idOf("Batu Bata"), resultItemName: "Batu Bata", resultQuantity: 1, materials: [{ itemId: idOf("Tanah Liat"), itemName: "Tanah Liat", quantity: 2 }, { itemId: idOf("Kayu Bakar"), itemName: "Kayu Bakar", quantity: 1 }] },
          { recipeName: "Gergaji Papan", resultItemId: idOf("Papan Kayu"), resultItemName: "Papan Kayu", resultQuantity: 1, materials: [{ itemId: idOf("Kayu Mentah"), itemName: "Kayu Mentah", quantity: 2 }] },
          { recipeName: "Pahat Balok", resultItemId: idOf("Balok Batu"), resultItemName: "Balok Batu", resultQuantity: 1, materials: [{ itemId: idOf("Batu Kasar"), itemName: "Batu Kasar", quantity: 2 }] }
        ]
      },
      {
        name: "Tungku Peleburan Lanjutan", description: "Melebur Logam dan Baja.", rank: "Uncommon", isCraftingStation: true,
        constructionTimeHours: 24, buildable: true,
        buildRequirements: [{ itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 50 }, { itemId: idOf("Tanah Liat"), itemName: "Tanah Liat", quantity: 30 }],
        recipes: [
          { recipeName: "Lebur Besi", resultItemId: idOf("Batangan Besi"), resultItemName: "Batangan Besi", resultQuantity: 1, materials: [{ itemId: idOf("Bijih Besi"), itemName: "Bijih Besi", quantity: 3 }, { itemId: idOf("Batu Bara"), itemName: "Batu Bara", quantity: 2 }] },
          { recipeName: "Tempa Baja Keras", resultItemId: idOf("Baja Keras"), resultItemName: "Baja Keras", resultQuantity: 1, materials: [{ itemId: idOf("Batangan Besi"), itemName: "Batangan Besi", quantity: 2 }, { itemId: idOf("Batu Bara"), itemName: "Batu Bara", quantity: 3 }, { itemId: idOf("Palu Tempa"), itemName: "Palu Tempa", quantity: 1 }] },
          { recipeName: "Buat Semen", resultItemId: idOf("Semen Mentah"), resultItemName: "Semen Mentah", resultQuantity: 1, materials: [{ itemId: idOf("Batu Kapur"), itemName: "Batu Kapur", quantity: 2 }, { itemId: idOf("Tanah Liat"), itemName: "Tanah Liat", quantity: 1 }] }
        ]
      },
      {
        name: "Dapur Umum", description: "Memasak masakan kompleks.", rank: "Uncommon", isCraftingStation: true,
        constructionTimeHours: 12, buildable: true,
        buildRequirements: [{ itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 20 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 20 }],
        recipes: [
          { recipeName: "Rebus Air Laut (Garam)", resultItemId: idOf("Garam Dapur"), resultItemName: "Garam Dapur", resultQuantity: 1, materials: [{ itemId: idOf("Air Laut"), itemName: "Air Laut", quantity: 2 }, { itemId: idOf("Kayu Bakar"), itemName: "Kayu Bakar", quantity: 1 }] },
          { recipeName: "Panggang Roti", resultItemId: idOf("Roti Panggang"), resultItemName: "Roti Panggang", resultQuantity: 1, materials: [{ itemId: idOf("Tepung Terigu"), itemName: "Tepung Terigu", quantity: 1 }, { itemId: idOf("Kayu Bakar"), itemName: "Kayu Bakar", quantity: 1 }] },
          { recipeName: "Tanakan Nasi", resultItemId: idOf("Nasi Putih"), resultItemName: "Nasi Putih", resultQuantity: 1, materials: [{ itemId: idOf("Beras Putih"), itemName: "Beras Putih", quantity: 1 }, { itemId: idOf("Kayu Bakar"), itemName: "Kayu Bakar", quantity: 1 }] }
        ]
      },
      {
        name: "Kincir Air", description: "Menggiling Biji.", rank: "Common", isCraftingStation: true,
        constructionTimeHours: 12, buildable: true,
        buildRequirements: [{ itemId: idOf("Balok Batu"), itemName: "Balok Batu", quantity: 20 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 20 }],
        recipes: [
          { recipeName: "Giling Gandum", resultItemId: idOf("Tepung Terigu"), resultItemName: "Tepung Terigu", resultQuantity: 1, materials: [{ itemId: idOf("Gandum"), itemName: "Gandum", quantity: 2 }] },
          { recipeName: "Tumbuk Padi", resultItemId: idOf("Beras Putih"), resultItemName: "Beras Putih", resultQuantity: 1, materials: [{ itemId: idOf("Padi Mentah"), itemName: "Padi Mentah", quantity: 2 }] }
        ]
      },

      // Murim & Xianxia
      {
        name: "Tungku Penempa Senjata Roh", description: "Melebur Baja Hitam dan material mistis.", rank: "Epic", isCraftingStation: true,
        constructionTimeHours: 48, buildable: true,
        buildRequirements: [{ itemId: idOf("Baja Keras"), itemName: "Baja Keras", quantity: 50 }, { itemId: idOf("Batu Meteor Api"), itemName: "Batu Meteor Api", quantity: 10 }],
        recipes: [
          { recipeName: "Tempa Baja Hitam Mistis", resultItemId: idOf("Baja Hitam Mistis"), resultItemName: "Baja Hitam Mistis", resultQuantity: 1, materials: [{ itemId: idOf("Baja Keras"), itemName: "Baja Keras", quantity: 3 }, { itemId: idOf("Batu Meteor Api"), itemName: "Batu Meteor Api", quantity: 1 }] }
        ]
      },
      {
        name: "Kawah Alkimia Langit", description: "Memurnikan Pil Kultivasi.", rank: "Legendary", isCraftingStation: true,
        constructionTimeHours: 72, buildable: true,
        buildRequirements: [{ itemId: idOf("Baja Hitam Mistis"), itemName: "Baja Hitam Mistis", quantity: 20 }, { itemId: idOf("Kristal Roh Ilahi"), itemName: "Kristal Roh Ilahi", quantity: 5 }],
        recipes: [
          { recipeName: "Suling Pil Pengumpul Qi", resultItemId: idOf("Pil Pengumpul Qi"), resultItemName: "Pil Pengumpul Qi", resultQuantity: 1, materials: [{ itemId: idOf("Ginseng Darah"), itemName: "Ginseng Darah", quantity: 2 }, { itemId: idOf("Pecahan Batu Roh"), itemName: "Pecahan Batu Roh", quantity: 5 }] },
          { recipeName: "Padatkan Batu Roh", resultItemId: idOf("Batu Roh Utuh"), resultItemName: "Batu Roh Utuh", resultQuantity: 1, materials: [{ itemId: idOf("Pecahan Batu Roh"), itemName: "Pecahan Batu Roh", quantity: 100 }] }
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
    // 7. ASSETS: FUNGSIONAL / INCOME
    // Mengikuti ROI dan Rule Oracle
    // =========================================================================
    console.log("\n--- MEMBUAT ASET (INCOME) ---");
    const funcAssets = [
      // Fungsional Receh
      {
        name: "Tikar Pengemis", description: "Mendapat sumbangan (5 Silver/hari).", rank: "Common",
        dailyProfit: 5, profitCurrency: "silver", constructionTimeHours: 1, buildable: true,
        buildRequirements: [{ itemId: idOf("Kain Katun"), itemName: "Kain Katun", quantity: 2 }]
      },
      {
        name: "Kuil Leluhur Desa", description: "Sumbangan umat (20 Silver/hari).", rank: "Uncommon",
        dailyProfit: 20, profitCurrency: "silver", constructionTimeHours: 24, buildable: true,
        buildRequirements: [{ itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 50 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 30 }]
      },
      // Kelas Menengah (Gold)
      {
        name: "Kedai Arak Murim", description: "Pusat pendekar berkumpul (1 Gold/hari).", rank: "Rare",
        dailyProfit: 100, profitCurrency: "silver", constructionTimeHours: 48, buildable: true,
        buildRequirements: [{ itemId: idOf("Batu Bata"), itemName: "Batu Bata", quantity: 200 }, { itemId: idOf("Papan Kayu"), itemName: "Papan Kayu", quantity: 150 }, { itemId: idOf("Genteng Keramik"), itemName: "Genteng Keramik", quantity: 100 }, { itemId: idOf("Baja Keras"), itemName: "Baja Keras", quantity: 10 }]
      },
      {
        name: "Balai Lelang Kota", description: "Pajak transaksi kota (5 Gold/hari).", rank: "Epic",
        dailyProfit: 500, profitCurrency: "silver", constructionTimeHours: 96, buildable: true,
        buildRequirements: [{ itemId: idOf("Semen Mentah"), itemName: "Semen Mentah", quantity: 100 }, { itemId: idOf("Baja Keras"), itemName: "Baja Keras", quantity: 50 }, { itemId: idOf("Kaca Kusam"), itemName: "Kaca Kusam", quantity: 50 }, { itemId: idOf("Kayu Ulin (Ironwood)"), itemName: "Kayu Ulin (Ironwood)", quantity: 20 }]
      },
      // Kelas Atas (Jade) - Limit 1 Jade/day max for individual (Oracle Rules)
      {
        name: "Paviliun Harta Surgawi", description: "Pusat lelang mistis kultivator (1 Jade/hari).", rank: "Legendary",
        dailyProfit: 1, profitCurrency: "jade", constructionTimeHours: 168, buildable: true,
        buildRequirements: [{ itemId: idOf("Baja Hitam Mistis"), itemName: "Baja Hitam Mistis", quantity: 100 }, { itemId: idOf("Kayu Surga (Heavenly Wood)"), itemName: "Kayu Surga (Heavenly Wood)", quantity: 50 }, { itemId: idOf("Kristal Roh Ilahi"), itemName: "Kristal Roh Ilahi", quantity: 10 }, { itemId: idOf("Batu Roh Utuh"), itemName: "Batu Roh Utuh", quantity: 5 }]
      }
    ];

    for (const f of funcAssets) {
      let asset = await Asset.findOne({ guildId, name: f.name });
      if (!asset) {
        await new Asset({ guildId, ...f, createdBy: 'System Oracle' }).save();
      }
    }

    // =========================================================================
    // 8. SHOP INJECTION
    // =========================================================================
    console.log("\n--- MENDAFTARKAN KE SHOP ---");
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
    console.log("Ekspansi Masif: Era Primitif -> Desa -> Murim -> Xianxia telah sukses dimasukkan ke Database!");

  } catch (err) {
    console.error("Terjadi error saat seeding:", err);
  } finally {
    mongoose.connection.close();
  }
}

seedEconomy();
