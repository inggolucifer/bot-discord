/**
 * seedLawMasterEcosystem.js
 * SEEDER MASTER HUKUM SEMESTA (15 CULTIVATION LAWS & SKILL TREES)
 * 
 * Mengisi database:
 * 1. 15 Kitab Manual Hukum Semesta (Category: 'law')
 * 2. Item-item Benda Common (Natal Artifact) & Satwa Common (Natal Beast)
 * 3. 210 Master Definisi Dokumen LawSkillDefinition (14 skill per Law × 15 Law)
 * 
 * Referensi: implementation_plan.md §4, §6, §9
 */

const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Item = require('../models/Item');
const LawSkillDefinition = require('../models/LawSkillDefinition');

const DEFAULT_GUILD_ID = process.env.DEFAULT_GUILD_ID || 'default_guild';

// ═══════════════════════════════════════════════════════════════════════
// 1. DAFTAR 15 KITAB MANUAL HUKUM SEMESTA
// ═══════════════════════════════════════════════════════════════════════
const LAW_MANUAL_ITEMS = [
  // 6 Divine Elemental Laws
  {
    name: 'Kitab Api Nirwana Phoenix',
    lawType: 'element_phoenix_fire',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab pusaka pengendali Api Samadhi dan intisari Burung Phoenix purba. Membakar kotoran fana untuk terlahir kembali.'
  },
  {
    name: 'Kitab Samudra Naga Azure',
    lawType: 'element_azure_water',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab esensi air samudra tak berdasar dan garis keturunan Naga Azure. Lembut mengalir namun mematikan.'
  },
  {
    name: 'Kitab Inti Bumi Xuanwu',
    lawType: 'element_xuanwu_earth',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab fondasi raga tanah sekuat cangkang kura-kura purba Xuanwu yang menopang benua semesta.'
  },
  {
    name: 'Kitab Pohon Hayat Kaisar Hijau',
    lawType: 'element_qingdi_wood',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab kehidupan abadi Pohon Hayat Semesta Kaisar Hijau (Qingdi). Menyembuhkan segala luka batin fana.'
  },
  {
    name: 'Kitab Badai Sayap Roc Sembilan Langit',
    lawType: 'element_roc_wind',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab penguasa angin badai dan kecepatan kilat Burung Raksasa Roc yang membubung 90.000 li.'
  },
  {
    name: 'Kitab Guntur Halilintar Dewa Petir',
    lawType: 'element_godthunder_light',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab penunduk petir murka para dewa penegak hukum langit yang meremukkan segala kejahatan.'
  },

  // 4 Jalur Raga, Gu, Artifact & Beast
  {
    name: 'Kitab Penempaan Raga Suci',
    lawType: 'body_tempering',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab penempaan daging, tulang, dan meridian fana menjadi Tubuh Raga Dewa Iblis Suci berenergi True Qi.'
  },
  {
    name: 'Kitab Rongga Sepuluh Ribu Gu',
    lawType: 'gu_master',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab pembuka Aperture spiritual untuk membudidayakan, memberi pakan, dan memfusikan aneka serangga Gu.'
  },
  {
    name: 'Kitab Ikatan Pusaka Jiwa Kelahiran',
    lawType: 'natal_artifact',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab pengikatan abadi benda fana common apa saja menjadi Pusaka Jiwa Primordial seumur hidup yang bernyawa.'
  },
  {
    name: 'Kitab Sumpah Darah Satwa Roh Purba',
    lawType: 'natal_beast',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab sumpah darah dengan satwa fana common apa saja untuk bermutasi dan berevolusi menjadi Satwa Dewa Purba.'
  },

  // 5 Jalur Demonic Dao Mandiri
  {
    name: 'Kitab Pelebur Inti Siluman Kotor',
    lawType: 'demonic_turbid_core',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab jalur iblis pemurni dan pelahap Qi kotor serta inti monster buas tanpa batas.'
  },
  {
    name: 'Kitab Penghisap Darah & Pemanen Ruh',
    lawType: 'demonic_blood_soul',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab pembantaian jalur iblis penghisap esensi darah fana dan penempa Panji Sembilan Ruh arwah korban.'
  },
  {
    name: 'Kitab Seribu Racun Pemusnah',
    lawType: 'demonic_myriad_venom',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab penempa Tubuh Racun Maut melalui konsumsi aneka racun berbisa ekstrem Jianghu.'
  },
  {
    name: 'Kitab Kontrak Iblis Jurang Abyss',
    lawType: 'demonic_abyssal_pact',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab perjanjian darah dengan para iblis abyssal purba penuntut upeti tumbal berkala.'
  },
  {
    name: 'Kitab Bayangan Sembilan Yin Netherworld',
    lawType: 'demonic_nether_darkness',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab kultivasi Qi gelap Netherworld di liang kubur kuno dan jurang tanpa sinar matahari.'
  }
];

// ═══════════════════════════════════════════════════════════════════════
// 2. ITEM COMMON UNTUK IKATAN PERMANEN (SLOT 2)
// ═══════════════════════════════════════════════════════════════════════
const COMMON_COMPANION_ITEMS = [
  // Benda Fana (Untuk Natal Artifact)
  {
    name: 'Pedang Besi Patah',
    category: 'weapon',
    weaponType: 'sword',
    rank: 'Common',
    tier: 1,
    baseAtk: 5,
    weight: 2,
    basePrice: 30,
    priceCurrency: 'copper',
    canBecomeArtifact: true,
    description: 'Pedang besi usang peninggalan masa lalu yang patah ujungnya namun memiliki mata batin kuat.'
  },
  {
    name: 'Mangkuk Keramik Retak',
    category: 'material',
    rank: 'Common',
    tier: 1,
    weight: 1,
    basePrice: 5,
    priceCurrency: 'copper',
    canBecomeArtifact: true,
    description: 'Mangkuk tanah liat retak sederhana yang sering dipakai mengemis atau minum air kali.'
  },
  {
    name: 'Cermin Kuningan Usang',
    category: 'material',
    rank: 'Common',
    tier: 1,
    weight: 1,
    basePrice: 15,
    priceCurrency: 'copper',
    canBecomeArtifact: true,
    description: 'Cermin kuningan buram warisan leluhur fana yang mampu memantulkan pendar samar.'
  },
  {
    name: 'Kerikil Hitam Kali',
    category: 'material',
    rank: 'Common',
    tier: 1,
    weight: 1,
    basePrice: 2,
    priceCurrency: 'copper',
    canBecomeArtifact: true,
    description: 'Sebuah kerikil sungai hitam bulat licin yang terendam air arus deras selama ratusan tahun.'
  },

  // Satwa Fana (Untuk Natal Beast)
  {
    name: 'Anak Anjing Kampung',
    category: 'material',
    rank: 'Common',
    tier: 1,
    weight: 3,
    basePrice: 50,
    priceCurrency: 'copper',
    beastTokenType: 'dog',
    description: 'Anak anjing liar berbulu cokelat yang setia membuntuti langkah kakimu di pasar desa.'
  },
  {
    name: 'Ular Rumput Hijau',
    category: 'material',
    rank: 'Common',
    tier: 1,
    weight: 1,
    basePrice: 35,
    priceCurrency: 'copper',
    beastTokenType: 'snake',
    description: 'Ular rumput kecil tidak berbisa yang melingkar tenang di pergelangan tanganmu.'
  },
  {
    name: 'Gagak Hitam Liar',
    category: 'material',
    rank: 'Common',
    tier: 1,
    weight: 1,
    basePrice: 25,
    priceCurrency: 'copper',
    beastTokenType: 'crow',
    description: 'Burung gagak hitam bersuara serak yang gemar bertengger di dahan kering makam kuno.'
  },
  {
    name: 'Kucing Hutan Belang',
    category: 'material',
    rank: 'Common',
    tier: 1,
    weight: 2,
    basePrice: 40,
    priceCurrency: 'copper',
    beastTokenType: 'cat',
    description: 'Kucing liar bertubuh ramping dengan cakar lincah pemburu tikus ladang.'
  }
];

