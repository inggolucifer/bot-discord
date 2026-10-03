/**
 * SEEDER ITEM ESENSI KHUSUS 20 LAW & MATERIAL ALTAR
 * Menambahkan katalog item esensi berjenjang (Tier 1 s/d Tier 5) untuk seluruh 20 Hukum Semesta
 * (6 Elemen, Body Tempering, Gu Master, Natal Beast, Natal Artifact, 5 Demonic Laws, 5 Righteous Laws)
 * serta memberikan starter pack item esensi kepada karakter Inggo untuk testing.
 */

const mongoose = require('mongoose');
require('dotenv').config();
const Item = require('../models/Item');
const Player = require('../models/Player');
const { resolveItemTier } = require('../utils/lawCultivationEngine');

const ESSENCE_ITEMS = [
  // ═══════════════════════════════════════════════════════════════
  // 1. ELEMEN PETIR (element_godthunder_light)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Pasir Petir Halus',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['essence', 'thunder_essence', 'thunder_catalyst', 'catalyst', 'material'],
    description: 'Pasir mineral yang tersengat petir gurun, memancarkan denyut statis halus untuk pemula elemen petir.',
    basePrice: 30,
    priceCurrency: 'silver'
  },
  {
    name: 'Batu Kilat Ungu',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'thunder_essence', 'thunder_catalyst', 'catalyst', 'material'],
    description: 'Batu kuarsa ungu yang menyerap halilintar awan badai, menghasilkan intisari kilat murni.',
    basePrice: 80,
    priceCurrency: 'silver'
  },
  {
    name: 'Kristal Petir Azure',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'thunder_essence', 'thunder_catalyst', 'catalyst', 'material'],
    description: 'Kristal biru bertegangan tinggi yang diekstraksi dari puncak tebing guntur, esensi ranah Foundation.',
    basePrice: 200,
    priceCurrency: 'silver'
  },
  {
    name: 'Inti Halilintar Emas Langit',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['essence', 'thunder_essence', 'thunder_catalyst', 'catalyst', 'material'],
    description: 'Intisari petir emas hukuman langit dewa kuno, mampu mengkristalkan Golden Core petir sejati.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Sari Guntur Primordial Chaos',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['essence', 'thunder_essence', 'thunder_catalyst', 'catalyst', 'material'],
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
    tags: ['essence', 'fire_essence', 'fire_catalyst', 'catalyst', 'material'],
    description: 'Bara api dasar dari kawah gunung berapi aktif, menghangatkan dantian fana.',
    basePrice: 30,
    priceCurrency: 'silver'
  },
  {
    name: 'Intisari Api Merah',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'fire_essence', 'fire_catalyst', 'catalyst', 'material'],
    description: 'Kristalisasi api murni yang membakar kotoran Qi fana.',
    basePrice: 80,
    priceCurrency: 'silver'
  },
  {
    name: 'Batu Nyala Phoenix Kuno',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'fire_essence', 'fire_catalyst', 'catalyst', 'material'],
    description: 'Pecahan sarang Burung Phoenix yang terbakar api abadi selama seribu tahun.',
    basePrice: 200,
    priceCurrency: 'silver'
  },
  {
    name: 'Lahar Inti Samadhi',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['essence', 'fire_essence', 'fire_catalyst', 'catalyst', 'material'],
    description: 'Cairan lahar api Samadhi sejati penempa Inti Emas tanpa cela.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Nyala Api Phoenix Primordial',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['essence', 'fire_essence', 'fire_catalyst', 'catalyst', 'material'],
    description: 'Api abadi burung Phoenix yang bangkit dari nirwana, membakar rintangan kultivasi apa pun.',
    basePrice: 20,
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
    tags: ['essence', 'water_essence', 'water_catalyst', 'catalyst', 'material'],
    description: 'Embun pagi di dedaunan pegunungan tinggi berhawa sejuk.',
    basePrice: 30,
    priceCurrency: 'silver'
  },
  {
    name: 'Embun Es Abadi',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'water_essence', 'water_catalyst', 'catalyst', 'material'],
    description: 'Embun beku yang tidak pernah mencair dari puncak glasier kutub utara.',
    basePrice: 80,
    priceCurrency: 'silver'
  },
  {
    name: 'Giok Samudra Naga Azure',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'water_essence', 'water_catalyst', 'catalyst', 'material'],
    description: 'Giok air laut dalam tempat persemayaman naga azure purba.',
    basePrice: 200,
    priceCurrency: 'silver'
  },
  {
    name: 'Mutiara Laut Dalam Sembilan Benua',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['essence', 'water_essence', 'water_catalyst', 'catalyst', 'material'],
    description: 'Mutiara raksasa palung laut terdalam dengan kekuatan pasang surut surgawi.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Mata Air Xuanming Primordial',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['essence', 'water_essence', 'water_catalyst', 'catalyst', 'material'],
    description: 'Tetesan air sumber samudera semesta yang menyejukkan jiwa dan dantian abadi.',
    basePrice: 20,
    priceCurrency: 'gold'
  },

  // ═══════════════════════════════════════════════════════════════
  // 4. ELEMEN BUMI XUANWU (element_xuanwu_earth)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Tanah Kuning Berenergi',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['essence', 'earth_essence', 'earth_catalyst', 'catalyst', 'material'],
    description: 'Lumpur lempung kuning padat dari dasar lembah sungai kuno.',
    basePrice: 30,
    priceCurrency: 'silver'
  },
  {
    name: 'Batu Inti Purba',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'earth_essence', 'earth_catalyst', 'catalyst', 'material'],
    description: 'Batu granit padat leylines benua yang memperkokoh fondasi dantian.',
    basePrice: 80,
    priceCurrency: 'silver'
  },
  {
    name: 'Lempeng Karang Xuanwu',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'earth_essence', 'earth_catalyst', 'catalyst', 'material'],
    description: 'Fosil karang purba yang mewarisi kekokohan tempurung Dewa Xuanwu.',
    basePrice: 200,
    priceCurrency: 'silver'
  },
  {
    name: 'Batu Gravitasi Gunung Kunlun',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['essence', 'earth_essence', 'earth_catalyst', 'catalyst', 'material'],
    description: 'Pecahan puncak gunung dewa Kunlun yang menyimpan bobot sepuluh ribu ton.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Tanah Suci Pangu Primordial',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['essence', 'earth_essence', 'earth_catalyst', 'catalyst', 'material'],
    description: 'Tanah primordial pembentuk daratan semesta pertama.',
    basePrice: 20,
    priceCurrency: 'gold'
  },

  // ═══════════════════════════════════════════════════════════════
  // 5. ELEMEN KAYU QINGDI (element_qingdi_wood)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Serat Bambu Rohani',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['essence', 'wood_essence', 'wood_catalyst', 'catalyst', 'herb', 'material'],
    description: 'Serat bambu hijau yang lentur dan memancarkan energi kehidupan alami.',
    basePrice: 30,
    priceCurrency: 'silver'
  },
  {
    name: 'Getah Pohon Roh Hijau',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'wood_essence', 'wood_catalyst', 'catalyst', 'herb', 'material'],
    description: 'Getah manis pohon berusia tiga ratus tahun yang menyegarkan organ batin.',
    basePrice: 80,
    priceCurrency: 'silver'
  },
  {
    name: 'Benih Hayat Kaisar Qingdi',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'wood_essence', 'wood_catalyst', 'catalyst', 'herb', 'material'],
    description: 'Biji kehidupan semesta yang mampu menumbuhkan kembali jaringan dantian rusak.',
    basePrice: 200,
    priceCurrency: 'silver'
  },
  {
    name: 'Kayu Abadi Pohon Dunia Yggdrasil',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['essence', 'wood_essence', 'wood_catalyst', 'catalyst', 'herb', 'material'],
    description: 'Dahan kayu purba yang tak pernah membusuk selama ribuan masa peradaban.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Intisari Pohon Hayat Primordial',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['essence', 'wood_essence', 'wood_catalyst', 'catalyst', 'herb', 'material'],
    description: 'Puncak intisari elemen kayu semesta yang memberi keabadian sel raga.',
    basePrice: 20,
    priceCurrency: 'gold'
  },

  // ═══════════════════════════════════════════════════════════════
  // 6. ELEMEN ANGIN ROC (element_roc_wind)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Bulu Angin Halus',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['essence', 'wind_essence', 'wind_catalyst', 'catalyst', 'material'],
    description: 'Bulu burung pemangsa dataran tinggi yang sangat ringan melayang di udara.',
    basePrice: 30,
    priceCurrency: 'silver'
  },
  {
    name: 'Bulu Burung Roc Astral',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'wind_essence', 'wind_catalyst', 'catalyst', 'material'],
    description: 'Bulu keras sayap anak burung Roc yang membelah aliran udara tanpa hambatan.',
    basePrice: 80,
    priceCurrency: 'silver'
  },
  {
    name: 'Kristal Badai 90.000 Li',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'wind_essence', 'wind_catalyst', 'catalyst', 'material'],
    description: 'Kristal topan pusaran sembilan langit penembus batas kecepatan jelajah.',
    basePrice: 200,
    priceCurrency: 'silver'
  },
  {
    name: 'Bulu Sayap Sayap Emas Dapeng',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['essence', 'wind_essence', 'wind_catalyst', 'catalyst', 'material'],
    description: 'Bulu burung Dapeng sayap emas penjelajah batas langit kosmis.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Hembusan Angin Primordial Astral',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['essence', 'wind_essence', 'wind_catalyst', 'catalyst', 'material'],
    description: 'Nafas angin pertama semesta yang mampu meniup hancur formasi bintang.',
    basePrice: 20,
    priceCurrency: 'gold'
  },

  // ═══════════════════════════════════════════════════════════════
  // 7. GU MASTER (gu_master)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Larva Serangga Rawa (Tier 1)',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['essence', 'gu_essence', 'gu_feed', 'gu_food', 'gu_larva', 'material'],
    description: 'Larva cacing rawa pemakan bangkai beracun, pakan dasar pemula Aperture Gu.',
    basePrice: 20,
    priceCurrency: 'copper'
  },
  {
    name: 'Intisari Serangga Gu',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'gu_essence', 'gu_feed', 'gu_food', 'gu_larva', 'material'],
    description: 'Sari sari herba beracun dan getah manis yang difermentasi khusus untuk makanan cacing Gu.',
    basePrice: 50,
    priceCurrency: 'silver'
  },
  {
    name: 'Madu Ratu Kalajengking Roh',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'gu_essence', 'gu_feed', 'gu_food', 'gu_larva', 'material'],
    description: 'Madu kental beracun dari sarang ratu kalajengking, santapan mewah pemacu mutasi cacing Gu.',
    basePrice: 150,
    priceCurrency: 'silver'
  },
  {
    name: 'Empedu Raja Serangga Purba',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['essence', 'gu_essence', 'gu_feed', 'gu_food', 'gu_larva', 'material'],
    description: 'Empedu pekat raja serangga gua terlarang, memicu lonjakan Satiety dan evolusi tier Gu.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Embrio Raja Gu Sembilan Kematian (Tier 5)',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['essence', 'gu_essence', 'gu_feed', 'gu_food', 'gu_larva', 'material'],
    description: 'Embrio Gu purba yang menetas di lembah sepuluh ribu racun, pakan pemuncak Gu Dewa.',
    basePrice: 20,
    priceCurrency: 'gold'
  },

  // ═══════════════════════════════════════════════════════════════
  // 8. PENEMPAAN RAGA (body_tempering) & MATERIAL ALTAR
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Salep Kulit Perunggu (Tier 1)',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['essence', 'body_essence', 'flesh', 'mineral', 'material'],
    description: 'Salep oles dari serbuk mineral perunggu untuk merapatkan pori-pori dan kulit fana.',
    basePrice: 20,
    priceCurrency: 'copper'
  },
  {
    name: 'Herba Tulang Besi',
    category: 'herb',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'body_essence', 'flesh', 'mineral', 'medicinal_herb', 'material'],
    description: 'Herba berakar hitam keras yang direbus untuk merendam daging dan menguatkan tulang fana.',
    basePrice: 60,
    priceCurrency: 'silver'
  },
  {
    name: 'Darah Siluman Berenergi',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'body_essence', 'flesh', 'beast_blood', 'material'],
    description: 'Darah segar kental binatang siluman tingkat tinggi untuk mandi rendaman raga vajra.',
    basePrice: 180,
    priceCurrency: 'silver'
  },
  {
    name: 'Sumsum Naga Emas Murni (Tier 4)',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['essence', 'body_essence', 'flesh', 'mineral', 'material'],
    description: 'Ekstraksi sumsum tulang naga sejati untuk merekonstruksi rangka tubuh menjadi rangka intan.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Inti Raga Dewa Vajra Kuno (Tier 5)',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['essence', 'body_essence', 'flesh', 'mineral', 'material'],
    description: 'Intisari raga makhluk dewa kuno yang kebal terhadap segala senjata fana dan mantra alam.',
    basePrice: 20,
    priceCurrency: 'gold'
  },
  {
    name: 'Kayu Bambu Keras',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['altar_material', 'crafting', 'material'],
    description: 'Batang bambu kokoh untuk konstruksi Bak Mandi Raga dan fasilitas kultivasi.',
    basePrice: 15,
    priceCurrency: 'silver'
  },
  {
    name: 'Batu Kasar Gunung',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['altar_material', 'crafting', 'material'],
    description: 'Batu kali padat untuk pondasi dasar altar dan kuali penempaan.',
    basePrice: 10,
    priceCurrency: 'silver'
  },

  // ═══════════════════════════════════════════════════════════════
  // 9. PUSAKA JIWA (natal_artifact)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Bijih Besi Tempa',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['essence', 'artifact_essence', 'ore', 'whetstone', 'mineral', 'material', 'common_artifact'],
    description: 'Bijih besi murni untuk memperkuat bilah pusaka fana.',
    basePrice: 25,
    priceCurrency: 'silver'
  },
  {
    name: 'Batu Asah Roh Purba',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'artifact_essence', 'ore', 'whetstone', 'mineral', 'material', 'common_artifact'],
    description: 'Batu asah berpori halus yang mengandung serbuk giok untuk menajamkan aura pusaka jiwa.',
    basePrice: 50,
    priceCurrency: 'silver'
  },
  {
    name: 'Pecahan Bijih Meteorit Kuno (Tier 3)',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'artifact_essence', 'ore', 'whetstone', 'mineral', 'material', 'common_artifact'],
    description: 'Bijih besi bintang jatuh yang memancarkan resonansi spiritual tajam.',
    basePrice: 180,
    priceCurrency: 'silver'
  },
  {
    name: 'Batu Asah Jiwa Hitam (Tier 4)',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['essence', 'artifact_essence', 'ore', 'whetstone', 'mineral', 'material', 'common_artifact'],
    description: 'Batu asah legendaris pembuka gerbang pencerahan spiritual bilah pusaka.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Logam Primordial Bintang Jatuh (Tier 5)',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['essence', 'artifact_essence', 'ore', 'whetstone', 'mineral', 'material', 'common_artifact'],
    description: 'Inti logam kosmik awal penciptaan untuk menempa Artefak Abadi tak terkalahkan.',
    basePrice: 20,
    priceCurrency: 'gold'
  },

  // ═══════════════════════════════════════════════════════════════
  // 10. SATWA ROH (natal_beast)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Daging Kelinci Roh (Tier 1)',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['essence', 'beast_essence', 'beast_food', 'meat', 'beast_meat', 'material', 'beast_egg'],
    description: 'Daging empuk kelinci padang rumput berenergi lembut, santapan hewan pendamping pemula.',
    basePrice: 15,
    priceCurrency: 'silver'
  },
  {
    name: 'Daging Siluman Berenergi',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'beast_essence', 'beast_food', 'meat', 'beast_meat', 'material', 'beast_egg'],
    description: 'Daging segar monster hutan berurat merah yang memulihkan darah satwa roh.',
    basePrice: 40,
    priceCurrency: 'silver'
  },
  {
    name: 'Jantung Monster Rawa',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'beast_essence', 'beast_food', 'meat', 'beast_meat', 'material', 'beast_egg'],
    description: 'Jantung masih berdenyut penuh vitalitas untuk evolusi satwa roh.',
    basePrice: 160,
    priceCurrency: 'silver'
  },
  {
    name: 'Darah Jantung Naga Roh (Tier 4)',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['essence', 'beast_essence', 'beast_food', 'meat', 'beast_meat', 'material', 'beast_egg'],
    description: 'Darah murni jantung naga purba yang membangkitkan garis keturunan ilahi satwa.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Daging Binatang Suci Primordial (Tier 5)',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['essence', 'beast_essence', 'beast_food', 'meat', 'beast_meat', 'material', 'beast_egg'],
    description: 'Daging makhluk suci mitologi yang mendorong evolusi satwa roh ke ranah dewa.',
    basePrice: 20,
    priceCurrency: 'gold'
  },

  // ═══════════════════════════════════════════════════════════════
  // 11. DEMONIC TURBID CORE (demonic_turbid_core)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Pecahan Inti Siluman Keruh (Tier 1)',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['essence', 'turbid_essence', 'beast_core', 'turbid_core', 'core', 'material'],
    description: 'Serpihan inti monster keruh liar berhawa kotor untuk pemula jalur iblis.',
    basePrice: 25,
    priceCurrency: 'silver'
  },
  {
    name: 'Inti Siluman Kotor',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'turbid_essence', 'beast_core', 'turbid_core', 'core', 'material'],
    description: 'Batu inti monster liar penuh hawa kotor, makanan favorit praktisi Pelebur Core.',
    basePrice: 70,
    priceCurrency: 'silver'
  },
  {
    name: 'Inti Monster Kuno Keruh (Tier 3)',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'turbid_essence', 'beast_core', 'turbid_core', 'core', 'material'],
    description: 'Inti monster rawa beracun ribuan tahun yang memancarkan hawa kotor pekat.',
    basePrice: 180,
    priceCurrency: 'silver'
  },
  {
    name: 'Inti Siluman Kiamat Hitam (Tier 4)',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['essence', 'turbid_essence', 'beast_core', 'turbid_core', 'core', 'material'],
    description: 'Inti monster bencana alam berhawa kotor dahsyat pelebur pembatas dantian.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Inti Primordial Chaos Gelap (Tier 5)',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['essence', 'turbid_essence', 'beast_core', 'turbid_core', 'core', 'material'],
    description: 'Inti primordial penuh kekacauan semesta penakluk hukum suci langit.',
    basePrice: 20,
    priceCurrency: 'gold'
  },

  // ═══════════════════════════════════════════════════════════════
  // 12. DEMONIC BLOOD SOUL (demonic_blood_soul)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Botol Darah Binatang Liar (Tier 1)',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['essence', 'blood_essence', 'blood_vial', 'blood', 'material'],
    description: 'Darah segar hewan buruan hutan untuk mengisi cawan darah pemula.',
    basePrice: 25,
    priceCurrency: 'silver'
  },
  {
    name: 'Botol Esensi Darah Segar',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'blood_essence', 'blood_vial', 'blood', 'material'],
    description: 'Botol kaca bersegel darah murni korban tempur untuk Panji Sembilan Ruh.',
    basePrice: 70,
    priceCurrency: 'silver'
  },
  {
    name: 'Esensi Darah Kultivator Kuno (Tier 3)',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'blood_essence', 'blood_vial', 'blood', 'material'],
    description: 'Darah kental kultivator berfondasi kuat yang diawetkan dalam botol giok darah.',
    basePrice: 180,
    priceCurrency: 'silver'
  },
  {
    name: 'Kristal Darah Asura Surgawi (Tier 4)',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['essence', 'blood_essence', 'blood_vial', 'blood', 'material'],
    description: 'Kristal darah pekat prajurit Asura medan pertempuran kuno.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Darah Dewa Iblis Primordial (Tier 5)',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['essence', 'blood_essence', 'blood_vial', 'blood', 'material'],
    description: 'Tetesan darah dewa iblis primordial yang mampu membalikkan aliran darah langit.',
    basePrice: 20,
    priceCurrency: 'gold'
  },

  // ═══════════════════════════════════════════════════════════════
  // 13. DEMONIC MYRIAD VENOM (demonic_myriad_venom)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Kantung Racun Ular Rawa (Tier 1)',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['essence', 'poison_essence', 'venom_sac', 'poison', 'material'],
    description: 'Kantung bisa ular beracun pemula untuk melatih ketahanan lambung beracun.',
    basePrice: 25,
    priceCurrency: 'silver'
  },
  {
    name: 'Empedu Racun Kalajengking',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['essence', 'poison_essence', 'venom_sac', 'poison', 'material'],
    description: 'Cairan bisa hijau pekat untuk diminum pendekar seribu racun.',
    basePrice: 65,
    priceCurrency: 'silver'
  },
  {
    name: 'Empedu Katak Beracun Sembilan Warna (Tier 3)',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['essence', 'poison_essence', 'venom_sac', 'poison', 'material'],
    description: 'Cairan empedu katak beracun yang dapat melelehkan daging dalam sekejap.',
    basePrice: 180,
    priceCurrency: 'silver'
  },
  {
    name: 'Bisa Kelabang Neraka Seribu Kaki (Tier 4)',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['essence', 'poison_essence', 'venom_sac', 'poison', 'material'],
    description: 'Racun pekat berwarna ungu pekat yang membakar meridian batin target.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Tetes Racun Primordial Pemusnah Jiwa (Tier 5)',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['essence', 'poison_essence', 'venom_sac', 'poison', 'material'],
    description: 'Racun abadi ciptaan alam yang mampu melarutkan bahkan jiwa dewa abadi.',
    basePrice: 20,
    priceCurrency: 'gold'
  },

  // ═══════════════════════════════════════════════════════════════
  // 14. DEMONIC ABYSSAL PACT (demonic_abyssal_pact) & ALTAR ABYSS
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Pecahan Obsidian Jurang (Tier 1)',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['abyssal', 'blood_vial', 'obsidian', 'essence', 'material', 'abyssal_essence', 'demonic_material', 'altar_material'],
    description: 'Serpihan batu kaca vulkanik hitam pekat berhawa dingin dari tubir jurang.',
    basePrice: 30,
    priceCurrency: 'silver'
  },
  {
    name: 'Batu Obsidian Hitam Abyss',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['abyssal', 'blood_vial', 'obsidian', 'essence', 'material', 'abyssal_essence', 'demonic_material', 'altar_material'],
    description: 'Batu karang hitam legam dari rekahan jurang Abyss untuk konstruksi Altar Kurban Darah.',
    basePrice: 100,
    priceCurrency: 'silver'
  },
  {
    name: 'Batu Obsidian Abyss Murni (Tier 3)',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['abyssal', 'blood_vial', 'obsidian', 'essence', 'material', 'abyssal_essence', 'demonic_material', 'altar_material'],
    description: 'Batu obsidian gelap gulita pemancar aura kutukan jurang abadi.',
    basePrice: 220,
    priceCurrency: 'silver'
  },
  {
    name: 'Plakat Kurban Jiwa Abyss (Tier 4)',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['abyssal', 'blood_vial', 'obsidian', 'essence', 'material', 'abyssal_essence', 'demonic_material'],
    description: 'Plakat hitam pemanggil resonansi makhluk kegelapan jurang tak berdasar.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Monolit Hitam Abyss Primordial (Tier 5)',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['abyssal', 'blood_vial', 'obsidian', 'essence', 'material', 'abyssal_essence', 'demonic_material'],
    description: 'Bongkahan monolit dari jantung abyss tempat terkuburnya rahasia penciptaan kegelapan.',
    basePrice: 20,
    priceCurrency: 'gold'
  },

  // ═══════════════════════════════════════════════════════════════
  // 15. DEMONIC NETHER DARKNESS (demonic_nether_darkness)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Pecahan Kerikil Nether Dingin (Tier 1)',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['yin_stone', 'nether', 'dark', 'essence', 'yin_essence', 'material'],
    description: 'Kerikil dingin dari kuburan tanpa nama pemancar hawa dingin malam.',
    basePrice: 25,
    priceCurrency: 'silver'
  },
  {
    name: 'Batu Yin Sembilan Lapis',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['yin_stone', 'nether', 'dark', 'essence', 'yin_essence', 'material'],
    description: 'Batu dingin dari pemakaman kuno ribuan tahun yang memancarkan hawa kematian murni.',
    basePrice: 85,
    priceCurrency: 'silver'
  },
  {
    name: 'Batu Yin Kuburan Roh Kuno (Tier 3)',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['yin_stone', 'nether', 'dark', 'essence', 'yin_essence', 'material'],
    description: 'Batu kubur sarang hantu berusia tiga ribu tahun penuh kondensasi energi Yin.',
    basePrice: 200,
    priceCurrency: 'silver'
  },
  {
    name: 'Kristal Kegelapan Neraka Sembilan Tingkat (Tier 4)',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['yin_stone', 'nether', 'dark', 'essence', 'yin_essence', 'material'],
    description: 'Kristal hitam es yang dibekukan oleh sungai bawah tanah dunia orang mati.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Inti Nether Primordial Abyss Gelap (Tier 5)',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['yin_stone', 'nether', 'dark', 'essence', 'yin_essence', 'material'],
    description: 'Intisari kegelapan abadi penguasa sembilan benua kematian.',
    basePrice: 20,
    priceCurrency: 'gold'
  },

  // ═══════════════════════════════════════════════════════════════
  // 16. RIGHTEOUS HEAVENLY MERIT (righteous_heavenly_merit)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Segel Jasa Kebajikan (Tier 1)',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['merit_seal', 'commendation_token', 'relief_receipt', 'essence', 'material'],
    description: 'Segel perunggu tanda pertolongan pertama kepada rakyat jelata yang tertindas.',
    basePrice: 30,
    priceCurrency: 'silver'
  },
  {
    name: 'Plakat Pahala Sekte (Tier 2)',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['merit_seal', 'commendation_token', 'relief_receipt', 'essence', 'material'],
    description: 'Plakat perak penghargaan dari dewan tetua atas pengabdian menegakkan kebajikan.',
    basePrice: 85,
    priceCurrency: 'silver'
  },
  {
    name: 'Token Penghargaan Kaisar (Tier 3)',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['merit_seal', 'commendation_token', 'relief_receipt', 'essence', 'material'],
    description: 'Token emas istana kaisar penanda jasa agung menyelamatkan seluruh provinsi.',
    basePrice: 220,
    priceCurrency: 'silver'
  },
  {
    name: 'Segel Emas Jasa Surgawi (Tier 4)',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['merit_seal', 'commendation_token', 'relief_receipt', 'essence', 'material'],
    description: 'Segel giok bertuliskan emas yang diakui oleh Pengadilan Langit.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Prasasti Kebajikan Langit Primordial (Tier 5)',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['merit_seal', 'commendation_token', 'relief_receipt', 'essence', 'material'],
    description: 'Prasasti pahala tak terhingga yang terukir di pilar langit semesta.',
    basePrice: 20,
    priceCurrency: 'gold'
  },

  // ═══════════════════════════════════════════════════════════════
  // 17. RIGHTEOUS PURE YANG (righteous_pure_yang)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Pecahan Giok Putih Murni (Tier 1)',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['yang_crystal', 'sun_essence_pill', 'white_jade_fragment', 'essence', 'material'],
    description: 'Pecahan batu giok putih susu yang memancarkan kehangatan lembut tanpa cela.',
    basePrice: 30,
    priceCurrency: 'silver'
  },
  {
    name: 'Kristal Yang Hangat (Tier 2)',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['yang_crystal', 'sun_essence_pill', 'white_jade_fragment', 'essence', 'material'],
    description: 'Kristal kuning keemasan pembersih hawa dingin kotor dari meridian.',
    basePrice: 85,
    priceCurrency: 'silver'
  },
  {
    name: 'Pil Intisari Matahari (Tier 3)',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['yang_crystal', 'sun_essence_pill', 'white_jade_fragment', 'essence', 'material'],
    description: 'Pil pemurni yang dipadatkan dari cahaya fajar pertama puncak gunung salju.',
    basePrice: 220,
    priceCurrency: 'silver'
  },
  {
    name: 'Kristal Api Surya Sejati (Tier 4)',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['yang_crystal', 'sun_essence_pill', 'white_jade_fragment', 'essence', 'material'],
    description: 'Kristal energi Yang murni yang mampu melenyapkan aura iblis seketika.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Inti Cahaya Murni Langit Sembilan (Tier 5)',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['yang_crystal', 'sun_essence_pill', 'white_jade_fragment', 'essence', 'material'],
    description: 'Inti cahaya suci matahari kosmik tanpa setitik pun bayangan gelap.',
    basePrice: 20,
    priceCurrency: 'gold'
  },

  // ═══════════════════════════════════════════════════════════════
  // 18. RIGHTEOUS SWORD HEART (righteous_sword_heart)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Minyak Pengasah Pedang Bambu (Tier 1)',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['sword_oil', 'whetstone_spirit', 'broken_blade_shard', 'sword_manual_scrap', 'essence', 'material'],
    description: 'Minyak tumbuhan harum untuk merawat dan mengilapkan bilah pedang pemula.',
    basePrice: 30,
    priceCurrency: 'silver'
  },
  {
    name: 'Batu Asah Bilah Roh (Tier 2)',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['sword_oil', 'whetstone_spirit', 'broken_blade_shard', 'sword_manual_scrap', 'essence', 'material'],
    description: 'Batu asah spiritual berbutir halus untuk menyatukan niat pendekar dengan pedangnya.',
    basePrice: 85,
    priceCurrency: 'silver'
  },
  {
    name: 'Serpihan Bilah Pendekar Purba (Tier 3)',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['sword_oil', 'whetstone_spirit', 'broken_blade_shard', 'sword_manual_scrap', 'essence', 'material'],
    description: 'Pecahan pedang pusaka yang masih memancarkan niat pedang tajam tanpa padam.',
    basePrice: 220,
    priceCurrency: 'silver'
  },
  {
    name: 'Minyak Jiwa Pedang Giok (Tier 4)',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['sword_oil', 'whetstone_spirit', 'broken_blade_shard', 'sword_manual_scrap', 'essence', 'material'],
    description: 'Minyak esensi langka yang mampu menembus rongga pedang dan membangunkan roh pedang.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Intisari Niat Pedang Surgawi (Tier 5)',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['sword_oil', 'whetstone_spirit', 'broken_blade_shard', 'sword_manual_scrap', 'essence', 'material'],
    description: 'Manifestasi kehendak pedang primordial pembelah tabir dimensi.',
    basePrice: 20,
    priceCurrency: 'gold'
  },

  // ═══════════════════════════════════════════════════════════════
  // 19. RIGHTEOUS FORMATION ARRAY (righteous_formation_array)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Bendera Formasi Angin (Tier 1)',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['array_flag', 'formation_plate', 'spirit_compass', 'essence', 'material'],
    description: 'Bendera sutra kecil bersulam mantra dasar untuk mengatur arah aliran angin formasi.',
    basePrice: 30,
    priceCurrency: 'silver'
  },
  {
    name: 'Lempeng Formasi Tanah Padat (Tier 2)',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['array_flag', 'formation_plate', 'spirit_compass', 'essence', 'material'],
    description: 'Lempeng lempung berukir pola segel pertahanan untuk memusatkan leylines bumi.',
    basePrice: 85,
    priceCurrency: 'silver'
  },
  {
    name: 'Kompas Roh Delapan Arah (Tier 3)',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['array_flag', 'formation_plate', 'spirit_compass', 'essence', 'material'],
    description: 'Kompas tembaga kuno penunjuk simpul meridian langit dan leylines bumi.',
    basePrice: 220,
    priceCurrency: 'silver'
  },
  {
    name: 'Bendera Formasi Bintang Surgawi (Tier 4)',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['array_flag', 'formation_plate', 'spirit_compass', 'essence', 'material'],
    description: 'Bendera formasi bertabur serbuk bintang pemanggil kekuatan konstelasi langit.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Cakram Segel Primordial Hexagram (Tier 5)',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['array_flag', 'formation_plate', 'spirit_compass', 'essence', 'material'],
    description: 'Cakram formasi kuno yang merangkum delapan trigram dan segel semesta semesta.',
    basePrice: 20,
    priceCurrency: 'gold'
  },

  // ═══════════════════════════════════════════════════════════════
  // 20. RIGHTEOUS KARMIC MIRROR (righteous_karmic_mirror)
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Pecahan Cermin Karma Tembaga (Tier 1)',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['karma_mirror_shard', 'judgment_talisman', 'confessional_incense', 'essence', 'material'],
    description: 'Serpihan cermin tembaga antik yang dapat memantulkan noda karma di jiwa fana.',
    basePrice: 30,
    priceCurrency: 'silver'
  },
  {
    name: 'Jimat Penghakiman Dosa (Tier 2)',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['karma_mirror_shard', 'judgment_talisman', 'confessional_incense', 'essence', 'material'],
    description: 'Kertas jimat merah penimbang kebajikan dan dosa yang tertulis dengan tinta cinnabar.',
    basePrice: 85,
    priceCurrency: 'silver'
  },
  {
    name: 'Dupa Pengakuan Dosa Roh (Tier 3)',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['karma_mirror_shard', 'judgment_talisman', 'confessional_incense', 'essence', 'material'],
    description: 'Dupa wangi pembersih belenggu karma masa lalu penenteram batin kultivator.',
    basePrice: 220,
    priceCurrency: 'silver'
  },
  {
    name: 'Cermin Pengawas Takdir Karma (Tier 4)',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['karma_mirror_shard', 'judgment_talisman', 'confessional_incense', 'essence', 'material'],
    description: 'Cermin giok perak yang menyingkap jalinan sebab-akibat tiga kehidupan.',
    basePrice: 5,
    priceCurrency: 'gold'
  },
  {
    name: 'Cermin Jantung Hati Langit Ilahi (Tier 5)',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['karma_mirror_shard', 'judgment_talisman', 'confessional_incense', 'essence', 'material'],
    description: 'Artefak cermin primordial yang murni tanpa setitik pun debu karma ilusi.',
    basePrice: 20,
    priceCurrency: 'gold'
  }
];

