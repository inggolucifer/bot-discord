/**
 * scripts/seedRighteousLawEcosystem.js
 * Seeder khusus 5 Hukum Semesta Faksi Righteous (Ortodoks):
 * - righteous_heavenly_merit (Hukum Jasa Langit)
 * - righteous_pure_yang (Kitab Yang Murni)
 * - righteous_sword_heart (Hati Pedang)
 * - righteous_formation_array (Formasi Bendera)
 * - righteous_karmic_mirror (Cermin Karma)
 * 
 * Meliputi:
 * 1. 5 Buku Manual Law (Category 'law', rank Common, tier 1, tags ['law', 'law_manual'])
 * 2. Item Material Penyerapan Bertier 1-8 & Slot 2 Binding Requirements
 * 3. 25 Definisi Dokumen LawSkillDefinition (5 skill per Law x 5 Law)
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Item = require('../models/Item');
const LawSkillDefinition = require('../models/LawSkillDefinition');
const { LAW_SKILL_TREES } = require('../utils/lawCultivationEngine');
const { getSkillPointCost } = require('../utils/kungfuMastery');

const DEFAULT_GUILD_ID = process.env.DEFAULT_GUILD_ID || 'default_guild';

// 1. DAFTAR 5 MANUAL LAW
const RIGHTEOUS_MANUALS = [
  {
    name: 'Kitab Hukum Jasa Langit',
    lawType: 'righteous_heavenly_merit',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 60,
    priceCurrency: 'copper',
    tags: ['law', 'law_manual'],
    isLawManual: true,
    description: 'Kitab fondasi jalan kebajikan langit. Menghimpun jasa dan menumpas kejahatan dunia fana.'
  },
  {
    name: 'Kitab Yang Murni',
    lawType: 'righteous_pure_yang',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 60,
    priceCurrency: 'copper',
    tags: ['law', 'law_manual'],
    isLawManual: true,
    description: 'Kitab fondasi intisari surya murni. Menjaga kesucian bejana dantian dari segala hawa iblis kotor.'
  },
  {
    name: 'Kitab Hati Pedang',
    lawType: 'righteous_sword_heart',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 60,
    priceCurrency: 'copper',
    tags: ['law', 'law_manual'],
    isLawManual: true,
    description: 'Kitab fondasi jalan pedang sejati. Mematri niat pedang ke dalam sukma pendekar.'
  },
  {
    name: 'Kitab Formasi Bendera',
    lawType: 'righteous_formation_array',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 60,
    priceCurrency: 'copper',
    tags: ['law', 'law_manual'],
    isLawManual: true,
    description: 'Kitab fondasi penataan formasi bendera dan susunan pelindung wilayah berdaulat.'
  },
  {
    name: 'Kitab Cermin Karma',
    lawType: 'righteous_karmic_mirror',
    category: 'law',
    rank: 'Common',
    tier: 1,
    basePrice: 60,
    priceCurrency: 'copper',
    tags: ['law', 'law_manual'],
    isLawManual: true,
    description: 'Kitab fondasi penimbangan karma semesta. Menerangi nurani dan memantulkan keburukan musuh.'
  }
];

// Helper: Nama rank dari tier (1=Common, 2=Uncommon, 3=Rare, 4=Epic, 5=Legendary, 6+=Mythical)
function getRankFromTier(tier) {
  if (tier <= 1) return 'Common';
  if (tier === 2) return 'Uncommon';
  if (tier === 3) return 'Rare';
  if (tier === 4) return 'Epic';
  if (tier === 5) return 'Legendary';
  return 'Mythical';
}

// 2. DAFTAR ITEM PENYERAPAN BERTIER (1-8)
function generateTieredItems() {
  const items = [];

  // Slot 2 Bind Pedang Sumpah
  items.push({
    name: 'Pedang Sumpah Besi',
    category: 'weapon',
    weaponType: 'sword',
    rank: 'Common',
    tier: 1,
    baseAtk: 12,
    basePrice: 50,
    priceCurrency: 'copper',
    tags: ['oath_sword', 'sword'],
    description: 'Pedang besi sederhana sebagai simbol ikatan sumpah seumur hidup jalan pedang.'
  });

  // Tag: merit_seal (Tier 1-8)
  for (let t = 1; t <= 8; t++) {
    items.push({
      name: `Segel Jasa Langit (Tier ${t})`,
      category: 'material',
      rank: getRankFromTier(t),
      tier: t,
      basePrice: Math.floor(20 * Math.pow(1.8, t - 1)),
      priceCurrency: t <= 3 ? 'copper' : 'silver',
      tags: ['merit_seal'],
      description: `Segel pengakuan amal kebajikan tingkat ${t}, memancarkan pendar emas kebajikan.`
    });
  }

  // Tag: commendation_token (Tier 1-5)
  for (let t = 1; t <= 5; t++) {
    items.push({
      name: `Token Pujian Kota (Tier ${t})`,
      category: 'material',
      rank: getRankFromTier(t),
      tier: t,
      basePrice: Math.floor(15 * Math.pow(1.7, t - 1)),
      priceCurrency: t <= 2 ? 'copper' : 'silver',
      tags: ['commendation_token'],
      description: `Lencana tanda kehormatan resmi dari balai kota tingkat ${t}.`
    });
  }

  // Tag: relief_receipt (Tier 1-3)
  for (let t = 1; t <= 3; t++) {
    items.push({
      name: `Tanda Terima Bantuan Sosial (Tier ${t})`,
      category: 'material',
      rank: getRankFromTier(t),
      tier: t,
      basePrice: Math.floor(10 * Math.pow(1.5, t - 1)),
      priceCurrency: 'copper',
      tags: ['relief_receipt'],
      description: `Surat bukti penyaluran bantuan kemanusiaan tingkat ${t} di wilayah tertimpa bencana.`
    });
  }

  // Tag: yang_crystal (Tier 1-8)
  for (let t = 1; t <= 8; t++) {
    items.push({
      name: `Kristal Yang Murni (Tier ${t})`,
      category: 'material',
      rank: getRankFromTier(t),
      tier: t,
      basePrice: Math.floor(25 * Math.pow(1.8, t - 1)),
      priceCurrency: t <= 3 ? 'copper' : 'silver',
      tags: ['yang_crystal'],
      description: `Kristal mineral hangat penyimpan intisari surya murni tingkat ${t}.`
    });
  }

  // Tag: sun_essence_pill (Tier 1-5)
  for (let t = 1; t <= 5; t++) {
    items.push({
      name: `Pil Esensi Matahari (Tier ${t})`,
      category: 'pill',
      rank: getRankFromTier(t),
      tier: t,
      basePrice: Math.floor(30 * Math.pow(1.8, t - 1)),
      priceCurrency: t <= 2 ? 'copper' : 'silver',
      tags: ['sun_essence_pill'],
      description: `Pil hasil rakitan alkimia surya tingkat ${t} yang membersihkan meridian dari hawa dingin.`
    });
  }

  // Tag: white_jade_fragment (Tier 1-5)
  for (let t = 1; t <= 5; t++) {
    items.push({
      name: `Pecahan Giok Putih (Tier ${t})`,
      category: 'material',
      rank: getRankFromTier(t),
      tier: t,
      basePrice: Math.floor(18 * Math.pow(1.6, t - 1)),
      priceCurrency: t <= 3 ? 'copper' : 'silver',
      tags: ['white_jade_fragment'],
      description: `Serpihan giok putih suci tingkat ${t} yang menolak hawa cemar kotor.`
    });
  }

  // Tag: sword_oil (Tier 1-8)
  for (let t = 1; t <= 8; t++) {
    items.push({
      name: `Minyak Pengasah Pedang Roh (Tier ${t})`,
      category: 'material',
      rank: getRankFromTier(t),
      tier: t,
      basePrice: Math.floor(22 * Math.pow(1.8, t - 1)),
      priceCurrency: t <= 3 ? 'copper' : 'silver',
      tags: ['sword_oil'],
      description: `Minyak esensi herba tingkat ${t} untuk melumasi dan membangkitkan aura bilah pedang.`
    });
  }

  // Tag: whetstone_spirit (Tier 1-8)
  for (let t = 1; t <= 8; t++) {
    items.push({
      name: `Batu Asah Intisari Pedang (Tier ${t})`,
      category: 'material',
      rank: getRankFromTier(t),
      tier: t,
      basePrice: Math.floor(24 * Math.pow(1.8, t - 1)),
      priceCurrency: t <= 3 ? 'copper' : 'silver',
      tags: ['whetstone_spirit'],
      description: `Batu asah bertuah tingkat ${t} yang mempertajam niat pedang batin.`
    });
  }

  // Tag: broken_blade_shard (Tier 1-8)
  for (let t = 1; t <= 8; t++) {
    items.push({
      name: `Pecahan Bilah Pedang Kuno (Tier ${t})`,
      category: 'material',
      rank: getRankFromTier(t),
      tier: t,
      basePrice: Math.floor(20 * Math.pow(1.7, t - 1)),
      priceCurrency: t <= 3 ? 'copper' : 'silver',
      tags: ['broken_blade_shard'],
      description: `Patahan bilah pedang pendekar zaman dahulu tingkat ${t} yang masih menyimpan sisa niat pedang.`
    });
  }

  // Tag: sword_manual_scrap (Tier 1-5)
  for (let t = 1; t <= 5; t++) {
    items.push({
      name: `Sobekan Lembar Jurus Pedang (Tier ${t})`,
      category: 'material',
      rank: getRankFromTier(t),
      tier: t,
      basePrice: Math.floor(25 * Math.pow(1.7, t - 1)),
      priceCurrency: t <= 2 ? 'copper' : 'silver',
      tags: ['sword_manual_scrap'],
      description: `Lembaran sobekan kitab jurus pedang tingkat ${t} untuk direnungkan.`
    });
  }

  // Tag: array_flag (Tier 1-8)
  for (let t = 1; t <= 8; t++) {
    items.push({
      name: `Bendera Formasi Awal (Tier ${t})`,
      category: 'material',
      rank: getRankFromTier(t),
      tier: t,
      basePrice: Math.floor(25 * Math.pow(1.8, t - 1)),
      priceCurrency: t <= 3 ? 'copper' : 'silver',
      tags: ['array_flag'],
      description: `Bendera formasi berbahan sutra bertatahkan pola simpul Qi tingkat ${t}.`
    });
  }

  // Tag: formation_plate (Tier 1-8)
  for (let t = 1; t <= 8; t++) {
    items.push({
      name: `Lempeng Logam Formasi (Tier ${t})`,
      category: 'material',
      rank: getRankFromTier(t),
      tier: t,
      basePrice: Math.floor(28 * Math.pow(1.8, t - 1)),
      priceCurrency: t <= 3 ? 'copper' : 'silver',
      tags: ['formation_plate'],
      description: `Lempeng tembaga berukir jalinan diagram formasi medan pertahanan tingkat ${t}.`
    });
  }

  // Tag: spirit_compass (Tier 1-5)
  for (let t = 1; t <= 5; t++) {
    items.push({
      name: `Kompas Arah Spiritual (Tier ${t})`,
      category: 'material',
      rank: getRankFromTier(t),
      tier: t,
      basePrice: Math.floor(30 * Math.pow(1.7, t - 1)),
      priceCurrency: t <= 2 ? 'copper' : 'silver',
      tags: ['spirit_compass'],
      description: `Kompas pembaca arus meridian bumi dan orientasi mata angin tingkat ${t}.`
    });
  }

  // Tag: karma_mirror_shard (Tier 1-8)
  for (let t = 1; t <= 8; t++) {
    items.push({
      name: `Pecahan Cermin Karma (Tier ${t})`,
      category: 'material',
      rank: getRankFromTier(t),
      tier: t,
      basePrice: Math.floor(25 * Math.pow(1.8, t - 1)),
      priceCurrency: t <= 3 ? 'copper' : 'silver',
      tags: ['karma_mirror_shard'],
      description: `Serpihan kaca perak pemantul bayangan karma batin tingkat ${t}.`
    });
  }

  // Tag: judgment_talisman (Tier 1-5)
  for (let t = 1; t <= 5; t++) {
    items.push({
      name: `Jimat Vonis Karma (Tier ${t})`,
      category: 'talisman',
      rank: getRankFromTier(t),
      tier: t,
      basePrice: Math.floor(28 * Math.pow(1.7, t - 1)),
      priceCurrency: t <= 2 ? 'copper' : 'silver',
      tags: ['judgment_talisman'],
      description: `Kertas jimat bertinta merah vonis pengadilan langit tingkat ${t}.`
    });
  }

  // Tag: confessional_incense (Tier 1-5)
  for (let t = 1; t <= 5; t++) {
    items.push({
      name: `Dupa Pengakuan Dosa (Tier ${t})`,
      category: 'material',
      rank: getRankFromTier(t),
      tier: t,
      basePrice: Math.floor(20 * Math.pow(1.6, t - 1)),
      priceCurrency: t <= 2 ? 'copper' : 'silver',
      tags: ['confessional_incense'],
      description: `Dupa cendana penenang batin penyesal dosa duniawi tingkat ${t}.`
    });
  }

  return items;
}

// 3. FUNGSI UTAMA SEEDER
async function seedRighteousLawEcosystem(options = { guildId: DEFAULT_GUILD_ID }) {
  const guildId = options.guildId || DEFAULT_GUILD_ID;
  console.log(`\n=== MENYEMAI EKOSISTEM 5 HUKUM RIGHTEOUS (Guild: ${guildId}) ===`);

  // A. Seed 5 Kitab Manual Law
  console.log('\n--- 1. Seeding 5 Kitab Manual Law ---');
  let manualCount = 0;
  for (const manual of RIGHTEOUS_MANUALS) {
    await Item.findOneAndUpdate(
      { guildId, name: manual.name },
      { ...manual, guildId },
      { upsert: true, new: true }
    );
    manualCount++;
    console.log(`  [MANUAL] ${manual.name} (${manual.lawType}) seeded.`);
  }

  // B. Seed Item Material Penyerapan Bertier
  console.log('\n--- 2. Seeding Item Material Penyerapan Bertier ---');
  const tieredItems = generateTieredItems();
  let materialCount = 0;
  for (const itemData of tieredItems) {
    await Item.findOneAndUpdate(
      { guildId, name: itemData.name },
      { ...itemData, guildId },
      { upsert: true, new: true }
    );
    materialCount++;
  }
  console.log(`  ✅ Berhasil menyemai ${materialCount} item material penyerapan bertier.`);

  // C. Seed 25 Definisi LawSkillDefinition
  console.log('\n--- 3. Seeding 25 Definisi LawSkillDefinition ---');
  let skillCount = 0;
  for (const [lawType, tree] of Object.entries(LAW_SKILL_TREES)) {
    for (const node of tree.nodes) {
      const tierCost = getSkillPointCost(node.tier || 1);
      const skillDoc = {
        skillId: node.id,
        lawType,
        tier: node.tier || 1,
        name: node.name,
        icon: node.icon || '⚡',
        description: node.description || '',
        isPassive: true,
        maxLevel: node.maxLevel || 5,
        requiredRank: node.requiredRank || 0,
        requiredParentSkillId: (node.requires && node.requires[0]) || null,
        skillPointCost: tierCost,
        costType: 'none',
        baseCost: 0,
        cooldownTurns: 0,
        targetType: 'self'
      };

      await LawSkillDefinition.findOneAndUpdate(
        { skillId: node.id },
        skillDoc,
        { upsert: true, new: true }
      );
      skillCount++;
    }
    console.log(`  [TREE] ${lawType}: ${tree.nodes.length} nodes seeded.`);
  }
  console.log(`  ✅ Berhasil menyemai ${skillCount} Definisi Skill Tree Righteous.`);

  console.log('\n=== SEEDER RIGHTEOUS LAW SELESAI DENGAN SUKSES! ===\n');
  return { manualCount, materialCount, skillCount };
}

// Eksekusi jika dijalankan langsung lewat CLI
if (require.main === module) {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jianghu-bot';
  console.log(`[SEEDER] Menghubungkan ke MongoDB (${mongoUri})...`);
  mongoose.connect(mongoUri)
    .then(async () => {
      console.log('[SEEDER] Terhubung ke MongoDB.');
      await seedRighteousLawEcosystem();
      await mongoose.connection.close();
      console.log('[SEEDER] Selesai & koneksi ditutup.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[SEEDER] Error saat menjalankan seedRighteousLawEcosystem:', err);
      process.exit(1);
    });
}

module.exports = { seedRighteousLawEcosystem, RIGHTEOUS_MANUALS, generateTieredItems };
