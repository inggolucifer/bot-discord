/**
 * Life Cycle & Single Death Door Engine for Jianghu Bot Living NPCs (V27 / V28)
 * Authoritative death processing, aging ticks, and family vendetta triggers.
 */

const mongoose = require('mongoose');
const NpcEvent = require('../models/NpcEvent');
const NpcFamily = require('../models/NpcFamily');
const NpcVendetta = require('../models/NpcVendetta');
const { createVendetta } = require('./npcVendettaEngine');

/**
 * Calculates grudge level based on kinship relationship.
 * spouse/child = 5, parent/sibling/patriarch/matriarch = 4, distant kin/relative = 2.
 */
function calculateKinGrudge(memberRole, victimRole) {
  if (memberRole === 'spouse' || memberRole === 'child' || victimRole === 'child') {
    return 5;
  }
  if (memberRole === 'parent' || memberRole === 'sibling' || memberRole === 'patriarch' || memberRole === 'matriarch') {
    return 4;
  }
  return 2;
}

/**
 * PINTU TUNGGAL KEMATIAN (Single Death Door)
 * Seluruh kematian NPC di dunia Jianghu wajib memanggil fungsi ini.
 * 
 * Invariants:
 * 1. Essential NPCs CANNOT DIE (set to downed with injurySeverity 3 and downedUntil +6h).
 * 2. Regular NPCs die permanently (isAlive: false, hp: 0, activityState: 'dead').
 * 3. Family vendettas are differentiated by kinship tier.
 */
async function killNpc(npcOrId, killerInfoOrType = {}, killerId = null, options = {}) {
  let npc = npcOrId;
  if (!npc) throw new Error('killNpc requires valid NPC instance');

  if (typeof npcOrId === 'string' || (npcOrId && mongoose.isValidObjectId(npcOrId) && !npcOrId.vitalStatus)) {
    const Npc = require('../models/Npc');
    npc = await Npc.findById(npcOrId);
  }
  if (!npc) throw new Error('killNpc requires valid NPC instance');

  let killerInfo = {};
  if (typeof killerInfoOrType === 'string') {
    killerInfo = { type: killerInfoOrType, id: killerId, ...(options || {}) };
  } else if (killerInfoOrType && typeof killerInfoOrType === 'object') {
    killerInfo = killerInfoOrType;
  }

  // Idempotency check: Jangan proses dua kali jika karakter sudah wafat
  if (npc.vitalStatus && npc.vitalStatus.isAlive === false) {
    return {
      status: 'dead',
      npc,
      deathEvent: null,
      createdVendettas: [],
      isEssential: npc.vitalStatus.isEssential || false,
      alreadyDead: true
    };
  }

  // ESSENTIAL NPC PROTECTION: DILARANG MATI
  if (npc.vitalStatus && npc.vitalStatus.isEssential === true) {
    npc.vitalStatus.isAlive = true;
    npc.vitalStatus.isInjured = true;
    npc.vitalStatus.injurySeverity = 3;
    npc.vitalStatus.downedUntil = new Date(Date.now() + 6 * 3600 * 1000);
    if (npc.attributes) {
      npc.attributes.hp = 1;
    }
    npc.schedule = npc.schedule || {};
    npc.schedule.activityState = 'downed';

    if (npc.save && typeof npc.save === 'function' && npc.constructor.db && npc.constructor.db.readyState === 1) {
      try {
        await npc.save();
      } catch (e) {}
    }

    return {
      status: 'downed',
      npc,
      deathEvent: null,
      createdVendettas: [],
      isEssential: true
    };
  }

  // 1. Mark Vital Status for regular NPC
  npc.vitalStatus = npc.vitalStatus || {};
  npc.vitalStatus.isAlive = false;
  npc.vitalStatus.isInjured = false;
  if (npc.attributes) {
    npc.attributes.hp = 0;
  }

  npc.lifespan = npc.lifespan || {};
  npc.lifespan.deathTimestamp = new Date();
  npc.lifespan.currentAge = npc.lifespan.maxAge;

  npc.schedule = npc.schedule || {};
  npc.schedule.activityState = 'dead';

  // 2. Generate Death Event
  const killerName = killerInfo.name || 'Takdir Fana';
  const killerType = killerInfo.type || 'nature';
  const resolvedKillerId = killerInfo.id || null;

  const deathDescription = killerType === 'player'
    ? `${npc.name} telah gugur setelah dikalahkan oleh pendekar ${killerName} dalam pertarungan hidup-mati.`
    : (killerType === 'npc'
      ? `${npc.name} telah tewas di tangan ${killerName}.`
      : `${npc.name} telah menghembuskan nafas terakhirnya dan bersatu kembali dengan semesta.`);

  const deathEvent = new NpcEvent({
    npcId: npc._id,
    eventType: 'death',
    description: deathDescription,
    relatedEntityId: resolvedKillerId,
    relatedEntityType: killerType === 'player' ? 'player' : (killerType === 'npc' ? 'npc' : null),
    metadata: {
      killerName,
      killerType,
      settlementName: npc.settlementName,
      anchorId: npc.schedule?.currentAnchorId
    }
  });

  if (deathEvent.save && deathEvent.constructor.db && deathEvent.constructor.db.readyState === 1) {
    try {
      await deathEvent.save();
    } catch (e) {}
  }

  // 3. Trigger Family & Kin Vendettas (Hanya untuk kerabat, derajat dendam terukur)
  const createdVendettas = [];
  if (resolvedKillerId && (killerType === 'player' || killerType === 'npc')) {
    let family = null;
    if (killerInfo.familyDoc) {
      family = killerInfo.familyDoc;
    } else if (npc.social && npc.social.familyId) {
      if (NpcFamily.db && NpcFamily.db.readyState === 1) {
        try {
          family = await NpcFamily.findById(npc.social.familyId);
        } catch (e) {}
      }
    }

    if (family && Array.isArray(family.members)) {
      const victimMember = family.members.find(m => m.npcId && m.npcId.toString() === npc._id.toString());
      const victimRole = victimMember ? victimMember.role : null;

      for (const member of family.members) {
        // Skip deceased NPC
        if (member.npcId && member.npcId.toString() === npc._id.toString()) continue;

        const grudgeLevel = calculateKinGrudge(member.role, victimRole);

        const vendetta = await createVendetta({
          hunterNpcId: member.npcId,
          targetId: resolvedKillerId,
          targetType: killerType,
          grudgeLevel,
          reason: `Balas dendam atas kematian ${member.role} (${npc.name})`,
          victimNpcName: npc.name,
          victimRelation: member.role
        });

        createdVendettas.push(vendetta);
      }
    }
  }

  // 4. Save NPC state if Mongoose document
  if (npc.save && typeof npc.save === 'function' && npc.constructor.db && npc.constructor.db.readyState === 1) {
    try {
      await npc.save();
    } catch (e) {}
  }

  return {
    status: 'dead',
    npc,
    deathEvent,
    createdVendettas,
    isEssential: false
  };
}

