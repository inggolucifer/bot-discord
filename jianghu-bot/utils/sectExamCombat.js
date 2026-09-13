const { calculatePlayerStats } = require('./playerCombat');

/**
 * Simplistic, instant-resolution combat engine for sect entrance exams.
 * Returns the combat log and result.
 */
function simulateExamCombat(playerStats, guardianStats) {
  let log = [];
  let playerHp = playerStats.hp;
  let guardianHp = guardianStats.hp;

  let round = 1;
  const maxRounds = 50;

  while (playerHp > 0 && guardianHp > 0 && round <= maxRounds) {
    // Player attacks
    const pDmg = Math.max(1, playerStats.atk - guardianStats.def);
    guardianHp -= pDmg;
    log.push(`Ronde ${round}: Anda menyerang ${guardianStats.name} sebesar ${pDmg} DMG.`);

    if (guardianHp <= 0) {
      log.push(`${guardianStats.name} tumbang! Anda memenangkan ujian combat.`);
      break;
    }

    // Guardian attacks
    const gDmg = Math.max(1, guardianStats.atk - playerStats.def);
    playerHp -= gDmg;
    log.push(`Ronde ${round}: ${guardianStats.name} membalas dengan ${gDmg} DMG.`);

    if (playerHp <= 0) {
      log.push(`Anda telah dikalahkan oleh ${guardianStats.name}.`);
      break;
    }

    round++;
  }

  if (round > maxRounds && playerHp > 0 && guardianHp > 0) {
    log.push(`Waktu habis (50 ronde). Ujian dianggap gagal.`);
    return { won: false, log, playerHpLeft: playerHp, guardianHpLeft: guardianHp };
  }

  return {
    won: playerHp > 0,
    log,
    playerHpLeft: playerHp,
    guardianHpLeft: guardianHp
  };
}

module.exports = { simulateExamCombat };
