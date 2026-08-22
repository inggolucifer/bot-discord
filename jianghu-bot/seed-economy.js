require('dotenv').config();
const mongoose = require('mongoose');

// Models
const Item = require('./models/Item');
const Asset = require('./models/Asset');
const Shop = require('./models/Shop');
const Player = require('./models/Player'); // Untuk mencari guildId yang valid

async function seedEconomy() {
  console.log("Menghubungkan ke MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Terhubung ke MongoDB!");

  try {
    // 1. Cari GuildId
    console.log("Mencari GuildId yang aktif...");
    const player = await Player.findOne({});
    if (!player) {
      throw new Error("Tidak ada pemain di database. Silakan registrasi setidaknya satu karakter (`/daftar`) terlebih dahulu agar sistem tau guild id-nya.");
    }
    const guildId = player.guildId;
    console.log(`Menggunakan GuildId: ${guildId}`);

    // =========================================================================
    // 1. ITEMS (TOOLS) - Akan dimasukkan ke Shop
    // =========================================================================
    console.log("\n--- MEMBUAT ITEMS (TOOLS) ---");
    const tools = [
      {
        name: "Cangkul Besi",
        rank: "Common",
        category: "consume", // Dibuat consume supaya kalau /item use bisa ngasih notif (meski kepakainya pas build asset)
        tier: 1,
        description: "Alat pertanian dasar. Diperlukan untuk membangun Lahan Tanah Liat atau Kebun. (Akan terpakai/hilang saat membangun aset).",
        basePrice: 50, // 50 Silver
        priceCurrency: "silver"
      },
      {
        name: "Kapak Besi",
        rank: "Common",
        category: "consume",
        tier: 1,
        description: "Alat penebang pohon. Diperlukan untuk membangun Area Penebangan Kayu. (Akan terpakai/hilang saat membangun aset).",
        basePrice: 50,
        priceCurrency: "silver"
      },
      {
        name: "Beliung Besi",
        rank: "Common",
        category: "consume",
        tier: 1,
        description: "Alat tambang dasar. Diperlukan untuk membuka Tambang Batu Fana. (Akan terpakai/hilang saat membangun aset).",
        basePrice: 50,
        priceCurrency: "silver"
      }
    ];

    const toolDocs = {};
    for (const t of tools) {
      let item = await Item.findOne({ guildId, name: t.name });
      if (!item) {
        item = new Item({ guildId, ...t, createdBy: 'System Oracle' });
        await item.save();
        console.log(`[Item Dibuat] ${t.name}`);
      } else {
        console.log(`[Item Sudah Ada] ${t.name}`);
      }
      toolDocs[t.name] = item;
    }

    // =========================================================================
    // 2. ITEMS (MATERIAL MENTAH)
    // =========================================================================
    console.log("\n--- MEMBUAT ITEMS (MATERIAL MENTAH) ---");
    const rawMaterials = [
      { name: "Tanah Liat", rank: "Common", category: "material", tier: 1, description: "Bahan bangunan dasar. Bisa dibakar menjadi Batu Bata.", basePrice: 2, priceCurrency: "silver" },
      { name: "Kayu Mentah", rank: "Common", category: "material", tier: 1, description: "Potongan kayu segar dari hutan. Bisa diolah menjadi Papan Kayu.", basePrice: 2, priceCurrency: "silver" },
      { name: "Batu Kasar", rank: "Common", category: "material", tier: 1, description: "Batu biasa dari pegunungan fana. Bisa dipahat menjadi Balok Batu.", basePrice: 2, priceCurrency: "silver" },
      { name: "Rumput Spiritual Dasar", rank: "Uncommon", category: "herb", tier: 2, description: "Rumput yang menyerap Qi langit dan bumi. Bahan dasar pil.", basePrice: 20, priceCurrency: "silver" },
    ];

    const rawDocs = {};
    for (const m of rawMaterials) {
      let item = await Item.findOne({ guildId, name: m.name });
      if (!item) {
        item = new Item({ guildId, ...m, createdBy: 'System Oracle' });
        await item.save();
        console.log(`[Item Dibuat] ${m.name}`);
      } else {
        console.log(`[Item Sudah Ada] ${m.name}`);
      }
      rawDocs[m.name] = item;
    }

    // =========================================================================
    // 3. ITEMS (MATERIAL OLAHAN)
    // =========================================================================
    console.log("\n--- MEMBUAT ITEMS (MATERIAL OLAHAN) ---");
    const processedMaterials = [
      { name: "Batu Bata", rank: "Common", category: "material", tier: 1, description: "Tanah liat yang sudah dibakar. Kokoh untuk membangun rumah dan kuil.", basePrice: 10, priceCurrency: "silver" },
      { name: "Papan Kayu", rank: "Common", category: "material", tier: 1, description: "Kayu yang sudah dihaluskan. Cocok untuk lantai dan pilar.", basePrice: 10, priceCurrency: "silver" },
      { name: "Balok Batu", rank: "Common", category: "material", tier: 1, description: "Batu yang dipahat rapi untuk pondasi kokoh.", basePrice: 10, priceCurrency: "silver" },
      { name: "Pil Pengumpul Qi Dasar", rank: "Uncommon", category: "pill", tier: 2, description: "Meningkatkan perputaran Qi bagi kultivator tahap awal.", basePrice: 1, priceCurrency: "gold" },
    ];

    const procDocs = {};
    for (const p of processedMaterials) {
      let item = await Item.findOne({ guildId, name: p.name });
      if (!item) {
        item = new Item({ guildId, ...p, createdBy: 'System Oracle' });
        await item.save();
        console.log(`[Item Dibuat] ${p.name}`);
      } else {
        console.log(`[Item Sudah Ada] ${p.name}`);
      }
      procDocs[p.name] = item;
    }

    // =========================================================================
    // 4. ASET PENGUMPUL (WORKER) - Menghasilkan Material Mentah
    // =========================================================================
    console.log("\n--- MEMBUAT ASET (PENGUMPUL) ---");
    const gatherAssets = [
      {
        name: "Lahan Tanah Liat",
        description: "Area berlumpur pinggir sungai. (Tugas Pekerja: Menghasilkan 5 Tanah Liat per hari).",
        rank: "Common",
        workerOutputItemId: rawDocs["Tanah Liat"]._id,
        workerOutputItemName: "Tanah Liat",
        workerOutputQuantity: 5,
        constructionTimeHours: 2,
        buildable: true,
        buildRequirements: [
          { itemId: toolDocs["Cangkul Besi"]._id, itemName: "Cangkul Besi", quantity: 1 }
        ]
      },
      {
        name: "Area Penebangan Kayu",
        description: "Pinggiran hutan fana. (Tugas Pekerja: Menghasilkan 5 Kayu Mentah per hari).",
        rank: "Common",
        workerOutputItemId: rawDocs["Kayu Mentah"]._id,
        workerOutputItemName: "Kayu Mentah",
        workerOutputQuantity: 5,
        constructionTimeHours: 2,
        buildable: true,
        buildRequirements: [
          { itemId: toolDocs["Kapak Besi"]._id, itemName: "Kapak Besi", quantity: 1 }
        ]
      },
      {
        name: "Tambang Batu Fana",
        description: "Gua kecil berbatu keras. (Tugas Pekerja: Menghasilkan 5 Batu Kasar per hari).",
        rank: "Common",
        workerOutputItemId: rawDocs["Batu Kasar"]._id,
        workerOutputItemName: "Batu Kasar",
        workerOutputQuantity: 5,
        constructionTimeHours: 2,
        buildable: true,
        buildRequirements: [
          { itemId: toolDocs["Beliung Besi"]._id, itemName: "Beliung Besi", quantity: 1 }
        ]
      }
    ];

    for (const g of gatherAssets) {
      let asset = await Asset.findOne({ guildId, name: g.name });
      if (!asset) {
        asset = new Asset({ guildId, ...g, createdBy: 'System Oracle' });
        await asset.save();
        console.log(`[Aset Dibuat] ${g.name}`);
      } else {
        console.log(`[Aset Sudah Ada] ${g.name}`);
      }
    }

    // =========================================================================
    // 5. ASET PENGOLAHAN (CRAFTING STATION)
    // =========================================================================
    console.log("\n--- MEMBUAT ASET (PENGOLAHAN) ---");
    const craftAssets = [
      {
        name: "Pusat Pengrajin Desa",
        description: "Tempat mengolah material mentah menjadi bahan bangunan.",
        rank: "Common",
        isCraftingStation: true,
        recipes: [
          {
            recipeName: "Bakar Tanah Liat",
            resultItemId: procDocs["Batu Bata"]._id,
            resultItemName: "Batu Bata",
            resultQuantity: 1,
            materials: [{ itemId: rawDocs["Tanah Liat"]._id, itemName: "Tanah Liat", quantity: 2 }]
          },
          {
            recipeName: "Potong Kayu",
            resultItemId: procDocs["Papan Kayu"]._id,
            resultItemName: "Papan Kayu",
            resultQuantity: 1,
            materials: [{ itemId: rawDocs["Kayu Mentah"]._id, itemName: "Kayu Mentah", quantity: 2 }]
          },
          {
            recipeName: "Pahat Batu",
            resultItemId: procDocs["Balok Batu"]._id,
            resultItemName: "Balok Batu",
            resultQuantity: 1,
            materials: [{ itemId: rawDocs["Batu Kasar"]._id, itemName: "Batu Kasar", quantity: 2 }]
          }
        ],
        constructionTimeHours: 12,
        buildable: true,
        buildRequirements: [
          { itemId: toolDocs["Kapak Besi"]._id, itemName: "Kapak Besi", quantity: 1 },
          { itemId: rawDocs["Kayu Mentah"]._id, itemName: "Kayu Mentah", quantity: 10 },
          { itemId: rawDocs["Batu Kasar"]._id, itemName: "Batu Kasar", quantity: 5 }
        ]
      },
      {
        name: "Tungku Alkemis Pemula",
        description: "Tempat meracik pil tingkat dasar.",
        rank: "Uncommon",
        isCraftingStation: true,
        recipes: [
          {
            recipeName: "Racik Pil Qi",
            resultItemId: procDocs["Pil Pengumpul Qi Dasar"]._id,
            resultItemName: "Pil Pengumpul Qi Dasar",
            resultQuantity: 1,
            materials: [{ itemId: rawDocs["Rumput Spiritual Dasar"]._id, itemName: "Rumput Spiritual Dasar", quantity: 3 }]
          }
        ],
        constructionTimeHours: 24,
        buildable: true,
        buildRequirements: [
          { itemId: procDocs["Batu Bata"]._id, itemName: "Batu Bata", quantity: 15 },
          { itemId: rawDocs["Tanah Liat"]._id, itemName: "Tanah Liat", quantity: 5 }
        ]
      }
    ];

    for (const c of craftAssets) {
      let asset = await Asset.findOne({ guildId, name: c.name });
      if (!asset) {
        asset = new Asset({ guildId, ...c, createdBy: 'System Oracle' });
        await asset.save();
        console.log(`[Aset Dibuat] ${c.name}`);
      } else {
        console.log(`[Aset Sudah Ada] ${c.name}`);
      }
    }

    // =========================================================================
    // 6. ASET FUNGSIONAL / INCOME (Kuil dll)
    // =========================================================================
    console.log("\n--- MEMBUAT ASET (INCOME/FUNGSIONAL) ---");
    const incomeAssets = [
      {
        name: "Kuil Leluhur Desa",
        description: "Menghasilkan sumbangan umat (20 Silver/hari).",
        rank: "Uncommon",
        dailyProfit: 20,
        profitCurrency: "silver",
        constructionTimeHours: 48,
        buildable: true,
        buildRequirements: [
          { itemId: procDocs["Batu Bata"]._id, itemName: "Batu Bata", quantity: 20 },
          { itemId: procDocs["Papan Kayu"]._id, itemName: "Papan Kayu", quantity: 10 },
          { itemId: procDocs["Balok Batu"]._id, itemName: "Balok Batu", quantity: 10 }
        ]
      },
      {
        name: "Kebun Herbal Sekte Luar",
        description: "Aset pekerja yang dirawat murid luar. (Tugas Pekerja: Menghasilkan 2 Rumput Spiritual Dasar/hari).",
        rank: "Uncommon",
        workerOutputItemId: rawDocs["Rumput Spiritual Dasar"]._id,
        workerOutputItemName: "Rumput Spiritual Dasar",
        workerOutputQuantity: 2,
        constructionTimeHours: 24,
        buildable: true,
        buildRequirements: [
          { itemId: toolDocs["Cangkul Besi"]._id, itemName: "Cangkul Besi", quantity: 2 },
          { itemId: procDocs["Papan Kayu"]._id, itemName: "Papan Kayu", quantity: 5 }
        ]
      }
    ];

    for (const i of incomeAssets) {
      let asset = await Asset.findOne({ guildId, name: i.name });
      if (!asset) {
        asset = new Asset({ guildId, ...i, createdBy: 'System Oracle' });
        await asset.save();
        console.log(`[Aset Dibuat] ${i.name}`);
      } else {
        console.log(`[Aset Sudah Ada] ${i.name}`);
      }
    }

    // =========================================================================
    // 7. MEMASUKKAN TOOLS KE SHOP
    // =========================================================================
    console.log("\n--- MENDAFTARKAN TOOLS KE SHOP ---");
    for (const t of tools) {
      const item = toolDocs[t.name];
      let shopEntry = await Shop.findOne({ guildId, refId: item._id });
      if (!shopEntry) {
        shopEntry = new Shop({
          guildId,
          category: 'item',
          refId: item._id,
          refModel: 'Item',
          price: t.basePrice,
          priceCurrency: t.priceCurrency,
          stock: -1, // Unlimited
          addedBy: 'System Oracle'
        });
        await shopEntry.save();
        console.log(`[Shop] Ditambahkan: ${t.name} (${t.basePrice} ${t.priceCurrency})`);
      } else {
        console.log(`[Shop] Sudah Ada: ${t.name}`);
      }
    }

    console.log("\n=== SEEDING SELESAI ===");
    console.log("Semua item, asset, dan shop telah sukses dibuat dan dihubungkan secara berkesinambungan!");

  } catch (err) {
    console.error("Terjadi error saat seeding:", err);
  } finally {
    mongoose.connection.close();
    console.log("Koneksi MongoDB ditutup.");
  }
}

seedEconomy();
