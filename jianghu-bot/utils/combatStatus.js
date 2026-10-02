/**
 * combatStatus.js
 * Kamus status efek terunifikasi (apply / tick / remove / stack / badges).
 * Digunakan bersama oleh InteractiveBattleService dan simulateBattle.
 */

const COMBAT_STATUS = {
  POISON: {
    id: 'poison',
    kind: 'debuff',
    badge: '☠️',
    name: 'Racun',
    maxStacks: 100,
    tickMode: 'severity',
    baseHpPctPerStack: 0.0015, // 20 stacks = 3% maxHp
  },
  BLEED: {
    id: 'bleed',
    kind: 'debuff',
    badge: '🩸',
    name: 'Pendarahan',
    maxSeverity: 5,
    tickHpPctPerSeverity: 0.03,
    decayPerTurn: 0.5,
  },
  INJURY: {
    id: 'injury',
    kind: 'condition',
    badge: '🦴',
    name: 'Cedera Dalam',
    maxSeverity: 10,
    atkDefPenaltyPerSev: 0.03, // -3% ATK & DEF per severity
    maxMpPenaltyPerSev: 0.02,  // -2% maxMP per severity
    decayPerTurn: 0.25,
    applyOnHitPctOfMaxHp: 0.15, // Serangan >= 15% maxHP memicu injury
  },
  STUN: {
    id: 'stun',
    kind: 'debuff',
    badge: '⚡',
    name: 'Lumpuh (Stun)',
    durationTurns: 1,
    skipTurn: true,
  },
  BURN: {
    id: 'burn',
    kind: 'debuff',
    badge: '🔥',
    name: 'Terbakar',
    maxStacks: 100,
    baseHpPctPerStack: 0.002, // 25 stacks = 5% maxHp
    rampPerTurn: 2,
  },
  FROZEN: {
    id: 'frozen',
    kind: 'debuff',
    badge: '❄️',
    name: 'Membeku',
    threshold: 100,
    skipTurn: true,
  },
  DEFENSE_UP: {
    id: 'defense_up',
    kind: 'buff',
    badge: '🛡️',
    name: 'Pertahanan Baja',
    damageTakenMult: 0.5,
    durationTurns: 1,
  },
  INTOX: {
    id: 'intox',
    kind: 'debuff',
    badge: '🍺',
    name: 'Mabuk',
    maxStacks: 100,
    missRatePerStack: 0.003, // 30 stacks = 9% miss rate
  },
  PSYCHOSIS: {
    id: 'psychosis',
    kind: 'debuff',
    badge: '🌀',
    name: 'Penyimpangan Qi',
    maxStacks: 100,
  }
};

const REFLECT_CAP = 0.25;

/**
 * Normalisasi dan pastikan format conditions, debuffs, dan buffs seragam pada entity.
 */
function ensureCombatState(entity) {
  if (!entity) return null;

  // 1. Normalisasi conditions
  if (!entity.conditions || typeof entity.conditions !== 'object' || Array.isArray(entity.conditions)) {
    // Jika conditions awalnya array (gaya simulateBattle), simpan snapshot dan konversi
    const condArray = Array.isArray(entity.conditions) ? entity.conditions : [];
    entity.conditions = {
      poison: 0,
      injury: 0,
      bleed: 0,
      intox: 0,
      frozen: 0,
      psychosis: 0,
      burn: 0,
      knockback: 0
    };
    for (const c of condArray) {
      if (c && c.type && entity.conditions[c.type] !== undefined) {
        entity.conditions[c.type] = Number(c.severity || c.stacks || 1);
      }
    }
  } else {
    entity.conditions.poison = Math.max(0, Math.min(100, Math.floor(Number(entity.conditions.poison) || 0)));
    entity.conditions.injury = Math.max(0, Math.min(10, Number(entity.conditions.injury) || 0));
    entity.conditions.bleed = Math.max(0, Math.min(5, Number(entity.conditions.bleed) || 0));
    entity.conditions.intox = Math.max(0, Math.min(100, Math.floor(Number(entity.conditions.intox) || 0)));
    entity.conditions.frozen = Math.max(0, Math.min(100, Math.floor(Number(entity.conditions.frozen) || 0)));
    entity.conditions.psychosis = Math.max(0, Math.min(100, Math.floor(Number(entity.conditions.psychosis) || 0)));
    entity.conditions.burn = Math.max(0, Math.min(100, Math.floor(Number(entity.conditions.burn) || 0)));
    entity.conditions.knockback = Math.max(0, Math.min(100, Math.floor(Number(entity.conditions.knockback) || 0)));
  }

  // 2. Normalisasi debuffs
  if (!Array.isArray(entity.debuffs)) {
    entity.debuffs = [];
  }

  // 3. Normalisasi buffs
  if (!Array.isArray(entity.buffs)) {
    entity.buffs = [];
  }

  return entity;
}

