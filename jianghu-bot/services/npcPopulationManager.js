/**
 * Population Maintenance & Core Role Replenishment Engine (V27)
 * Ensures every settlement maintains 3 core live roles (Innkeeper, Blacksmith, Alchemist).
 */

const { generateDeterministicNpc } = require('./npcGenerator');

const CORE_ROLES = ['innkeeper', 'blacksmith', 'alchemist'];

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
    const npcDoc = generateDeterministicNpc({
      role,
      anchorId,
      settlementName,
      regionSlug,
      targetRealmIndex: 0,
      targetStage: 3,
      isEssential: true,
      essentialRole: role
    }, `${seed}_${role}_${i}`);

    generatedReplacements.push(npcDoc);
  }

  return generatedReplacements;
}

module.exports = {
  CORE_ROLES,
  checkAnchorCoreRoles,
  replenishMissingRoles
};
