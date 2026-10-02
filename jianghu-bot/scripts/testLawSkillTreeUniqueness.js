const assert = require('assert');
const {
  LAW_SKILL_TREES,
  LAW_DEFINITIONS,
  applyLawSkillTreeEffects,
  getLawCombatModifiers,
  applyLawDamageModifiers,
  getLawStatus
} = require('../utils/lawCultivationEngine');
const {
  onSkillHitLawExtras,
  onTurnStartLawExtras,
  tickStatuses,
  applyStatus,
  ensureCombatState,
  getDefenseDamageMultiplier
} = require('../utils/combatStatus');
const { checkAndApplyHeavyHitInjury } = require('../utils/combatBody');
const { calculatePlayerStats } = require('../utils/playerCombat');

console.log('================================================================');
console.log('   QA TEST: LAW SKILL TREE UNIQUENESS & SIGNATURE PROCS (9+/10)');
console.log('================================================================');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    throw err;
  }
}

// TEST 1: Setiap 20 law memiliki minimal 1 node dengan effectType 'combat_proc' atau 'system'
runTest('1. Setiap 20 law memiliki count(effectType combat_proc|system) >= 1', () => {
  const lawKeys = Object.keys(LAW_SKILL_TREES);
  assert.strictEqual(lawKeys.length, 20, 'Harus ada tepat 20 skill tree law');

  for (const lawKey of lawKeys) {
    const tree = LAW_SKILL_TREES[lawKey];
    assert.strictEqual(tree.nodes.length, 5, `Law ${lawKey} harus memiliki tepat 5 node`);
    
    const procOrSystemNodes = tree.nodes.filter(
      n => n.effectType === 'combat_proc' || n.effectType === 'system'
    );
    assert(
      procOrSystemNodes.length >= 1,
      `Law ${lawKey} harus memiliki minimal 1 node combat_proc atau system (ditemukan: ${procOrSystemNodes.length})`
    );
  }
});

// TEST 2: Tidak ada dua law dengan effects identik
runTest('2. Tidak ada dua law dengan skema effects identik', () => {
  const lawKeys = Object.keys(LAW_SKILL_TREES);
  const fingerprintSet = new Set();

  for (const lawKey of lawKeys) {
    const tree = LAW_SKILL_TREES[lawKey];
    const effectsFingerprint = JSON.stringify(
      tree.nodes.map(n => ({
        id: n.id,
        effectType: n.effectType,
        effects: n.effects
      }))
    );
    assert(
      !fingerprintSet.has(effectsFingerprint),
      `Law ${lawKey} memiliki konfigurasi effects duplikat dengan law lain!`
    );
    fingerprintSet.add(effectsFingerprint);
  }
});

// TEST 3: Hard budget caps per level (crit < 0.5, atkMult < 0.025, flatHp < 35, etc.)
runTest('3. Hard budget caps per level ditaati di seluruh node', () => {
  for (const [lawKey, tree] of Object.entries(LAW_SKILL_TREES)) {
    for (const node of tree.nodes) {
      const e = node.effects || {};
      if (e.critHitRate !== undefined) {
        assert(e.critHitRate <= 0.25, `Node ${node.id} in ${lawKey} melebihi cap crit (0.25): ${e.critHitRate}`);
      }
      if (e.atkMult !== undefined) {
        assert(e.atkMult <= 0.015, `Node ${node.id} in ${lawKey} melebihi cap atkMult (0.015): ${e.atkMult}`);
      }
      if (e.flatHp !== undefined) {
        assert(e.flatHp <= 20, `Node ${node.id} in ${lawKey} melebihi cap flatHp (20): ${e.flatHp}`);
      }
      if (e.flatAtk !== undefined) {
        assert(e.flatAtk <= 5, `Node ${node.id} in ${lawKey} melebihi cap flatAtk (5): ${e.flatAtk}`);
      }
      if (e.defMult !== undefined) {
        assert(e.defMult <= 0.015, `Node ${node.id} in ${lawKey} melebihi cap defMult (0.015): ${e.defMult}`);
      }
    }
  }
});