/**
 * Terapkan status efek ke entity.
 * Menangani poison, bleed, injury, stun, burn, frozen, defense_up, intox, psychosis.
 */
function applyStatus(entity, statusId, options = {}) {
  if (!entity || !statusId) return null;
  ensureCombatState(entity);

  const key = String(statusId).toLowerCase();
  const severity = Number(options.severity) || 1;
  const duration = Number(options.duration) || 1;
  const stacks = Number(options.stacks) || (severity * 20);

  switch (key) {
    case 'poison': {
      let incoming = stacks || 20;
      const poisonResist = Number(entity.extendedStats?.poisonResist || entity.poisonResist || 0);
      if (poisonResist > 0) {
        const resistFraction = poisonResist <= 1.0 ? poisonResist : (poisonResist / 100);
        incoming = Math.max(1, Math.floor(incoming * (1 - Math.min(0.75, resistFraction))));
      }
      entity.conditions.poison = Math.min(100, entity.conditions.poison + incoming);
      break;
    }
    case 'bleed': {
      entity.conditions.bleed = Math.min(5, Number((entity.conditions.bleed + (severity || 1)).toFixed(2)));
      break;
    }
    case 'injury': {
      entity.conditions.injury = Math.min(10, Number((entity.conditions.injury + (severity || 1)).toFixed(2)));
      break;
    }
    case 'stun': {
      const existingStun = entity.debuffs.find(d => d.type === 'stun');
      if (existingStun) {
        existingStun.duration = Math.max(existingStun.duration, duration);
      } else {
        entity.debuffs.push({
          type: 'stun',
          name: options.name || 'Lumpuh (Stun)',
          duration: duration,
          badge: '⚡',
          icon: '⚡',
          description: 'Melumpuhkan saraf; kehilangan giliran bertindak.'
        });
      }
      break;
    }
    case 'burn': {
      entity.conditions.burn = Math.min(100, entity.conditions.burn + (stacks || 25));
      break;
    }
    case 'frozen': {
      entity.conditions.frozen = Math.min(100, entity.conditions.frozen + (stacks || 35));
      break;
    }
    case 'defense_up': {
      const existingDef = entity.buffs.find(b => b.type === 'defense_up');
      if (existingDef) {
        existingDef.duration = Math.max(existingDef.duration, duration);
        existingDef.value = options.damageTakenMult || 0.5;
      } else {
        entity.buffs.push({
          type: 'defense_up',
          name: options.name || 'Pertahanan Baja',
          duration: duration,
          value: options.damageTakenMult || 0.5,
          badge: '🛡️',
          icon: '🛡️',
          description: 'Kuda-kuda bertahan mereduksi 50% damage serangan lawan.'
        });
      }
      break;
    }
    case 'intox': {
      entity.conditions.intox = Math.min(100, entity.conditions.intox + (stacks || 15));
      break;
    }
    case 'psychosis': {
      entity.conditions.psychosis = Math.min(100, entity.conditions.psychosis + (stacks || 15));
      break;
    }
    default: {
      // Custom generic debuff/buff
      if (options.kind === 'buff') {
        entity.buffs.push({
          type: key,
          name: options.name || key,
          duration,
          value: options.value || 0,
          badge: options.badge || '✨',
          icon: options.icon || '✨',
          description: options.description || ''
        });
      } else {
        entity.debuffs.push({
          type: key,
          name: options.name || key,
          duration,
          value: options.value || 0,
          badge: options.badge || '⚠️',
          icon: options.icon || '⚠️',
          description: options.description || ''
        });
      }
    }
  }

  // Sinkronkan statusBadges
  entity.statusBadges = getStatusBadges(entity);
  return entity;
}

