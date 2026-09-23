/**
 * conditionEngine.js
 * Authoritative Character Conditions & Status Effects Engine
 * Jianghu Bot & Immortal-X (Server Authoritative)
 */

const COMBAT_COND = require('../config/combatConditions');

const CONDITION_METADATA = {
  poison: {
    key: 'poison',
    name: 'Racun (Poison)',
    icon: '☠️',
    color: '#10b981',
    description: 'Kehilangan HP saat menyerang atau melangkah di peta. Posisi Standby / Diam tidak memicu luka racun.',
    combatEffect: 'HP berkurang saat menyerang/menggunakan item. Aman saat Standby/Kuda-kuda.',
    mapEffect: 'Kehilangan HP per petak langkah saat melangkah di peta.',
    cureHint: 'Pil Penawar Racun, Herba Detoks, Istirahat Pengobatan.'
  },
  injury: {
    key: 'injury',
    name: 'Luka Dalam (Injury)',
    icon: '🩹',
    color: '#f59e0b',
    description: 'Kerusakan meridian dan dantian. Mereduksi ATK, DEF, dan kapasitas maksimal MP/Qi tubuh.',
    combatEffect: 'Mereduksi ATK & DEF hingga -45% dan menurunkan Max MP/Qi.',
    mapEffect: 'Pemulihan stamina dan Qi internal terhambat.',
    cureHint: 'Salep Jin Chuang, Pil Pemulih Meridian, Meditasi Penyembuhan.'
  },
  bleed: {
    key: 'bleed',
    name: 'Pendarahan (Bleed)',
    icon: '🩸',
    color: '#ef4444',
    description: 'Luka sobek mengucurkan darah. Kehilangan HP setiap ronde dan berkurang seiring berjalannya turn.',
    combatEffect: 'Kehilangan HP per ronde, mereda secara alami setiap giliran (-10).',
    mapEffect: 'Mereda bertahap seiring berjalannya waktu dan penghentian luka.',
    cureHint: 'Perban Sutra, Bubuk Penghenti Darah (Stop Bleed Powder).'
  },
  intox: {
    key: 'intox',
    name: 'Mabuk Arak (Intox)',
    icon: '🍶',
    color: '#a855f7',
    description: 'Pengaruh alkohol spiritual. Meningkatkan Miss Rate, namun MENINGKATKAN DMG Jurus Arak (Drunken Kungfu).',
    combatEffect: 'Miss rate meningkat (hingga +35%), namun jurus Wine Art/Tinju Arak menguat drastis (+30% s/d +60%).',
    mapEffect: 'Metabolisme tubuh perlahan menguraikan alkohol seiring waktu.',
    cureHint: 'Teh Pengusir Mabuk, Air Dingin Segar, Istirahat.'
  },
  frozen: {
    key: 'frozen',
    name: 'Membeku (Frozen)',
    icon: '❄️',
    color: '#06b6d4',
    description: 'Hawa es ekstrem. Jika nilai >= 30, tubuh MEMBEKU TOTAL (skip turn & blokir pergerakan). Skill Api mencairkan seketika.',
    combatEffect: 'Nilai >= 30: Tidak bisa bertindak (Skip Turn). Jurus Api langsung memotong hawa es dan memicu Unfreeze!',
    mapEffect: 'Nilai >= 30: Kaku di tempat, pergerakan di peta terblokir total.',
    cureHint: 'Skill Elemen Api, Pil Api Yang, Minyak Penghangat, Sumber Air Hangat.'
  },
  psychosis: {
    key: 'psychosis',
    name: 'Penyimpangan Qi (Psychosis)',
    icon: '🌀',
    color: '#ec4899',
    description: 'Pikiran kacau dan delusi. Karakter kehilangan kendali dan tidak dapat membedakan teman atau musuh.',
    combatEffect: 'Peluang kehilangan kontrol: menyerang rekan sekutu (Pet/NPC), melukai diri sendiri, atau meracau.',
    mapEffect: 'Gangguan konsentrasi meditasi dan halusinasi dialog.',
    cureHint: 'Pil Hati Jernih (Qingxin Pill), Dupa Penenang Jiwa.'
  },
  burn: {
    key: 'burn',
    name: 'Luka Bakar (Burn)',
    icon: '🔥',
    color: '#f97316',
    description: 'Api menjalar di tubuh. Memburuk setiap turn (+5). Pada 75+ berubah jadi INCINERATED (-50% Efektivitas Heal).',
    combatEffect: 'Kehilangan HP per ronde dan api kian membesar. Skill Air & Item Air langsung memadamkannya!',
    mapEffect: 'Luka bakar bertambah parah di lingkungan bersuhu tinggi.',
    cureHint: 'Skill Elemen Air, Item Air Embun, Salep Salju Dingin, Pil Es.'
  },
  knockback: {
    key: 'knockback',
    name: 'Terpelanting (Knock Back)',
    icon: '💨',
    color: '#64748b',
    description: 'Benturan momentum dahsyat. Menunda giliran (ATB Delay), meremukkan Stance, dan dapat menghempas lawan ke dinding.',
    combatEffect: 'Memukul mundur ATB gauge, merusak Stance, memecahkan Kuda-Kuda Bertahan, dan memicu Wall Slam Damage.',
    mapEffect: 'Terhempas mundur 1 petak saat terkena jebakan atau sergapan musuh.',
    cureHint: 'Skill Tanah (Earth), Kuda-kuda Kokoh, Memulihkan Keseimbangan.'
  }
};

