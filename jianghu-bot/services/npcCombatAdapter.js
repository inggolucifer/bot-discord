/**
 * Combat Adapter for Living NPCs (V27)
 * Bridges living NPC documents to InteractiveBattleService and battle.js routes.
 */

const Npc = require('../models/Npc');
const NpcPlayerRelation = require('../models/NpcPlayerRelation');
const NpcAmbush = require('../models/NpcAmbush');
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

  // 1. Basic Attack Skill
  skills.push({
    skillId: 'npc_basic_strike',
    name: `Serangan ${npc.title || 'Pendekar'}`,
    type: 'attack',
    power: Math.max(15, Math.floor((npc.attributes ? npc.attributes.attack : 20) * 0.8)),
    qiCost: 0,
    cooldown: 0,
    currentCooldown: 0
  });

  // 2. Elemental / Technique Skill
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

  // 3. Defensive Stance
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
  session,
  player,
  isVictory = true,
  npcDbId,
  mode = 'npc_spar'
}) {
  if (!npcDbId) return { handled: false };

  const npc = await Npc.findById(npcDbId);
  if (!npc) return { handled: false };

  let relation = session.relationDoc || null;
  if (!relation) {
    try {
      relation = await NpcPlayerRelation.findOne({ playerId: player._id, npcId: npc._id });
    } catch (e) {}
  }

  if (mode === 'npc_spar') {
    // Non-lethal sparring: Increase affinity +3 on win/draw
    if (relation) {
      relation.affinity = Math.min(100, Math.max(-100, relation.affinity + 3));
      await relation.save();
    }
    return {
      handled: true,
      mode: 'npc_spar',
      message: `Pertarungan sparring persahabatan dengan ${npc.name} berakhir. Anda berdua saling membungkuk hormat! (Afinitas +3)`
    };
  }

  if (mode === 'npc_duel') {
    if (isVictory) {
      // Lethal Duel: Player killed NPC! Call single death door
      await killNpc(npc, {
        id: player._id,
        type: 'player',
        name: player.characterName
      });

      // Check if duel was in settlement (adds wanted level)
      let wantedIncrease = 0;
      if (session.battleConfig && (session.battleConfig.isSettlement || session.battleConfig.settlementName)) {
        wantedIncrease = 2;
        player.wantedLevel = Math.min(5, (player.wantedLevel || 0) + wantedIncrease);
        player.reputation = Math.max(0, (player.reputation || 100) - 30);
      }

      // Drop NPC Inventory items into player inventory
      const droppedItems = [];
      if (Array.isArray(npc.inventory)) {
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

      await player.save();

      return {
        handled: true,
        mode: 'npc_duel',
        isLethal: true,
        npcDead: true,
        wantedIncrease,
        droppedItems,
        message: `${npc.name} telah tewas dalam duel hidup-mati! ${wantedIncrease > 0 ? `Tingkat buronan Anda bertambah +${wantedIncrease}!` : ''}`
      };
    }
  }

  if (mode === 'npc_ambush') {
    // Resolve ambush
    if (NpcAmbush.db && NpcAmbush.db.readyState === 1) {
      try {
        await NpcAmbush.updateMany(
          { hunterNpcId: npc._id, targetPlayerId: player._id, status: 'triggered' },
          { status: 'resolved' }
        );
      } catch (e) {}
    }
    return {
      handled: true,
      mode: 'npc_ambush',
      message: `Anda berhasil mematahkan serangan mendadak (Ambush) dari ${npc.name}!`
    };
  }

  return { handled: true };
}

module.exports = {
  getPrimaryElement,
  generateNpcCombatSkills,
  convertNpcToBattleEnemy,
  convertNpcToBattleAlly,
  handleNpcBattleResolution
};