/**
 * Hapus atau bersihkan status efek dari entity.
 */
function removeStatus(entity, statusId) {
  if (!entity || !statusId) return;
  ensureCombatState(entity);
  const key = String(statusId).toLowerCase();

  if (entity.conditions && entity.conditions[key] !== undefined) {
    entity.conditions[key] = 0;
  }

  if (Array.isArray(entity.debuffs)) {
    entity.debuffs = entity.debuffs.filter(d => d.type !== key);
  }

  if (Array.isArray(entity.buffs)) {
    entity.buffs = entity.buffs.filter(b => b.type !== key);
  }

  entity.statusBadges = getStatusBadges(entity);
}

/**
 * Cek apakah entity memiliki status aktif tertentu.
 */
function hasStatus(entity, statusId) {
  if (!entity || !statusId) return false;
  ensureCombatState(entity);
  const key = String(statusId).toLowerCase();

  if (entity.conditions && entity.conditions[key] > 0) return true;
  if (Array.isArray(entity.debuffs) && entity.debuffs.some(d => d.type === key && d.duration > 0)) return true;
  if (Array.isArray(entity.buffs) && entity.buffs.some(b => b.type === key && b.duration > 0)) return true;
  return false;
}

/**
 * Dapatkan pengali damage yang diterima berdasarkan buff bertahan (defense_up).
 */
function getDefenseDamageMultiplier(entity) {
  if (!entity) return 1.0;
  ensureCombatState(entity);

  let mult = 1.0;

  if (Array.isArray(entity.buffs)) {
    const defBuff = entity.buffs.find(b => b.type === 'defense_up' && b.duration > 0);
    if (defBuff) {
      mult *= (Number(defBuff.value) || COMBAT_STATUS.DEFENSE_UP.damageTakenMult);
    }
  } else if (entity.actionType === 'defend') {
    mult *= COMBAT_STATUS.DEFENSE_UP.damageTakenMult;
  }

  // Corrosion debuff: mengikis pertahanan (meningkatkan damage yang diterima)
  if (Array.isArray(entity.debuffs)) {
    const corrDebuff = entity.debuffs.find(d => d.type === 'corrosion' && d.duration > 0);
    if (corrDebuff) {
      mult *= (1 + (Number(corrDebuff.value) || 0.10));
    }
  }

  return mult;
}

/**
 * Dapatkan daftar badge status lengkap untuk rendering UI.
 */
