/**
 * seedJianghuMasterEcosystem.js
 * SEEDER MASTER OTORITATIF: Merombak & Mengisi Ekosistem Jianghu dari 0
 * 100% Selaras dengan globalAssets.ts
 *
 * Menghasilkan:
 * 1. Seluruh Item (Weapons, Armor, Helm, Pants, Boots, Accessories, Mounts, Tickets, Herbs, Pills)
 * 2. Seluruh Monsters (6 Region Overworld + Gua Kuno)
 * 3. Seluruh Sekte & Fasilitas Ujian Masuk
 * 4. Seluruh Lokasi, Bangunan, Dermaga, dan Gua Kuno
 */

const mongoose = require('mongoose');
const Item = require('../models/Item');
const Monster = require('../models/Monster');
const Sect = require('../models/Sect');
const Location = require('../models/Location');

const DEFAULT_GUILD_ID = process.env.DEFAULT_GUILD_ID || 'default_guild';

async function seedMasterEcosystem(options = { reset: false, guildId: DEFAULT_GUILD_ID }) {
  const guildId = options.guildId || DEFAULT_GUILD_ID;
  console.log(`\n=== MEMULAI MASTER SEEDER EKOSISTEM JIANGHU (Guild: ${guildId}) ===`);

  if (options.reset) {
    console.log('[RESET] Menghapus data katalog lama (Item, Monster, Sect, Location)...');
    await Item.deleteMany({ guildId });
    await Monster.deleteMany({ guildId });
    await Sect.deleteMany({ guildId });
    await Location.deleteMany({ guildId });
    console.log('[RESET] Database bersih, siap disi dari 0.');
  }

  // =========================================================================
  // 1. SEED ITEMS & PERLENGKAPAN (TERMASUK MOUNT SYSTEM)
  // =========================================================================
  console.log('--- 1. Seeding Items & Equipment ---');

  const items = [
    // --- SENJATA (WEAPONS) ---
    {
      name: 'Pedang Bambu',
      rank: 'Common',
      category: 'weapon',
      weaponType: 'sword',
      tier: 1,
      baseAtk: 12,
      baseSpd: 2,
      weight: 2,
      basePrice: 15,
      description: 'Pedang bambu ringan untuk melatih jurus dasar pemula.'
    },
    {
      name: 'Pedang Besi Tempa',
      rank: 'Uncommon',
      category: 'weapon',
      weaponType: 'sword',
      tier: 2,
      baseAtk: 28,
      baseSpd: 4,
      weight: 4,
      basePrice: 80,
      description: 'Pedang baja hasil tempaan pandai besi kota.'
    },
    {
      name: 'Golok Baja Naga',
      rank: 'Rare',
      category: 'weapon',
      weaponType: 'saber',
      tier: 3,
      baseAtk: 65,
      baseDef: 10,
      weight: 6,
      basePrice: 250,
      description: 'Golok berat berukir sisik naga dengan tebasan mematikan.'
    },
    {
      name: 'Pedang Giok Langit',
      rank: 'Epic',
      category: 'weapon',
      weaponType: 'sword',
      tier: 4,
      baseAtk: 140,
      baseSpd: 15,
      weight: 3,
      basePrice: 15,
      priceCurrency: 'jade',
      description: 'Pedang pusaka dari giok spiritual langit berkilau aura murni.'
    },

    // --- BAJU ZIRAH (ARMOR) ---
    {
      name: 'Jubah Kain Kasar',
      rank: 'Common',
      category: 'armor',
      tier: 1,
      baseDef: 8,
      baseHp: 50,
      weight: 2,
      basePrice: 10,
      description: 'Jubah tenun sederhana yang nyaman digunakan sehari-hari.'
    },
    {
      name: 'Baju Zirah Besi',
      rank: 'Uncommon',
      category: 'armor',
      tier: 2,
      baseDef: 25,
      baseHp: 150,
      weight: 8,
      basePrice: 75,
      description: 'Pelindung dada dari lempengan besi kokoh menahan tebasan.'
    },
    {
      name: 'Jubah Sutra Surgawi',
      rank: 'Epic',
      category: 'armor',
      tier: 4,
      baseDef: 90,
      baseHp: 600,
      baseSpd: 10,
      weight: 2,
      basePrice: 12,
      priceCurrency: 'jade',
      description: 'Jubah sakti tenunan sutra langit yang membiaskan hawa pedang musuh.'
    },

    // --- HELMET, PANTS, BOOTS ---
    {
      name: 'Ikat Kepala Pendekar',
      rank: 'Common',
      category: 'helmet',
      tier: 1,
      baseDef: 4,
      baseHp: 25,
      weight: 1,
      basePrice: 8,
      description: 'Ikat kepala kain merah lambang semangat pengelana.'
    },
    {
      name: 'Celana Kain Praktis',
      rank: 'Common',
      category: 'pants',
      tier: 1,
      baseDef: 5,
      baseHp: 30,
      weight: 1,
      basePrice: 8,
      description: 'Celana longgar yang memudahkan pergerakan jurus kaki.'
    },
    {
      name: 'Sepatu Langkah Bayangan',
      rank: 'Rare',
      category: 'boots',
      tier: 3,
      baseDef: 15,
      baseSpd: 18,
      weight: 1,
      basePrice: 180,
      description: 'Sepatu kulit ringan yang membuat langkah kaki hening bagai bayangan.'
    },

    // --- TUNGGANGAN (MOUNTS) ---
    {
      name: 'Kuda Jinak',
      rank: 'Common',
      category: 'mount',
      mountType: 'horse_jinak',
      staminaReduction: 0.5,
      travelSpeedBonus: 0.15,
      capacityBonus: 20,
      capacityMode: 'always',
      capacityType: 'horse',
      weight: 0,
      basePrice: 150,
      description: 'Kuda tunggangan yang jinak. Mengurangi biaya stamina langkah -0.5 dan mempercepat jelajah.'
    },
    {
      name: 'Kuda Ferghana',
      rank: 'Rare',
      category: 'mount',
      mountType: 'horse_ferghana',
      staminaReduction: 1.0,
      travelSpeedBonus: 0.25,
      capacityBonus: 35,
      capacityMode: 'always',
      capacityType: 'horse',
      weight: 0,
      basePrice: 450,
      description: 'Kuda darah keringat legendaris dari barat benua. Mengurangi stamina langkah -1.0.'
    },
    {
      name: 'Kuda Roh Bertanduk',
      rank: 'Epic',
      category: 'mount',
      mountType: 'spirit_horned_horse',
      staminaReduction: 1.5,
      travelSpeedBonus: 0.40,
      capacityBonus: 50,
      weight: 0,
      basePrice: 1200,
      description: 'Kuda sakti bertanduk giok. Mampu berlari kencang memotong jarak dan menghemat -1.5 stamina.'
    },
    {
      name: 'Harimau Bayangan',
      rank: 'Legendary',
      category: 'mount',
      mountType: 'shadow_tiger',
      staminaReduction: 2.0,
      travelSpeedBonus: 0.55,
      weight: 0,
      basePrice: 35,
      priceCurrency: 'jade',
      description: 'Raja predator siluman bayangan. Mengurangi stamina langkah -2.0.'
    },
    {
      name: 'Kura-kura Lapis Baja',
      rank: 'Rare',
      category: 'mount',
      mountType: 'iron_armored_turtle',
      staminaReduction: 0.8,
      travelSpeedBonus: 0.10,
      capacityBonus: 80,
      weight: 0,
      basePrice: 300,
      description: 'Kura-kura rawa tempurung baja. Tahan miasma dan berkapasitas muatan raksasa.'
    },
    {
      name: 'Perahu Kayu Nelayan',
      rank: 'Common',
      category: 'mount',
      mountType: 'wooden_boat',
      staminaReduction: 0.5,
      weight: 0,
      basePrice: 100,
      description: 'Perahu dayung kayu nelayan. Digunakan untuk menyeberangi perairan sungai dan danau.'
    },
    {
      name: 'Kapal Kayu Ek',
      rank: 'Uncommon',
      category: 'mount',
      mountType: 'ship',
      staminaReduction: 1.0,
      travelSpeedBonus: 0.30,
      weight: 0,
      basePrice: 600,
      description: 'Kapal layar kokoh yang dibutuhkan untuk mengarungi lautan luas (Eastern Sea).'
    },
    {
      name: 'Pedang Terbang Spiritual',
      rank: 'Mythical',
      category: 'mount',
      mountType: 'flying_sword',
      staminaReduction: 2.5,
      travelSpeedBonus: 0.75,
      weight: 0,
      basePrice: 100,
      priceCurrency: 'spirit',
      description: 'Artefak pedang terbang tingkat tinggi. Memungkinkan terbang melompati tebing curam dan pegunungan batu.'
    },

    // --- TIKET & KUALIFIKASI (SECT & FERRY TICKETS) ---
    {
      name: 'Plakat Ujian Sekte',
      rank: 'Uncommon',
      category: 'material',
      weight: 0.2,
      basePrice: 150,
      description: 'Plakat tembaga resmi sebagai tiket pendaftaran seleksi murid sekte.'
    },
    {
      name: 'Surat Rekomendasi Tetua',
      rank: 'Rare',
      category: 'material',
      weight: 0.1,
      basePrice: 400,
      description: 'Surat segel lilin merah dari tetua terhormat yang membebaskan biaya ujian sekte.'
    },
    {
      name: 'Tiket Rakit Penyeberangan',
      rank: 'Common',
      category: 'material',
      weight: 0.1,
      basePrice: 25,
      description: 'Kupon penyeberangan rakit bambu sungai antardaerah.'
    },
    {
      name: 'Pakan Kuda Spiritual',
      rank: 'Common',
      category: 'consume',
      weight: 0.5,
      basePrice: 10,
      description: 'Rumput ilalang berenergi Qi segar yang sangat disukai tunggangan.'
    },

    // --- HARTA GUA & MATA UANG SPIRITUAL ---
    {
      name: 'Batu Roh Rendah',
      rank: 'Uncommon',
      category: 'material',
      weight: 0.1,
      basePrice: 50,
      description: 'Kristal mineral alam penyimpan energi Qi murni untuk kultivasi dan perdagangan.'
    },
    {
      name: 'Batu Roh Menengah',
      rank: 'Rare',
      category: 'material',
      weight: 0.1,
      basePrice: 250,
      description: 'Batu kristal padat dengan kemurnian energi spiritual sepuluh kali lipat.'
    },
    {
      name: 'Bijih Besi Kuno',
      rank: 'Common',
      category: 'material',
      weight: 1,
      basePrice: 15,
      description: 'Batuan tambang dari dinding gua purba untuk bahan penempaan senjata.'
    },
    {
      name: 'Herba Ginseng Seribu Tahun',
      rank: 'Rare',
      category: 'herb',
      weight: 0.2,
      basePrice: 120,
      description: 'Akar herba bertuah untuk memulihkan meridian tubuh dan bahan ramuan pil.'
    }
  ];

  for (const it of items) {
    await Item.findOneAndUpdate(
      { guildId, name: it.name },
      { ...it, guildId },
      { upsert: true, new: true }
    );
  }
  console.log(`[PASS] ${items.length} Item & Perlengkapan berhasil di-seed.`);

  // =========================================================================
  // 2. SEED MONSTERS (BESTIARY REGION & GUA KUNO)
  // =========================================================================
  console.log('--- 2. Seeding Monsters ---');

  const monsters = [
    // Central Plains
    { key: 'wolf_azure', name: 'Serigala Azure', regionSlug: 'central_plains', tier: 1, minRealmIndex: 0, statBlock: { hp: 120, atk: 18, def: 8, spd: 10 } },
    { key: 'golden_eagle', name: 'Elang Emas', regionSlug: 'central_plains', tier: 1, minRealmIndex: 1, statBlock: { hp: 100, atk: 22, def: 6, spd: 16 } },
    { key: 'bandit_leader', name: 'Pemimpin Bandit', regionSlug: 'central_plains', tier: 2, minRealmIndex: 1, statBlock: { hp: 250, atk: 32, def: 18, spd: 12 } },

    // Azure Mountain Range
    { key: 'white_tiger', name: 'Harimau Putih Pegunungan', regionSlug: 'azure_mountain', tier: 3, minRealmIndex: 2, statBlock: { hp: 450, atk: 55, def: 30, spd: 18 } },
    { key: 'ghost_sparrow', name: 'Burung Pipit Hantu', regionSlug: 'azure_mountain', tier: 2, minRealmIndex: 2, statBlock: { hp: 180, atk: 40, def: 15, spd: 25 } },
    { key: 'rock_golem', name: 'Golem Batu Kuno', regionSlug: 'azure_mountain', tier: 4, minRealmIndex: 3, statBlock: { hp: 800, atk: 65, def: 70, spd: 6 } },

    // Southern Demon Domain
    { key: 'swamp_python', name: 'Ular Piton Rawa Iblis', regionSlug: 'southern_demon_domain', tier: 3, minRealmIndex: 2, statBlock: { hp: 400, atk: 50, def: 25, spd: 14 } },
    { key: 'miasma_fiend', name: 'Iblis Kabut Beracun', regionSlug: 'southern_demon_domain', tier: 4, minRealmIndex: 3, statBlock: { hp: 650, atk: 75, def: 35, spd: 20 } },

    // Eastern Sea Region
    { key: 'abyssal_serpent', name: 'Ular Naga Laut Dalam', regionSlug: 'eastern_sea', tier: 5, minRealmIndex: 4, statBlock: { hp: 1200, atk: 110, def: 60, spd: 22 } },

    // Northern Desolate Territory
    { key: 'frost_demon', name: 'Iblis Es Abadi', regionSlug: 'northern_desolate', tier: 4, minRealmIndex: 3, statBlock: { hp: 750, atk: 80, def: 45, spd: 15 } },

    // Western Sacred Deserts
    { key: 'sand_scorpion', name: 'Kalajengking Raksasa Pasir', regionSlug: 'western_deserts', tier: 3, minRealmIndex: 2, statBlock: { hp: 380, atk: 48, def: 32, spd: 12 } },

    // Monster Penjaga Gua Kuno
    { key: 'cave_bat', name: 'Kelelawar Gua Beracun', regionSlug: 'central_plains', tier: 1, minRealmIndex: 0, statBlock: { hp: 80, atk: 14, def: 6, spd: 8 } },
    { key: 'cave_spider', name: 'Laba-Laba Gua Raksasa', regionSlug: 'central_plains', tier: 1, minRealmIndex: 0, statBlock: { hp: 110, atk: 18, def: 8, spd: 6 } },
    { key: 'ancient_demon_lord', name: 'Raja Iblis Gua Purba', regionSlug: 'azure_mountain', tier: 6, minRealmIndex: 5, statBlock: { hp: 2200, atk: 140, def: 90, spd: 25 } }
  ];

  for (const m of monsters) {
    await Monster.findOneAndUpdate(
      { guildId, key: m.key },
      { ...m, guildId, isActive: true },
      { upsert: true, new: true }
    );
  }
  console.log(`[PASS] ${monsters.length} Monster Bestiary berhasil di-seed.`);

  // =========================================================================
  // 3. SEED SEKTE (SECT & ENTRANCE EXAMS)
  // =========================================================================
  console.log('--- 3. Seeding Sects & Entrance Exams ---');

  const sects = [
    {
      name: 'Sekte Pedang Langit',
      description: 'Sekte Daois ortodoks yang berfokus pada kemahiran jurus pedang dan pedang terbang.',
      hallSettlementName: 'Desa Xingcun',
      hallRegionSlug: 'central_plains',
      entranceTest: {
        enabled: true,
        type: 'combat',
        minRealmIndex: 0,
        guardianStatBlock: {
          name: 'Calon Murid Pendaftar Penantang',
          hp: 120,
          atk: 18,
          def: 10,
          spd: 10
        },
        cooldownHours: 12
      }
    },
    {
      name: 'Kuil Lonceng Emas',
      description: 'Ordo suci Shaolin yang mengasah teknik pemurnian jasmani kebal senjata.',
      hallSettlementName: 'Desa Kuil Emas',
      hallRegionSlug: 'azure_mountain',
      entranceTest: {
        enabled: true,
        type: 'combat',
        minRealmIndex: 1,
        guardianStatBlock: {
          name: 'Biksu Penjaga Gerbang Perunggu',
          hp: 220,
          atk: 25,
          def: 30,
          spd: 8
        },
        cooldownHours: 24
      }
    },
    {
      name: 'Lembah Racun Bayangan',
      description: 'Sekte misterius penguasa seni miasma dan racun di rimba selatan.',
      hallSettlementName: 'Desa Rimba Lembah',
      hallRegionSlug: 'southern_demon_domain',
      entranceTest: {
        enabled: true,
        type: 'combat',
        minRealmIndex: 1,
        guardianStatBlock: {
          name: 'Penguji Belati Racun',
          hp: 180,
          atk: 35,
          def: 12,
          spd: 18
        },
        cooldownHours: 12
      }
    },
    {
      name: 'Istana Giok Laut Timur',
      description: 'Sekte pertapa samudera di kepulauan timur dengan teknik aliran air lentur.',
      hallSettlementName: 'Pulau Istana Giok',
      hallRegionSlug: 'eastern_sea',
      entranceTest: {
        enabled: true,
        type: 'combat',
        minRealmIndex: 2,
        guardianStatBlock: {
          name: 'Penjaga Formasi Air Murni',
          hp: 350,
          atk: 45,
          def: 25,
          spd: 20
        },
        cooldownHours: 24
      }
    }
  ];

  for (const s of sects) {
    await Sect.findOneAndUpdate(
      { guildId, name: s.name },
      { ...s, guildId },
      { upsert: true, new: true }
    );
  }
  console.log(`[PASS] ${sects.length} Sekte Besar & Ujian Masuk berhasil di-seed.`);

  // =========================================================================
  // 4. SEED LOKASI, FASILITAS, DERMAGA, & GUA KUNO
  // =========================================================================
  console.log('--- 4. Seeding Locations, Docks & Ancient Caves ---');

  const locations = [
    // Desa Xingcun
    {
      regionSlug: 'central_plains',
      settlementName: 'Desa Xingcun',
      buildingName: 'Balai Sekte Pedang Langit',
      buildingType: 'sect_hall',
      mapIconType: 'sect_hall',
      description: 'Aula penerimaan murid baru dan pusat administrasi sekte.'
    },
    {
      regionSlug: 'central_plains',
      settlementName: 'Desa Xingcun',
      buildingName: 'Dermaga Sungai Xingcun',
      buildingType: 'dock',
      mapIconType: 'dock',
      description: 'Dermaga tepi sungai untuk penyeberangan rakit bambu ke rimba selatan.'
    },
    {
      regionSlug: 'central_plains',
      settlementName: 'Desa Xingcun',
      buildingName: 'Gua Rahasia Kuno (Mortal Cave)',
      buildingType: 'dungeon_entrance',
      mapIconType: 'dungeon',
      description: 'Mulut gua purba yang menyimpan lorong labirin 8x8 dan peti pusaka fana.'
    },

    // Rimba Selatan
    {
      regionSlug: 'southern_demon_domain',
      settlementName: 'Desa Rimba Lembah',
      buildingName: 'Dermaga Rimba Selatan',
      buildingType: 'dock',
      mapIconType: 'dock',
      description: 'Pangkalan rakit penyeberangan kembali ke Dataran Tengah.'
    },

    // Pesisir Timur & Laut Timur
    {
      regionSlug: 'eastern_sea',
      settlementName: 'Pelabuhan Pesisir Timur',
      buildingName: 'Dermaga Utama Timur',
      buildingType: 'dock',
      mapIconType: 'dock',
      description: 'Pelabuhan besar tempat kapal layar cepat berlayar ke Pulau Istana Giok.'
    },
    {
      regionSlug: 'eastern_sea',
      settlementName: 'Pulau Istana Giok',
      buildingName: 'Dermaga Istana Giok',
      buildingType: 'dock',
      mapIconType: 'dock',
      description: 'Dermaga pulau giok tempat kapal merapat.'
    },

    // Pegunungan Azure
    {
      regionSlug: 'azure_mountain',
      settlementName: 'Puncak Langit Azure',
      buildingName: 'Makam Kaisar Pedang (Immortal Ruin)',
      buildingType: 'dungeon_entrance',
      mapIconType: 'dungeon',
      description: 'Pintu masuk ke labirin raksasa 40x40 makam kaisar pedang purba.'
    }
  ];

  for (const loc of locations) {
    await Location.findOneAndUpdate(
      { guildId, regionSlug: loc.regionSlug, settlementName: loc.settlementName, buildingName: loc.buildingName },
      { ...loc, guildId, isActive: true },
      { upsert: true, new: true }
    );
  }
  console.log(`[PASS] ${locations.length} Titik Lokasi, Dermaga, dan Pintu Masuk Gua berhasil di-seed.`);

  console.log('\n=== MASTER SEEDER EKOSISTEM JIANGHU SELESAI (100% SUKSES) ===\n');
}

// Eksekusi jika dijalankan langsung via CLI
if (require.main === module) {
  const isReset = process.argv.includes('--reset');
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jianghu-bot';

  mongoose.connect(uri)
    .then(async () => {
      console.log('[DB] Terhubung ke MongoDB:', uri);
      await seedMasterEcosystem({ reset: isReset });
      process.exit(0);
    })
    .catch((err) => {
      console.error('[DB] Gagal menghubungkan ke MongoDB:', err.message);
      process.exit(1);
    });
}

module.exports = { seedMasterEcosystem };
