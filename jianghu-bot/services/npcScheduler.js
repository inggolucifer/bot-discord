/**
 * Activity Scheduling Engine for Living NPCs (V27)
 * Maps Jianghu 12 Shichen into daily cultivator routines.
 */

const { getJianghuTime, getShichenFromHour } = require('../utils/npcTime');

function resolveCurrentActivity(npc, jianghuTime) {
  const shichenId = jianghuTime.shichenId || getShichenFromHour(jianghuTime.hour || 12).id;
  const role = (npc.vitalStatus && npc.vitalStatus.essentialRole) || 'cultivator';

  // 1. Late Night (Zi, Chou, Yin: 23:00 - 05:00) -> Sleep / Rest at Residences
  if (['zi', 'chou', 'yin'].includes(shichenId)) {
    return {
      activityState: 'sleeping',
      targetFacility: 'residences',
      description: `${npc.name} sedang beristirahat memulihkan energi dantian di kediaman warga.`
    };
  }

  // 2. Morning to Midday (Mao, Chen, Si: 05:00 - 11:00) -> Primary Work / Practice
  if (['mao', 'chen', 'si'].includes(shichenId)) {
    let targetFacility = 'market';
    if (role === 'innkeeper') targetFacility = 'inn';
    else if (role === 'blacksmith') targetFacility = 'workshop';
    else if (role === 'alchemist') targetFacility = 'market';
    else if (role === 'sect_disciple') targetFacility = 'sect_hall';
    else if (role === 'guard') targetFacility = 'gate';
    else targetFacility = 'bounty_board';

    return {
      activityState: 'working',
      targetFacility,
      description: `${npc.name} sedang tekun menjalankan tugas di ${targetFacility}.`
    };
  }

  // 3. Midday (Wu, Wei: 11:00 - 15:00) -> Lunch & Socializing
  if (['wu', 'wei'].includes(shichenId)) {
    const targetFacility = role === 'innkeeper' ? 'inn' : 'tavern';
    return {
      activityState: 'socializing',
      targetFacility,
      description: `${npc.name} sedang bersantai menikmati arak beras dan bertukar kabar di ${targetFacility}.`
    };
  }

  // 4. Afternoon (Shen, You: 15:00 - 19:00) -> Martial Training / Duty
  if (['shen', 'you'].includes(shichenId)) {
    let targetFacility = 'workshop';
    if (role === 'sect_disciple') targetFacility = 'sect_hall';
    else if (role === 'guard') targetFacility = 'gate';
    else targetFacility = 'bounty_board';

    return {
      activityState: 'training',
      targetFacility,
      description: `${npc.name} sedang melatih jurus beladiri atau berpatroli.`
    };
  }

  // 5. Evening (Xu, Hai: 19:00 - 23:00) -> Meditation / Evening Wind Down
  return {
    activityState: 'meditating',
    targetFacility: 'residences',
    description: `${npc.name} sedang bermeditasi menyelaraskan meridian di malam hening.`
  };
}

function updateNpcScheduleState(npc, jianghuTime = getJianghuTime()) {
  if (!npc || !npc.vitalStatus || !npc.vitalStatus.isAlive) {
    if (npc && npc.schedule) npc.schedule.activityState = 'dead';
    return npc;
  }

  const activity = resolveCurrentActivity(npc, jianghuTime);
  npc.schedule = npc.schedule || {};
  npc.schedule.activityState = activity.activityState;
  npc.schedule.currentFacility = activity.targetFacility;
  npc.buildingName = activity.targetFacility;

  return {
    npc,
    activity
  };
}

module.exports = {
  resolveCurrentActivity,
  updateNpcScheduleState
};
