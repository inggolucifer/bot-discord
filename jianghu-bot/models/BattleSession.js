const mongoose = require('mongoose');

const battleEntitySchema = new mongoose.Schema({
  entityId: { type: String, required: true },
  entityType: { type: String, enum: ['player', 'monster', 'npc'], required: true },
  name: { type: String, required: true },
  level: { type: Number, default: 1 },
  imageUrl: { type: String, default: null },
  
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
    type: { type: String, enum: ['attack_up', 'defense_up', 'speed_up', 'regen', 'shield'] },
    value: Number,
    duration: Number // in ticks/turns
  }],
  debuffs: [{
    name: String,
    type: { type: String, enum: ['poison', 'burn', 'stun', 'defense_down', 'speed_down', 'stance_break'] },
    value: Number,
    duration: Number
  }],
  
  // Skills
  skills: [{
    skillId: String,
    name: String,
    description: String,
    type: { type: String, enum: ['attack', 'heal', 'buff', 'debuff', 'ultimate'] },
    power: Number,
    qiCost: Number,
    cooldown: Number,
    currentCooldown: { type: Number, default: 0 }
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
  enemies: [battleEntitySchema],
  
  // Turn/Tick Management
  currentTick: { type: Number, default: 0 },
  turnQueue: [String], // Array of entityIds ready to act
  
  // Combat Log
  logs: [{
    tick: Number,
    actor: String,
    target: String,
    action: String, // 'attack', 'skill', 'flee', 'item_failed'
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
    items: [{
      itemId: String,
      name: String,
      quantity: Number
    }]
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => Date.now() + 30 * 60 * 1000 } // Battle expires after 30 mins
});

battleSessionSchema.index({ battleId: 1 });
battleSessionSchema.index({ 'player.entityId': 1, status: 1 });

module.exports = mongoose.model('BattleSession', battleSessionSchema);