/**
 * Normalisasi objek conditions agar selalu memiliki integer bulat >= 0
 */
function normalizeConditions(raw) {
  const c = raw || {};
  const clamp = (val) => Math.min(100, Math.max(0, Math.floor(Number(val) || 0)));
  return {
    poison: clamp(c.poison),
    injury: clamp(c.injury),
    bleed: clamp(c.bleed),
    intox: clamp(c.intox),
    frozen: clamp(c.frozen),
    psychosis: clamp(c.psychosis),
    burn: clamp(c.burn),
    knockback: clamp(c.knockback)
  };
}

/**
 * Menghitung tingkat keparahan (Tier) suatu kondisi
 */
function getConditionLevel(type, value) {
  const val = Math.max(0, Math.floor(Number(value) || 0));
  if (val === 0) {
    return {
      tier: 'Normal',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
      label: 'Normal / Sehat',
      val: 0
    };
  }
  if (type === 'frozen') {
    if (val >= COMBAT_COND.FROZEN_THRESHOLD) {
      return {
        tier: 'Membeku Total',
        badgeColor: 'bg-cyan-950/90 text-cyan-200 border-cyan-400 animate-pulse font-bold',
        label: `Membeku Kaku (${val})`,
        val
      };
    }
    return {
      tier: 'Kedinginan',
      badgeColor: 'bg-cyan-950/60 text-cyan-300 border-cyan-700/60',
      label: `Hawa Dingin (${val})`,
      val
    };
  }
  if (type === 'burn') {
    if (val >= COMBAT_COND.BURN_INCINERATED_THRESHOLD) {
      return {
        tier: 'Incinerated',
        badgeColor: 'bg-orange-950 text-orange-200 border-red-500 animate-pulse font-bold',
        label: `Incinerated! (${val})`,
        val
      };
    }
  }

  if (val <= 25) {
    return {
      tier: 'Ringan',
      badgeColor: 'bg-amber-950/70 text-amber-300 border-amber-700/60',
      label: `Ringan (${val})`,
      val
    };
  } else if (val <= 50) {
    return {
      tier: 'Sedang',
      badgeColor: 'bg-orange-950/80 text-orange-300 border-orange-600/70',
      label: `Sedang (${val})`,
      val
    };
  } else if (val <= 75) {
    return {
      tier: 'Berat',
      badgeColor: 'bg-rose-950/90 text-rose-300 border-rose-600/80',
      label: `Berat (${val})`,
      val
    };
  } else {
    return {
      tier: 'Kritis',
      badgeColor: 'bg-red-950 text-red-200 border-red-500 animate-pulse font-bold',
      label: `Kritis (${val})`,
      val
    };
  }
}

/**
 * Pemrosesan Resonansi Antar-Skill (Elemental Synergy)
 * - Skill Air memadamkan Burn (-35 s/d -50)
 * - Skill Api mencairkan Frozen (-40 s/d -60) dan memicu unfreeze
 * - Skill Tanah memberikan resistensi Knock Back
 */
