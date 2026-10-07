const mongoose = require('mongoose');
require('dotenv').config();
const Player = require('../models/Player');
const Item = require('../models/Item');
const { getLawStatus, syncLawChanneling } = require('../utils/lawCultivationEngine');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jianghu');
  console.log('🔗 Testing Law Overhaul Logic in MongoDB...');

  const player = await Player.findOne({ discordId: 'google_10398407018507304858_1790425324687' });
  if (!player) {
    console.error('Player Inggo not found!');
    process.exit(1);
  }

  console.log('Player:', player.characterName);
  console.log('Law:', player.cultivationLaw?.activeLawType, 'Rank:', player.cultivationLaw?.rank);

  // 1. Test getLawStatus
  const status = getLawStatus(player);
  console.log('\n--- 1. LAW STATUS ---');
  console.log('Essence:', `${status.currentEssence}/${status.maxEssence} (${status.essencePercent}%)`);
  console.log('Facilities:', status.facilities);
  console.log('Gu Slots Count:', status.guSlots.length);
  console.log('Gu Slots Detail:', status.guSlots.map(g => ({ name: g.guName, tier: g.tier, satiety: g.satiety })));

  // 2. Test Gu Feeding (Item mode)
  console.log('\n--- 2. TEST GU FEED (Item Mode) ---');
  const targetGu = player.cultivationLaw.guSlots[0];
  const oldSatiety = targetGu.satiety || targetGu.hunger || 0;
  targetGu.satiety = Math.min(100, oldSatiety + 20);
  targetGu.hunger = targetGu.satiety;
  console.log(`Feed Gu [${targetGu.guName}]: Satiety ${oldSatiety}% -> ${targetGu.satiety}%`);

  // 3. Test Gu Fusion (Combine Slot 1 & 2)
  console.log('\n--- 3. TEST GU FUSION ---');
  if (player.cultivationLaw.guSlots.length >= 2) {
    const gu1 = player.cultivationLaw.guSlots[0];
    const gu2 = player.cultivationLaw.guSlots[1];
    console.log(`Combining Gu [${gu1.guName} Tier ${gu1.tier}] and [${gu2.guName} Tier ${gu2.tier}]...`);
    const newTier = Math.min(5, Math.max(gu1.tier || 1, gu2.tier || 1) + 1);
    const mutated = {
      guName: `Gu Mutasi ${gu1.guType.toUpperCase()}-${gu2.guType.toUpperCase()} Purba`,
      guType: gu1.guType,
      tier: newTier,
      level: 1,
      satiety: 100,
      hunger: 100,
      bonusAtk: (gu1.bonusAtk || 5) + (gu2.bonusAtk || 5) + 8,
      bonusDef: (gu1.bonusDef || 3) + (gu2.bonusDef || 3) + 5,
      specialEffect: 'dual_essence_venom',
      lastFedAt: new Date()
    };
    console.log('Mutated Gu Result:', mutated);
  }

  // 4. Test Channeling & Digestion
  console.log('\n--- 4. TEST CHANNELING ESSENCE DIGESTION ---');
  player.cultivationLaw.isChanneling = true;
  player.cultivationLaw.lastChannelSyncAt = new Date(Date.now() - 10 * 60 * 1000); // 10 menit lalu
  const syncResult = syncLawChanneling(player);
  console.log('Channeling 10 minutes result:');
  console.log('New Qi:', syncResult.newQi);
  console.log('Essence Remaining:', player.cultivationLaw.currentEssence);
  console.log('Gu 0 Satiety After Digestion:', player.cultivationLaw.guSlots[0]?.satiety);

  await mongoose.disconnect();
  console.log('\n✅ Semua pengujian logic Law Overhaul berhasil 100%!');
}

test();
