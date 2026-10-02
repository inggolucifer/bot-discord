const assert = require('assert');
const {
  LAW_SKILL_TREES,
  LAW_DEFINITIONS,
  applyLawSkillTreeEffects,
  getActiveCombatSignatures,
  getLawStatus
} = require('../utils/lawCultivationEngine');
const { calculatePlayerStats } = require('../utils/playerCombat');

console.log('================================================================');
console.log('   QA TEST: SKILL TREE POLISH TO 9.3+ (DEDUP + ABYSS + CONTRACT)');
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

// ─────────────────────────────────────────────────────────────
// 1. CAPSTONE DEDUPLICATION & ZERO DUPLICATES ACROSS ALL 20 LAWS
// ─────────────────────────────────────────────────────────────
runTest('1. Zero duplicate tier 3 capstone fingerprints across all 20 laws', () => {
  const capstones = [];
  const capstoneMap = new Map();

  for (const [lawKey, tree] of Object.entries(LAW_SKILL_TREES)) {
    const t3Nodes = (tree.nodes || []).filter(n => (n.tier || 1) === 3);
    assert.strictEqual(t3Nodes.length, 2, `Law ${lawKey} harus memiliki tepat 2 node Capstone (Tier 3)`);

    for (const node of t3Nodes) {
      const sortedEffects = Object.keys(node.effects || {})
        .sort()
        .reduce((acc, k) => {
          acc[k] = node.effects[k];
          return acc;
        }, {});
      const fp = JSON.stringify(sortedEffects);

      if (capstoneMap.has(fp)) {
        const other = capstoneMap.get(fp);
        assert.fail(
          `Duplikasi fingerprint Capstone T3 ditemukan!\n  Node A: [${lawKey}] ${node.id} (${node.name})\n  Node B: [${other.lawKey}] ${other.nodeId} (${other.name})\n  Effects: ${fp}`
        );
      }

      capstoneMap.set(fp, { lawKey, nodeId: node.id, name: node.name });
      capstones.push({ lawKey, nodeId: node.id, fp, effects: node.effects });
    }
  }

  assert.strictEqual(capstones.length, 40, 'Total capstone tier 3 di 20 law harus tepat 40');
  assert.strictEqual(capstoneMap.size, 40, 'Semua 40 capstone harus memiliki fingerprint effects yang 100% unik');

  // Khusus Azure vs Qingdi
  const azureT3 = LAW_SKILL_TREES.element_azure_water.nodes.filter(n => n.tier === 3).map(n => JSON.stringify(n.effects));
  const qingdiT3 = LAW_SKILL_TREES.element_qingdi_wood.nodes.filter(n => n.tier === 3).map(n => JSON.stringify(n.effects));
  for (const a of azureT3) {
    for (const q of qingdiT3) {
      assert.notStrictEqual(a, q, 'Azure T3 dan Qingdi T3 dilarang identik');
    }
  }

  // Khusus Roc vs Nether
  const rocT3 = LAW_SKILL_TREES.element_roc_wind.nodes.filter(n => n.tier === 3).map(n => JSON.stringify(n.effects));
  const netherT3 = LAW_SKILL_TREES.demonic_nether_darkness.nodes.filter(n => n.tier === 3).map(n => JSON.stringify(n.effects));
  for (const r of rocT3) {
    for (const n of netherT3) {
      assert.notStrictEqual(r, n, 'Roc T3 dan Nether T3 dilarang identik');
    }
  }
});

// ─────────────────────────────────────────────────────────────
// 2. SETIAP LAW: >= 1 COMBAT_PROC ATAU SYSTEM
// ─────────────────────────────────────────────────────────────
runTest('2. Setiap 20 law memiliki >= 1 node dengan effectType combat_proc atau system', () => {
  for (const [lawKey, tree] of Object.entries(LAW_SKILL_TREES)) {
    const specialNodes = (tree.nodes || []).filter(
      n => n.effectType === 'combat_proc' || n.effectType === 'system'
    );
    assert(
      specialNodes.length >= 1,
      `Law ${lawKey} harus memiliki minimal 1 node ber-effectType combat_proc/system (ditemukan: ${specialNodes.length})`
    );
  }
});

