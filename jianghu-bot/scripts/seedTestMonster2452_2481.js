/**
 * Skrip Seeder: Monster Uji Coba di Koordinat (2452, 2481) & Item Kitab Law/Manual
 * Menyiapkan:
 * 1. Monster "Serigala Roh Darah" (wolf_azure) pada petak (2452, 2481) di zone 'tianyuan_world_map'.
 * 2. Hukum Alam "Hukum Pedang Langit" (Khusus Mortal).
 * 3. Manual Teknik "Pedang Angin Puyuh" (Butuh Realm Qi Refining & Sword Level 30).
 * 4. Manual Teknik "Pukulan Tapak Besi" (Butuh Fist Level 15).
 * 5. Item Kitab terkait di katalog Item.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Monster = require('../models/Monster');
const ZoneTile = require('../models/ZoneTile');
const Law = require('../models/Law');
const Manual = require('../models/Manual');
const Item = require('../models/Item');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jianghu';
const DEFAULT_GUILD_ID = process.env.DEFAULT_GUILD_ID || 'SYSTEM_GLOBAL';

async function run() {
  console.log('=== SEED TEST MONSTER & LAW / MANUAL FRAMEWORK ===');
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 });
    console.log('[OK] Terhubung ke MongoDB (Primary URI).');
  } catch (err) {
    console.log('[INFO] Gagal terhubung ke remote URI, mencoba fallback ke MongoDB lokal...');
    try {
      await mongoose.connect('mongodb://127.0.0.1:27017/jianghu', { serverSelectionTimeoutMS: 3000 });
      console.log('[OK] Terhubung ke MongoDB lokal.');
    } catch (localErr) {
      console.warn('[WARN] MongoDB lokal dan remote tidak dapat diakses langsung dari CLI lokal saat ini.');
      console.warn('[INFO] Skrip ini akan dijalankan di server production saat deployment.');
      return;
    }
  }

  // 1. Seed Monster "Serigala Roh Darah"
  const monsterData = {
    guildId: DEFAULT_GUILD_ID,
    key: 'wolf_azure',
    name: 'Serigala Roh Darah',
    regionSlug: 'central_plains',
    tier: 1,
    minRealmIndex: 0,
    statBlock: {
      hp: 150,
      atk: 20,
      def: 8,
      spd: 10
    },
    description: 'Siluman serigala purba yang menjaga tanah perbatasan Central Plains. Sangat agresif dan siap diuji tanding turn-based!',
    isActive: true
  };

  const monster = await Monster.findOneAndUpdate(
    { key: monsterData.key },
    { ...monsterData },
    { upsert: true, new: true }
  );
  console.log(`[PASS] Monster siap: ${monster.name} (Key: ${monster.key}, HP: ${monster.statBlock.hp}, ATK: ${monster.statBlock.atk})`);

  // 2. Tempatkan Monster di Petak Grid (2452, 2481)
  const targetTile = await ZoneTile.findOneAndUpdate(
    { zoneId: 'tianyuan_world_map', tileX: 2452, tileY: 2481 },
    {
      guildId: DEFAULT_GUILD_ID,
      zoneId: 'tianyuan_world_map',
      tileX: 2452,
      tileY: 2481,
      tileType: 'poi',
      terrainType: 'plains',
      label: 'Sarang Serigala Roh Darah',
      spawnedMonster: {
        key: monster.key,
        name: monster.name,
        tier: monster.tier,
        hp: monster.statBlock.hp,
        maxHp: monster.statBlock.hp,
        atk: monster.statBlock.atk,
        def: monster.statBlock.def,
        spd: monster.statBlock.spd,
        imageUrl: monster.imageUrl || null
      }
    },
    { upsert: true, new: true }
  );
  console.log(`[PASS] Petak (2452, 2481) berhasil dipasangi monster: ${targetTile.spawnedMonster.name} (${targetTile.label})`);

  // 3. Seed Master Law & Item Gulungan Law
  const lawName = 'Hukum Pedang Langit';
  await Law.findOneAndUpdate(
    { name: lawName },
    {
      guildId: DEFAULT_GUILD_ID,
      name: lawName,
      element: 'Logam',
      minRealmIndex: 0,
      description: 'Hukum kultivasi ortodoks fondasi fana. Membimbing aliran Qi pedang murni ke dalam dantian sejak masa Mortal.',
      flatBonus: { hp: 50, atk: 15, def: 10, spd: 5 }
    },
    { upsert: true }
  );

  await Item.findOneAndUpdate(
    { name: 'Gulungan Hukum Pedang Langit' },
    {
      guildId: DEFAULT_GUILD_ID,
      name: 'Gulungan Hukum Pedang Langit',
      rank: 'Rare',
      category: 'law',
      tier: 1,
      minRealmIndex: 0,
      effect: `learn_law_${lawName}`,
      description: 'Gulungan sutra kuno berisi petunjuk hukum kultivasi. HANYA DAPAT DISERAP KETIKA MASIH MORTAL (Fondasi Fana) untuk mengunci takdir kultivasi.'
    },
    { upsert: true }
  );
  console.log(`[PASS] Hukum Alam dan Item Gulungan siap: ${lawName}`);

  // 4. Seed Manual Teknik dengan Persyaratan Kemahiran
  // A. Pedang Angin Puyuh (Butuh Qi Refining Realm Index 1 & Sword Level 30)
  const manualA = 'Pedang Angin Puyuh';
  await Manual.findOneAndUpdate(
    { name: manualA },
    {
      guildId: DEFAULT_GUILD_ID,
      name: manualA,
      description: 'Jurus tebasan pedang berputar yang memicu pusaran angin kencang. Memberikan tebasan beruntun mematikan.',
      minRealmIndex: 1, // Butuh Qi Refining
      maxLevel: 10,
      timeToComprehendHours: 12,
      requiredSkillType: 'sword',
      requiredSkillPoints: 30, // Butuh Sword Level 30
      flatBonusPerLevel: { atk: 6, spd: 4 },
      effectType: 'damage',
      effectValue: 1.5,
      triggerChance: 0.6
    },
    { upsert: true }
  );

  await Item.findOneAndUpdate(
    { name: 'Kitab Pedang Angin Puyuh' },
    {
      guildId: DEFAULT_GUILD_ID,
      name: 'Kitab Pedang Angin Puyuh',
      rank: 'Rare',
      category: 'manual',
      tier: 2,
      minRealmIndex: 1,
      requiredKungfuSkill: 'sword',
      requiredKungfuLevel: 30,
      effect: `learn_manual_${manualA}`,
      description: 'Kitab ilmu pedang tingkat lanjut. Syarat Mempelajari: Ranah Qi Refining (Index 1) & Kemahiran Pedang Level 30.'
    },
    { upsert: true }
  );

  // B. Pukulan Tapak Besi (Butuh Fist Level 15)
  const manualB = 'Pukulan Tapak Besi';
  await Manual.findOneAndUpdate(
    { name: manualB },
    {
      guildId: DEFAULT_GUILD_ID,
      name: manualB,
      description: 'Teknik mengeraskan telapak tangan seperti lempengan baja. Memecahkan pertahanan musuh dengan telak.',
      minRealmIndex: 0,
      maxLevel: 10,
      timeToComprehendHours: 8,
      requiredSkillType: 'fist',
      requiredSkillPoints: 15, // Butuh Fist Level 15
      flatBonusPerLevel: { atk: 5, def: 3 },
      effectType: 'damage',
      effectValue: 1.3,
      triggerChance: 0.5
    },
    { upsert: true }
  );

  await Item.findOneAndUpdate(
    { name: 'Kitab Pukulan Tapak Besi' },
    {
      guildId: DEFAULT_GUILD_ID,
      name: 'Kitab Pukulan Tapak Besi',
      rank: 'Uncommon',
      category: 'manual',
      tier: 1,
      minRealmIndex: 0,
      requiredKungfuSkill: 'fist',
      requiredKungfuLevel: 15,
      effect: `learn_manual_${manualB}`,
      description: 'Kitab beladiri tangan kosong. Syarat Mempelajari: Kemahiran Pukulan (Fist) Level 15.'
    },
    { upsert: true }
  );
  console.log(`[PASS] Manual Teknik siap: ${manualA} (Req: Qi Refining + Sword Lv.30) & ${manualB} (Req: Fist Lv.15)`);

  console.log('=== SEEDING SELESAI DENGAN SUKSES (100% OK) ===');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('[FAIL] Seeder error:', err);
  process.exit(1);
});