function processElementalInteractions(actor, skill, target = null) {
  const events = [];
  if (!actor || !skill) return events;

  const rawElem = (skill.element || skill.rootType || '').toLowerCase();
  actor.conditions = normalizeConditions(actor.conditions);

  // 1. SKILL AIR VS BURN (Perapal & Target)
  if (rawElem === 'water' || rawElem === 'air') {
    if (actor.conditions.burn > 0) {
      const reduced = Math.min(actor.conditions.burn, COMBAT_COND.WATER_CLEANSE_BURN_AMOUNT);
      actor.conditions.burn = Math.max(0, actor.conditions.burn - reduced);
      events.push({
        type: 'elemental_cleanse_burn',
        actor: actor.name,
        amount: reduced,
        message: `💧 [Resonansi Air] Aliran Qi air sejuk dari ${skill.name} memadamkan api tubuh ${actor.name}, mereduksi Burn sebesar -${reduced} poin!`
      });
    }

    if (target && target.conditions && target.conditions.burn > 0) {
      const targetBurnReduced = Math.min(target.conditions.burn, 30);
      target.conditions.burn = Math.max(0, target.conditions.burn - targetBurnReduced);
      events.push({
        type: 'steam_burst',
        actor: actor.name,
        target: target.name,
        amount: targetBurnReduced,
        message: `💨 [Ledakan Uap Panas] Hantaman air ${skill.name} menyengat kobaran api ${target.name}, memadamkan -${targetBurnReduced} Burn musuh dalam semburan uap mendidih!`
      });
    }
  }

  // 2. SKILL API VS FROZEN (Mencairkan Pembekuan)
  if (rawElem === 'fire' || rawElem === 'api') {
    if (actor.conditions.frozen > 0) {
      const reduced = Math.min(actor.conditions.frozen, COMBAT_COND.FIRE_CLEANSE_FROZEN_AMOUNT);
      const wasFrozenSolid = actor.conditions.frozen >= COMBAT_COND.FROZEN_THRESHOLD;
      actor.conditions.frozen = Math.max(0, actor.conditions.frozen - reduced);
      const isNowUnfrozen = actor.conditions.frozen < COMBAT_COND.FROZEN_THRESHOLD;

      let msg = `🔥 [Resonansi Api] Hawa panas Yang dari ${skill.name} membakar es internal, mengurangi Frozen -${reduced} poin!`;
      if (wasFrozenSolid && isNowUnfrozen) {
        msg += ` ❄️➡️✨ Es mencair sempurna! ${actor.name} terbebas dari pembekuan (UNFROZEN)!`;
      }
      events.push({
        type: 'elemental_cleanse_frozen',
        actor: actor.name,
        amount: reduced,
        unfrozen: wasFrozenSolid && isNowUnfrozen,
        message: msg
      });
    }
  }

  return events;
}

/**
 * Pemrosesan Efek Knock Back Khusus Turn-Based Combat
 */
