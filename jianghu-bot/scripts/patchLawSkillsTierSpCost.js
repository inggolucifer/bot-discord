const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const LawSkillDefinition = require('../models/LawSkillDefinition');
const { getSkillPointCost } = require('../utils/kungfuMastery');

async function patchLawSkillsTierSpCost() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jianghu-bot';
  console.log('[PATCH-SP] Menghubungkan ke MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('[PATCH-SP] Terhubung ke MongoDB.');

  const skills = await LawSkillDefinition.find({});
  console.log(`[PATCH-SP] Ditemukan ${skills.length} dokumen LawSkillDefinition.`);

  let updatedCount = 0;
  for (const skill of skills) {
    const tier = skill.tier || 1;
    const properCost = getSkillPointCost(tier);

    if (skill.skillPointCost !== properCost) {
      skill.skillPointCost = properCost;
      await skill.save();
      updatedCount++;
    }
  }

  console.log(`[PATCH-SP] Berhasil memperbarui ${updatedCount} dokumen dengan skillPointCost bertingkat.`);

  // Verifikasi sampel per tier
  const sampleTiers = [1, 2, 3, 4, 5];
  for (const t of sampleTiers) {
    const sample = await LawSkillDefinition.findOne({ tier: t }).lean();
    if (sample) {
      console.log(`  [VERIFIKASI] Tier ${t} sample: ${sample.skillId} -> skillPointCost: ${sample.skillPointCost} SP (Expected: ${getSkillPointCost(t)} SP)`);
    }
  }

  await mongoose.connection.close();
  console.log('[PATCH-SP] Selesai & koneksi ditutup.');
}

if (require.main === module) {
  patchLawSkillsTierSpCost()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[PATCH-SP] Error:', err);
      process.exit(1);
    });
}

module.exports = { patchLawSkillsTierSpCost };
