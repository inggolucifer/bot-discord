/**
 * Life Cycle & Single Death Door Engine for Jianghu Bot Living NPCs (V27)
 * Authoritative death processing, aging ticks, and family vendetta triggers.
 */

const NpcEvent = require('../models/NpcEvent');
const NpcFamily = require('../models/NpcFamily');
const NpcVendetta = require('../models/NpcVendetta');
const { createVendetta } = require('./npcVendettaEngine');

/**
 * PINTU TUNGGAL KEMATIAN (Single Death Door)
 * Seluruh kematian NPC di dunia Jianghu wajib memanggil fungsi ini.
 */
async function killNpc(npc, killerInfo = {}) {
  if (!npc) throw new Error('killNpc requires valid NPC instance');

  // Idempotency check: Jangan proses dua kali jika karakter sudah wafat
  if (npc.vitalStatus && npc.vitalStatus.isAlive === false) {
    return {
      npc,
      deathEvent: null,
      createdVendettas: [],
      isEssential: npc.vitalStatus.isEssential || false,
      alreadyDead: true
    };
  }

  // 1. Mark Vital Status
  npc.vitalStatus = npc.vitalStatus || {};
  npc.vitalStatus.isAlive = false;
  npc.vitalStatus.isInjured = false;

  npc.lifespan = npc.lifespan || {};
  npc.lifespan.deathTimestamp = new Date();
  npc.lifespan.currentAge = npc.lifespan.maxAge;

  npc.schedule = npc.schedule || {};
  npc.schedule.activityState = 'dead';

  // 2. Generate Death Event
  const killerName = killerInfo.name || 'Takdir Fana';
  const killerType = killerInfo.type || 'nature';
  const killerId = killerInfo.id || null;

  const deathDescription = killerType === 'player'
    ? `${npc.name} telah gugur setelah dikalahkan oleh pendekar ${killerName} dalam pertarungan hidup-mati.`
    : (killerType === 'npc'
      ? `${npc.name} telah tewas di tangan ${killerName}.`
      : `${npc.name} telah menghembuskan nafas terakhirnya dan bersatu kembali dengan semesta.`);

  const deathEvent = new NpcEvent({
    npcId: npc._id,
    eventType: 'death',
    description: deathDescription,
    relatedEntityId: killerId,
    relatedEntityType: killerType === 'player' ? 'player' : (killerType === 'npc' ? 'npc' : null),
    metadata: {
      killerName,
      killerType,
      settlementName: npc.settlementName,
      anchorId: npc.schedule.currentAnchorId
    }
  });

  if (deathEvent.save && deathEvent.constructor.db && deathEvent.constructor.db.readyState === 1) {
    try {
      await deathEvent.save();
    } catch (e) {
      // safe fallback
    }
  }

  // 3. Trigger Family & Kin Vendettas
  const createdVendettas = [];
  if (killerId && (killerType === 'player' || killerType === 'npc')) {
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
      for (const member of family.members) {
        // Skip deceased NPC
        if (member.npcId.toString() === npc._id.toString()) continue;

        const vendetta = await createVendetta({
          hunterNpcId: member.npcId,
          targetId: killerId,
          targetType: killerType,
          grudgeLevel: 5, // Maximum grudge for family death
          reason: `Balas dendam atas pembunuhan ${member.role} tercinta (${npc.name})`,
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
    } catch (e) {
      // safe fallback
    }
  }

  return {
    npc,
    deathEvent,
    createdVendettas,
    isEssential: npc.vitalStatus.isEssential || false
  };
}

function advanceNpcLifeTick(npc, deltaMonths = 1, rng = Math.random) {
  if (!npc || !npc.vitalStatus || !npc.vitalStatus.isAlive) {
    return { status: 'dead' };
  }

  // Aging
  const yearsAdded = deltaMonths / 12;
  npc.lifespan.currentAge = Math.floor(npc.lifespan.currentAge + yearsAdded);

  // Check death by old age
  if (npc.lifespan.currentAge >= npc.lifespan.maxAge && !npc.lifespan.isImmortal) {
    killNpc(npc, { type: 'nature', name: 'Usia Lanjut' });
    return { status: 'died_of_old_age', npc };
  }

  // Passive Breakthrough Chance (5% base if conditions met)
  if (npc.cultivation && !npc.cultivation.bottlenecks) {
    const breakthroughRoll = rng();
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
  advanceNpcLifeTick
};