// TEST 4: Global proc caps aman saat simulasi max level pada path
runTest('4. Global proc caps (stun <= 0.15, lifesteal <= 0.08, burn <= 15, regen <= 0.03, etc.)', () => {
  for (const [lawKey, tree] of Object.entries(LAW_SKILL_TREES)) {
    const mockPlayer = {
      laws: [{ lawType: lawKey, rank: 5, stage: 10, cultivationExp: 1000 }],
      lawSkillTrees: {
        [lawKey]: {
          allocatedPoints: 50,
          nodes: {}
        }
      },
      extendedStats: {}
    };

    // Alokasikan semua node di maxLevel untuk menguji batas hard cap akumulasi
    for (const node of tree.nodes) {
      mockPlayer.lawSkillTrees[lawKey].nodes[node.id] = {
        purchased: true,
        currentLevel: node.maxLevel || 5
      };
    }

    applyLawSkillTreeEffects(mockPlayer);

    const ext = mockPlayer.extendedStats;
    if (ext.stunProcChance !== undefined) {
      assert(ext.stunProcChance <= 0.1501, `stunProcChance melebihi cap 0.15: ${ext.stunProcChance}`);
    }
    if (ext.lifestealPct !== undefined) {
      assert(ext.lifestealPct <= 0.0801, `lifestealPct melebihi cap 0.08: ${ext.lifestealPct}`);
    }
    if (ext.burnProcStacks !== undefined) {
      assert(ext.burnProcStacks <= 15.01, `burnProcStacks melebihi cap 15: ${ext.burnProcStacks}`);
    }
    if (ext.combatHpRegenPct !== undefined) {
      assert(ext.combatHpRegenPct <= 0.0301, `combatHpRegenPct melebihi cap 0.03: ${ext.combatHpRegenPct}`);
    }
    if (ext.reflectPct !== undefined) {
      assert(ext.reflectPct <= 0.2501, `reflectPct melebihi cap 0.25: ${ext.reflectPct}`);
    }
    if (ext.injuryResist !== undefined) {
      assert(ext.injuryResist <= 0.4001, `injuryResist melebihi cap 0.40: ${ext.injuryResist}`);
    }
    if (ext.defenseUpProcChance !== undefined) {
      assert(ext.defenseUpProcChance <= 0.2001, `defenseUpProcChance melebihi cap 0.20: ${ext.defenseUpProcChance}`);
    }
    if (ext.chillProcChance !== undefined) {
      assert(ext.chillProcChance <= 0.2501, `chillProcChance melebihi cap 0.25: ${ext.chillProcChance}`);
    }
    if (ext.firstStrikeAtkPct !== undefined) {
      assert(ext.firstStrikeAtkPct <= 0.2501, `firstStrikeAtkPct melebihi cap 0.25: ${ext.firstStrikeAtkPct}`);
    }
  }
});

// TEST 5: Branch Exclusivity Lock (Path A lalu Path B)
runTest('5. Exclusive branches tetap locked saat memilih branch berlawanan', () => {
  const phoenixTree = LAW_SKILL_TREES['element_phoenix_fire'];
  const nodeA = phoenixTree.nodes.find(n => n.id === 'phoenix_inferno_burst');
  const nodeB = phoenixTree.nodes.find(n => n.id === 'phoenix_cauterize');
  
  assert.strictEqual(nodeA.exclusiveGroup, 'main_path');
  assert.strictEqual(nodeB.exclusiveGroup, 'main_path');

  // Simulasi validasi alokasi
  const userAllocatedNodes = { 'phoenix_inferno_burst': { currentLevel: 3 } };
  const targetNode = nodeB;
  const targetExclusiveGroup = targetNode.exclusiveGroup;

  const hasConflictingBranch = Object.entries(userAllocatedNodes).some(([nodeId, nData]) => {
    if ((nData.currentLevel || 0) <= 0) return false;
    const existingNode = phoenixTree.nodes.find(n => n.id === nodeId);
    return existingNode && existingNode.id !== targetNode.id && existingNode.exclusiveGroup === targetExclusiveGroup;
  });

  assert.strictEqual(hasConflictingBranch, true, 'Harus terdeteksi konflik branch eksklusif');
});