function applyKnockbackEffect(session, attacker, target, knockbackPoints = 25) {
  const events = [];
  if (!target) return events;

  target.conditions = normalizeConditions(target.conditions);
  const kbValue = Math.max(1, Math.floor(knockbackPoints));
  target.conditions.knockback = Math.min(100, (target.conditions.knockback || 0) + kbValue);

  // 1. ATB Gauge Pushback
  const atbReduction = Math.floor(COMBAT_COND.KNOCKBACK_BASE_ATB_REDUCTION + (kbValue * COMBAT_COND.KNOCKBACK_ATB_SCALE));
  target.atb = Math.max(0, (target.atb || 0) - atbReduction);
  events.push({
    type: 'knockback_atb',
    target: target.name,
    amount: atbReduction,
    message: `💨 ${target.name} terdorong mundur oleh benturan! Action Gauge (ATB) terpukul mundur -${atbReduction}!`
  });

  // 2. Stance Damage
  const stanceDmg = Math.floor(COMBAT_COND.KNOCKBACK_STANCE_DAMAGE + (kbValue * 0.25));
  target.stance = Math.max(0, (target.stance || 0) - stanceDmg);
  events.push({
    type: 'knockback_stance',
    target: target.name,
    amount: stanceDmg,
    message: `🥋 Kuda-kuda ${target.name} goyah parah! Kehilangan ${stanceDmg} Stance.`
  });

  // 3. Stagger & Guard Break
  if (Array.isArray(target.buffs)) {
    const defendBuffIdx = target.buffs.findIndex(b => b.name === 'Kuda-Kuda Bertahan' || b.type === 'defense_up');
    if (defendBuffIdx !== -1) {
      target.buffs.splice(defendBuffIdx, 1);
      events.push({
        type: 'guard_break',
        target: target.name,
        message: `🛡️💥 [GUARD BREAK] Kuda-kuda bertahan ${target.name} patah secara paksa akibat hantaman Knock Back!`
      });
    }
  }

  // 4. Wall Slam Collision Damage jika knockback >= 50
  if (kbValue >= COMBAT_COND.KNOCKBACK_WALL_SLAM_THRESHOLD) {
    const wallSlamDmg = Math.max(5, Math.floor(target.maxHp * COMBAT_COND.KNOCKBACK_WALL_SLAM_PERCENT));
    target.hp = Math.max(0, target.hp - wallSlamDmg);
    if (target.hp <= 0) target.isDead = true;

    events.push({
      type: 'wall_slam',
      target: target.name,
      damage: wallSlamDmg,
      message: `💥 [WALL SLAM] ${target.name} terhempas kencang menghantam dinding batu arena, menerima ${wallSlamDmg} Collision DMG!${target.isDead ? ` 💀 (${target.name} tumbang!)` : ''}`
    });
  }

  // 5. Multi-Enemy Queue Displacement jika knockback >= 60 dan ada antrian musuh
  if (session && kbValue >= COMBAT_COND.KNOCKBACK_QUEUE_SWAP_THRESHOLD && Array.isArray(session.enemyQueue) && session.enemyQueue.length > 0) {
    const enemyIdx = session.enemies.findIndex(e => e.entityId === target.entityId && !e.isDead);
    if (enemyIdx !== -1) {
      const swappedEnemy = session.enemies[enemyIdx];
      const nextEnemy = session.enemyQueue.shift();
      session.enemies[enemyIdx] = nextEnemy;
      session.enemyQueue.push(swappedEnemy);

      events.push({
        type: 'queue_displacement',
        target: swappedEnemy.name,
        replacement: nextEnemy.name,
        message: `🌪️ [Hempasan Formasi] ${swappedEnemy.name} terpental jauh ke barisan cadangan! ${nextEnemy.name} dipaksa maju menggantikan posisinya!`
      });
    }
  }

  return events;
}

/**
 * Pemrosesan Kondisi pada Akhir Ronde Kombat (Tick Loop)
 */