// ─────────────────────────────────────────────────────────────
// 3. SETIAP LAW: >= 1 SIGNATURE KEY DARI ALLOWLIST
// ─────────────────────────────────────────────────────────────
runTest('3. Setiap 20 law memiliki >= 1 signature key spesifik dari allowlist', () => {
  const SIGNATURE_KEYS = [
    'burnProcStacks',
    'burnTickBonus',
    'chillProcChance',
    'defenseUpProcChance',
    'combatHpRegenPct',
    'firstStrikeAtkPct',
    'stunProcChance',
    'lifestealPct',
    'injuryResist',
    'venomPoisonProc',
    'yangCleanseChance',
    'swordBleedChance',
    'reflectPct',
    'abyssalCurseResist',
    'netherZoneAtkBonus',
    'corruptionToDefPct',
    'guSlotAtkBonus',
    'poisonProcFromGu',
    'artifactInfusionAtk',
    'beastHealOnKillPct',
    'essenceGainPct',
    'unarmedPenaltyMitigation',
    'atkWantedMult',
    'dmgVsCorrupted',
    'homeBonusAdd',
    'corrosionDefShred',
    'bonusAtkOnStun',
    'spdSlowOnHit',
    'poisonResist',
    'corruptionResist'
  ];

  for (const [lawKey, tree] of Object.entries(LAW_SKILL_TREES)) {
    let foundSignature = false;
    for (const node of tree.nodes) {
      const eff = node.effects || {};
      for (const sigKey of SIGNATURE_KEYS) {
        if (eff[sigKey] !== undefined && eff[sigKey] > 0) {
          foundSignature = true;
          break;
        }
      }
      if (foundSignature) break;
    }

    assert(
      foundSignature,
      `Law ${lawKey} tidak memiliki satupun signature key dari allowlist di node-nodenya!`
    );
  }
});

// ─────────────────────────────────────────────────────────────
// 4. HARD CAPS & SAFETY LIMITS (STUN, LIFESTEAL, CURSE RESIST, REGEN)
// ─────────────────────────────────────────────────────────────
runTest('4. Hard caps & safety limits (stun <= 0.15, lifesteal <= 0.08, curseResist <= 0.40, regen <= 0.03)', () => {
  for (const [lawKey, tree] of Object.entries(LAW_SKILL_TREES)) {
    for (const node of tree.nodes) {
      const e = node.effects || {};
      if (node.tier === 3) {
        if (e.crit !== undefined) assert(e.crit <= 0.25, `${lawKey} T3 crit (${e.crit}) melebihi cap 0.25`);
        if (e.atkMult !== undefined) assert(e.atkMult <= 0.015, `${lawKey} T3 atkMult (${e.atkMult}) melebihi cap 0.015`);
        if (e.flatHp !== undefined) assert(e.flatHp <= 20, `${lawKey} T3 flatHp (${e.flatHp}) melebihi cap 20`);
      }
    }

    // Simulasi path terpanjang untuk akumulasi proc
    const mockPlayer = {
      cultivationLaw: {
        activeLawType: lawKey,
        rank: 5,
        skillLevels: Object.fromEntries(tree.nodes.map(n => [n.id, n.maxLevel || 5]))
      },
      extendedStats: {}
    };

    applyLawSkillTreeEffects(mockPlayer);
    const ext = mockPlayer.extendedStats;

    if (ext.stunProcChance) assert(ext.stunProcChance <= 0.15, `${lawKey} stunProcChance (${ext.stunProcChance}) > 0.15`);
    if (ext.lifestealPct) assert(ext.lifestealPct <= 0.08, `${lawKey} lifestealPct (${ext.lifestealPct}) > 0.08`);
    if (ext.combatHpRegenPct) assert(ext.combatHpRegenPct <= 0.03, `${lawKey} combatHpRegenPct (${ext.combatHpRegenPct}) > 0.03`);
    if (ext.abyssalCurseResist) assert(ext.abyssalCurseResist <= 0.40, `${lawKey} abyssalCurseResist (${ext.abyssalCurseResist}) > 0.40`);
    if (ext.reflectPct) assert(ext.reflectPct <= 0.25, `${lawKey} reflectPct (${ext.reflectPct}) > 0.25`);
  }
});