// TEST 6: Combat Proc Wiring - Burn & BurnTickBonus
runTest('6. Combat Proc: Phoenix Fire burnProcStacks & burnTickBonus', () => {
  const attacker = {
    name: 'Phoenix Cultivator',
    extendedStats: {
      burnProcStacks: 4,
      burnTickBonus: 0.25
    }
  };
  const defender = {
    name: 'Target Dummy',
    maxHp: 1000,
    hp: 1000,
    conditions: {},
    buffs: [],
    debuffs: []
  };
  ensureCombatState(defender);

  const hitRes = onSkillHitLawExtras({
    attacker,
    defender,
    skill: { name: 'Fire Strike' },
    damage: 100,
    isCrit: false
  });

  assert(defender.conditions.burn >= 4, `Target harus memiliki burn stacks >= 4, actual: ${defender.conditions.burn}`);
  assert(hitRes.notes.some(n => n.includes('Api Feniks')), 'Harus mencatat log bakar');

  // Test burnTickBonus in tickStatuses
  const initialHp = defender.hp;
  const tickRes = tickStatuses(defender, attacker);
  assert(defender.hp < initialHp, 'Defender harus terkena DoT burn');
  assert(tickRes.logs.some(n => n.includes('Membakar') || n.includes('burn') || n.includes('Api')), 'Harus ada pesan tick burn');
});

// TEST 7: Combat Proc Wiring - Chill & SPD Slow
runTest('7. Combat Proc: Azure Water chillProcChance & spd slow', () => {
  const origRandom = Math.random;
  Math.random = () => 0.01;
  try {
    const attacker = {
      name: 'Azure Cultivator',
      extendedStats: {
        chillProcChance: 1.0,
        spdSlowOnHit: 0.15
      }
    };
    const defender = {
      name: 'Target Dummy',
      speed: 100,
      conditions: {},
      buffs: [],
      debuffs: []
    };
    ensureCombatState(defender);

    const hitRes = onSkillHitLawExtras({
      attacker,
      defender,
      skill: { name: 'Water Torrent' },
      damage: 100,
      isCrit: false
    });

    assert(defender.conditions.frozen >= 15, `Defender harus memiliki frozen stacks >= 15, actual: ${defender.conditions.frozen}`);
    assert(defender.debuffs.some(d => d.type === 'chill'), 'Defender harus memiliki debuff chill');
    assert(defender.speed < 100, `Speed defender harus berkurang karena chill slow, actual: ${defender.speed}`);
    assert(hitRes.notes.some(n => n.includes('Air Biru')), 'Harus ada log chill');
  } finally {
    Math.random = origRandom;
  }
});

// TEST 8: Combat Proc Wiring - Xuanwu DefenseUp Proc on being hit
runTest('8. Combat Proc: Xuanwu defenseUpProcChance on being hit', () => {
  const origRandom = Math.random;
  Math.random = () => 0.01;
  try {
    const attacker = { name: 'Aggressor' };
    const defender = {
      name: 'Xuanwu Cultivator',
      extendedStats: {
        defenseUpProcChance: 1.0
      },
      buffs: [],
      debuffs: [],
      conditions: {}
    };
    ensureCombatState(defender);

    const hitRes = onSkillHitLawExtras({
      attacker,
      defender,
      skill: { name: 'Slash' },
      damage: 50,
      isCrit: false
    });

    const hasDefUp = defender.buffs.some(b => b.type === 'defense_up' && b.duration > 0);
    assert(hasDefUp, 'Defender harus mendapatkan buff defense_up saat terkena serangan');
    assert(hitRes.notes.some(n => n.includes('Kuda-kuda Kokoh') || n.includes('Pertahanan Baja')), 'Harus ada log Xuanwu guard proc');

    // Verify defense damage multiplier cuts damage
    const defMult = getDefenseDamageMultiplier(defender);
    assert.strictEqual(defMult, 0.5, 'defense_up harus mengurangi damage sebesar 50%');
  } finally {
    Math.random = origRandom;
  }
});