function processCombatTurnConditions(entity, actionContext = {}) {
  const events = [];
  if (!entity || entity.isDead) return events;

  entity.conditions = normalizeConditions(entity.conditions);
  const conds = entity.conditions;
  const isStandby = !!actionContext.isStandby || actionContext.actionType === 'defend';

  // 1. POISON (Hanya merusak jika BUKAN Standby / Diam)
  if (conds.poison > 0) {
    if (isStandby) {
      events.push({
        type: 'poison_standby',
        actor: entity.name,
        message: `🛡️ ${entity.name} menjaga ketenangan dantian (Standby). Racun terhambat dan tidak mengalir melukai tubuh!`
      });
    } else {
      const dmg = Math.max(2, Math.floor(entity.maxHp * (conds.poison * COMBAT_COND.POISON_DAMAGE_FACTOR)));
      entity.hp = Math.max(0, entity.hp - dmg);
      if (entity.hp <= 0) entity.isDead = true;

      events.push({
        type: 'poison_damage',
        actor: entity.name,
        damage: dmg,
        message: `☠️ Racun menggerogoti organ tubuh ${entity.name} saat beraksi, merenggut ${dmg} HP!${entity.isDead ? ` 💀 (${entity.name} gugur oleh racun!)` : ''}`
      });
    }
  }

  // 2. BLEED (Kehilangan HP, lalu menyusut alami)
  if (conds.bleed > 0) {
    const dmg = Math.max(2, Math.floor(entity.maxHp * (conds.bleed * COMBAT_COND.BLEED_DAMAGE_FACTOR)));
    entity.hp = Math.max(0, entity.hp - dmg);
    if (entity.hp <= 0) entity.isDead = true;

    conds.bleed = Math.max(0, conds.bleed - COMBAT_COND.BLEED_DECAY_PER_TURN);

    events.push({
      type: 'bleed_damage',
      actor: entity.name,
      damage: dmg,
      remainingBleed: conds.bleed,
      message: `🩸 Pendarahan mengucur deras dari ${entity.name} sebesar ${dmg} DMG! (Pendarahan berkurang menjadi ${conds.bleed})`
    });
  }

  // 3. BURN (Kehilangan HP, lalu MEMBURUK +5 setiap ronde)
  if (conds.burn > 0) {
    const isIncinerated = conds.burn >= COMBAT_COND.BURN_INCINERATED_THRESHOLD;
    const mult = isIncinerated ? 1.8 : 1.0;
    const dmg = Math.max(3, Math.floor(entity.maxHp * (conds.burn * COMBAT_COND.BURN_DAMAGE_FACTOR * mult)));
    entity.hp = Math.max(0, entity.hp - dmg);
    if (entity.hp <= 0) entity.isDead = true;

    // Api menjalar memburuk jika tidak dipadamkan
    conds.burn = Math.min(120, conds.burn + COMBAT_COND.BURN_RAMP_PER_TURN);

    let msg = `🔥 Api membakar tubuh ${entity.name} menghasilkan ${dmg} DMG! Api menjalar semakin besar (+${COMBAT_COND.BURN_RAMP_PER_TURN} Burn $\\to$ ${conds.burn}).`;
    if (isIncinerated) {
      msg += ' ⚠️ [STATUS INCINERATED]: Tubuh hangus terbakar arang! Efektivitas penyembuhan terpotong 50%!';
    }
    events.push({
      type: 'burn_damage',
      actor: entity.name,
      damage: dmg,
      isIncinerated,
      newBurn: conds.burn,
      message: msg
    });
  }

  // 4. FROZEN (Mereda setiap ronde)
  if (conds.frozen > 0) {
    const wasFrozenSolid = conds.frozen >= COMBAT_COND.FROZEN_THRESHOLD;
    conds.frozen = Math.max(0, conds.frozen - COMBAT_COND.FROZEN_DECAY_PER_TURN);
    const isNowUnfrozen = conds.frozen < COMBAT_COND.FROZEN_THRESHOLD;

    if (wasFrozenSolid && isNowUnfrozen) {
      events.push({
        type: 'unfrozen_decay',
        actor: entity.name,
        message: `❄️➡️💧 Suhu tubuh ${entity.name} mulai pulih. Lapisan es mencair ke ${conds.frozen} poin, tubuh kembali bebas bergerak (UNFROZEN)!`
      });
    }
  }

  // 5. INTOX (Metabolisme arak mereda)
  if (conds.intox > 0) {
    conds.intox = Math.max(0, conds.intox - COMBAT_COND.INTOX_DECAY_PER_TURN);
  }

  // 6. PSYCHOSIS (Ketenangan pikiran perlahan kembali)
  if (conds.psychosis > 0) {
    conds.psychosis = Math.max(0, conds.psychosis - COMBAT_COND.PSYCHOSIS_DECAY_PER_TURN);
  }

  return events;
}

/**
 * Validasi Pergerakan di Grid Peta (Spasial)
 */
function processGridStepConditions(player, stepCount = 1) {
  if (!player) return { canMove: true, stepDamage: 0 };
  const conds = normalizeConditions(player.conditions);

  // Jika Membeku >= 30, pergerakan terkunci!
  if (conds.frozen >= COMBAT_COND.FROZEN_THRESHOLD) {
    return {
      canMove: false,
      reason: `❄️ Tubuhmu sedang membeku kaku oleh hawa es ekstrem (Frozen: ${conds.frozen})! Tidak dapat melangkah sampai es mencair atau gunakan jurus/obat api.`
    };
  }

  // Jika Teracuni > 0, kehilangan HP per langkah
  let stepDamage = 0;
  if (conds.poison > 0) {
    const maxHp = player.stats?.baseHp || 100;
    stepDamage = Math.max(1, Math.floor(maxHp * (conds.poison * COMBAT_COND.POISON_STEP_DAMAGE_FACTOR) * stepCount));
  }

  return {
    canMove: true,
    stepDamage
  };
}

/**
 * Penyembuhan / Penyesuaian Kondisi Melalui Konsumsi Item
 */