// ═══════════════════════════════════════════════════════════════════════
// 3. GENERATOR 210 SKILL TREES (14 SKILL × 15 LAW)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Helper untuk menyusun 14 skill terstruktur per Law
 */
function createLawSkills(lawType, config) {
  const isBody = lawType === 'body_tempering';
  const costType = isBody ? 'true_qi' : 'qi';

  return [
    // TIER 1 (Rank 0-1) — 4 Skills
    {
      skillId: `${lawType}_t1_p1`,
      lawType,
      tier: 1,
      name: config.t1[0].name,
      icon: config.t1[0].icon,
      description: config.t1[0].desc,
      isPassive: true,
      requiredRank: 0,
      costType: 'none',
      baseCost: 0,
      cooldownTurns: 0,
      targetType: 'self'
    },
    {
      skillId: `${lawType}_t1_p2`,
      lawType,
      tier: 1,
      name: config.t1[1].name,
      icon: config.t1[1].icon,
      description: config.t1[1].desc,
      isPassive: true,
      requiredRank: 0,
      costType: 'none',
      baseCost: 0,
      cooldownTurns: 0,
      targetType: 'self'
    },
    {
      skillId: `${lawType}_t1_a1`,
      lawType,
      tier: 1,
      name: config.t1[2].name,
      icon: config.t1[2].icon,
      description: config.t1[2].desc,
      isPassive: false,
      requiredRank: 0,
      costType,
      baseCost: 15,
      cooldownTurns: 3,
      targetType: 'single_enemy',
      damageMultiplier: 1.3
    },
    {
      skillId: `${lawType}_t1_p3`,
      lawType,
      tier: 1,
      name: config.t1[3].name,
      icon: config.t1[3].icon,
      description: config.t1[3].desc,
      isPassive: true,
      requiredRank: 1,
      costType: 'none',
      baseCost: 0,
      cooldownTurns: 0,
      targetType: 'self'
    },

    // TIER 2 (Rank 2-3) — 4 Skills
    {
      skillId: `${lawType}_t2_a1`,
      lawType,
      tier: 2,
      name: config.t2[0].name,
      icon: config.t2[0].icon,
      description: config.t2[0].desc,
      isPassive: false,
      requiredRank: 2,
      costType,
      baseCost: 25,
      cooldownTurns: 6,
      targetType: 'self'
    },
    {
      skillId: `${lawType}_t2_a2`,
      lawType,
      tier: 2,
      name: config.t2[1].name,
      icon: config.t2[1].icon,
      description: config.t2[1].desc,
      isPassive: false,
      requiredRank: 2,
      costType,
      baseCost: 30,
      cooldownTurns: 5,
      targetType: 'all_enemies',
      damageMultiplier: 1.2
    },
    {
      skillId: `${lawType}_t2_a3`,
      lawType,
      tier: 2,
      name: config.t2[2].name,
      icon: config.t2[2].icon,
      description: config.t2[2].desc,
      isPassive: false,
      requiredRank: 3,
      costType,
      baseCost: 20,
      cooldownTurns: 5,
      targetType: 'self'
    },
    {
      skillId: `${lawType}_t2_a4`,
      lawType,
      tier: 2,
      name: config.t2[3].name,
      icon: config.t2[3].icon,
      description: config.t2[3].desc,
      isPassive: false,
      requiredRank: 3,
      costType,
      baseCost: 25,
      cooldownTurns: 4,
      targetType: 'single_enemy',
      damageMultiplier: 1.6
    },

    // TIER 3 (Rank 4-5) — 3 Skills
    {
      skillId: `${lawType}_t3_p1`,
      lawType,
      tier: 3,
      name: config.t3[0].name,
      icon: config.t3[0].icon,
      description: config.t3[0].desc,
      isPassive: true,
      requiredRank: 4,
      costType: 'none',
      baseCost: 0,
      cooldownTurns: 0,
      targetType: 'self'
    },
    {
      skillId: `${lawType}_t3_a1`,
      lawType,
      tier: 3,
      name: config.t3[1].name,
      icon: config.t3[1].icon,
      description: config.t3[1].desc,
      isPassive: false,
      requiredRank: 4,
      costType,
      baseCost: 60,
      cooldownTurns: 10,
      targetType: 'all_enemies',
      damageMultiplier: 1.8
    },
    {
      skillId: `${lawType}_t3_a2`,
      lawType,
      tier: 3,
      name: config.t3[2].name,
      icon: config.t3[2].icon,
      description: config.t3[2].desc,
      isPassive: false,
      requiredRank: 5,
      costType,
      baseCost: 50,
      cooldownTurns: 8,
      targetType: 'all_enemies',
      damageMultiplier: 1.5
    },

    // TIER 4 (Rank 6-7) — 1 Skill
    {
      skillId: `${lawType}_t4_avatar`,
      lawType,
      tier: 4,
      name: config.t4.name,
      icon: config.t4.icon,
      description: config.t4.desc,
      isPassive: false,
      requiredRank: 6,
      costType,
      baseCost: 100,
      cooldownTurns: 15,
      targetType: 'self'
    },

    // TIER 5 (Rank 8) — 2 Skills (1 God Passive + 1 1000% Cataclysm)
    {
      skillId: `${lawType}_t5_god_passive`,
      lawType,
      tier: 5,
      name: config.t5[0].name,
      icon: config.t5[0].icon,
      description: config.t5[0].desc,
      isPassive: true,
      requiredRank: 8,
      costType: 'none',
      baseCost: 0,
      cooldownTurns: 0,
      targetType: 'self'
    },
    {
      skillId: `${lawType}_t5_cataclysm`,
      lawType,
      tier: 5,
      name: config.t5[1].name,
      icon: config.t5[1].icon,
      description: config.t5[1].desc,
      isPassive: false,
      requiredRank: 8,
      costType,
      baseCost: 180,
      cooldownTurns: 20,
      targetType: 'single_enemy',
      damageMultiplier: 10.0
    }
  ];
}