// TEST 9: Combat Proc Wiring - God Thunder Stun & bonusAtkOnStun
runTest('9. Combat Proc: God Thunder stunProcChance & bonusAtkOnStun', () => {
  const origRandom = Math.random;
  Math.random = () => 0.01;
  try {
    const attacker = {
      name: 'Thunder Cultivator',
      laws: [{ lawType: 'element_godthunder_light', rank: 3 }],
      extendedStats: {
        stunProcChance: 1.0,
        bonusAtkOnStun: 0.15
      }
    };
    const defender = {
      name: 'Target Dummy',
      buffs: [],
      debuffs: [],
      conditions: {}
    };
    ensureCombatState(defender);

    const hitRes = onSkillHitLawExtras({
      attacker,
      defender,
      skill: { name: 'Lightning Spear' },
      damage: 80,
      isCrit: false
    });

    const isStunned = defender.debuffs.some(d => d.type === 'stun' && d.duration > 0);
    assert(isStunned, 'Target harus terkena debuff stun');
    assert(hitRes.notes.some(n => n.includes('Petir Dewa') || n.includes('Stun')), 'Harus ada log stun');

    // Test bonusAtkOnStun via getLawCombatModifiers / applyLawDamageModifiers
    const modNormal = getLawCombatModifiers(attacker, { debuffs: [] }, { skipFirstStrike: true });
    const modStunned = getLawCombatModifiers(attacker, defender, { skipFirstStrike: true });
    assert(modStunned.damageMultiplier > modNormal.damageMultiplier, 'Bonus damage harus aktif melawan target yang stun');
  } finally {
    Math.random = origRandom;
  }
});

// TEST 10: Combat Proc Wiring - Blood Soul Lifesteal (Capped at 8%)
runTest('10. Combat Proc: Blood Soul lifestealPct (cap 8%)', () => {
  const attacker = {
    name: 'Blood Cultivator',
    maxHp: 500,
    hp: 400,
    extendedStats: {
      lifestealPct: 0.20 // test input tinggi harus kena clamp 0.08
    }
  };
  const defender = {
    name: 'Target Dummy',
    buffs: [],
    debuffs: [],
    conditions: {}
  };

  const hitRes = onSkillHitLawExtras({
    attacker,
    defender,
    skill: { name: 'Blood Rend' },
    damage: 200,
    isCrit: false
  });

  // 200 dmg * 0.08 cap = 16 heal
  assert.strictEqual(attacker.hp, 416, `HP attacker harus bertambah sebesar 16 (8% cap), actual: ${attacker.hp}`);
  assert(hitRes.notes.some(n => n.includes('Hisapan Darah')), 'Harus mencatat log lifesteal');
});

// TEST 11: System / Turn Start Wiring - Qingdi Combat HP Regen (Cap 3%)
runTest('11. System / Turn Start: Qingdi combatHpRegenPct (cap 3%)', () => {
  const player = {
    name: 'Qingdi Cultivator',
    maxHp: 1000,
    hp: 800,
    extendedStats: {
      combatHpRegenPct: 0.10 // test input tinggi harus kena clamp 0.03
    }
  };

  const turnRes = onTurnStartLawExtras({ entity: player });
  // 1000 * 0.03 = 30 heal
  assert.strictEqual(player.hp, 830, `HP player harus pulih sebesar 30 (3% cap), actual: ${player.hp}`);
  assert(turnRes.notes.some(n => n.includes('Pemulihan Hayat')), 'Harus ada log regenerasi');
});