function applyItemConditionCure(player, item) {
  if (!player || !item) return '';
  player.conditions = normalizeConditions(player.conditions);
  const conds = player.conditions;
  const msgs = [];
  const name = (item.name || '').toLowerCase();
  const desc = (item.description || '').toLowerCase();

  // 1. Penawar Racun
  if (name.includes('penawar') || name.includes('antidote') || name.includes('detoks') || desc.includes('racun')) {
    if (conds.poison > 0) {
      const cureAmt = Math.min(conds.poison, 60);
      conds.poison = Math.max(0, conds.poison - cureAmt);
      msgs.push(`Racun berkurang -${cureAmt} (Sisa: ${conds.poison})`);
    }
  }

  // 2. Salep Jin Chuang / Pil Meridian (Injury)
  if (name.includes('jin chuang') || name.includes('jinchuang') || name.includes('meridian') || desc.includes('luka dalam') || desc.includes('injury')) {
    if (conds.injury > 0) {
      const cureAmt = Math.min(conds.injury, 40);
      conds.injury = Math.max(0, conds.injury - cureAmt);
      msgs.push(`Luka dalam berkurang -${cureAmt} (Sisa: ${conds.injury})`);
    }
  }

  // 3. Perban / Penghenti Darah (Bleed)
  if (name.includes('perban') || name.includes('bandage') || name.includes('darah') || desc.includes('pendarahan') || desc.includes('bleed')) {
    if (conds.bleed > 0) {
      const cureAmt = Math.min(conds.bleed, 60);
      conds.bleed = Math.max(0, conds.bleed - cureAmt);
      msgs.push(`Pendarahan berkurang -${cureAmt} (Sisa: ${conds.bleed})`);
    }
  }

  // 4. Arak / Minuman Beralkohol (Intox)
  if (item.category === 'consume' && (name.includes('arak') || name.includes('tuak') || name.includes('wine') || name.includes('alkohol'))) {
    const addIntox = 25;
    conds.intox = Math.min(100, conds.intox + addIntox);
    msgs.push(`Kadar arak meningkat +${addIntox} (Intox: ${conds.intox})`);
  }

  // 5. Teh Pengusir Mabuk (Sobering Tea)
  if (name.includes('teh') || name.includes('sober') || desc.includes('mabuk')) {
    if (conds.intox > 0) {
      const cureAmt = Math.min(conds.intox, 50);
      conds.intox = Math.max(0, conds.intox - cureAmt);
      msgs.push(`Pengaruh mabuk berkurang -${cureAmt} (Sisa: ${conds.intox})`);
    }
  }

  // 6. Pil Api Yang / Minyak Hangat (Frozen)
  if (name.includes('api yang') || name.includes('penghangat') || name.includes('hangat') || desc.includes('beku') || desc.includes('frozen')) {
    if (conds.frozen > 0) {
      const cureAmt = Math.min(conds.frozen, 60);
      conds.frozen = Math.max(0, conds.frozen - cureAmt);
      msgs.push(`Hawa beku mencair -${cureAmt} (Sisa: ${conds.frozen})`);
    }
  }

  // 7. Pil Hati Jernih / Dupa Penenang (Psychosis)
  if (name.includes('hati jernih') || name.includes('qingxin') || name.includes('penenang') || desc.includes('penyimpangan') || desc.includes('delusi')) {
    if (conds.psychosis > 0) {
      const cureAmt = Math.min(conds.psychosis, 50);
      conds.psychosis = Math.max(0, conds.psychosis - cureAmt);
      msgs.push(`Penyimpangan Qi mereda -${cureAmt} (Sisa: ${conds.psychosis})`);
    }
  }

  // 8. Item Air / Salep Salju Dingin (Burn)
  if (name.includes('air embun') || name.includes('salju') || name.includes('air gunung') || name.includes('embun es') || desc.includes('bakar') || desc.includes('burn')) {
    if (conds.burn > 0) {
      const cureAmt = Math.min(conds.burn, 50);
      conds.burn = Math.max(0, conds.burn - cureAmt);
      msgs.push(`Kobaran luka bakar padam -${cureAmt} (Sisa: ${conds.burn})`);
    }
  }

  player.conditions = conds;
  return msgs.length > 0 ? ` [Kondisi: ${msgs.join(', ')}]` : '';
}

module.exports = {
  CONDITION_METADATA,
  normalizeConditions,
  getConditionLevel,
  processElementalInteractions,
  applyKnockbackEffect,
  processCombatTurnConditions,
  processGridStepConditions,
  applyItemConditionCure
};
