/**
 * Population Maintenance & Core Role Replenishment Engine (V27 / V28)
 * Ensures every settlement maintains 3 core live roles (Innkeeper, Blacksmith, Alchemist).
 */

const { generateDeterministicNpc } = require('./npcGenerator');

const CORE_ROLES = ['innkeeper', 'blacksmith', 'alchemist'];

/**
 * 4 Real Backup NPCs (Shuang Ke, Wu Binglin, Yin Ci, Li Keke).
 * Trade roles can die and are replaced by generator, therefore isEssential: false.
 */
const BACKUP_NPCS = [
  {
    name: 'Shuang Ke',
    title: 'Pendekar Pedang Bayangan',
    gender: 'male',
    role: 'innkeeper',
    essentialRole: 'innkeeper',
    isEssential: false
  },
  {
    name: 'Wu Binglin',
    title: 'Saudagar Herba Gunung',
    gender: 'male',
    role: 'alchemist',
    essentialRole: 'alchemist',
    isEssential: false
  },
  {
    name: 'Yin Ci',
    title: 'Penjaga Paviliun Kitab',
    gender: 'male',
    role: 'blacksmith',
    essentialRole: 'blacksmith',
    isEssential: false
  },
  {
    name: 'Li Keke',
    title: 'Murid Alkimia Bunga Persik',
    gender: 'female',
    role: 'alchemist',
    essentialRole: 'alchemist',
    isEssential: false
  }
];

function checkAnchorCoreRoles(anchorId, activeNpcsInAnchor = []) {
  const existingRoles = new Set();

  for (const npc of activeNpcsInAnchor) {
    if (!npc.vitalStatus || !npc.vitalStatus.isAlive) continue;

    // Detect role from essentialRole or inventory/professions
    if (npc.vitalStatus.essentialRole) {
      existingRoles.add(npc.vitalStatus.essentialRole);
    } else if (npc.buildingName === 'inn' || (npc.inventory && npc.inventory.some(i => i.category === 'wine'))) {
      existingRoles.add('innkeeper');
    } else if (npc.buildingName === 'workshop' || (npc.attributes && npc.attributes.professions && npc.attributes.professions.smithing > 0)) {
      existingRoles.add('blacksmith');
    } else if (npc.buildingName === 'market' || (npc.attributes && npc.attributes.professions && npc.attributes.professions.alchemy > 0)) {
      existingRoles.add('alchemist');
    }
  }

  const missingRoles = CORE_ROLES.filter(r => !existingRoles.has(r));
  return {
    existingRoles: Array.from(existingRoles),
    missingRoles
  };
}

function replenishMissingRoles({
  anchorId,
  settlementName = 'Pemukiman Jianghu',
  regionSlug = 'donghai_coastal_plain',
  missingRoles = [],
  seed = 'replenish_seed'
} = {}) {
  const generatedReplacements = [];

  for (let i = 0; i < missingRoles.length; i++) {
    const role = missingRoles[i];
    // Trade role replacements are NOT essential story characters (can die and be replaced)
    const npcDoc = generateDeterministicNpc({
      role,
      anchorId,
      settlementName,
      regionSlug,
      targetRealmIndex: 0,
      targetStage: 3,
      isEssential: false,
      essentialRole: role
    }, `${seed}_${role}_${i}`);

    generatedReplacements.push(npcDoc);
  }

  return generatedReplacements;
}

module.exports = {
  CORE_ROLES,
  BACKUP_NPCS,
  checkAnchorCoreRoles,
  replenishMissingRoles
};
