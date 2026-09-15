const { simulateBattle } = require('./simulateBattle');

/**
 * Menghitung peluang encounter/ambush di grid berdasarkan ambientDangerTier dan tile hazard
 */
function calculateGridEncounterChance(ambientDangerTier = 1, isHazardTile = false) {
  const tier = Math.max(1, Number(ambientDangerTier) || 1);
  let chance = tier * 0.05; // Tier 1: 5%, Tier 2: 10%, Tier 3: 15%, dst.

  if (isHazardTile) {
    chance += 0.25; // Bonus +25% peluang jika melangkah ke tile hazard
  }

  return Math.min(0.80, Math.max(0.05, chance));
}

/**
 * Membuat data lawan (bandit atau monster) sesuai format simulateBattle
 */
function createGridOpponent(ambientDangerTier = 1, isHazardTile = false) {
  const tier = Math.max(1, Number(ambientDangerTier) || 1);
  const groupSize = Math.max(1, Math.min(5, Math.floor(Math.random() * tier) + (isHazardTile ? 2 : 1)));

  const baseHp = 120;
  const baseAtk = 12;
  const baseDef = 5;
  const baseSpd = 8;

  const tierMultiplier = 1 + (tier - 1) * 0.25;
  const totalHp = Math.floor(baseHp * tierMultiplier * (1 + 0.5 * (groupSize - 1)));
  const totalAtk = Math.floor(baseAtk * tierMultiplier * (1 + 0.6 * (groupSize - 1)));
  const totalDef = Math.floor(baseDef * tierMultiplier * (1 + 0.4 * (groupSize - 1)));
  const totalSpd = Math.floor(baseSpd * tierMultiplier * (1 + 0.2 * (groupSize - 1)));

  const opponentName = isHazardTile
    ? `Kelompok Monster Buas (${groupSize} ekor)`
    : `Kawanan Bandit Penyamun (${groupSize} orang)`;

  return {
    characterName: opponentName,
    stats: {
      baseHp: totalHp,
      baseAtk: totalAtk,
      baseDef: totalDef,
      baseSpd: totalSpd
    },
    laws: [],
    manuals: [],
    activeBuffs: [],
    equipment: {},
    inventory: [],
    systemCultivation: null
  };
}

/**
 * Menjalankan simulasi pertarungan grid dan memperbarui status pemain
 */
function runGridBattle(player, opponent, ambientDangerTier = 1) {
  const battleResult = simulateBattle(player, opponent, { isPvE: true, allowSteal: true });

  const won = battleResult.winnerIdx === 1;
  player.currentHp = Math.max(1, battleResult.p1Hp);
  player.combatConditions = battleResult.p1Conditions || [];

  let rewardMessage = '';
  if (won) {
    const copperWon = Math.floor((Math.random() * 25 + 15) * ambientDangerTier);
    if (!player.currency) player.currency = { copper: 0, silver: 0, gold: 0 };
    player.currency.copper = (player.currency.copper || 0) + copperWon;
    rewardMessage = `Kamu memenangkan pertarungan dan merampas ${copperWon} Copper!`;
  } else {
    const copperLost = Math.min(player.currency?.copper || 0, 15 * ambientDangerTier);
    if (player.currency && copperLost > 0) {
      player.currency.copper -= copperLost;
    }
    rewardMessage = `Kamu terdesak mundur dengan luka-luka dan kehilangan ${copperLost} Copper!`;
  }

  return {
    won,
    opponentName: opponent.characterName,
    summary: rewardMessage,
    p1HpRemaining: player.currentHp,
    battleResult
  };
}

/**
 * Pengecekan utama encounter saat pergerakan grid atau gathering
 */
function checkAndRunGridEncounter(player, zoneConfig, isHazardTile = false, forcedRoll = null) {
  const dangerTier = zoneConfig?.ambientDangerTier || 1;
  const chance = calculateGridEncounterChance(dangerTier, isHazardTile);

  const roll = forcedRoll !== null ? forcedRoll : Math.random();

  if (roll < chance) {
    const opponent = createGridOpponent(dangerTier, isHazardTile);
    const combatOutcome = runGridBattle(player, opponent, dangerTier);
    return {
      triggered: true,
      dangerTier,
      isHazardTile,
      encounterChance: chance,
      combatOutcome
    };
  }

  return {
    triggered: false,
    dangerTier,
    isHazardTile,
    encounterChance: chance
  };
}

module.exports = {
  calculateGridEncounterChance,
  createGridOpponent,
  runGridBattle,
  checkAndRunGridEncounter
};