function getStatusBadges(entity) {
  if (!entity) return [];
  ensureCombatState(entity);

  const badges = [];
  const conds = entity.conditions || {};

  // 1. Poison
  if (conds.poison > 0) {
    const sev = Math.max(1, Math.ceil(conds.poison / 20));
    const descText = `Hawa beracun merenggut HP tiap ronde (${conds.poison}%)`;
    badges.push({
      id: 'poison',
      badge: '☠️',
      label: 'Racun',
      severity: sev,
      stacks: conds.poison,
      duration: null,
      kind: 'debuff',
      description: descText,
      desc: descText
    });
  }

  // 2. Bleed
  if (conds.bleed > 0) {
    const sev = Math.max(1, Math.floor(conds.bleed));
    const descText = `Pendarahan luka robek (-${Math.round(conds.bleed * 3)}% HP/turn)`;
    badges.push({
      id: 'bleed',
      badge: '🩸',
      label: 'Pendarahan',
      severity: sev,
      stacks: conds.bleed,
      duration: null,
      kind: 'debuff',
      description: descText,
      desc: descText
    });
  }

  // 3. Injury
  if (conds.injury > 0) {
    const sev = Math.floor(conds.injury);
    const penaltyPct = Math.round(sev * 3);
    const descText = `Cedera organ dalam (-${penaltyPct}% ATK/DEF, -${Math.round(sev * 2)}% Qi)`;
    badges.push({
      id: 'injury',
      badge: '🦴',
      label: 'Cedera Dalam',
      severity: sev,
      stacks: null,
      duration: null,
      kind: 'condition',
      description: descText,
      desc: descText
    });
  }

  // 4. Burn
  if (conds.burn > 0) {
    const sev = Math.max(1, Math.ceil(conds.burn / 25));
    const descText = `Kobaran api membakar tubuh (${conds.burn}%)`;
    badges.push({
      id: 'burn',
      badge: '🔥',
      label: 'Terbakar',
      severity: sev,
      stacks: conds.burn,
      duration: null,
      kind: 'debuff',
      description: descText,
      desc: descText
    });
  }

  // 5. Frozen
  if (conds.frozen > 0) {
    const sev = Math.max(1, Math.ceil(conds.frozen / 25));
    const descText = conds.frozen >= 100 ? 'Membeku kaku (tidak dapat bergerak)' : `Hawa dingin es (${conds.frozen}%)`;
    badges.push({
      id: 'frozen',
      badge: '❄️',
      label: 'Membeku',
      severity: sev,
      stacks: conds.frozen,
      duration: null,
      kind: 'debuff',
      description: descText,
      desc: descText
    });
  }

  // 6. Intox
  if (conds.intox > 0) {
    const sev = Math.max(1, Math.ceil(conds.intox / 25));
    const descText = `Pengaruh arak mengurangi akurasi serangan (${conds.intox}%)`;
    badges.push({
      id: 'intox',
      badge: '🍺',
      label: 'Mabuk',
      severity: sev,
      stacks: conds.intox,
      duration: null,
      kind: 'debuff',
      description: descText,
      desc: descText
    });
  }

  // 7. Psychosis
  if (conds.psychosis > 0) {
    const sev = Math.max(1, Math.ceil(conds.psychosis / 25));
    const descText = `Qi meridian tidak stabil (${conds.psychosis}%)`;
    badges.push({
      id: 'psychosis',
      badge: '🌀',
      label: 'Penyimpangan Qi',
      severity: sev,
      stacks: conds.psychosis,
      duration: null,
      kind: 'debuff',
      description: descText,
      desc: descText
    });
  }

  // 8. Stun & custom debuffs
  if (Array.isArray(entity.debuffs)) {
    entity.debuffs.forEach(d => {
      if (d.duration > 0) {
        const descText = d.description || 'Kehilangan giliran bertindak';
        badges.push({
          id: d.type || 'stun',
          badge: d.badge || d.icon || '⚡',
          label: d.name || 'Lumpuh',
          severity: 1,
          stacks: null,
          duration: d.duration,
          kind: 'debuff',
          description: descText,
          desc: descText
        });
      }
    });
  }

  // 9. Buffs (defense_up dll)
  if (Array.isArray(entity.buffs)) {
    entity.buffs.forEach(b => {
      if (b.duration > 0) {
        const descText = b.description || 'Mereduksi kerusakan yang diterima';
        badges.push({
          id: b.type || 'defense_up',
          badge: b.badge || b.icon || '🛡️',
          label: b.name || 'Bertahan',
          severity: 1,
          stacks: null,
          duration: b.duration,
          kind: 'buff',
          description: descText,
          desc: descText
        });
      }
    });
  }

  return badges;
}

/**
 * Jalankan 1 putaran tick status pada akhir ronde untuk satu entity.
 * Menangani DoT damage (Poison, Bleed, Burn), peluruhan durasi (Stun, Buffs),
 * serta peluruhan alami Injury.
 *
 * @param {Object} entity - player atau enemy entity
 * @param {Object} ctx - { maxHp, isStandby, actionType }
 * @returns {Object} { logs: string[], hpDelta: number, skipTurn: boolean, isDead: boolean }
 */