// ─────────────────────────────────────────────────────────────
// 5. API / UI CONTRACT FOR SKILL TREE & STATUS (D1, D2)
// ─────────────────────────────────────────────────────────────
runTest('5. API & status.skillTree contract nodes, lockedReason, activeBranch, combatSignatures', () => {
  const mockPlayer = {
    level: 10,
    cultivationLaw: {
      activeLawType: 'demonic_abyssal_pact',
      rank: 2,
      stage: 3,
      lawSkillPoints: 10,
      unlockedSkillIds: ['abyss_void_core'],
      skillLevels: { abyss_void_core: 3 }
    },
    systemCultivation: { realm: 'Qi Refining', stage: 5 },
    extendedStats: {}
  };

  const status = getLawStatus(mockPlayer);
  assert(status.skillTree, 'status.skillTree wajib ada di response getLawStatus');

  const st = status.skillTree;
  assert(typeof st.points === 'number', 'skillTree.points harus angka');
  assert(Array.isArray(st.nodes), 'skillTree.nodes harus array');
  assert(Array.isArray(st.combatSignatures), 'skillTree.combatSignatures harus array');
  assert.strictEqual(st.nodes.length, 5, 'skillTree.nodes harus berjumlah 5');

  const requiredNodeKeys = [
    'id', 'name', 'tier', 'level', 'maxLevel', 'costPerLevel',
    'branchId', 'exclusiveGroup', 'effectType',
    'canUpgrade', 'lockedReason', 'effects', 'description'
  ];

  for (const node of st.nodes) {
    for (const key of requiredNodeKeys) {
      assert(key in node, `Node ${node.id} kekurangan key wajib: ${key}`);
    }
  }
});

// ─────────────────────────────────────────────────────────────
// 6. BRANCH LOCKING ENFORCEMENT (ST-P5)
// ─────────────────────────────────────────────────────────────
runTest('6. Branch exclusivity: memilih cabang A mengunci cabang B (lockedReason: branch_locked)', () => {
  const tree = LAW_SKILL_TREES.element_phoenix_fire;
  const branchANode = tree.nodes.find(n => n.branchId === 'A' && n.tier === 2);
  const branchBNode = tree.nodes.find(n => n.branchId === 'B' && n.tier === 2);
  assert(branchANode && branchBNode, 'Phoenix fire harus punya cabang A dan B');

  const mockPlayer = {
    level: 15,
    cultivationLaw: {
      activeLawType: 'element_phoenix_fire',
      rank: 2,
      stage: 5,
      lawSkillPoints: 15,
      unlockedSkillIds: ['phoenix_flame_seed', branchANode.id],
      skillLevels: {
        phoenix_flame_seed: 3,
        [branchANode.id]: 2
      }
    },
    systemCultivation: { realm: 'Qi Refining', stage: 5 },
    extendedStats: {}
  };

  const status = getLawStatus(mockPlayer);
  const nodeBInStatus = status.skillTree.nodes.find(n => n.id === branchBNode.id);

  assert.strictEqual(nodeBInStatus.canUpgrade, false, 'Node cabang B tidak boleh bisa di-upgrade jika cabang A aktif');
  assert.strictEqual(nodeBInStatus.lockedReason, 'branch_locked', 'lockedReason node B harus branch_locked');
  assert.strictEqual(status.skillTree.activeBranch, 'A', 'activeBranch harus terdeteksi A');
});

