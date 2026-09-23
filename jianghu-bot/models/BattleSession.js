const mongoose = require('mongoose');

const battleEntitySchema = new mongoose.Schema({
  entityId: { type: String, required: true },
  entityType: { type: String, enum: ['player', 'monster', 'npc'], required: true },
  name: { type: String, required: true },
  level: { type: Number, default: 1 },
  imageUrl: { type: String, default: null },
  element: { type: String, default: 'neutral' },
  tierSize: { type: String, enum: ['small', 'medium', 'large', 'boss'], default: 'small' },
  isAlly: { type: Boolean, default: false },
  allyType: { type: String, enum: ['npc', 'pet', null], default: null },
  
  // Stats
  hp: { type: Number, required: true },
  maxHp: { type: Number, required: true },
  qi: { type: Number, default: 0 },
  maxQi: { type: Number, default: 100 },
  stamina: { type: Number, default: 100 },
  maxStamina: { type: Number, default: 100 },
  attack: { type: Number, required: true },
  defense: { type: Number, required: true },
  speed: { type: Number, required: true },
  
  // ATB System
  atb: { type: Number, default: 0 },
  maxAtb: { type: Number, default: 100 },
  
  // Stance Break & Qi Overload
  stance: { type: Number, default: 100 }, // 0 = broken
  maxStance: { type: Number, default: 100 },
  qiOverloadActive: { type: Boolean, default: false },
  
  // Status Effects
  buffs: [{
    name: String,
    type: { type: String, default: 'defense_up' },
    value: Number,
    duration: Number, // in turns
    icon: { type: String, default: '🛡️' },
    description: { type: String, default: '' }
  }],
  debuffs: [{
    name: String,
    type: { type: String, default: 'poison' },
    value: Number,
    duration: Number, // in turns
    icon: { type: String, default: '☠️' },
    description: { type: String, default: '' }
  }],
  conditions: {
    poison: { type: Number, default: 0 },
    injury: { type: Number, default: 0 },
    bleed: { type: Number, default: 0 },
    intox: { type: Number, default: 0 },
    frozen: { type: Number, default: 0 },
    psychosis: { type: Number, default: 0 },
    burn: { type: Number, default: 0 },
    knockback: { type: Number, default: 0 }
  },
  
  // Skills
  skills: [{
    skillId: String,
    name: String,
    description: String,
    type: { type: String, enum: ['attack', 'heal', 'buff', 'debuff', 'ultimate', 'defend'], default: 'attack' },
    icon: { type: String, default: '⚔️' },
    power: { type: Number, default: 10 },
    qiCost: { type: Number, default: 0 },
    cooldown: { type: Number, default: 0 },
    currentCooldown: { type: Number, default: 0 },
    element: { type: String, default: 'neutral' },
    critBonus: { type: Number, default: 0 },
    stanceDmgMult: { type: Number, default: 1.0 },
    aoeAll: { type: Boolean, default: false },
    qiRegen: { type: Number, default: 0 },
    debuffChance: { type: Number, default: 0 },
    debuffType: { type: String, default: null },
    isBasicAttack: { type: Boolean, default: false },
    kungfuDiscipline: { type: String, default: 'fist' }
  }],
  
  isDead: { type: Boolean, default: false }
}, { _id: false });

const battleSessionSchema = new mongoose.Schema({
  battleId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['pve', 'pvp', 'boss'], required: true },
  status: { type: String, enum: ['ongoing', 'won', 'lost', 'fled'], default: 'ongoing' },
  
  // Environment
  zoneId: { type: String, default: 'unknown' },
  weather: { type: String, default: 'clear' },
  
  // Combatants
  player: { type: battleEntitySchema, required: true },
  allies: [battleEntitySchema],
  enemies: [battleEntitySchema], // active enemies in field (up to maxActiveEnemies)
  enemyQueue: [battleEntitySchema], // reserve enemies ready to fill in when an active enemy dies
  
  battleConfig: {
    maxActiveEnemies: { type: Number, default: 4 },
    isBossMode: { type: Boolean, default: false },
    eventContext: { type: String, default: null },
    tileKey: { type: String, default: null },
    zoneId: { type: String, default: null }
  },

  // Turn/Tick Management
  currentTick: { type: Number, default: 0 },
  turnQueue: [String], // Array of entityIds ready to act
  
  // Combat Log
  logs: [{
    tick: Number,
    actor: String,
    target: String,
    action: String, // 'attack', 'skill', 'flee', 'item_failed', 'effect', 'summon'
    skillName: String,
    damage: Number,
    critical: Boolean,
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],

  // Rewards (calculated upon victory)
  rewards: {
    exp: { type: Number, default: 0 },
    silver: { type: Number, default: 0 },
    kungfuExp: [{
      discipline: String,
      amount: Number,
      weaponName: String,
      newLevel: Number,
      levelUp: Boolean
    }],
    items: [{
      itemId: String,
      name: String,
      quantity: Number,
      rarity: { type: String, default: 'common' },
      qualityMultiplier: { type: Number, default: 1.0 }
    }]
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => Date.now() + 30 * 60 * 1000 } // Battle expires after 30 mins
});

battleSessionSchema.index({ 'player.entityId': 1, status: 1 });

module.exports = mongoose.model('BattleSession', battleSessionSchema);
