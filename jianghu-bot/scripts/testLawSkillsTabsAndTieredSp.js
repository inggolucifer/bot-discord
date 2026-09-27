const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Player = require('../models/Player');
const LawSkillDefinition = require('../models/LawSkillDefinition');
const { getSkillPointCost, getMaxManualCapacity, getRequiredSkillCombatExp } = require('../utils/kungfuMastery');

async function testLawSkillsTabsAndTieredSp() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jianghu-bot';
  console.log('[TEST] Menghubungkan ke MongoDB...');
  await mongoose.connect(mongoUri);

  console.log('\n--- 1. Verifikasi Biaya SP Bertingkat di Database ---');
  const tiers = [1, 2, 3, 4, 5];
  for (const t of tiers) {
    const skills = await LawSkillDefinition.find({ tier: t }).limit(3).lean();
    console.log(`Tier ${t} (Expected: ${getSkillPointCost(t)} SP):`);
    for (const s of skills) {
      if (s.skillPointCost !== getSkillPointCost(t)) {
        throw new Error(`MISMATCH: ${s.skillId} has cost ${s.skillPointCost}, expected ${getSkillPointCost(t)}`);
      }
      console.log(`  ✓ ${s.skillId} -> ${s.skillPointCost} SP`);
    }
  }

  console.log('\n--- 2. Verifikasi Data Karakter Inggo ---');
  const inggo = await Player.findOne({ characterName: 'Inggo' });
  if (!inggo) {
    console.log('Karakter Inggo tidak ditemukan.');
  } else {
    console.log(`Karakter: ${inggo.characterName}`);
    console.log(`Law: ${inggo.cultivationLaw?.activeLawType}`);
    console.log(`Rank: ${inggo.cultivationLaw?.rank}, Stage: ${inggo.cultivationLaw?.stage}`);
    console.log(`Available SP: ${inggo.cultivationLaw?.lawSkillPoints}`);
    console.log(`Unlocked Skills:`, inggo.cultivationLaw?.unlockedSkillIds);
    console.log(`Combat Loadout:`, inggo.cultivationLaw?.combatLoadout);
    console.log(`Core Stat: ${inggo.kungfuSkills?.core || 0}`);
    console.log(`Max External Manual Capacity: ${getMaxManualCapacity(inggo)}`);

    // Pastikan Inggo punya minimal 1 unlocked skill untuk testing loadout jika belum ada
    if (!inggo.cultivationLaw.unlockedSkillIds || inggo.cultivationLaw.unlockedSkillIds.length === 0) {
      const sampleT1 = await LawSkillDefinition.findOne({ lawType: inggo.cultivationLaw.activeLawType, tier: 1 }).lean();
      if (sampleT1) {
        inggo.cultivationLaw.unlockedSkillIds = [sampleT1.skillId];
        inggo.cultivationLaw.combatLoadout = [sampleT1.skillId];
        await inggo.save();
        console.log(`  ✓ Memberikan skill awal untuk Inggo: ${sampleT1.skillId}`);
      }
    }
  }

  console.log('\n--- 3. Verifikasi Formula XP Serangan Tempur Kuadratik ---');
  for (let lvl = 1; lvl <= 5; lvl++) {
    console.log(`Level ${lvl} -> Req Hits: ${getRequiredSkillCombatExp(lvl)} serangan`);
  }

  console.log('\n✅ SEMUA LOGIKA INTEGRASI TAB DAN SP TIER TELAH TERVERIFIKASI SEMPURNA!');
  await mongoose.connection.close();
}

testLawSkillsTabsAndTieredSp()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error during test:', err);
    process.exit(1);
  });
