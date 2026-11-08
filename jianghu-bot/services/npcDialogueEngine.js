/**
 * Dynamic Visual Novel Dialogue Engine for Living NPCs (V27)
 * Resolves Wuxia-flavored narrative dialogues with personality adaptations.
 */

const fs = require('fs');
const path = require('path');

let scriptsCache = null;

function getDialogueScripts() {
  if (!scriptsCache) {
    const filePath = path.resolve(__dirname, '../world-data/npc-dialogue-scripts-v27.json');
    scriptsCache = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return scriptsCache;
}

function getAffinityStage(affinity = 0) {
  if (affinity <= -60) return 'nemesis';
  if (affinity <= -20) return 'hateful';
  if (affinity < 0) return 'wary';
  if (affinity < 20) return 'neutral';
  if (affinity < 50) return 'friendly';
  if (affinity < 80) return 'close_friend';
  return 'soulmate';
}

function resolveHonorific(npc, player, affinity = 0) {
  const stage = getAffinityStage(affinity);
  const pGender = (player && player.gender) || 'male';

  if (stage === 'soulmate') return pGender === 'female' ? 'Kekasih Jiwa' : 'Belahan Jiwa';
  if (stage === 'close_friend') return 'Saudara Sejiwa';
  if (stage === 'friendly') return 'Rekan Dao Terhormat';
  if (stage === 'wary') return 'Pengelana Asing';
  if (stage === 'hateful') return 'Manusia Munafik';
  if (stage === 'nemesis') return 'Musuh Bebuyutan';
  return 'Rekan Dao';
}

function replacePlaceholders(template, replacements = {}) {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, String(value || ''));
  }
  return result;
}

function resolveGreeting(npc, player, affinity = 0) {
  const scripts = getDialogueScripts();
  const stage = getAffinityStage(affinity);
  const stageGreetings = scripts.greetings[stage] || scripts.greetings.neutral;

  const personalityId = (npc.personality && npc.personality.primary) || 'righteous';
  const rawTemplate = stageGreetings[personalityId] || stageGreetings.default || 'Salam, Rekan Dao {playerName}.';

  const honorific = resolveHonorific(npc, player, affinity);
  const replacements = {
    playerName: (player && (player.characterName || player.name)) || 'Pendekar',
    npcName: npc.name || 'Warga Jianghu',
    sectName: (npc.social && npc.social.sectName) || 'Sekte Jianghu',
    honorific
  };

  return replacePlaceholders(rawTemplate, replacements);
}

function resolveDialogue(npc, player, actionType = 'chat', outcome = 'success', context = {}) {
  const scripts = getDialogueScripts();
  const affinity = context.affinity !== undefined ? context.affinity : 0;
  const personalityId = (npc.personality && npc.personality.primary) || 'righteous';

  const actionBlock = scripts.actions[actionType] || scripts.actions.chat;
  const outcomeBlock = actionBlock[outcome] || actionBlock.success || actionBlock.accept || actionBlock.execute || {};

  let rawTemplate = outcomeBlock[personalityId] || outcomeBlock.default;
  if (!rawTemplate) {
    // If still missing, pick first available string in block
    const keys = Object.keys(outcomeBlock);
    rawTemplate = keys.length > 0 ? outcomeBlock[keys[0]] : `... {npcName} menatap {playerName} dalam keheningan.`;
  }

  const honorific = resolveHonorific(npc, player, affinity);
  const replacements = {
    playerName: (player && (player.characterName || player.name)) || 'Pendekar',
    npcName: npc.name || 'Warga Jianghu',
    sectName: (npc.social && npc.social.sectName) || 'Sekte Jianghu',
    itemName: context.itemName || 'Benda Pusaka',
    amount: context.amount || '',
    honorific
  };

  return replacePlaceholders(rawTemplate, replacements);
}

module.exports = {
  getAffinityStage,
  resolveHonorific,
  replacePlaceholders,
  resolveGreeting,
  resolveDialogue
};