function tickStatuses(entity, ctx = {}) {
  const result = {
    logs: [],
    hpDelta: 0,
    skipTurn: false,
    isDead: false
  };

  if (!entity || entity.isDead) return result;
  ensureCombatState(entity);

  const conds = entity.conditions;
  const maxHp = ctx.maxHp || entity.maxHp || 100;
  const entityName = entity.name || entity.characterName || 'Pendekar';
  const isStandby = !!ctx.isStandby || ctx.actionType === 'defend';

  // 1. POISON TICK
  if (conds.poison > 0) {
    if (isStandby) {
      result.logs.push(`🛡️ ${entityName} menjaga ketenangan dantian (Standby). Racun terhambat dan tidak mengalir melukai tubuh!`);
    } else {
      let dmg = Math.max(2, Math.floor(maxHp * (conds.poison * 0.0015)));
      const isPoisonLaw = entity.cultivationLaw?.activeLawType === 'demonic_myriad_venom' || entity.activeLawType === 'demonic_myriad_venom';
      const tolerancePct = entity.cultivationLaw?.demonicData?.venomTolerancePct || (isPoisonLaw ? 20 : 0);
      if (tolerancePct > 0) {
        dmg = Math.max(1, Math.floor(dmg * (1 - (tolerancePct / 100))));
      }

      if (isPoisonLaw) {
        entity.hp = Math.max(1, entity.hp - dmg);
        conds.poison = Math.max(0, conds.poison - 5);
        result.hpDelta -= dmg;
        result.logs.push(`☠️ Hawa racun batin menggerogoti meridian ${entityName}, merenggut ${dmg} HP (Sisa: ${entity.hp} HP)! Racun mereda ke ${conds.poison}.`);
      } else {
        entity.hp = Math.max(0, entity.hp - dmg);
        result.hpDelta -= dmg;
        if (entity.hp <= 0) {
          entity.isDead = true;
          result.isDead = true;
        }
        result.logs.push(`☠️ Racun menggerogoti organ tubuh ${entityName}, merenggut ${dmg} HP!${entity.isDead ? ` 💀 (${entityName} gugur oleh racun!)` : ''}`);
      }
    }
  }

  // 2. BLEED TICK
  if (conds.bleed > 0 && !entity.isDead) {
    const dmg = Math.max(2, Math.floor(maxHp * (conds.bleed * COMBAT_STATUS.BLEED.tickHpPctPerSeverity)));
    entity.hp = Math.max(0, entity.hp - dmg);
    result.hpDelta -= dmg;
    conds.bleed = Math.max(0, Number((conds.bleed - COMBAT_STATUS.BLEED.decayPerTurn).toFixed(2)));
    if (entity.hp <= 0) {
      entity.isDead = true;
      result.isDead = true;
    }
    result.logs.push(`🩸 Luka terbuka ${entityName} mengalirkan darah segar! Menderita ${dmg} DMG! (Pendarahan mereda ke ${conds.bleed})${entity.isDead ? ` 💀 (${entityName} gugur karena kehabisan darah!)` : ''}`);
  }

  // 3. BURN TICK
  if (conds.burn > 0 && !entity.isDead) {
    const burnBonus = Math.min(0.015, Number(entity.extendedStats?.burnTickBonus || ctx.burnTickBonus || 0));
    const dmg = Math.max(2, Math.floor(maxHp * (conds.burn * (COMBAT_STATUS.BURN.baseHpPctPerStack + burnBonus))));
    entity.hp = Math.max(0, entity.hp - dmg);
    result.hpDelta -= dmg;
    conds.burn = Math.max(0, conds.burn - 5);
    if (entity.hp <= 0) {
      entity.isDead = true;
      result.isDead = true;
    }
    result.logs.push(`🔥 Api membakar tubuh ${entityName}! Menderita ${dmg} DMG!${entity.isDead ? ` 💀 (${entityName} hangus terbakar!)` : ''}`);
  }

  // 4. INJURY DECAY (Luka dalam menyusut secara bertahap setiap ronde)
  if (conds.injury > 0) {
    conds.injury = Math.max(0, Number((conds.injury - COMBAT_STATUS.INJURY.decayPerTurn).toFixed(2)));
  }

  // 5. DEBUFFS TICK (Stun duration dsb)
  if (Array.isArray(entity.debuffs)) {
    entity.debuffs = entity.debuffs.filter(d => {
      d.duration -= 1;
      return d.duration > 0;
    });
  }

  // 6. BUFFS TICK (Defense_up duration dsb)
  if (Array.isArray(entity.buffs)) {
    entity.buffs = entity.buffs.filter(b => {
      b.duration -= 1;
      return b.duration > 0;
    });
  }

  // 7. FROZEN & INTOX DECAY
  if (conds.frozen > 0) {
    conds.frozen = Math.max(0, conds.frozen - 10);
  }
  if (conds.intox > 0) {
    conds.intox = Math.max(0, conds.intox - 5);
  }

  // Sinkronkan badge terbaru setelah tick
  entity.statusBadges = getStatusBadges(entity);
  return result;
}

