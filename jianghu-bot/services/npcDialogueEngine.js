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

function getDefaultDialogueChoices(relation) {
  const affinity = relation?.affinity ?? 0;
  const choices = [
    { id: 'choice_chat', label: 'Berbincang santai', action: 'chat' },
    { id: 'choice_inquire', label: 'Tanyakan kabar Jianghu', action: 'inquire' },
    { id: 'choice_spar', label: 'Ajak latihan tanding', action: 'spar' }
  ];
  if (affinity >= 20) {
    choices.push({ id: 'choice_gift', label: 'Beri hadiah', action: 'gift' });
  }
  if (affinity >= 50) {
    choices.push({ id: 'choice_favor', label: 'Minta bantuan', action: 'request_favor' });
  }
  if (affinity >= 60 && !relation?.specialStatus?.isSwornSibling) {
    choices.push({ id: 'choice_recruit', label: 'Ajak berkelana bersama', action: 'recruit' });
  }
  if (affinity >= 70 && !relation?.specialStatus?.isDaoCompanion) {
    choices.push({ id: 'choice_confess', label: 'Nyatakan isi hati', action: 'confess' });
  }
  return choices;
}

function generateDialogueLine({ npc, player = {}, relation = {}, actionContext = 'greeting', rng = Math.random, payload = {} }) {
  const affinity = relation?.affinity ?? 0;
  let text = '';

  if (actionContext === 'greeting') {
    if (npc.dialogLines && npc.dialogLines.length > 0 && npc.dialogLines[0].text) {
      text = npc.dialogLines[0].text;
    } else {
      text = resolveGreeting(npc, player, affinity);
    }
  } else if (actionContext === 'gift') {
    text = resolveDialogue(npc, player, 'gift', 'liked', { affinity, ...(payload || {}) });
  } else if (actionContext === 'steal_caught') {
    text = resolveDialogue(npc, player, 'steal', 'caught', { affinity, ...(payload || {}) });
  } else if (actionContext === 'threaten_submit') {
    text = resolveDialogue(npc, player, 'threaten', 'success', { affinity, ...(payload || {}) });
  } else if (actionContext === 'threaten_resist') {
    text = resolveDialogue(npc, player, 'threaten', 'failure', { affinity, ...(payload || {}) });
  } else {
    text = resolveDialogue(npc, player, actionContext, 'success', { affinity, ...(payload || {}) });
  }

  return {
    text,
    speakerName: npc.name || 'Warga Jianghu',
    choices: getDefaultDialogueChoices(relation)
  };
}

module.exports = {
  getAffinityStage,
  resolveHonorific,
  replacePlaceholders,
  resolveGreeting,
  resolveDialogue,
  getDefaultDialogueChoices,
  generateDialogueLine
};
