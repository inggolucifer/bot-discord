/**
 * SEEDER ITEM ESENSI KHUSUS 15 LAW & MATERIAL ALTAR
 * Menambahkan katalog item esensi berjenjang (Tier 1 s/d Tier 5) untuk seluruh 15 Hukum Semesta
 * serta memberikan starter pack item esensi kepada karakter Inggo untuk testing.
 */

const mongoose = require('mongoose');
require('dotenv').config();
const Item = require('../models/Item');
const Player = require('../models/Player');

const ESSENCE_ITEMS = [
  // ═══════════════════════════════════════════════════════════════
  // 1. ELEMEN PETIR (element_godthunder_light)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Pasir Petir Halus',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['essence', 'thunder_essence', 'catalyst'],
    description: 'Pasir mineral yang tersengat petir gurun, memancarkan denyut statis halus untuk pemula elemen petir.',
    basePrice: 30,
    priceCurrency: 'silver'
  },
  {
    name: 'Batu Kilat Ungu',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'thunder_essence', 'catalyst'],
    description: 'Batu kuarsa ungu yang menyerap halilintar awan badai, menghasilkan intisari kilat murni.',
    basePrice: 80,
    priceCurrency: 'silver'
  },
  {
    name: 'Kristal Petir Azure',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'thunder_essence', 'catalyst'],
    description: 'Kristal biru bertegangan tinggi yang diekstraksi dari puncak tebing guntur, esensi ranah Foundation.',
    basePrice: 200,
    priceCurrency: 'silver'
  },
  {
    name: 'Inti Halilintar Emas Langit',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['essence', 'thunder_essence', 'catalyst'],
    description: 'Intisari petir emas hukuman langit dewa kuno, mampu mengkristalkan Golden Core petir sejati.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Sari Guntur Primordial Chaos',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['essence', 'thunder_essence', 'catalyst'],
    description: 'Guntur pertama saat langit dan bumi terbelah. Intisari petir primordial tanpa tandingan.',
    basePrice: 20,
    priceCurrency: 'gold'
  },

  // ═══════════════════════════════════════════════════════════════
  // 2. ELEMEN API PHOENIX (element_phoenix_fire)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Percikan Bara Vulkanik',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['essence', 'fire_essence', 'catalyst'],
    description: 'Bara api dasar dari kawah gunung berapi aktif, menghangatkan dantian fana.',
    basePrice: 30,
    priceCurrency: 'silver'
  },
  {
    name: 'Intisari Api Merah',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'fire_essence', 'catalyst'],
    description: 'Kristalisasi api murni yang membakar kotoran Qi fana.',
    basePrice: 80,
    priceCurrency: 'silver'
  },
  {
    name: 'Batu Nyala Phoenix Kuno',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'fire_essence', 'catalyst'],
    description: 'Pecahan sarang Burung Phoenix yang terbakar api abadi selama seribu tahun.',
    basePrice: 200,
    priceCurrency: 'silver'
  },
  {
    name: 'Lahar Inti Samadhi',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['essence', 'fire_essence', 'catalyst'],
    description: 'Cairan lahar api Samadhi sejati penempa Inti Emas tanpa cela.',
    basePrice: 5,
    priceCurrency: 'gold'
  },

  // ═══════════════════════════════════════════════════════════════
  // 3. ELEMEN AIR AZURE (element_azure_water)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Tetes Embun Pagi Dingin',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['essence', 'water_essence', 'catalyst'],
    description: 'Embun pagi di dedaunan pegunungan tinggi berhawa sejuk.',
    basePrice: 30,
    priceCurrency: 'silver'
  },
  {
    name: 'Embun Es Abadi',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'water_essence', 'catalyst'],
    description: 'Embun beku yang tidak pernah mencair dari puncak glasier kutub utara.',
    basePrice: 80,
    priceCurrency: 'silver'
  },
  {
    name: 'Giok Samudra Naga Azure',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'water_essence', 'catalyst'],
    description: 'Giok air laut dalam tempat persemayaman naga azure purba.',
    basePrice: 200,
    priceCurrency: 'silver'
  },

  // ═══════════════════════════════════════════════════════════════
  // 4. ELEMEN BUMI XUANWU (element_xuanwu_earth)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Tanah Kuning Berenergi',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['essence', 'earth_essence', 'catalyst'],
    description: 'Lumpur lempung kuning padat dari dasar lembah sungai kuno.',
    basePrice: 30,
    priceCurrency: 'silver'
  },
  {
    name: 'Batu Inti Purba',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'earth_essence', 'catalyst'],
    description: 'Batu granit padat leylines benua yang memperkokoh fondasi dantian.',
    basePrice: 80,
    priceCurrency: 'silver'
  },
  {
    name: 'Lempeng Karang Xuanwu',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'earth_essence', 'catalyst'],
    description: 'Fosil karang purba yang mewarisi kekokohan tempurung Dewa Xuanwu.',
    basePrice: 200,
    priceCurrency: 'silver'
  },

  // ═══════════════════════════════════════════════════════════════
  // 5. ELEMEN KAYU QINGDI (element_qingdi_wood)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Serat Bambu Rohani',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['essence', 'wood_essence', 'catalyst'],
    description: 'Serat bambu hijau yang lentur dan memancarkan energi kehidupan alami.',
    basePrice: 30,
    priceCurrency: 'silver'
  },
  {
    name: 'Getah Pohon Roh Hijau',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'wood_essence', 'catalyst'],
    description: 'Getah manis pohon berusia tiga ratus tahun yang menyegarkan organ batin.',
    basePrice: 80,
    priceCurrency: 'silver'
  },
  {
    name: 'Benih Hayat Kaisar Qingdi',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'wood_essence', 'catalyst'],
    description: 'Biji kehidupan semesta yang mampu menumbuhkan kembali jaringan dantian rusak.',
    basePrice: 200,
    priceCurrency: 'silver'
  },

  // ═══════════════════════════════════════════════════════════════
  // 6. ELEMEN ANGIN ROC (element_roc_wind)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Bulu Angin Halus',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['essence', 'wind_essence', 'catalyst'],
    description: 'Bulu burung pemangsa dataran tinggi yang sangat ringan melayang di udara.',
    basePrice: 30,
    priceCurrency: 'silver'
  },
  {
    name: 'Bulu Burung Roc Astral',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'wind_essence', 'catalyst'],
    description: 'Bulu keras sayap anak burung Roc yang membelah aliran udara tanpa hambatan.',
    basePrice: 80,
    priceCurrency: 'silver'
  },
  {
    name: 'Kristal Badai 90.000 Li',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'wind_essence', 'catalyst'],
    description: 'Kristal topan pusaran sembilan langit penembus batas kecepatan jelajah.',
    basePrice: 200,
    priceCurrency: 'silver'
  },

  // ═══════════════════════════════════════════════════════════════
  // 7. GU MASTER (gu_master)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Intisari Serangga Gu',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'gu_essence', 'gu_feed'],
    description: 'Sari sari herba beracun dan getah manis yang difermentasi khusus untuk makanan cacing Gu.',
    basePrice: 50,
    priceCurrency: 'silver'
  },
  {
    name: 'Madu Ratu Kalajengking Roh',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'gu_essence', 'gu_feed'],
    description: 'Madu kental beracun dari sarang ratu kalajengking, santapan mewah pemacu mutasi cacing Gu.',
    basePrice: 150,
    priceCurrency: 'silver'
  },
  {
    name: 'Empedu Raja Serangga Purba',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['essence', 'gu_essence', 'gu_feed'],
    description: 'Empedu pekat raja serangga gua terlarang, memicu lonjakan Satiety dan evolusi tier Gu.',
    basePrice: 5,
    priceCurrency: 'gold'
  },

  // ═══════════════════════════════════════════════════════════════
  // 8. PENEMPAAN RAGA (body_tempering) & MATERIAL ALTAR
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Herba Tulang Besi',
    category: 'herb',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'body_essence', 'medicinal_herb'],
    description: 'Herba berakar hitam keras yang direbus untuk merendam daging dan menguatkan tulang fana.',
    basePrice: 60,
    priceCurrency: 'silver'
  },
  {
    name: 'Darah Siluman Berenergi',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'body_essence', 'beast_blood'],
    description: 'Darah segar kental binatang siluman tingkat tinggi untuk mandi rendaman raga vajra.',
    basePrice: 180,
    priceCurrency: 'silver'
  },
  {
    name: 'Kayu Bambu Keras',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['altar_material', 'crafting'],
    description: 'Batang bambu kokoh untuk konstruksi Bak Mandi Raga dan fasilitas kultivasi.',
    basePrice: 15,
    priceCurrency: 'silver'
  },
  {
    name: 'Batu Kasar Gunung',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['altar_material', 'crafting'],
    description: 'Batu kali padat untuk pondasi dasar altar dan kuali penempaan.',
    basePrice: 10,
    priceCurrency: 'silver'
  },

  // ═══════════════════════════════════════════════════════════════
  // 9. PUSAKA JIWA (natal_artifact)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Batu Asah Roh Purba',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'artifact_essence', 'whetstone'],
    description: 'Batu asah berpori halus yang mengandung serbuk giok untuk menajamkan aura pusaka jiwa.',
    basePrice: 50,
    priceCurrency: 'silver'
  },
  {
    name: 'Bijih Besi Tempa',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['essence', 'artifact_essence', 'mineral'],
    description: 'Bijih besi murni untuk memperkuat bilah pusaka fana.',
    basePrice: 25,
    priceCurrency: 'silver'
  },

  // ═══════════════════════════════════════════════════════════════
  // 10. SATWA ROH (natal_beast)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Daging Siluman Berenergi',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'beast_essence', 'beast_meat'],
    description: 'Daging segar monster hutan berurat merah yang memulihkan darah satwa roh.',
    basePrice: 40,
    priceCurrency: 'silver'
  },
  {
    name: 'Jantung Monster Rawa',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'beast_essence', 'beast_meat'],
    description: 'Jantung masih berdenyut penuh vitalitas untuk evolusi satwa roh.',
    basePrice: 160,
    priceCurrency: 'silver'
  },

  // ═══════════════════════════════════════════════════════════════
  // 11. JALUR IBLIS (demonic laws) & ALTAR ABYSS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Inti Siluman Kotor',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'turbid_essence', 'beast_core'],
    description: 'Batu inti monster liar penuh hawa kotor, makanan favorit praktisi Pelebur Core.',
    basePrice: 70,
    priceCurrency: 'silver'
  },
  {
    name: 'Botol Esensi Darah Segar',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'blood_essence', 'blood_vial'],
    description: 'Botol kaca bersegel darah murni korban tempur untuk Panji Sembilan Ruh.',
    basePrice: 70,
    priceCurrency: 'silver'
  },
  {
    name: 'Empedu Racun Kalajengking',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'poison_essence', 'venom_sac'],
    description: 'Cairan bisa hijau pekat untuk diminum pendekar seribu racun.',
    basePrice: 65,
    priceCurrency: 'silver'
  },
  {
    name: 'Batu Obsidian Hitam Abyss',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['altar_material', 'abyssal_essence', 'demonic_material'],
    description: 'Batu karang hitam legam dari rekahan jurang Abyss untuk konstruksi Altar Kurban Darah.',
    basePrice: 100,
    priceCurrency: 'silver'
  },
  {
    name: 'Batu Yin Sembilan Lapis',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'yin_essence', 'yin_stone'],
    description: 'Batu dingin dari pemakaman kuno ribuan tahun yang memancarkan hawa kematian murni.',
    basePrice: 85,
    priceCurrency: 'silver'
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jianghu');
    console.log('🔗 Terhubung ke database MongoDB.');

    let upsertedCount = 0;
    for (const itemData of ESSENCE_ITEMS) {
      await Item.findOneAndUpdate(
        { name: itemData.name },
        { $set: itemData },
        { upsert: true, new: true }
      );
      upsertedCount++;
    }
    console.log(`✅ Berhasil seeding/upsert ${upsertedCount} Item Esensi & Material Altar.`);

    // Berikan starter pack item esensi ke karakter Inggo untuk pengujian langsung
    const inggo = await Player.findOne({ discordId: 'google_10398407018507304858_1790425324687' });
    if (inggo) {
      const guEssenceItem = await Item.findOne({ name: 'Intisari Serangga Gu' });
      const maduItem = await Item.findOne({ name: 'Madu Ratu Kalajengking Roh' });
      const bambuItem = await Item.findOne({ name: 'Kayu Bambu Keras' });
      const batuKasarItem = await Item.findOne({ name: 'Batu Kasar Gunung' });
      const herbaTulangItem = await Item.findOne({ name: 'Herba Tulang Besi' });
      const petirItem = await Item.findOne({ name: 'Kristal Petir Azure' });

      const testItems = [
        { item: guEssenceItem, qty: 10 },
        { item: maduItem, qty: 5 },
        { item: bambuItem, qty: 20 },
        { item: batuKasarItem, qty: 20 },
        { item: herbaTulangItem, qty: 10 },
        { item: petirItem, qty: 5 }
      ];

      if (!inggo.inventory) inggo.inventory = [];

      for (const { item, qty } of testItems) {
        if (!item) continue;
        const existing = inggo.inventory.find(inv => inv.itemId?.toString() === item._id.toString());
        if (existing) {
          existing.quantity += qty;
        } else {
          inggo.inventory.push({
            itemId: item._id,
            quantity: qty
          });
        }
      }

      // Pastikan Inggo memiliki saldo Copper dan Silver yang cukup untuk testing
      if (!inggo.currency) inggo.currency = { copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 };
      inggo.currency.copper = Math.max(inggo.currency.copper || 0, 500);
      inggo.currency.silver = Math.max(inggo.currency.silver || 0, 300);

      // Inisialisasi facilities jika belum ada
      if (!inggo.cultivationLaw) inggo.cultivationLaw = {};
      if (!inggo.cultivationLaw.facilities) {
        inggo.cultivationLaw.facilities = {
          bodyCauldronTier: 0,
          abyssalAltarTier: 0,
          guCrucibleTier: 1,
          soulAnvilTier: 0,
          beastDenTier: 0
        };
      }
      inggo.cultivationLaw.currentEssence = inggo.cultivationLaw.currentEssence || 80;
      inggo.cultivationLaw.maxEssence = 625; // Rank 2 Foundation Establishment

      inggo.markModified('inventory');
      inggo.markModified('currency');
      inggo.markModified('cultivationLaw');
      await inggo.save();

      console.log(`✨ Karakter Inggo berhasil dibekali paket pengujian (10x Intisari Gu, 5x Madu, Material Altar, 500 Copper, 300 Silver)!`);
    }

    await mongoose.disconnect();
    console.log('🔌 Koneksi MongoDB ditutup. Seeding selesai dengan sempurna.');
  } catch (err) {
    console.error('❌ Gagal menjalankan seeder:', err);
    process.exit(1);
  }
}

seed();