function getRankFromTier(tier) {
  if (tier <= 1) return 'Common';
  if (tier === 2) return 'Uncommon';
  if (tier === 3) return 'Rare';
  if (tier === 4) return 'Epic';
  if (tier === 5) return 'Legendary';
  if (tier === 6) return 'Mythical';
  if (tier === 7) return 'Immortal';
  return 'Divine';
}

// ═══════════════════════════════════════════════════════════════
// SPIRIT STONES TIER 1 S/D 8 (spirit_stone_t{N} & breakthrough_material)
// ═══════════════════════════════════════════════════════════════
for (let t = 1; t <= 8; t++) {
  ESSENCE_ITEMS.push({
    name: `Batu Roh Murni (Tier ${t})`,
    category: 'material',
    rank: getRankFromTier(t),
    tier: t,
    tags: ['spirit_stone', 'breakthrough_material', 'essence', 'material', `spirit_stone_t${t}`],
    description: `Batu mineral yang menyimpan konsentrasi Qi murni padat tingkat ${t}, berguna untuk kultivasi dan terobosan ranah.`,
    basePrice: Math.floor(20 * Math.pow(2.2, t - 1)),
    priceCurrency: t <= 2 ? 'copper' : t <= 5 ? 'silver' : 'gold'
  });
}

