const XP_PER_ELEMENTAL_CAST = 8;
const MAX_XP_PER_ELEMENT_PER_BATTLE = 40;
const VALID_ROOTS = ['fire', 'water', 'lightning', 'wind', 'earth', 'wood'];

/**
 * Apply combat Spiritual Root XP ke player object (mutasi in-place).
 * @param {Object} player - Mongoose player doc
 * @param {Object} usedElementsCount - { fire: 3, water: 1, ... }
 * @returns {Array<{ element: string, gain: number, casts: number }>} gains untuk display
 */
function applyCombatSpiritualRootXp(player, usedElementsCount) {
  if (!usedElementsCount || typeof usedElementsCount !== 'object') return [];

  if (!player.extendedStats) player.extendedStats = {};
  if (!player.extendedStats.spiritualRoot) {
    player.extendedStats.spiritualRoot = {
      fire: 0, water: 0, lightning: 0, wind: 0, earth: 0, wood: 0
    };
  }

  const gains = [];
  for (const [elem, count] of Object.entries(usedElementsCount)) {
    if (!VALID_ROOTS.includes(elem)) continue;
    if (player.extendedStats.spiritualRoot[elem] === undefined) continue;

    const casts = Number(count) || 0;
    if (casts <= 0) continue;

    const gain = Math.min(casts * XP_PER_ELEMENTAL_CAST, MAX_XP_PER_ELEMENT_PER_BATTLE);
    player.extendedStats.spiritualRoot[elem] =
      (player.extendedStats.spiritualRoot[elem] || 0) + gain;
    gains.push({ element: elem, gain, casts });
  }

  if (gains.length > 0) {
    player.markModified('extendedStats.spiritualRoot');
  }
  return gains;
}

/**
 * XP dari training/comprehend manual ber-rootType
 */
function calcTrainingSpiritualRootXp(manual) {
  const baseXp = 30;
  const tier = Number(manual?.tier || manual?.rank || 1);
  const tierBonus = Math.min(Math.max(tier, 1), 10) * 10;
  return Math.min(baseXp + tierBonus, 100);
}

function applyTrainingSpiritualRootXp(player, rootType, manual) {
  if (!rootType || !VALID_ROOTS.includes(rootType)) return 0;

  if (!player.extendedStats) player.extendedStats = {};
  if (!player.extendedStats.spiritualRoot) {
    player.extendedStats.spiritualRoot = {
      fire: 0, water: 0, lightning: 0, wind: 0, earth: 0, wood: 0
    };
  }

  const xpGain = calcTrainingSpiritualRootXp(manual);
  player.extendedStats.spiritualRoot[rootType] =
    (player.extendedStats.spiritualRoot[rootType] || 0) + xpGain;
  player.markModified('extendedStats.spiritualRoot');
  return xpGain;
}

module.exports = {
  XP_PER_ELEMENTAL_CAST,
  MAX_XP_PER_ELEMENT_PER_BATTLE,
  VALID_ROOTS,
  applyCombatSpiritualRootXp,
  calcTrainingSpiritualRootXp,
  applyTrainingSpiritualRootXp
};
