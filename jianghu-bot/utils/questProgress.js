const Quest = require('../models/Quest');
const Player = require('../models/Player');

async function evaluateQuestProgress(player, quest, questLogEntry, context = {}) {
  // context: { npcIdTalked, submittedItems }
  let allDone = true;

  for (let i = 0; i < quest.objectives.length; i++) {
    const objective = quest.objectives[i];
    let progress = questLogEntry.objectiveProgress.find(p => p.index === i);

    if (!progress) {
      progress = { index: i, done: false };
      questLogEntry.objectiveProgress.push(progress);
    }

    if (progress.done) continue;

    switch (objective.type) {
      case 'talk_to_npc':
        if (context.npcIdTalked && context.npcIdTalked.toString() === objective.targetNpcId.toString()) {
          progress.done = true;
        } else {
          allDone = false;
        }
        break;

      case 'reach_settlement':
        if (player.currentLocation.settlementName === objective.targetSettlementName && !context.isTraveling) {
          progress.done = true;
        } else {
          allDone = false;
        }
        break;

      case 'reach_building':
        if (player.currentLocation.settlementName === objective.targetSettlementName &&
            player.currentLocation.buildingName === objective.targetBuildingName &&
            !context.isTraveling) {
          progress.done = true;
        } else {
          allDone = false;
        }
        break;

      case 'submit_item':
        if (context.submittedItems &&
            context.submittedItems.itemId &&
            context.submittedItems.itemId.toString() === objective.itemId.toString()) {

          progress.submittedQty = (progress.submittedQty || 0) + context.submittedItems.quantity;
          if (progress.submittedQty >= objective.quantity) {
             progress.done = true;
          } else {
             allDone = false;
          }
        } else {
          if ((progress.submittedQty || 0) < objective.quantity) {
            allDone = false;
          }
        }
        break;


      case 'kill_beast':
        if (context.killedBeastName && objective.target && context.killedBeastName.toLowerCase() === objective.target.toLowerCase()) {
           progress.submittedQty = (progress.submittedQty || 0) + (context.amount || 1);
           if (progress.submittedQty >= (objective.amount || objective.quantity || 1)) {
              progress.done = true;
           } else {
              allDone = false;
           }
        } else {
           if ((progress.submittedQty || 0) < (objective.amount || objective.quantity || 1)) {
               allDone = false;
           }
        }
        break;

      case 'defeat_bandit':
        if (context.defeatedBandit) {
           progress.submittedQty = (progress.submittedQty || 0) + (context.amount || 1);
           if (progress.submittedQty >= (objective.amount || objective.quantity || 1)) {
              progress.done = true;
           } else {
              allDone = false;
           }
        } else {
           if ((progress.submittedQty || 0) < (objective.amount || objective.quantity || 1)) {
               allDone = false;
           }
        }
        break;

      case 'wait_time':
        const now = new Date();
        if (progress.waitDeadlineAt && now >= progress.waitDeadlineAt) {
          progress.done = true;
        } else {
          allDone = false;
        }
        break;
    }
  }

  return { updatedProgress: questLogEntry.objectiveProgress, allDone };
}

module.exports = { evaluateQuestProgress };
