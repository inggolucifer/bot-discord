/**
 * Combat Adapter for Living NPCs (V28 / B5)
 * Bridges living NPC documents to InteractiveBattleService with single death door protection for essential NPCs.
 */

const Npc = require('../models/Npc');
const NpcPlayerRelation = require('../models/NpcPlayerRelation');
const NpcAmbush = require('../models/NpcAmbush');
const NpcVendetta = require('../models/NpcVendetta');
const { killNpc } = require('./npcLifecycle');

function getPrimaryElement(roots = {}) {
  let highest = 0;
  let primary = 'neutral';
  for (const [el, val] of Object.entries(roots)) {
    if (val > highest) {
      highest = val;
      primary = el;
    }
  }
  return primary;
}

function generateNpcCombatSkills(npc) {
  const skills = [];
  const primaryElement = getPrimaryElement(npc.attributes ? npc.attributes.roots : {});

  skills.push({
    skillId: 'npc_basic_strike',
    name: `Serangan ${npc.title || 'Pendekar'}`,
    type: 'attack',
    power: Math.max(15, Math.floor((npc.attributes ? npc.attributes.attack : 20) * 0.8)),
    qiCost: 0,
    cooldown: 0,
    currentCooldown: 0
  });

  const elemName = primaryElement !== 'neutral' ? primaryElement.toUpperCase() : 'QI MURNI';
  skills.push({
    skillId: 'npc_special_art',
    name: `Jurus Intisari ${elemName}`,
    type: 'attack',
    power: Math.max(25, Math.floor((npc.attributes ? npc.attributes.attack : 20) * 1.4)),
    qiCost: 15,
    cooldown: 2,
    currentCooldown: 0,
    element: primaryElement
  });

  skills.push({
    skillId: 'npc_guard_stance',
    name: 'Kuda-kuda Pelindung Dantian',
    type: 'buff',
    power: 0,
    qiCost: 10,
    cooldown: 3,
    currentCooldown: 0,
    effect: { type: 'defense_up', value: 0.5, duration: 1 }
  });

  return skills;
}

function convertNpcToBattleEnemy(npc, mode = 'npc_spar') {
  if (!npc) return null;
  const attrs = npc.attributes || {};
  const primaryElement = getPrimaryElement(attrs.roots);

  return {
    id: `npc_${npc._id}`,
    entityId: `npc_${npc._id}`,
    npcDbId: npc._id.toString(),
    name: npc.name,
    level: Math.max(1, (npc.cultivation ? npc.cultivation.stage : 1)),
    imageUrl: npc.portraitUrl || null,
    element: primaryElement,
    tierSize: 'medium',
    hp: Math.max(20, attrs.hp || 100),
    maxHp: Math.max(20, attrs.maxHp || 100),
    attack: Math.max(5, attrs.attack || 20),
    defense: Math.max(2, attrs.defense || 10),
    speed: Math.max(5, attrs.agility || 15),
    skills: generateNpcCombatSkills(npc),
    tags: ['living_npc', mode],
    category: 'npc_cultivator',
    personality: npc.personality ? npc.personality.primary : 'righteous',
    combatMode: mode
  };
}

function convertNpcToBattleAlly(npc) {
  if (!npc) return null;
  const attrs = npc.attributes || {};
  const primaryElement = getPrimaryElement(attrs.roots);

  return {
    entityId: `ally_npc_${npc._id}`,
    entityType: 'npc_companion',
    name: npc.name,
    level: Math.max(1, (npc.cultivation ? npc.cultivation.stage : 1)),
    imageUrl: npc.portraitUrl || null,
    element: primaryElement,
    hp: Math.max(20, attrs.hp || 100),
    maxHp: Math.max(20, attrs.maxHp || 100),
    attack: Math.max(5, attrs.attack || 20),
    defense: Math.max(2, attrs.defense || 10),
    speed: Math.max(5, attrs.agility || 15),
    skills: generateNpcCombatSkills(npc)
  };
}

