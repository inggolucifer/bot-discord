/**
 * Population Maintenance & Core Role Replenishment Engine (V27 / V28)
 * Ensures every settlement maintains 3 core live roles (Innkeeper, Blacksmith, Alchemist).
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { generateDeterministicNpc } = require('./npcGenerator');
const { makeRng } = require('../utils/npcRng');

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
    const npcDoc = generateDeterministicNpc({
      role,
      anchorId,
      settlementName,
      regionSlug,
      targetRealmIndex: 0,
      targetStage: 3,
      isEssential: false,
      essentialRole: role,
      zoneId: 'tianyuan_world_map'
    }, `${seed}_${role}_${i}`);

    npcDoc._id = new mongoose.Types.ObjectId();
    generatedReplacements.push(npcDoc);
  }

  return generatedReplacements;
}

async function runPopulationTick({
  Npc: NpcModel = null,
  NpcEvent: NpcEventModel = null,
  now = Date.now(),
  targetAnchorId = null,
  maxTotal = 1200
} = {}) {
  const Npc = NpcModel || require('../models/Npc');
  let NpcEvent = NpcEventModel;
  if (!NpcEvent) {
    try { NpcEvent = require('../models/NpcEvent'); } catch (_) {}
  }

  const currentTotal = await Npc.countDocuments({ 'vitalStatus.isAlive': true });
  if (currentTotal >= maxTotal) {
    return 0;
  }

  const rootDir = path.resolve(__dirname, '../');
  const anchorsPath = path.join(rootDir, 'world-data/anchors.json');
  let anchors = [];
  try {
    anchors = JSON.parse(fs.readFileSync(anchorsPath, 'utf8'));
  } catch (_) {
    anchors = [{ id: 'desa_xingcun', name: 'Desa Xingcun', region: 'central_plains', x: 2455, y: 2485, type: 'village' }];
  }

  const targetAnchors = targetAnchorId
    ? anchors.filter(a => a.id === targetAnchorId)
    : anchors.filter(a => a.type !== 'secret_realm' && a.type !== 'danger_zone');

  const gameDayMs = 3600 * 1000; // 1 real hour = 24 game hours
  const newNpcs = [];

  for (const anchor of targetAnchors) {
    const allInAnchor = await Npc.find({
      $or: [
        { 'schedule.currentAnchorId': anchor.id },
        { settlementName: anchor.name }
      ]
    });

    const activeInAnchor = allInAnchor.filter(n => n.vitalStatus?.isAlive !== false);
    const deadInAnchor = allInAnchor.filter(n => n.vitalStatus?.isAlive === false);

    const { missingRoles } = checkAnchorCoreRoles(anchor.id, activeInAnchor);
    if (missingRoles.length === 0) continue;

    // Check if dead core role has been dead for >= 24 game hours
    const eligibleReplacements = [];
    for (const role of missingRoles) {
      const deadOfRole = deadInAnchor.filter(n => n.vitalStatus?.essentialRole === role);
      if (deadOfRole.length > 0) {
        const longestDead = deadOfRole.sort((a, b) => {
          const tA = a.lifespan?.deathTimestamp ? new Date(a.lifespan.deathTimestamp).getTime() : 0;
          const tB = b.lifespan?.deathTimestamp ? new Date(b.lifespan.deathTimestamp).getTime() : 0;
          return tA - tB;
        })[0];
        const deathTime = longestDead?.lifespan?.deathTimestamp ? new Date(longestDead.lifespan.deathTimestamp).getTime() : 0;
        if (now - deathTime >= gameDayMs) {
          eligibleReplacements.push(role);
        }
      } else {
        // Missing role with no record in DB
        eligibleReplacements.push(role);
      }
    }

    if (eligibleReplacements.length > 0) {
      const replacements = replenishMissingRoles({
        anchorId: anchor.id,
        settlementName: anchor.name,
        regionSlug: anchor.region || 'central_plains',
        missingRoles: eligibleReplacements,
        seed: `replenish_${anchor.id}_${now}`
      });

      for (const rep of replacements) {
        rep.tileX = anchor.x || 2455;
        rep.tileY = anchor.y || 2485;
        if (!rep.schedule) rep.schedule = {};
        rep.schedule.tileX = rep.tileX;
        rep.schedule.tileY = rep.tileY;
        rep.schedule.currentAnchorId = anchor.id;
        rep.schedule.homeAnchorId = anchor.id;
        rep.zoneId = 'tianyuan_world_map';
        rep.guildId = 'global';
        newNpcs.push(rep);
      }
    }
  }

  if (newNpcs.length > 0) {
    if (typeof Npc.insertMany === 'function') {
      await Npc.insertMany(newNpcs);
    }
    if (NpcEvent && typeof NpcEvent.create === 'function') {
      for (const npc of newNpcs) {
        try {
          await NpcEvent.create({
            type: 'arrival',
            anchorId: npc.schedule?.currentAnchorId,
            description: `Pendatang baru ${npc.name} (${npc.title}) telah tiba di ${npc.settlementName}.`,
            createdAt: new Date(now)
          });
        } catch (_) {}
      }
    }
  }

  return newNpcs.length;
}

module.exports = {
  CORE_ROLES,
  BACKUP_NPCS,
  checkAnchorCoreRoles,
  replenishMissingRoles,
  runPopulationTick
};