/**
 * Sinergi Law saat serangan mendarat (Skill/Basic Hit):
 * - Demonic Myriad Venom: Menyuntikkan racun ke darah lawan
 * - Gu Master: Peluang racun jika Gu bertag poison / poisonProcFromGu
 * - Pure Yang: Resist 30% efek racun yang masuk ke defender
 * - Sword Heart: Peluang bleed pada tebasan pedang (crit / swordBleedChance)
 * - Heavy Hit Injury: Jika damage >= 15% Max HP defender (bisa ditolak injuryResist)
 * - Phoenix Fire: burnProcStacks on hit (Cap 15)
 * - Azure Water: chillProcChance (Cap 25%) & spdSlowOnHit (Cap 20%)
 * - Xuanwu Earth / Natal Relic: defenseUpProcChance on defender (Cap 20%)
 * - God Thunder: stunProcChance on hit (Cap 15%)
 * - Demonic Blood Soul: lifesteal on hit (Cap 8%)
 * - Demonic Myriad Venom: corrosionDefShred (Cap 15%)
 */
function onSkillHitLawExtras({ attacker, defender, skill, damage, isCrit }) {
  const notes = [];
  if (!attacker || !defender || damage <= 0) return { notes };

  ensureCombatState(attacker);
  ensureCombatState(defender);

  const atkLaw = attacker.cultivationLaw?.activeLawType || attacker.activeLawType;
  const defLaw = defender.cultivationLaw?.activeLawType || defender.activeLawType;

  // 1. Heavy Hit Injury Check (>= 15% Max HP) with injuryResist
  const maxHp = defender.maxHp || 100;
  if (damage >= maxHp * COMBAT_STATUS.INJURY.applyOnHitPctOfMaxHp) {
    const injuryResist = Math.min(0.40, Number(defender.extendedStats?.injuryResist || 0));
    if (injuryResist > 0 && Math.random() < injuryResist) {
      notes.push('🛡️ [Raga Baja: Berhasil menahan benturan dan menolak cedera dalam!]');
    } else {
      applyStatus(defender, 'injury', { severity: 1 });
      notes.push('🦴 [Serangan Telak: Memicu Cedera Dalam!]');
    }
  }

  // 2. Demonic Myriad Venom & Venom Poison Proc
  if (atkLaw === 'demonic_myriad_venom') {
    let poisonStacks = 25;
    // Pure Yang Defender: Resistensi hawa kotor/racun (stacks berkurang 30%)
    if (defLaw === 'righteous_pure_yang') {
      poisonStacks = Math.floor(poisonStacks * 0.70);
      notes.push('☀️ [Hawa Murni Yang menahan 30% racun lawan!]');
    }
    applyStatus(defender, 'poison', { stacks: poisonStacks });
    notes.push('☠️ [Myriad Venom: Hawa racun menyusup ke meridian lawan!]');
  } else if (Number(attacker.extendedStats?.venomPoisonProc || 0) > 0) {
    const vProc = Number(attacker.extendedStats.venomPoisonProc);
    let pStacks = Math.max(10, Math.floor(vProc * 100));
    if (defLaw === 'righteous_pure_yang') {
      pStacks = Math.floor(pStacks * 0.70);
      notes.push('☀️ [Hawa Murni Yang menahan 30% racun lawan!]');
    }
    applyStatus(defender, 'poison', { stacks: pStacks });
    notes.push('☠️ [Hawa Racun Batin: Serangan menularkan racun ke meridian lawan!]');
  }

  // 3. Gu Master -> Peluang racun jika membawa Gu bertag poison / poisonProcFromGu
  if (atkLaw === 'gu_master') {
    const guSlots = attacker.cultivationLaw?.guSlots || [];
    const hasPoisonGu = guSlots.some(g => g && (g.guType === 'poison' || g.element === 'poison' || (g.tags && g.tags.includes('poison'))));
    const extraPoison = Math.min(0.30, Number(attacker.extendedStats?.poisonProcFromGu || 0));
    const guPoisonChance = (hasPoisonGu ? 0.35 : 0) + extraPoison;
    if (guPoisonChance > 0 && Math.random() < guPoisonChance) {
      let poisonStacks = 20;
      if (defLaw === 'righteous_pure_yang') {
        poisonStacks = Math.floor(poisonStacks * 0.70);
      }
      applyStatus(defender, 'poison', { stacks: poisonStacks });
      notes.push('🐛 [Gu Beracun: Gigitan Gu menularkan bisa mematikan!]');
    }
  }

  // 4. Righteous Sword Heart -> Peluang pendarahan (Bleed) saat serangan kritikal atau swordBleedChance
  const swordBleed = Math.min(0.25, Number(attacker.extendedStats?.swordBleedChance || 0));
  if ((atkLaw === 'righteous_sword_heart' && isCrit) || (swordBleed > 0 && Math.random() < swordBleed)) {
    applyStatus(defender, 'bleed', { severity: 1 });
    notes.push('🗡️ [Hati Pedang: Tebasan memicu luka pendarahan robek!]');
  }

  // 5. Phoenix Fire -> burnProcStacks on hit (Cap 15)
  const burnProc = Math.min(15, Number(attacker.extendedStats?.burnProcStacks || 0));
  if (burnProc > 0) {
    applyStatus(defender, 'burn', { stacks: burnProc });
    notes.push(`🔥 [Api Feniks: Menyulut kobaran +${burnProc} stack api!]`);
  }

  // 6. Azure Water -> chillProcChance (Cap 25%) & spdSlowOnHit (Cap 20%)
  const chillChance = Math.min(0.25, Number(attacker.extendedStats?.chillProcChance || 0));
  if (chillChance > 0 && Math.random() < chillChance) {
    const slowPct = Math.min(0.20, Number(attacker.extendedStats?.spdSlowOnHit || 0.10));
    applyStatus(defender, 'chill', {
      kind: 'debuff',
      name: 'Hawa Dingin',
      duration: 2,
      value: slowPct,
      badge: '❄️',
      icon: '❄️',
      description: `Gerakan melambat (-${Math.round(slowPct * 100)}% Kecepatan)`
    });
    if (typeof defender.speed === 'number' && defender.speed > 0) {
      defender.speed = Math.max(1, Math.floor(defender.speed * (1 - slowPct)));
    }
    if (defender.conditions) {
      defender.conditions.frozen = Math.min(100, (defender.conditions.frozen || 0) + 15);
    }
    notes.push(`❄️ [Air Biru: Hawa dingin membekukan meridian (-${Math.round(slowPct * 100)}% SPD)!]`);
  }

  // 7. Xuanwu Earth / Natal Relic -> Guard proc on Defender (defenseUpProcChance, Cap 20%)
  const defUpChance = Math.min(0.20, Number(defender.extendedStats?.defenseUpProcChance || 0));
  if (defUpChance > 0 && Math.random() < defUpChance) {
    applyStatus(defender, 'defense_up', { duration: 1, damageTakenMult: 0.5 });
    notes.push('🛡️ [Kuda-kuda Kokoh: Memicu Pertahanan Baja 1 Ronde!]');
  }

  // 8. God Thunder -> Shock Stun proc (stunProcChance, Cap 15%)
  const stunChance = Math.min(0.15, Number(attacker.extendedStats?.stunProcChance || 0));
  if (stunChance > 0 && Math.random() < stunChance) {
    applyStatus(defender, 'stun', { duration: 1 });
    notes.push('⚡ [Sengatan Petir Dewa: Melumpuhkan (Stun) saraf lawan 1 ronde!]');
  }

  // 9. Demonic Blood Soul -> Lifesteal on damage dealt (lifestealPct, Cap 8%)
  const lifesteal = Math.min(0.08, Number(attacker.extendedStats?.lifestealPct || 0));
  if (lifesteal > 0 && damage > 0) {
    const healAmt = Math.max(1, Math.floor(damage * lifesteal));
    const maxAtkHp = attacker.maxHp || 100;
    const curHp = attacker.hp || maxAtkHp;
    attacker.hp = Math.min(maxAtkHp, curHp + healAmt);
    notes.push(`🩸 [Hisapan Darah: Memulihkan +${healAmt} HP dari luka lawan!]`);
  }

  // 10. Demonic Myriad Venom -> Acid Corrosion Def Shred (corrosionDefShred, Cap 15%)
  const corrosion = Math.min(0.15, Number(attacker.extendedStats?.corrosionDefShred || 0));
  if (corrosion > 0) {
    applyStatus(defender, 'corrosion', {
      kind: 'debuff',
      name: 'Asam Korosif',
      duration: 2,
      value: corrosion,
      badge: '☣️',
      icon: '☣️',
      description: `Zirah terkikis asam (-${Math.round(corrosion * 100)}% DEF)`
    });
    notes.push(`☣️ [Bisa Asam: Mengikis zirah pertahanan lawan (-${Math.round(corrosion * 100)}% DEF)!]`);
  }

  return { notes };
}

