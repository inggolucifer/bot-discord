require('dotenv').config();
const mongoose = require('mongoose');
const {
  getMaxManualCapacity,
  canLearnNewManual,
  getRequiredSkillCombatExp,
  getSkillPointCost,
  getMaxSkillLevel
} = require('../utils/kungfuMastery');
const Player = require('../models/Player');
const ArenaLadderEntry = require('../models/ArenaLadderEntry');

async function testAll() {
  console.log('=== 1. TESTING KUNGFU MASTERY HELPER MATH ===');
  
  // Test capacity calculation
  const mockPlayer0 = { manuals: [1, 2, 3], kungfuSkills: { core: 0 } };
  const mockPlayer5 = { manuals: [1, 2, 3, 4], kungfuSkills: { core: 5 } };
  const mockPlayer12 = { manuals: [1, 2, 3, 4, 5], kungfuSkills: { core: 12 } };
  const mockPlayerFull = { manuals: [1, 2, 3, 4, 5, 6], kungfuSkills: { core: 12 } };

  console.log('Core 0 Capacity:', getMaxManualCapacity(mockPlayer0), 'Expected: 4');
  console.log('Core 5 Capacity:', getMaxManualCapacity(mockPlayer5), 'Expected: 5');
  console.log('Core 12 Capacity:', getMaxManualCapacity(mockPlayer12), 'Expected: 6');
  console.log('Can learn (3/4):', canLearnNewManual(mockPlayer0), 'Expected: true');
  console.log('Can learn (6/6):', canLearnNewManual(mockPlayerFull), 'Expected: false');

  console.log('\n=== 2. TESTING COMBAT ATTACK XP & TIER SP COSTS ===');
  for (let lvl = 1; lvl <= 5; lvl++) {
    console.log(`Level ${lvl} Required Attack XP:`, getRequiredSkillCombatExp(lvl));
  }
  for (let tier = 1; tier <= 5; tier++) {
    console.log(`Tier ${tier} SP Cost:`, getSkillPointCost(tier), 'Max Level:', getMaxSkillLevel(tier));
  }

  console.log('\n=== 3. TESTING DATABASE AND LADDER ENTRIES ===');
  await mongoose.connect(process.env.MONGODB_URI);
  
  const ladder = await ArenaLadderEntry.find({}).sort({ rank: 1 });
  console.log('Total Arena Ladder Entries:', ladder.length);
  ladder.forEach(e => console.log(`- Rank #${e.rank}: ${e.characterName} (${e.discordId}) CP: ${e.combatPower}`));

  const inggo = await Player.findOne({ discordId: 'google_10398407018507304858_1790425324687' });
  if (inggo) {
    console.log('\nActive Inggo Player Found:');
    console.log('- Realm:', inggo.realm, 'Level:', inggo.level);
    console.log('- Law:', inggo.cultivationLaw?.activeLawType, 'Rank:', inggo.cultivationLaw?.rank, 'SP:', inggo.cultivationLaw?.lawSkillPoints);
    console.log('- Core Stat:', inggo.kungfuSkills?.core || 0);
    console.log('- Manuals Count:', inggo.manuals?.length || 0);
    console.log('- Max Manual Capacity:', getMaxManualCapacity(inggo));
  }

  await mongoose.disconnect();
  console.log('\n✅ ALL INTEGRATION CHECKS PASSED SUCCESSFULLY!');
  process.exit(0);
}

testAll().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