/**
 * Advances life tick for an NPC (aging, breakthrough, or natural death).
 * Compatible with both synchronous and asynchronous caller awaiting.
 */
function advanceNpcLifeTick(npc, deltaMonths = 1, rng) {
  if (!npc || !npc.vitalStatus || !npc.vitalStatus.isAlive) {
    return { status: 'dead' };
  }
  const rollRng = typeof rng === 'function' ? rng : () => 0.5;

  // Aging
  const yearsAdded = deltaMonths / 12;
  npc.lifespan.currentAge = Math.floor(npc.lifespan.currentAge + yearsAdded);

  // Check death by old age
  if (npc.lifespan.currentAge >= npc.lifespan.maxAge && !npc.lifespan.isImmortal) {
    npc.vitalStatus.isAlive = false;
    npc.schedule = npc.schedule || {};
    npc.schedule.activityState = 'dead';
    const killPromise = killNpc(npc, { type: 'nature', name: 'Usia Lanjut' });
    const res = { status: 'died_of_old_age', npc };
    res.then = (onFulfilled, onRejected) => killPromise.then(() => onFulfilled(res), onRejected);
    return res;
  }

  // Passive Breakthrough Chance (5% base if conditions met)
  if (npc.cultivation && !npc.cultivation.bottlenecks) {
    const breakthroughRoll = rollRng();
    if (breakthroughRoll < (npc.cultivation.breakthroughRate || 0.05)) {
      if (npc.cultivation.stage < 9) {
        npc.cultivation.stage += 1;
        return { status: 'stage_breakthrough', stage: npc.cultivation.stage, npc };
      } else if (npc.cultivation.realmIndex < 8 && breakthroughRoll < 0.01) {
        npc.cultivation.realmIndex += 1;
        npc.cultivation.stage = 1;
        return { status: 'realm_breakthrough', realmIndex: npc.cultivation.realmIndex, npc };
      }
    }
  }

  return { status: 'alive', npc };
}

module.exports = {
  killNpc,
  advanceNpcLifeTick,
  calculateKinGrudge
};