/**
 * Sinergi Law pada awal giliran (Turn Start):
 * - Pure Yang: Peluang membersihkan (cleanse) racun di meridian
 * - Qingdi Wood / Phoenix: Combat HP Regen per ronde
 */
function onTurnStartLawExtras({ entity, session }) {
  const notes = [];
  if (!entity) return { notes };
  ensureCombatState(entity);

  const lawType = entity.cultivationLaw?.activeLawType || entity.activeLawType;

  // 1. Pure Yang Cleanse: 25% + skill yangCleanseChance peluang memurnikan racun setiap awal giliran
  const skillCleanseChance = Number(entity.extendedStats?.yangCleanseChance || 0);
  const baseCleanseChance = (lawType === 'righteous_pure_yang') ? 0.25 : 0;
  const totalCleanseChance = baseCleanseChance + skillCleanseChance;

  if (totalCleanseChance > 0 && entity.conditions?.poison > 0) {
    if (Math.random() < totalCleanseChance || entity.conditions.poison >= 60) {
      const cleansed = Math.min(entity.conditions.poison, 25);
      entity.conditions.poison = Math.max(0, entity.conditions.poison - cleansed);
      entity.statusBadges = getStatusBadges(entity);
      notes.push(`☀️ [Hawa Murni Yang membakar racun meridian (-${cleansed} Racun)!]`);
    }
  }

  // 2. Qingdi Wood / Phoenix: Combat HP Regen per ronde (combatHpRegenPct, Cap 3% Max HP)
  const hpRegenPct = Math.min(0.03, Number(entity.extendedStats?.combatHpRegenPct || 0));
  if (hpRegenPct > 0 && entity.hp > 0) {
    const maxHp = entity.maxHp || 100;
    const healAmt = Math.max(1, Math.floor(maxHp * hpRegenPct));
    entity.hp = Math.min(maxHp, entity.hp + healAmt);
    notes.push(`🍃 [Pemulihan Hayat: Menyerap intisari alam, pulih +${healAmt} HP!]`);
  }

  return { notes };
}

module.exports = {
  COMBAT_STATUS,
  REFLECT_CAP,
  ensureCombatState,
  applyStatus,
  removeStatus,
  hasStatus,
  getDefenseDamageMultiplier,
  getStatusBadges,
  tickStatuses,
  onSkillHitLawExtras,
  onTurnStartLawExtras
};