// ═══════════════════════════════════════════════════════════════
// BREAKTHROUGH CATALYSTS TIER 1 S/D 8 (breakthrough_catalyst_t{N})
// ═══════════════════════════════════════════════════════════════
for (let t = 1; t <= 8; t++) {
  ESSENCE_ITEMS.push({
    name: `Katalis Terobosan Langit (Tier ${t})`,
    category: 'material',
    rank: getRankFromTier(t),
    tier: t,
    tags: ['breakthrough_catalyst', 'catalyst', 'breakthrough_material', 'essence', 'material', `breakthrough_catalyst_t${t}`],
    description: `Katalis spiritual tingkat ${t} yang memicu resonansi dantian untuk merobek pembatas ranah besar (Major Breakthrough).`,
    basePrice: Math.floor(50 * Math.pow(2.5, t - 1)),
    priceCurrency: t <= 2 ? 'copper' : t <= 4 ? 'silver' : 'gold'
  });
}

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
    console.log(`✅ Berhasil seeding/upsert ${upsertedCount} Item Esensi & Material Altar untuk 20 Law.`);

    // Idempotent backfill: Pastikan item existing yang memiliki tag esensi/material memiliki tier numerik
    const missingTierItems = await Item.find({
      $or: [
        { tier: { $exists: false } },
        { tier: null },
        { tier: { $type: 'string' } }
      ]
    });
    let backfilledCount = 0;
    for (const it of missingTierItems) {
      const resolved = resolveItemTier(it);
      it.tier = resolved;
      await it.save();
      backfilledCount++;
    }
    if (backfilledCount > 0) {
      console.log(`✨ Berhasil melakukan backfill tier numerik pada ${backfilledCount} item existing.`);
    }

    // Berikan starter pack item esensi ke karakter Inggo untuk pengujian langsung
    const inggo = await Player.findOne({ discordId: 'google_10398407018507304858_1790425324687' });
    if (inggo) {
      const itemsToFetch = [
        'Larva Serangga Rawa (Tier 1)',
        'Intisari Serangga Gu',
        'Madu Ratu Kalajengking Roh',
        'Kayu Bambu Keras',
        'Batu Kasar Gunung',
        'Herba Tulang Besi',
        'Kristal Petir Azure',
        'Bijih Besi Tempa',
        'Daging Kelinci Roh (Tier 1)',
        'Inti Siluman Kotor',
        'Botol Esensi Darah Segar',
        'Empedu Racun Kalajengking',
        'Batu Obsidian Hitam Abyss',
        'Batu Yin Sembilan Lapis',
        'Segel Jasa Kebajikan (Tier 1)',
        'Kristal Yang Hangat (Tier 2)',
        'Batu Asah Bilah Roh (Tier 2)',
        'Lempeng Formasi Tanah Padat (Tier 2)',
        'Pecahan Cermin Karma Tembaga (Tier 1)'
      ];

      const testItems = [];
      for (const itemName of itemsToFetch) {
        const found = await Item.findOne({ name: itemName });
        if (found) {
          testItems.push({ item: found, qty: 10 });
        }
      }

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
      inggo.currency.copper = Math.max(inggo.currency.copper || 0, 1000);
      inggo.currency.silver = Math.max(inggo.currency.silver || 0, 500);

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

      console.log(`✨ Karakter Inggo berhasil dibekali paket pengujian 20 Law lengkap!`);
    }

    await mongoose.disconnect();
    console.log('🔌 Koneksi MongoDB ditutup. Seeding selesai dengan sempurna.');
  } catch (err) {
    console.error('❌ Gagal menjalankan seeder:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  seed();
}

module.exports = { ESSENCE_ITEMS };
