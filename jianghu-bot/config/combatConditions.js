/**
 * combatConditions.js
 * Master Configuration for Character Conditions & Status Effects
 * Jianghu Bot & Immortal-X
 */

module.exports = {
  // POISON
  POISON_DAMAGE_FACTOR: 0.005, // e.g., value * 0.5% maxHp or proportional damage
  POISON_STEP_DAMAGE_FACTOR: 0.002, // Damage per step when walking on grid while poisoned

  // INJURY
  INJURY_ATK_DEF_REDUCTION_PER_POINT: 0.0045, // 100 injury = ~45% reduction to ATK and DEF
  INJURY_MAX_MP_REDUCTION_PER_POINT: 0.005,  // 100 injury = ~50% reduction to Max MP/Qi
  INJURY_REDUCTION_PER_REST: 20,

  // BLEED
  BLEED_DAMAGE_FACTOR: 0.004, // Bleed DoT per point
  BLEED_DECAY_PER_TURN: 10,   // Bleed decays naturally each turn

  // INTOX
  INTOX_MISS_RATE_PER_POINT: 0.0035, // 100 intox = +35% miss rate in combat
  INTOX_WINE_ART_BONUS_PER_POINT: 0.006, // 100 intox = +60% Drunken Kungfu / wineArt DMG
  INTOX_DECAY_PER_TURN: 5,

  // FROZEN
  FROZEN_THRESHOLD: 30, // >= 30 means completely frozen (cannot move / skip turn)
  FROZEN_DECAY_PER_TURN: 10,
  FIRE_CLEANSE_FROZEN_AMOUNT: 50, // Fire skill reduces frozen by 50 points

  // PSYCHOSIS
  PSYCHOSIS_CONFUSION_CHANCE_PER_POINT: 0.0065, // Max ~65% confusion at 100 psychosis
  PSYCHOSIS_DECAY_PER_TURN: 5,

  // BURN
  BURN_DAMAGE_FACTOR: 0.0035,
  BURN_RAMP_PER_TURN: 5, // Burn worsens by 5 points each turn
  BURN_INCINERATED_THRESHOLD: 75, // >= 75 triggers INCINERATED
  HEALING_REDUCTION_INCINERATED: 0.5, // 50% healing reduction when incinerated
  WATER_CLEANSE_BURN_AMOUNT: 45, // Water skill reduces burn by 45 points

  // KNOCK BACK
  KNOCKBACK_BASE_ATB_REDUCTION: 35, // -35 ATB flat
  KNOCKBACK_ATB_SCALE: 0.3,
  KNOCKBACK_STANCE_DAMAGE: 30,
  KNOCKBACK_WALL_SLAM_THRESHOLD: 50, // If knockback >= 50, triggers wall slam collision
  KNOCKBACK_WALL_SLAM_PERCENT: 0.08, // 8% Max HP collision damage
  KNOCKBACK_QUEUE_SWAP_THRESHOLD: 60, // If knockback >= 60, swap front enemy to queue
};