// 15 Konfigurasi Lengkap Sesuai Dokumen Perencanaan
const ALL_LAW_CONFIGS = {
  // 1. Api Phoenix
  element_phoenix_fire: {
    t1: [
      { name: 'Percikan Nyala Batin', icon: '🔥', desc: 'Pasif: Meningkatkan Fire DMG +5% per level.' },
      { name: 'Selubung Bulu Phoenix', icon: '🪶', desc: 'Pasif: Meningkatkan Spiritual RES Api +10 dan kebal efek Freeze.' },
      { name: 'Cakar Pembakar Phoenix', icon: '🦅', desc: 'Menyerang dengan 130% Fire DMG dengan 40% peluang status Burn.' },
      { name: 'Perisai Api Balasan', icon: '🛡️', desc: 'Pasif: 10% peluang membalas serangan dengan 30% ledakan api.' }
    ],
    t2: [
      { name: 'Kobaran Api Nirwana', icon: '💥', desc: 'Mengorbankan 15% HP untuk meningkatkan ATK sebesar +40% selama 3 ronde.' },
      { name: 'Raungan Kawah Vulkanik', icon: '🌋', desc: 'AoE Fear: 25% peluang membuat musuh melewatkan giliran.' },
      { name: 'Penyembuhan Samadhi', icon: '🩸', desc: 'Memulihkan 15% Max HP dan menghapus efek Bleed.' },
      { name: 'Tusukan Meteor Cakar', icon: '☄️', desc: 'Menyerang dengan 170% Fire DMG dan menghancurkan 50% Stance musuh.' }
    ],
    t3: [
      { name: 'Kemuliaan Kaisar Api', icon: '👑', desc: 'Pasif: Fire DMG +15% dan Crit DMG +10% per level.' },
      { name: 'Domain Api Penyucian', icon: '🔥', desc: 'Membakar seluruh musuh sebesar 8% Max HP per ronde selama 5 ronde.' },
      { name: 'Sembilan Bulu Membara', icon: '🪽', desc: 'Meluncurkan 9 proyektil bulu api spektral masing-masing 35% DMG.' }
    ],
    t4: { name: 'Penjelmaan Phoenix Suci', icon: '🌅', desc: 'Berubah menjadi Burung Phoenix Sejati 8 ronde: Fire DMG ×2, serangan splash AoE.' },
    t5: [
      { name: 'Kebangkitan Nirwana Abadi', icon: '🌌', desc: 'Pasif: Saat tewas, bangkit seketika dengan 35% Max HP dan ledakan 300% AoE (1× per battle).' },
      { name: 'Kemurkaan Nirwana Pembakar Langit', icon: '☀️', desc: 'Serangan 1000% Fire DMG murni ke satu target dan membakar tanah pertempuran permanen.' }
    ]
  },

  // 2. Air Naga Azure
  element_azure_water: {
    t1: [
      { name: 'Aliran Samudra Azure', icon: '💧', desc: 'Pasif: Water DMG +5% dan SPD +3% per level.' },
      { name: 'Meditasi Palung Glasier', icon: '🌊', desc: 'Pasif: Perolehan Qi di zona air meningkat +12% per level.' },
      { name: 'Terkaman Arus Naga', icon: '🐉', desc: 'Menyerang dengan 130% Water DMG dan menyerap 10% damage sebagai HP.' },
      { name: 'Cermin Kabut Air', icon: '🛡️', desc: 'Pasif: 10% peluang menghindar dan memperlambat musuh -20% SPD.' }
    ],
    t2: [
      { name: 'Zirah Es Abadi', icon: '❄️', desc: 'Memperoleh perisai es 20% Max HP; musuh penyerang diperlambat -20% SPD.' },
      { name: 'Gelombang Pasang Tsunami', icon: '🌊', desc: 'AoE 120% Water DMG dengan 30% peluang memundurkan giliran musuh.' },
      { name: 'Mata Air Penyembuh Laut', icon: '💙', desc: 'Memulihkan 5% Max HP per ronde selama 4 ronde.' },
      { name: 'Tusukan Trisula Es', icon: '🧊', desc: 'Menyerang dengan 160% Water DMG dengan 35% peluang Freeze Stun 1 ronde.' }
    ],
    t3: [
      { name: 'Kedaulatan Samudra Utara', icon: '👑', desc: 'Pasif: Water DMG +15% dan efektivitas healing +12% per level.' },
      { name: 'Domain Laut Glasier Abyssal', icon: '🌀', desc: 'Membekukan seluruh musuh 1 ronde; damage air meningkat +30% sisa pertempuran.' },
      { name: 'Panggilan Tiga Naga Air', icon: '🐉', desc: 'Tiga naga air purba menghantam musuh masing-masing 65% DMG.' }
    ],
    t4: { name: 'Wujud Avatar Naga Azure Purba', icon: '🌊', desc: 'Berubah menjadi Naga Azure 8 ronde: Seluruh stat ×1.8, basic attack splash 50% damage.' },
    t5: [
      { name: 'Jantung Naga Samudra Purba', icon: '🌌', desc: 'Pasif: Serangan fatal dinegasikan dan diubah menjadi Perisai Air 50% Max HP (1× per battle).' },
      { name: 'Bencana Sembilan Samudra Naga Azure', icon: '🌊', desc: 'Hantaman tsunami dahsyat 1000% Water DMG ke target + 300% splash AoE + hapus semua buff musuh.' }
    ]
  },

  // 3. Tanah Xuanwu
  element_xuanwu_earth: {
    t1: [
      { name: 'Inti Pegunungan Karang', icon: '🗿', desc: 'Pasif: Earth DMG +5% dan DEF +6 per level.' },
      { name: 'Harmoni Urat Bumi Leylines', icon: '🪨', desc: 'Pasif: Perolehan Qi dan hasil tambang meningkat +10% per level.' },
      { name: 'Tinju Penghancur Granit', icon: '👊', desc: 'Menyerang dengan 140% Earth DMG dan 35% Stance DMG.' },
      { name: 'Cangkang Xuanwu Kebal', icon: '🛡️', desc: 'Pasif: 12% peluang mengurangi serangan fisik musuh menjadi 0.' }
    ],
    t2: [
      { name: 'Benteng Karang Kokoh', icon: '🏔️', desc: 'Memperoleh perisai batu 30% Max HP; kebal efek knockback 4 ronde.' },
      { name: 'Hentakan Gempa Bumi', icon: '🌋', desc: 'AoE 120% Earth DMG dengan 35% peluang Stun 1 ronde.' },
      { name: 'Regenerasi Sumsum Batu', icon: '💎', desc: 'Mengonversi 10% DEF menjadi pemulihan HP setiap ronde.' },
      { name: 'Tusukan Stalagmit Tajam', icon: '🪨', desc: 'Menyerang dengan 165% Earth DMG dan mengabaikan 30% DEF lawan.' }
    ],
    t3: [
      { name: 'Keagungan Penguasa Gunung', icon: '👑', desc: 'Pasif: Earth DMG +15% dan DEF +15% per level.' },
      { name: 'Benteng Xuanwu Tak Tergoyahkan', icon: '🏰', desc: 'Mereduksi seluruh damage masuk sebesar 40% untuk sisa pertempuran.' },
      { name: 'Empat Pilar Gempa Dahsyat', icon: '🪨', desc: 'Empat pilar batu menghantam musuh 55% DMG masing-masing dan mengakar musuh 2 ronde.' }
    ],
    t4: { name: 'Penjelmaan Titan Xuanwu', icon: '🐢', desc: 'Wujud Xuanwu Purba 8 ronde: DEF ×2.2, memantulkan 80% DEF sebagai damage balasan.' },
    t5: [
      { name: 'Aegis Lempeng Benua Abadi', icon: '🌌', desc: 'Pasif: Damage maksimal dalam 1 hit dibatasi 25% Max HP; kebal serangan critical.' },
      { name: 'Bencana Gempa Bumi Pemusnah Primordial', icon: '🌋', desc: '1000% Earth DMG ke target + hancurkan Stance bar seketika + Stun 2 ronde.' }
    ]
  },

  // 4. Kayu Qingdi
  element_qingdi_wood: {
    t1: [
      { name: 'Daya Hidup Rimba Hijau', icon: '🌿', desc: 'Pasif: Wood DMG +5% dan Max HP +20 per level.' },
      { name: 'Siklus Pohon Tanpa Akhir', icon: '🍃', desc: 'Pasif: Qi gathering herba +12% per level; batas usia Lifespan ×1.5.' },
      { name: 'Cambuk Duri Pengikat', icon: '🎋', desc: 'Menyerang dengan 125% Wood DMG dan menyerap 15% damage menjadi HP.' },
      { name: 'Kulit Kayu Penolak Racun', icon: '🛡️', desc: 'Pasif: 10% peluang menyerap pukulan musuh dan memulihkan 5% HP.' }
    ],
    t2: [
      { name: 'Aura Bunga Penawar Racun', icon: '🌸', desc: 'Menghapus seluruh debuff diri dan memulihkan 8% HP per ronde selama 3 ronde.' },
      { name: 'Penyebaran Spora Pembungkam', icon: '🌾', desc: 'AoE 100% Wood DMG dengan 40% peluang membungkam skill musuh selama 2 ronde.' },
      { name: 'Getah Pohon Keabadian', icon: '💚', desc: 'Pasif: Bangkit dengan 25% HP saat menerima serangan fatal (cd 24 jam).' },
      { name: 'Lembing Semak Berduri', icon: '🌿', desc: 'Menyerang dengan 155% Wood DMG dan menyerap 5% HP musuh setiap ronde.' }
    ],
    t3: [
      { name: 'Kemegahan Kaisar Hijau Qingdi', icon: '👑', desc: 'Pasif: Wood DMG +15% dan HP Regen +20% per level.' },
      { name: 'Domain Rimba Purba Semesta', icon: '🌲', desc: 'Semua skill kayu hemat -50% Qi; memulihkan 10% HP setiap ronde.' },
      { name: 'Seribu Sulur Kayu Pembelit', icon: '🎋', desc: '5 cambukan sulur masing-masing 45% DMG dan melumpuhkan pergerakan musuh.' }
    ],
    t4: { name: 'Mekarnya Pohon Hayat Semesta', icon: '🌳', desc: 'Wujud Qingdi 8 ronde: HP regens 25% per ronde, sekutu +50% ATK, wood damage ×2.' },
    t5: [
      { name: 'Akar Tak Terputus Kaisar Hijau', icon: '🌌', desc: 'Pasif: Kerusakan fatal memotong Qi alih-alih HP; kebal terhadap racun dan kutukan penuaan.' },
      { name: 'Penciptaan & Pemusnahan Sepuluh Ribu Pohon', icon: '🌸', desc: '1000% Wood life-drain blast ke target + pulihkan seluruh HP pemain dan sekutu ke 100%.' }
    ]
  },

  // 5. Angin Roc
  element_roc_wind: {
    t1: [
      { name: 'Luncuran Sayap Badai Roc', icon: '🦅', desc: 'Pasif: Wind DMG +5% dan Agility +5 per level.' },
      { name: 'Kepakan Sayap Sembilan Puluh Ribu Li', icon: '🪶', desc: 'Pasif: Kecepatan jelajah peta +15% dan konsumsi stamina langkah -10%.' },
      { name: 'Bilah Bulu Badai Tajam', icon: '🌪️', desc: 'Menyerang 125% Wind DMG; pasti CRIT jika SPD pemain lebih tinggi dari musuh.' },
      { name: 'Selubung Angin Penghindar', icon: '🛡️', desc: 'Pasif: 10% peluang menghindar penuh dan memperoleh +10% SPD tambahan.' }
    ],
    t2: [
      { name: 'Langkah Bayangan Halimun', icon: '💨', desc: 'Evasion +40% selama 3 ronde; basic attack memukul 2 kali beruntun.' },
      { name: 'Pusaran Angin Topan', icon: '🌪️', desc: 'AoE 130% Wind DMG dan menurunkan akurasi musuh -30% selama 2 ronde.' },
      { name: 'Hembusan Angin Pemulih Raga', icon: '🍃', desc: 'Mengonversi 15% Agility menjadi pemulihan HP selama 3 ronde.' },
      { name: 'Bilah Pedang Sonik Taufan', icon: '🗡️', desc: 'Menyerang 165% Wind DMG dengan 30% peluang Bleed selama 3 ronde.' }
    ],
    t3: [
      { name: 'Sayap Penguasa Sembilan Langit', icon: '👑', desc: 'Pasif: Wind DMG +15% dan Evasion +10% per level.' },
      { name: 'Domain Mata Badai Abadi', icon: '🌌', desc: 'Memperoleh 100% Evasion selama 2 ronde; semua jurus angin memukul dua kali.' },
      { name: 'Hujan Seribu Bulu Badai', icon: '🦅', desc: '8 proyektil bulu angin menghujam musuh masing-masing 30% DMG.' }
    ],
    t4: { name: 'Burung Roc Melintasi Sembilan Langit', icon: '🦅', desc: 'Wujud Roc Kuno 8 ronde: SPD ×2.5, serangan memukul 3 kali, tembus 50% DEF musuh.' },
    t5: [
      { name: 'Elang Kehampaan Tak Tersentuh', icon: '🌌', desc: 'Pasif: Otomatis menghindar dari 2 serangan pertama dalam duel; selalu menyerang giliran pertama.' },
      { name: 'Selaman Pembelah Langit Burung Roc Purba', icon: '🌪️', desc: 'Menghilang ke void 1 ronde lalu menukik dengan 1000% Wind DMG + 100% Stun 2 ronde.' }
    ]
  },

  // 6. Petir Dewa
  element_godthunder_light: {
    t1: [
      { name: 'Lengkungan Petir Langit', icon: '⚡', desc: 'Pasif: Lightning DMG +5% dan Crit Rate +3% per level.' },
      { name: 'Tempaan Halilintar Tubuh', icon: '🌩️', desc: 'Pasif: Resistensi petir +15% per level; membangun muatan listrik statis.' },
      { name: 'Kilatan Busur Petir Ungu', icon: '⚡', desc: 'Menyerang 135% Lightning DMG dengan percikan 25% ke musuh sekitar.' },
      { name: 'Perisai Muatan Statis', icon: '🛡️', desc: 'Pasif: 10% peluang melumpuhkan penyerang jarak dekat selama 1 ronde.' }
    ],
    t2: [
      { name: 'Jubah Guntur Langit Biru', icon: '⚡', desc: 'Crit Rate +35% dan Crit DMG +50% selama 3 ronde.' },
      { name: 'Sambaran Halilintar Sembilan Langit', icon: '🌩️', desc: 'AoE 140% Lightning DMG dengan 30% peluang Paralyze Stun 1 ronde.' },
      { name: 'Pelepasan Beban Meridian', icon: '⚡', desc: 'Mengonversi muatan statis menjadi 20% Qi dan 15% HP pemulihan.' },
      { name: 'Tombak Hukuman Dewa Petir', icon: '⚡', desc: 'Menyerang 175% Lightning DMG mengabaikan 40% DEF dan Spiritual RES lawan.' }
    ],
    t3: [
      { name: 'Wibawa Penguasa Halilintar Dewa', icon: '👑', desc: 'Pasif: Lightning DMG +15% dan Crit DMG +15% per level.' },
      { name: 'Domain Hukuman Tribulasi Langit', icon: '⚡', desc: 'Setiap ronde sambaran petir acak menyambar musuh 80% DMG; petir +40% DMG.' },
      { name: 'Pengadilan Sembilan Sambaran Petir', icon: '🌩️', desc: '9 kilat sambaran beruntun menghantam target masing-masing 40% DMG.' }
    ],
    t4: { name: 'Wujud Penjelmaan Dewa Petir Langit', icon: '⚡', desc: 'Wujud Dewa Petir 8 ronde: Seluruh damage diubah menjadi True Damage tembus zirah, Crit Rate 100%.' },
    t5: [
      { name: 'Penguasa Tribulasi Langit Tertinggi', icon: '🌌', desc: 'Pasif: Menyerap 50% damage sihir elemen musuh menjadi HP; kebal Stun dan Paralyze.' },
      { name: 'Kemurkaan Sembilan Langit Tribulasi Primordial', icon: '⚡', desc: 'Sambaran guntur primordial 1000% True Damage ke target + 400% AoE flash ke semua musuh.' }
    ]
  },

  // 7. Body Tempering (True Qi)
  body_tempering: {
    t1: [
      { name: 'Kulit Fana Sekuat Kayu Besi', icon: '💪', desc: 'Pasif: Physical DEF +10 dan Max HP +30 per level.' },
      { name: 'Sirkulasi True Qi Meridian', icon: '🔥', desc: 'Pasif: Regenerasi True Qi +3 per ronde tempur; Vitality +5 per level.' },
      { name: 'Tinju Raga Bertenaga Lembu', icon: '👊', desc: 'Pukulan fisik bertenaga 140% True Qi DMG; memulihkan +5 True Qi saat mendarat.' },
      { name: 'Otot Baja Penangkis Bilah', icon: '🛡️', desc: 'Pasif: 12% peluang mengurangi damage fisik lawan sebesar 50%.' }
    ],
    t2: [
      { name: 'Pelepasan True Qi Berkobar', icon: '💥', desc: 'Membakar True Qi untuk meningkatkan ATK fisik +50% dan Stance DMG +50% selama 3 ronde.' },
      { name: 'Hentakan Kaki Pemecah Tanah', icon: '🦶', desc: 'AoE 130% Physical DMG dan menghancurkan Stance bar semua musuh aktif.' },
      { name: 'Pemurnian Darah Panas', icon: '🩸', desc: 'Memulihkan 20% Max HP dan menghapus semua efek debuff fisik.' },
      { name: 'Tinju Penghancur Tulang', icon: '🥊', desc: 'Hantaman keras 170% Physical DMG dan melumpuhkan target 1 ronde.' }
    ],
    t3: [
      { name: 'Keagungan Raga Emas Vajra', icon: '👑', desc: 'Pasif: HP +20% dan DEF +20% per level.' },
      { name: 'Domain Tinju Mengguncang Gunung', icon: '🏰', desc: 'Kebal segala status Stun dan Knockback; Physical DMG +40% untuk sisa pertempuran.' },
      { name: 'Seribu Bogem Mentah Beruntun', icon: '👊', desc: 'Hujanan 10 pukulan bertubi-tubi masing-masing 35% Physical DMG.' }
    ],
    t4: { name: 'Wujud Tirani Tubuh Dewa Iblis', icon: '👹', desc: 'Wujud Tirani 8 ronde: HP dan DEF ×2.5, serangan tangan kosong memicu ledakan gelombang kejut.' },
    t5: [
      { name: 'Raga Abadi Tak Terhancurkan Vajra', icon: '🌌', desc: 'Pasif: Pemain tidak dapat dibunuh dalam 3 ronde pertama pertempuran; kebal debuff fisik.' },
      { name: 'Pukulan Tunggal Penghancur Jagat Raya', icon: '💥', desc: 'Hantaman tinju tunggal 1000% True Qi Physical DMG murni yang membelah ruang hampa.' }
    ]
  },

  // 8. Gu Master
  gu_master: {
    t1: [
      { name: 'Keahlian Merawat Cacing Gu', icon: '🐛', desc: 'Pasif: Efisiensi pakan cacing Gu meningkat +10% per level.' },
      { name: 'Pelebaran Rongga Aperture', icon: '🔬', desc: 'Pasif: Kapasitas tampung rongga Gu meningkat +10% per level.' },
      { name: 'Sengatan Bisa Serangga Gu', icon: '💀', desc: 'Menyerang dengan 130% Poison DMG gabungan praktisi dan Gu.' },
      { name: 'Cangkang Pelindung Koloni Gu', icon: '🛡️', desc: 'Pasif: 10% peluang cacing Gu menyerap 40% damage untuk pemain.' }
    ],
    t2: [
      { name: 'Akselerasi Fusi Sepuluh Ribu Gu', icon: '🔄', desc: 'Pasif: Peluang keberhasilan fusi Gu meningkat +5% per level.' },
      { name: 'Keluaran Kawanan Gu Buas', icon: '🕷️', desc: 'AoE 120% Poison DMG; 25% peluang membuat musuh panik melewatkan giliran.' },
      { name: 'Sedotan Intisari Hayat Mangsa', icon: '💊', desc: 'Menghisap 15% damage musuh sebagai pemulihan HP pemain.' },
      { name: 'Semprotan Bisa Asam Hibrida', icon: '🧬', desc: 'Menyerang dengan 160% Elemental Poison DMG dan merusak zirah musuh.' }
    ],
    t3: [
      { name: 'Dominasi Raja Gu Tertinggi', icon: '👑', desc: 'Pasif: Pengganda stat Gu tertinggi meningkat +15% per level.' },
      { name: 'Simbiosis Koloni Gu Batin', icon: '🌑', desc: 'Memadukan koloni Gu ke dalam raga: seluruh stat ×1.3 untuk sisa pertempuran.' },
      { name: 'Serbuan Gelombang Kawanan Gu', icon: '🔮', desc: '3 gelombang kawanan Gu menyerbu musuh masing-masing 60% DMG.' }
    ],
    t4: { name: 'Metamorfosis Gu Primordial Legendaris', icon: '🦂', desc: 'Fusi penuh dengan Gu Raja 8 ronde: Seluruh stat ×2, racun menembus kekebalan musuh.' },
    t5: [
      { name: 'Leluhur Rongga Gu Primordial Abadi', icon: '🌌', desc: 'Pasif: Serangga Gu kebal mati dalam tempur; peluang fusi Gu menjadi 100% sempurna.' },
      { name: 'Mulut Menelan Langit Laksa Cacing Gu', icon: '🕸️', desc: 'Serangan telan 1000% Single Target Devouring DMG gabungan pemain dan kawanan Gu.' }
    ]
  },

  // 9. Natal Soul Artifact
  natal_artifact: {
    t1: [
      { name: 'Penguasaan Infus Qi Pusaka', icon: '⚒️', desc: 'Pasif: Kecepatan pengisian bar infus pusaka meningkat +10% per level.' },
      { name: 'Resonansi Jiwa dengan Benda Fana', icon: '🔗', desc: 'Pasif: Bonus stat dari pusaka jiwa meningkat +5% per level.' },
      { name: 'Serangan Padu Bilah Pusaka', icon: '⚔️', desc: 'Pemain dan pusaka menyerang bersama menghasilkan 100%+60% DMG.' },
      { name: 'Perisai Runa Penangkis Pusaka', icon: '🛡️', desc: 'Pasif: 10% peluang pusaka menangkis pukulan penuh untuk pemain.' }
    ],
    t2: [
      { name: 'Orbit Pusaka Melayang Otonom', icon: '🔄', desc: 'Pusaka terbang menyerang mandiri setiap putaran selama 4 ronde.' },
      { name: 'Gelombang Getaran Runa Batin', icon: '🌟', desc: 'AoE 120% Sonic DMG dan 25% peluang mengacaukan konsentrasi jurus musuh.' },
      { name: 'Penyerap Intisari Senjata Lawan', icon: '🔮', desc: 'Mengubah 15% damage pukulan menjadi pengisian Qi Dantian.' },
      { name: 'Tebasan Pedang Melayang Beruntun', icon: '🧲', desc: 'Pusaka melesat cepat menghasilkan 160% Slash DMG menembus blokir.' }
    ],
    t3: [
      { name: 'Keagungan Pusaka Rohani Sejati', icon: '👑', desc: 'Pasif: Pengganda atribut pusaka meningkat +15% per level.' },
      { name: 'Penyatuan Raga dan Bilah Pusaka', icon: '🗡️', desc: 'Pemain menyatu dengan pusaka: seluruh stat ×1.3 untuk sisa pertempuran.' },
      { name: 'Panggilan Ribuan Bayangan Pusaka', icon: '⚡', desc: '3 bayangan pusaka spektral menghujam musuh masing-masing 60% DMG.' }
    ],
    t4: { name: 'Resonansi Jiwa Pusaka Legendaris', icon: '⚔️', desc: 'Fusi murni 8 ronde: Seluruh parameter tempur ×2, pusaka melancarkan serangan pasif setiap detik.' },
    t5: [
      { name: 'Pusaka Primordial Chaos Bernyawa', icon: '🌌', desc: 'Pasif: Pusaka tidak dapat hancur; membangkitkan pemain dengan 20% HP jika pemain tumbang.' },
      { name: 'Tebasan Pembelah Langit dan Bumi Purba', icon: '🗡️', desc: '1000% True Single Target Cleave DMG mengabaikan 100% DEF dan zirah pelindung lawan.' }
    ]
  },

  // 10. Natal Beast Companion
  natal_beast: {
    t1: [
      { name: 'Ikatan Batin Satwa Roh', icon: '🐾', desc: 'Pasif: Multiplier stat satwa pendamping meningkat +5% per level.' },
      { name: 'Efisiensi Pemberian Pakan Roh', icon: '🍖', desc: 'Pasif: Nilai nutrisi pakan satwa meningkat +10% per level.' },
      { name: 'Serangan Serentak Satwa & Pendekar', icon: '🐺', desc: 'Pemain dan satwa menyerang bersama menghasilkan 100%+60% DMG.' },
      { name: 'Naluri Pelindung Satwa Setia', icon: '🛡️', desc: 'Pasif: 10% peluang satwa memasang badan menahan damage untuk pemain.' }
    ],
    t2: [
      { name: 'Mutasi Wujud Fisik Siluman', icon: '🔄', desc: 'Satwa bertransformasi menjadi wujud buas berukuran besar selama 4 ronde.' },
      { name: 'Raungan Buas Raja Hutan Purba', icon: '🐉', desc: 'AoE Fear: 25% peluang membuat musuh melewatkan gilirannya.' },
      { name: 'Tautan Jiwa Simbiotik', icon: '❤️', desc: 'Membagi 15% efek pemulihan HP antara satwa dan pemain.' },
      { name: 'Semburan Napas Elemen Satwa', icon: '🔥', desc: 'Satwa menyemburkan 150% Elemental Breath DMG ke barisan musuh.' }
    ],
    t3: [
      { name: 'Kenaikan Pangkat Tetua Satwa Roh', icon: '👑', desc: 'Pasif: Pengganda atribut satwa meningkat +15% per level.' },
      { name: 'Jiwa Manunggal Satwa dan Pendekar', icon: '🌟', desc: 'Transformasi permanen hingga akhir pertempuran: seluruh stat ×1.3.' },
      { name: 'Panggilan Kawanan Satwa Purba', icon: '🐲', desc: '3 satwa spektral menerjang musuh masing-masing menghasilkan 60% DMG.' }
    ],
    t4: { name: 'Fusi Sempurna Satwa Dewa Mitologi', icon: '🐉', desc: 'Fusi sejati pemain dan satwa 8 ronde: Seluruh stat ×2, serangan memiliki efek ganda.' },
    t5: [
      { name: 'Dewa Satwa Primordial Abadi', icon: '🌌', desc: 'Pasif: Satwa kebal mati dalam tempur; bangkit dengan 20% HP setelah 2 ronde jika tumbang.' },
      { name: 'Raungan Langit dan Bumi Satwa Purba', icon: '🐲', desc: 'Serangan gabungan dahsyat 1000% DMG ke target tunggal yang mengguncang dunia.' }
    ]
  },

  // 11. Demonic: Turbid Beast Core
  demonic_turbid_core: {
    t1: [
      { name: 'Penyedot Hawa Siluman Keruh', icon: '🌪️', desc: 'Pasif: Dark DMG +5% dan efisiensi serap inti monster +10% per level.' },
      { name: 'Ketahanan Racun Miasma', icon: '☣️', desc: 'Pasif: Resistensi terhadap hawa kotor +15% per level.' },
      { name: 'Pukulan Tinju Baleful Turbid', icon: '👊', desc: 'Menyerang 130% Dark DMG dengan 30% peluang menurunkan ATK musuh.' },
      { name: 'Kabut Pelindung Hawa Kotor', icon: '🛡️', desc: 'Pasif: 10% peluang membutakan musuh saat diserang.' }
    ],
    t2: [
      { name: 'Peleburan Inti Monster Spontan', icon: '🔥', desc: 'Membakar inti kotor untuk meningkatkan Crit Rate +30% selama 3 ronde.' },
      { name: 'Ledakan Gelombang Baleful Miasma', icon: '💥', desc: 'AoE 130% Dark DMG dan mengurangi DEF semua musuh sebesar 20%.' },
      { name: 'Pemulihan Inti Siluman Batin', icon: '🩸', desc: 'Mengubah hawa kotor terserap menjadi 15% HP pemulihan instan.' },
      { name: 'Cakar Penghancur Dantian Siluman', icon: '🦅', desc: 'Menyerang 165% Dark DMG dan menguras 20 Qi milik musuh.' }
    ],
    t3: [
      { name: 'Kekuasaan Raja Pelebur Inti', icon: '👑', desc: 'Pasif: Dark DMG +15% dan penyerapan Qi monster +20% per level.' },
      { name: 'Domain Kawah Hawa Keruh Abadi', icon: '🌑', desc: 'Semua musuh terkena korosi 6% HP per ronde; Dark DMG meningkat +35%.' },
      { name: 'Ledakan Tiga Inti Siluman Buas', icon: '🔮', desc: '3 ledakan inti monster buas menghantam musuh masing-masing 60% DMG.' }
    ],
    t4: { name: 'Penjelmaan Dewa Iblis Siluman Chaos', icon: '👹', desc: 'Wujud Siluman Chaos 8 ronde: ATK dan DEF ×2, serangan memicu korosi pertahanan musuh.' },
    t5: [
      { name: 'Leluhur Inti Siluman Primordial', icon: '🌌', desc: 'Pasif: Kebal terhadap serangan monster tipe Beast; menyerap 30% serangan beast menjadi HP.' },
      { name: 'Peleburan Jagat Raya Inti Siluman Purba', icon: '🌋', desc: '1000% Dark Devouring DMG ke target tunggal dan menyerap 50% damage menjadi HP diri.' }
    ]
  },

  // 12. Demonic: Blood & Soul Devouring
  demonic_blood_soul: {
    t1: [
      { name: 'Pencium Aroma Darah Segar', icon: '🩸', desc: 'Pasif: Lifesteal +5% dan Blood DMG +5% per level.' },
      { name: 'Panen Esensi Jiwa Terlantar', icon: '👻', desc: 'Pasif: Memperoleh tambahan Qi setiap kali mengalahkan musuh.' },
      { name: 'Tusukan Belati Pencabut Nyawa', icon: '🗡️', desc: 'Menyerang 130% Blood DMG dan memulihkan 20% damage sebagai HP.' },
      { name: 'Perisai Darah Pelindung Batin', icon: '🛡️', desc: 'Pasif: 10% peluang mengubah luka yang diterima menjadi darah pemulih.' }
    ],
    t2: [
      { name: 'Pelepasan Panji Sembilan Ruh', icon: '🚩', desc: 'Memanggil arwah penasaran meningkatkan ATK +45% selama 3 ronde.' },
      { name: 'Lautan Darah Mendidih Shura', icon: '🌊', desc: 'AoE 130% Blood DMG dan menyebabkan efek Bleed hebat selama 3 ronde.' },
      { name: 'Hisapan Darah Jantung Lawan', icon: '💉', desc: 'Menghisap darah musuh menghasilkan 160% DMG dan memulihkan 25% HP.' },
      { name: 'Jeratan Rantai Arwah Penasaran', icon: '⛓️', desc: 'Mengikat arwah target menghasilkan 140% DMG dan Stun 1 ronde.' }
    ],
    t3: [
      { name: 'Kaisar Asura Laut Darah', icon: '👑', desc: 'Pasif: Lifesteal +15% dan Blood DMG +15% per level.' },
      { name: 'Domain Neraka Sembilan Panji Ruh', icon: '🩸', desc: 'Menghidupkan bayangan arwah musuh yang gugur untuk menyerang lawan.' },
      { name: 'Badai Arwah Pencabut Sukma', icon: '🌪️', desc: 'Hentakan ribuan arwah panji menyerang musuh masing-masing 60% DMG.' }
    ],
    t4: { name: 'Penjelmaan Raja Asura Haus Darah', icon: '👹', desc: 'Wujud Asura 8 ronde: Lifesteal 100%, kecepatan serang berlipat ganda, kebal rasa sakit.' },
    t5: [
      { name: 'Leluhur Abadi Laut Darah Shura', icon: '🌌', desc: 'Pasif: Selama ada musuh yang berdarah di arena, pemain tidak dapat mati (kebal fatal damage).' },
      { name: 'Pemusnahan Sukma Sembilan Neraka Darah', icon: '🩸', desc: '1000% Pure Blood Devastation DMG ke satu target + cabut jiwa musuh seketika.' }
    ]
  },

  // 13. Demonic: Myriad Venom
  demonic_myriad_venom: {
    t1: [
      { name: 'Pengecap Aneka Racun Maut', icon: '🧪', desc: 'Pasif: Poison DMG +5% dan toleransi racun meningkat +10% per level.' },
      { name: 'Kantung Bisa Kulit Hitam', icon: '🐍', desc: 'Pasif: Kebal terhadap racun biasa; memancarkan aura racun tipis.' },
      { name: 'Semprotan Jarum Bisa Korosif', icon: '🎯', desc: 'Menyerang 125% Poison DMG dengan 50% peluang racun tumpuk.' },
      { name: 'Sisik Ular Berbisa Pelindung', icon: '🛡️', desc: 'Pasif: 12% peluang meracuni musuh yang menyerang jarak dekat.' }
    ],
    t2: [
      { name: 'Pelepasan Kabut Seribu Bisa', icon: '💨', desc: 'Membakar racun batin meningkatkan ATK +35% dan melipatgandakan DoT racun 3 ronde.' },
      { name: 'Hujan Racun Asam Korosi Zirah', icon: '🌧️', desc: 'AoE 120% Poison DMG dan menghancurkan 25% DEF semua musuh aktif.' },
      { name: 'Penawar Bisa Racun Menjadi Qi', icon: '🍶', desc: 'Menetralisir racun di dalam tubuh menjadi 20% pemulihan HP dan Qi.' },
      { name: 'Tusukan Taring Ular Hitam Maut', icon: '🐍', desc: 'Menyerang 165% Poison DMG dan melumpuhkan saraf musuh 1 ronde.' }
    ],
    t3: [
      { name: 'Raja Penguasa Selaksa Racun', icon: '👑', desc: 'Pasif: Poison DMG +15% dan durasi racun bertambah +2 ronde.' },
      { name: 'Domain Kawah Racun Kiamat Semesta', icon: '☠️', desc: 'Seluruh musuh kehilangan 10% Max HP per ronde; musuh tidak dapat menerima heal.' },
      { name: 'Panggilan Tiga Naga Racun Purba', icon: '🐉', desc: '3 naga racun asam menyembur musuh masing-masing 60% DMG.' }
    ],
    t4: { name: 'Tubuh Tirani Sembilan Belas Racun Suci', icon: '🦂', desc: 'Wujud Racun Kiamat 8 ronde: Kebal seluruh status, basic attack menginfeksi racun korosif mematikan.' },
    t5: [
      { name: 'Penguasa Racun Kiamat Primordial Abadi', icon: '🌌', desc: 'Pasif: Semua efek racun pemain menjadi True Damage yang tidak dapat dikurangi zirah atau mantra.' },
      { name: 'Bencana Racun Pemusnah Kehidupan Jagat', icon: '☠️', desc: '1000% Catastrophic Poison DMG ke target tunggal + lelehkan zirah musuh seketika.' }
    ]
  },

  // 14. Demonic: Abyssal Demon Pact
  demonic_abyssal_pact: {
    t1: [
      { name: 'Tanda Perjanjian Darah Iblis', icon: '📜', desc: 'Pasif: Dark DMG +5% dan ATK +5 per level dengan bayaran upeti.' },
      { name: 'Bisikan Rahasia Jurang Abyss', icon: '👁️', desc: 'Pasif: Mengetahui kelemahan musuh; Crit Rate +3% per level.' },
      { name: 'Cakar Bayangan Iblis Neraka', icon: '🐾', desc: 'Menyerang 130% Dark DMG dan mencuri 5% ATK musuh selama 2 ronde.' },
      { name: 'Perisai Daging Tumbal Iblis', icon: '🛡️', desc: 'Pasif: 10% peluang mengalihkan damage yang diterima ke jurang void.' }
    ],
    t2: [
      { name: 'Panggilan Kekuatan Iblis Kuno', icon: '🔥', desc: 'Meminjam daya abyss untuk meningkatkan ATK +50% selama 3 ronde.' },
      { name: 'Raungan Jurang Kehampaan Neraka', icon: '🌪️', desc: 'AoE 130% Dark DMG dengan 30% peluang Fear membuat musuh gemetar.' },
      { name: 'Persembahan Jiwa Musuh ke Abyss', icon: '⚖️', desc: 'Mengorbankan musuh yang tumbang untuk memulihkan 25% HP dan Qi diri.' },
      { name: 'Sabetan Sabit Algojo Abyss', icon: '⚔️', desc: 'Menyerang 170% Dark DMG dengan bonus damage berlipat jika HP musuh rendah.' }
    ],
    t3: [
      { name: 'Panglima Perang Dunia Bawah Abyss', icon: '👑', desc: 'Pasif: Dark DMG +15% dan Crit DMG +15% per level.' },
      { name: 'Domain Pintu Gerbang Jurang Neraka', icon: '🚪', desc: 'Membuka gerbang abyss yang menyeret dan menelan 8% HP semua musuh setiap putaran.' },
      { name: 'Panggilan Tiga Raksasa Iblis Neraka', icon: '👹', desc: 'Tiga raksasa jurang menghantam musuh masing-masing 65% DMG.' }
    ],
    t4: { name: 'Penjelmaan Tubuh Dewa Iblis Abyss', icon: '👿', desc: 'Wujud Iblis Purba 8 ronde: Ukuran raga membesar, seluruh stat ×2, serangan memicu gempa void.' },
    t5: [
      { name: 'Kaisar Tahta Sembilan Iblis Neraka Abadi', icon: '🌌', desc: 'Pasif: Memperoleh kekebalan 100% dari serangan berunsur sihir gelap; setiap pukulan menyedot jiwa.' },
      { name: 'Penghakiman Kehampaan Sembilan Iblis Neraka', icon: '💥', desc: '1000% Abyssal Void DMG murni ke target tunggal dan menelan musuh ke dasar neraka.' }
    ]
  },

  // 15. Demonic: Nether Darkness Qi
  demonic_nether_darkness: {
    t1: [
      { name: 'Hawa Dingin Yin Sembilan Nether', icon: '❄️', desc: 'Pasif: Dark Yin DMG +5% dan SPD +3% per level.' },
      { name: 'Meditasi Liang Kubur Kuno', icon: '🪦', desc: 'Pasif: Perolehan Qi di zona makam dan gua gelap meningkat +15% per level.' },
      { name: 'Bilah Bayangan Senyap Nether', icon: '🗡️', desc: 'Menyerang 130% Yin DMG menembus pertahanan fisik musuh.' },
      { name: 'Jubah Malam Abadi Pembias Bayang', icon: '🛡️', desc: 'Pasif: 12% peluang musuh salah sasaran menyerang bayangan semu.' }
    ],
    t2: [
      { name: 'Penyatuan Bayangan Sunyi Malam', icon: '🌑', desc: 'Evasion +45% selama 3 ronde; serangan dari bayangan memiliki 100% Crit Rate.' },
      { name: 'Kabut Yin Pembeku Jiwa Lawan', icon: '🌫️', desc: 'AoE 125% Yin DMG dan membekukan sirkulasi Qi musuh (-30% MP).' },
      { name: 'Sedotan Dingin Sukma Netherworld', icon: '🧊', desc: 'Menghisap 15% Max HP musuh dan mengubahnya menjadi perisai bayangan.' },
      { name: 'Tusukan Duri Es Netherworld', icon: '🗡️', desc: 'Menyerang 165% Yin DMG dengan 35% peluang Stun 1 ronde.' }
    ],
    t3: [
      { name: 'Penguasa Domain Sembilan Lapis Yin', icon: '👑', desc: 'Pasif: Dark Yin DMG +15% dan Evasion +10% per level.' },
      { name: 'Domain Malam Abadi Tanpa Surya', icon: '🌌', desc: 'Cahaya padam total: musuh kehilangan 40% akurasi dan menderita 7% damage per ronde.' },
      { name: 'Bayangan Seribu Hantu Netherworld', icon: '👻', desc: 'Kawanan hantu nether menyerbu musuh masing-masing 60% DMG.' }
    ],
    t4: { name: 'Penjelmaan Mahadewa Kegelapan Yin Purba', icon: '🌑', desc: 'Wujud Malam Primordial 8 ronde: Tubuh menjadi bayangan transparan kebal serangan fisik murni.' },
    t5: [
      { name: 'Kaisar Kegelapan Primordial Void Abadi', icon: '🌌', desc: 'Pasif: Pemain tidak dapat ditarget oleh mantra sihir saat berada dalam kondisi bayangan.' },
      { name: 'Kiamat Malam Abadi Sembilan Jurang Yin', icon: '🌑', desc: '1000% Pure Nether Yin DMG yang memadamkan seluruh cahaya dan sukma lawan seketika.' }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════
// 4. MAIN SEEDER FUNCTION
// ═══════════════════════════════════════════════════════════════════════
async function seedLawMasterEcosystem(options = { reset: false, guildId: DEFAULT_GUILD_ID }) {
  const guildId = options.guildId || DEFAULT_GUILD_ID;
  console.log(`\n=== MEMULAI SEEDER HUKUM SEMESTA (Guild: ${guildId}) ===`);

  // Hubungkan ke MongoDB jika belum terhubung
  if (mongoose.connection.readyState === 0) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jianghu-bot';
    console.log(`[DB] Menghubungkan ke MongoDB...`);
    await mongoose.connect(mongoUri);
    console.log(`[DB] Terhubung ke MongoDB.`);
  }

  // 1. SEED 15 KITAB MANUAL HUKUM SEMESTA
  console.log('\n--- 1. Seeding 15 Kitab Manual Hukum Semesta (Category: "law") ---');
  let manualCount = 0;
  for (const itemData of LAW_MANUAL_ITEMS) {
    await Item.findOneAndUpdate(
      { guildId, name: itemData.name },
      { ...itemData, isLawManual: true, guildId },
      { upsert: true, new: true }
    );
    manualCount++;
    console.log(`  [LAW] Upserted: ${itemData.name} (${itemData.lawType})`);
  }
  console.log(`  ✅ Berhasil menyemai ${manualCount} Kitab Manual Hukum.`);

  // 2. SEED ITEM COMMON & SATWA COMMON
  console.log('\n--- 2. Seeding Item Common (Artifact) & Satwa Common (Beast) ---');
  let companionCount = 0;
  for (const itemData of COMMON_COMPANION_ITEMS) {
    await Item.findOneAndUpdate(
      { guildId, name: itemData.name },
      { ...itemData, guildId },
      { upsert: true, new: true }
    );
    companionCount++;
    console.log(`  [COMPANION] Upserted: ${itemData.name} (${itemData.canBecomeArtifact ? 'Artifact' : 'Beast'})`);
  }
  console.log(`  ✅ Berhasil menyemai ${companionCount} Benda & Satwa Common.`);

  // 3. SEED 210 DEFINISI SKILL TREES
  console.log('\n--- 3. Seeding 210 Master Definisi Dokumen LawSkillDefinition ---');
  let totalSkills = 0;
  for (const [lawType, config] of Object.entries(ALL_LAW_CONFIGS)) {
    const skills = createLawSkills(lawType, config);
    for (const skill of skills) {
      await LawSkillDefinition.findOneAndUpdate(
        { skillId: skill.skillId },
        skill,
        { upsert: true, new: true }
      );
      totalSkills++;
    }
    console.log(`  [TREE] ${lawType}: 14 skills upserted.`);
  }
  console.log(`  ✅ Berhasil menyemai ${totalSkills} Definisi Skill Pohon Law.`);

  console.log('\n=== SEEDER HUKUM SEMESTA SELESAI DENGAN SUKSES! ===\n');
}

// Eksekusi jika dijalankan langsung lewat node CLI
if (require.main === module) {
  seedLawMasterEcosystem()
    .then(() => {
      console.log('Script selesai, menutup koneksi database.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal Error during seedLawMasterEcosystem:', err);
      process.exit(1);
    });
}

module.exports = { seedLawMasterEcosystem };
