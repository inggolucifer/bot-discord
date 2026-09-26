require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI tidak ditemukan di .env');
    process.exit(1);
  }

  console.log('🔄 Menghubungkan ke MongoDB...');
  await mongoose.connect(uri);
  console.log('✅ Berhasil terhubung ke MongoDB.');

  const Player = require('../models/Player');
  const LawSkillDefinition = require('../models/LawSkillDefinition');
  const { getQiRequired } = require('../utils/lawCultivationEngine');
  const { getMaxQi } = require('../utils/cultivation');

  // Cari karakter Inggo via characterName atau username
  const player = await Player.findOne({
    $or: [
      { characterName: { $regex: 'inggo', $options: 'i' } },
      { username: { $regex: 'inggo', $options: 'i' } },
      { email: { $regex: 'inggo', $options: 'i' } }
    ]
  });

  if (!player) {
    console.error('❌ Karakter Inggo tidak ditemukan di database!');
    await mongoose.disconnect();
    return;
  }

  console.log(`\n========================================`);
  console.log(`Ditemukan Karakter: ${player.characterName || player.username} (ID: ${player._id})`);
  console.log(`Discord ID: ${player.discordId}`);
  console.log(`Email: ${player.email}`);
  console.log(`Status Awal:`);
  console.log(`- Level: ${player.level}`);
  console.log(`- Realm: ${player.systemCultivation?.realm || 'Belum Ada'} (Stage: ${player.systemCultivation?.stage || 1})`);
  console.log(`- Law: ${player.cultivationLaw?.activeLawType || 'Belum Ada'}`);

  // 1. SET REALM KE REALM 2: Pembentukan Fondasi (Foundation Establishment)
  const realm2Name = 'Pembentukan Fondasi (Foundation Establishment)';
  const realm2Stage = 1; // Stage 1 dari 9
  const realm2MaxQi = getMaxQi(2, realm2Stage); // ~25,000 Qi

  player.systemCultivation = {
    realm: realm2Name,
    stage: realm2Stage,
    qi: Math.floor(realm2MaxQi * 0.45), // 11,250 Qi (45% progres)
    lastSyncAt: new Date(),
    isFlawedFoundation: false
  };

  // Level karakter disesuaikan untuk Realm 2 (Cap: Lv. 60)
  player.level = 45; // Level 45 berada di dalam range Realm 2 (Lv. 41 - 60)
  player.isNormalCultivator = false;

  // 2. SET LAW KE GU MASTER (Tuan Sepuluh Ribu Gu)
  const lawRank = 2;  // Rank 2: Peternak Gu Muda (Sesuai Realm 2)
  const lawStage = 1; // Stage 1 dari 9
  const lawMaxQi = getQiRequired(lawRank, lawStage); // Hitung Qi target stage

  // Cari skill-skill Gu Master dari database
  const guSkills = await LawSkillDefinition.find({ lawType: 'gu_master' }).lean();
  console.log(`\n📚 Ditemukan ${guSkills.length} skill Gu Master di koleksi database:`);
  guSkills.forEach(s => console.log(`  - [Tier ${s.tier}] ${s.name} (${s.skillId})`));

  const starterSkills = guSkills.filter(s => s.tier === 0 || s.tier === 1).map(s => s.skillId);
  const equippedSkills = starterSkills.slice(0, 4);

  // Inisialisasi Gu Aperture (Sarang Cacing Gu)
  const initialGuSlots = [
    {
      guName: 'Gu Cacing Sutra Emas Purba',
      guType: 'healing',
      level: 3,
      hunger: 85,
      lastFedAt: new Date()
    },
    {
      guName: 'Gu Belati Bisa Kalajengking',
      guType: 'attack',
      level: 2,
      hunger: 70,
      lastFedAt: new Date()
    },
    {
      guName: 'Gu Cangkang Baja Xuanwu',
      guType: 'defense',
      level: 2,
      hunger: 90,
      lastFedAt: new Date()
    }
  ];

  player.cultivationLaw = {
    activeLawType: 'gu_master',
    boundAt: player.cultivationLaw?.boundAt || new Date(),
    rank: lawRank,
    stage: lawStage,
    qi: Math.floor(lawMaxQi * 0.4), // 40% progres Qi Law
    maxQi: lawMaxQi,
    isChanneling: false,
    lastChannelSyncAt: new Date(),
    lawLevelCapBonus: 44, // Bonus cap level dari rank 2
    lawSkillPoints: 25,   // 25 SP gratis untuk bebas dialokasikan pemain pada pohon skill!
    unlockedSkillIds: equippedSkills,
    combatLoadout: equippedSkills,
    guSlots: initialGuSlots,
    bodyTemperingParts: {},
    demonicData: {},
    dailyData: {
      lastDailyEpiphanyDate: null,
      consecutiveLoginDays: 3,
      channelMinutesUsedToday: 0,
      lastChannelDate: new Date()
    }
  };

  // Berikan bekal tael dan batu roh melimpah untuk testing
  player.currency = {
    copper: 2500,
    silver: 150,
    gold: 10,
    jade: 2,
    spirit: 50
  };

  // Tandai modifikasi field mongoose
  player.markModified('systemCultivation');
  player.markModified('cultivationLaw');
  player.markModified('currency');
  await player.save();

  console.log(`\n========================================`);
  console.log(`🎉 BERHASIL MEMPERBARUI KARAKTER ${player.characterName}:`);
  console.log(`- Nama Karakter: ${player.characterName}`);
  console.log(`- Level: ${player.level} (Cap Realm: 60)`);
  console.log(`- Ranah Sistem: ${player.systemCultivation.realm}`);
  console.log(`  ↳ Realm Index: 2 (Pembentukan Fondasi)`);
  console.log(`  ↳ Tahap (Stage): ${player.systemCultivation.stage} / 9`);
  console.log(`  ↳ Akumulasi Qi: ${player.systemCultivation.qi} / ${realm2MaxQi} Qi`);
  console.log(`- Hukum Semesta: ${player.cultivationLaw.activeLawType} (Tuan Sepuluh Ribu Gu)`);
  console.log(`  ↳ Rank: Rank ${player.cultivationLaw.rank} (Peternak Gu Muda), Stage ${player.cultivationLaw.stage}`);
  console.log(`  ↳ Qi Law: ${player.cultivationLaw.qi} / ${player.cultivationLaw.maxQi} Myriad Gu Venom Qi`);
  console.log(`  ↳ Poin Skill Bebas: ${player.cultivationLaw.lawSkillPoints} SP (Siap untuk alokasi di Constellation Tree)`);
  console.log(`  ↳ Jurus Terpasang: ${player.cultivationLaw.combatLoadout.join(', ')}`);
  console.log(`- Sarang Cacing Gu (Gu Aperture):`);
  player.cultivationLaw.guSlots.forEach((gu, i) => {
    console.log(`  [Slot ${i + 1}] 🐛 ${gu.guName} | Tipe: ${gu.guType} | Level: ${gu.level} | Lapar: ${gu.hunger}%`);
  });
  console.log(`- Dompet: ${player.currency.copper} Copper, ${player.currency.silver} Silver`);
  console.log(`========================================\n`);

  await mongoose.disconnect();
  console.log('✅ Koneksi MongoDB ditutup.');
}

main().catch(err => {
  console.error('❌ Terjadi error:', err);
  process.exit(1);
});