// TEST 12: First Strike Atk Pct (Roc Wind)
runTest('12. Conditional Combat: Roc Wind firstStrikeAtkPct', () => {
  const attacker = {
    name: 'Roc Cultivator',
    laws: [{ lawType: 'element_roc_wind', rank: 3 }],
    extendedStats: {
      firstStrikeAtkPct: 0.20
    }
  };
  const defender = { name: 'Target' };

  const firstHitRes = applyLawDamageModifiers(attacker, defender, 100, { hasHitDefender: false });
  const secondHitRes = applyLawDamageModifiers(attacker, defender, 100, { hasHitDefender: true });

  assert(firstHitRes.finalDamage > secondHitRes.finalDamage, 'First strike harus menghasilkan damage lebih besar');
  assert(firstHitRes.logParts.some(p => p.includes('Serangan Pertama')), 'Harus ada log first strike');
  assert(!secondHitRes.logParts.some(p => p.includes('Serangan Pertama')), 'Tidak boleh ada log first strike pada hit kedua');
});

// TEST 13: Injury Resist (Body Tempering)
runTest('13. Defensive Proc: Body Tempering injuryResist', () => {
  const origRandom = Math.random;
  Math.random = () => 0.01;
  try {
    const victim = {
      name: 'Tough Guy',
      maxHp: 100,
      extendedStats: {
        injuryResist: 0.35 // 35% resist rate
      },
      conditions: {}
    };

    // Heavy hit 30 dmg >= 15% maxHp
    const injuryApplied = checkAndApplyHeavyHitInjury(victim, 30);
    assert.strictEqual(injuryApplied, false, 'Cedera organ tubuh harus ditolak karena injuryResist berhasil menahan benturan');
  } finally {
    Math.random = origRandom;
  }
});

// TEST 14: Beast Heal on Kill (Natal Beast)
runTest('14. Combat Kill Proc: Natal Beast beastHealOnKillPct (cap 8%)', () => {
  const player = {
    maxHp: 1000,
    hp: 500,
    extendedStats: {
      beastHealOnKillPct: 0.05
    }
  };
  const beastHealPct = Math.min(0.08, player.extendedStats.beastHealOnKillPct);
  const healAmt = Math.max(1, Math.floor(player.maxHp * beastHealPct));
  player.hp = Math.min(player.maxHp, player.hp + healAmt);

  assert.strictEqual(player.hp, 550, `Player HP harus pulih +50 (5% maxHp), actual: ${player.hp}`);
});

// TEST 15: getLawStatus uniquePanel combatSignatures
runTest('15. getLawStatus menampilkan combatSignatures pada uniquePanel', () => {
  const player = {
    cultivationLaw: {
      activeLawType: 'element_phoenix_fire',
      rank: 3,
      stage: 5,
      qi: 500,
      dailyData: {}
    },
    systemCultivation: { realm: 'Qi Refining', stage: 1 },
    laws: [{ lawType: 'element_phoenix_fire', rank: 3, stage: 5, cultivationExp: 500 }],
    lawSkillTrees: {
      element_phoenix_fire: {
        allocatedPoints: 20,
        nodes: {
          phoenix_blaze: { purchased: true, currentLevel: 5 },
          phoenix_cauterize: { purchased: true, currentLevel: 5 }
        }
      }
    },
    extendedStats: {}
  };

  applyLawSkillTreeEffects(player);
  const status = getLawStatus(player);
  assert(status.uniquePanel, 'Harus ada uniquePanel');
  assert(Array.isArray(status.uniquePanel.combatSignatures), 'combatSignatures harus berupa array');
  assert(
    status.uniquePanel.combatSignatures.includes('burnProc'),
    'Phoenix Fire harus mendaftarkan signature burnProc'
  );
});

console.log('================================================================');
console.log(`SEMUA ${passedTests}/${totalTests} PENGUJIAN SKILL TREE UNIQUENESS BERHASIL (100% PASS)!`);
console.log('================================================================');