async function handleNpcBattleResolution({
  session = {},
  player,
  isVictory = true,
  npcDbId,
  npcDoc = null,
  mode = 'npc_spar',
  chainDepth = 0
}) {
  // Idempotency check: Ensure battle resolution only runs once per battle session
  if (session && session.resolvedNpcBattle) {
    return { handled: true, alreadyResolved: true };
  }
  if (session) {
    session.resolvedNpcBattle = true;
  }

  let npc = npcDoc;
  if (!npc && npcDbId && Npc.db && Npc.db.readyState === 1) {
    try {
      npc = await Npc.findById(npcDbId);
    } catch (_) {}
  }
  if (!npc) return { handled: false };

  let relation = session.relationDoc || null;
  if (!relation && NpcPlayerRelation.db && NpcPlayerRelation.db.readyState === 1) {
    try {
      relation = await NpcPlayerRelation.findOne({ playerId: player._id, npcId: npc._id });
    } catch (_) {}
  }

  // 1. Sparring Mode: Non-lethal, HP >= 1, modifies affinity
  if (mode === 'npc_spar') {
    if (npc.attributes) {
      npc.attributes.hp = Math.max(1, npc.attributes.hp || 100);
    }
    if (npc.vitalStatus) {
      npc.vitalStatus.isAlive = true;
    }
    if (relation) {
      relation.affinity = Math.min(100, Math.max(-100, (relation.affinity || 0) + (isVictory ? 3 : -1)));
      if (typeof relation.save === 'function' && relation.constructor?.db?.readyState === 1) {
        await relation.save();
      }
    }
    return {
      handled: true,
      mode: 'npc_spar',
      isVictory,
      message: `Pertarungan sparring persahabatan dengan ${npc.name} berakhir. Anda berdua saling membungkuk hormat! (Afinitas ${isVictory ? '+3' : '-1'})`
    };
  }

  // 2. Player Defeat in Lethal Modes: NPC remains alive
  if (!isVictory) {
    return {
      handled: true,
      mode,
      isVictory: false,
      playerDied: true,
      message: `Anda dikalahkan oleh ${npc.name}!`
    };
  }

  // 3. Player Victory: Check Essential Protection
  const isEssential = !!(npc.vitalStatus?.isEssential || npc.isEssential);
  const killerInfo = {
    id: player._id,
    type: 'player',
    name: player.characterName || player.name || 'Pendekar',
    power: player.stats?.baseAtk || 50,
    chainDepth
  };

  const deathResult = await killNpc(npc, killerInfo);

  if (isEssential || deathResult.status === 'downed') {
    return {
      handled: true,
      mode,
      isVictory: true,
      downed: true,
      isLethal: false,
      npcDead: false,
      droppedItems: [],
      message: `${npc.name} telah tumbang, bukan tewas! Dantian mereka terluka parah dan membutuhkan masa pemulihan.`
    };
  }

  // Regular NPC Death
  let wantedIncrease = 0;
  if (session.battleConfig && (session.battleConfig.isSettlement || session.battleConfig.settlementName)) {
    wantedIncrease = 2;
    player.wantedLevel = Math.min(5, (player.wantedLevel || 0) + wantedIncrease);
    player.reputation = Math.max(0, (player.reputation || 100) - 30);
  }

  const droppedItems = [];
  if (Array.isArray(npc.inventory) && player.inventory) {
    for (const item of npc.inventory) {
      if (item.itemId) {
        player.inventory.push({
          itemId: item.itemId,
          quantity: item.quantity || 1,
          isEquipped: false
        });
        droppedItems.push(item.name || 'Harta Rampasan');
      }
    }
  }

  if (typeof player.save === 'function' && player.constructor?.db?.readyState === 1) {
    await player.save();
  }

  // Resolve Ambush & Vendetta if in ambush mode
  if (mode === 'npc_ambush') {
    if (NpcAmbush.db && NpcAmbush.db.readyState === 1) {
      try {
        await NpcAmbush.updateMany(
          { hunterNpcId: npc._id, targetPlayerId: player._id, status: { $in: ['pending', 'triggered'] } },
          { status: 'resolved' }
        );
      } catch (_) {}
    }

    if (session.vendettaDoc) {
      session.vendettaDoc.resolved = true;
      session.vendettaDoc.resolutionType = 'hunter_died';
      session.vendettaDoc.resolvedAt = new Date();
      if (typeof session.vendettaDoc.save === 'function' && session.vendettaDoc.constructor?.db?.readyState === 1) {
        await session.vendettaDoc.save();
      }
    }

    if (NpcVendetta.db && NpcVendetta.db.readyState === 1) {
      try {
        await NpcVendetta.updateMany(
          { hunterNpcId: npc._id, targetId: player._id, resolved: false },
          { resolved: true, resolutionType: 'hunter_died', resolvedAt: new Date() }
        );
      } catch (_) {}
    }
  }

  return {
    handled: true,
    mode,
    isVictory: true,
    isLethal: true,
    npcDead: true,
    wantedIncrease,
    droppedItems,
    message: `${npc.name} telah tewas dalam duel hidup-mati! ${wantedIncrease > 0 ? `Tingkat buronan Anda bertambah +${wantedIncrease}!` : ''}`
  };
}

module.exports = {
  getPrimaryElement,
  generateNpcCombatSkills,
  convertNpcToBattleEnemy,
  convertNpcToBattleAlly,
  handleNpcBattleResolution
};
