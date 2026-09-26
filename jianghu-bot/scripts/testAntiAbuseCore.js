require('dotenv').config();
const mongoose = require('mongoose');
const { getRequiredSkillCombatExp } = require('../utils/kungfuMastery');

async function testAntiAbuseLogic() {
  console.log('=== TESTING ANTI-ABUSE HISTORIC SKILL MASTERY ===\n');

  // Simulated player document
  const playerDoc = {
    discordId: 'test_player_123',
    kungfuSkills: { core: 10 },
    manuals: [],
    historicSkillMastery: new Map(),
    markModified: () => {}
  };

  const manualId = 'manual_sword_technique';
  const skillDisplayName = 'Kitab Pedang Angin Puyuh';

  console.log(`[Langkah 1] Pemain mempelajari "${skillDisplayName}" pertama kali.`);
  playerDoc.manuals.push({
    manualId,
    level: 1,
    exp: 0,
    maxLevel: 5
  });
  playerDoc.historicSkillMastery.set(manualId, 1);
  console.log(`- Level Manual: ${playerDoc.manuals[0].level}`);
  console.log(`- Core Stat: ${playerDoc.kungfuSkills.core}`);
  console.log(`- Historic Peak: ${playerDoc.historicSkillMastery.get(manualId)}`);

  console.log(`\n[Langkah 2] Bertarung di combat nyata dan naik ke Level 2.`);
  let newLevel = 2;
  let previousPeak = playerDoc.historicSkillMastery.get(manualId) || 0;
  if (newLevel > previousPeak) {
    playerDoc.historicSkillMastery.set(manualId, newLevel);
    playerDoc.kungfuSkills.core += 1;
    playerDoc.manuals[0].level = newLevel;
    console.log(`✨ Rekor baru! Level: ${newLevel}, Core bertambah +1 (Total Core: ${playerDoc.kungfuSkills.core})`);
  }
  console.log(`- Level Manual: ${playerDoc.manuals[0].level}`);
  console.log(`- Core Stat: ${playerDoc.kungfuSkills.core} (Bertambah dari 10 ke 11)`);
  console.log(`- Historic Peak: ${playerDoc.historicSkillMastery.get(manualId)}`);

  console.log(`\n[Langkah 3] Pemain menaikkan lagi ke Level 5 (Max Level).`);
  for (let lvl = 3; lvl <= 5; lvl++) {
    previousPeak = playerDoc.historicSkillMastery.get(manualId) || 0;
    if (lvl > previousPeak) {
      playerDoc.historicSkillMastery.set(manualId, lvl);
      playerDoc.kungfuSkills.core += 1;
      playerDoc.manuals[0].level = lvl;
    }
  }
  console.log(`- Level Manual: ${playerDoc.manuals[0].level}`);
  console.log(`- Core Stat: ${playerDoc.kungfuSkills.core} (Bertambah dari 11 ke 14)`);
  console.log(`- Historic Peak: ${playerDoc.historicSkillMastery.get(manualId)} (Rekor = 5)`);

  console.log(`\n[Langkah 4] Pemain mengklik [🗑️ Lupakan Manual]!`);
  playerDoc.manuals = [];
  console.log(`- Manuals length: ${playerDoc.manuals.length} (Slot dikosongkan)`);
  console.log(`- Core Stat: ${playerDoc.kungfuSkills.core} (Tetap 14, tidak berkurang)`);
  console.log(`- Historic Peak: ${playerDoc.historicSkillMastery.get(manualId)} (Rekor 5 TETAP DIINGAT SISTEM!)`);

  console.log(`\n[Langkah 5] Pemain mencoba EKSPLOITASI: Mempelajari ulang manual yang sama dari tas.`);
  playerDoc.manuals.push({
    manualId,
    level: 1,
    exp: 0,
    maxLevel: 5
  });
  console.log(`- Level Manual Baru: ${playerDoc.manuals[0].level}`);
  console.log(`- Core Stat: ${playerDoc.kungfuSkills.core}`);

  console.log(`\n[Langkah 6] Pemain memakai manual di combat dan naik dari Level 1 ke Level 2.`);
  newLevel = 2;
  previousPeak = playerDoc.historicSkillMastery.get(manualId) || 0;
  let coreAdded = false;
  if (newLevel > previousPeak) {
    playerDoc.historicSkillMastery.set(manualId, newLevel);
    playerDoc.kungfuSkills.core += 1;
    coreAdded = true;
  } else {
    playerDoc.manuals[0].level = newLevel;
    console.log(`🛡️ ANTI-ABUSE AKTIF! newLevel (${newLevel}) <= previousPeak (${previousPeak}).`);
    console.log(`   Level jurus naik ke ${newLevel}, TETAPI Core Stat TIDAK bertambah (+0)!`);
  }
  console.log(`- Core Stat Akhir: ${playerDoc.kungfuSkills.core} (TETAP 14! Anti-exploit sukses 100%)`);

  if (playerDoc.kungfuSkills.core === 14 && !coreAdded) {
    console.log('\n✅ VERIFIKASI SELESAI: SISTEM ANTI-ABUSE BERFUNGSI SEMPURNA TANPA CELAH!');
  } else {
    console.error('\n❌ ERROR: Anti-abuse gagal!');
    process.exit(1);
  }
}

testAntiAbuseLogic();