// ─────────────────────────────────────────────────────────────
// 7. ABYSS SIGNATURE VISIBILITY & CURSE RESIST MITIGATION (ST-P3)
// ─────────────────────────────────────────────────────────────
runTest('7. Abyss signature: abyssalCurseResist terlihat di signatures dan melunakkan penalti upeti', () => {
  const tree = LAW_SKILL_TREES.demonic_abyssal_pact;
  const mantleNode = tree.nodes.find(n => n.id === 'abyss_umbral_mantle');
  assert(mantleNode, 'Node abyss_umbral_mantle harus ada');
  assert(mantleNode.effects.abyssalCurseResist > 0, 'abyss_umbral_mantle harus punya abyssalCurseResist');

  const mockPlayer = {
    level: 20,
    cultivationLaw: {
      activeLawType: 'demonic_abyssal_pact',
      rank: 3,
      stage: 5,
      lawSkillPoints: 20,
      unlockedSkillIds: ['abyss_void_core', 'abyss_umbral_mantle'],
      skillLevels: {
        abyss_void_core: 3,
        abyss_umbral_mantle: 4 // 4 * 0.06 = 0.24 curse resist
      },
      demonicData: {
        abyssalTributeDueAt: new Date(Date.now() - 3 * 24 * 3600 * 1000), // Overdue 3 hari (curse Lv 1)
        corruption: 30
      }
    },
    systemCultivation: { realm: 'Qi Refining', stage: 5 },
    stats: { baseHp: 1000, baseAtk: 100, baseDef: 80, baseSpd: 50 },
    extendedStats: {}
  };

  const status = getLawStatus(mockPlayer);
  assert(
    status.skillTree.combatSignatures.includes('abyssalCurseResist'),
    'abyssalCurseResist harus muncul di skillTree.combatSignatures'
  );
  assert(
    status.uniquePanel.combatSignatures.includes('abyssalCurseResist'),
    'abyssalCurseResist harus muncul di uniquePanel.combatSignatures'
  );
  assert(
    status.uniquePanel.demonicData.abyssalCurseResist > 0,
    'abyssalCurseResist harus muncul di uniquePanel.demonicData'
  );

  // Verifikasi mitigasi penalti di calculatePlayerStats
  const playerWithResist = JSON.parse(JSON.stringify(mockPlayer));
  const statsWithResist = calculatePlayerStats(playerWithResist);

  const playerWithoutResist = JSON.parse(JSON.stringify(mockPlayer));
  playerWithoutResist.cultivationLaw.skillLevels.abyss_umbral_mantle = 0;
  playerWithoutResist.cultivationLaw.unlockedSkillIds = ['abyss_void_core'];
  const statsWithoutResist = calculatePlayerStats(playerWithoutResist);

  assert(
    statsWithResist.atk > statsWithoutResist.atk,
    `Stats ATK dengan curse resist (${statsWithResist.atk}) harus lebih besar daripada tanpa resist (${statsWithoutResist.atk})`
  );
});

// ─────────────────────────────────────────────────────────────
// 8. QINGDI (ST-P1) & NETHER (ST-P2) SIGNATURES
// ─────────────────────────────────────────────────────────────
runTest('8. Qingdi wood combatHpRegen & Nether void netherZone signatures', () => {
  // Qingdi Wood
  const qingdiPlayer = {
    level: 10,
    cultivationLaw: {
      activeLawType: 'element_qingdi_wood',
      rank: 3,
      skillLevels: {
        qingdi_sprout_seed: 3,
        qingdi_vital_circulation: 3,
        qingdi_evergreen_dao: 2 // Regen signature
      },
      unlockedSkillIds: ['qingdi_sprout_seed', 'qingdi_vital_circulation', 'qingdi_evergreen_dao']
    },
    systemCultivation: { realm: 'Qi Refining', stage: 5 },
    extendedStats: {}
  };

  const qingdiStatus = getLawStatus(qingdiPlayer);
  assert(
    qingdiStatus.skillTree.combatSignatures.includes('combatHpRegen'),
    'Qingdi dengan evergreen dao harus memiliki combatHpRegen di combatSignatures'
  );

  // Nether Darkness
  const netherPlayer = {
    level: 10,
    cultivationLaw: {
      activeLawType: 'demonic_nether_darkness',
      rank: 3,
      skillLevels: {
        nether_shadow_seed: 3,
        nether_umbra_veil: 3,
        nether_void_walker: 2 // Nether zone signature
      },
      unlockedSkillIds: ['nether_shadow_seed', 'nether_umbra_veil', 'nether_void_walker']
    },
    systemCultivation: { realm: 'Qi Refining', stage: 5 },
    extendedStats: {}
  };

  const netherStatus = getLawStatus(netherPlayer);
  assert(
    netherStatus.skillTree.combatSignatures.includes('netherZone'),
    'Nether dengan void walker harus memiliki netherZone di combatSignatures'
  );
});

console.log('================================================================');
console.log(`SEMUA ${passedTests} DARI ${totalTests} SKENARIO PENGUJIAN QA BERHASIL 100% [PASS]`);
console.log('================================================================');
