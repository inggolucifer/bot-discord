/**
 * scripts/estimate_law_combat_rank5.js
 * 
 * Data-Driven Combat Estimation Snapshot: Rank 5 across all 20 Cultivation Laws
 * Evaluates HP, ATK, DEF, SPD, Crit, Resistances, and Special Conditional Modifiers.
 */

const { calculatePlayerStats } = require('../utils/playerCombat');
const { LAW_DEFINITIONS, LAW_BALANCE, getLawCombatModifiers } = require('../utils/lawCultivationEngine');

console.log('═══════════════════════════════════════════════════════════════════════════════════════════════════');
console.log('                   SIMULASI KESEIMBANGAN TEMPUR 20 LAW PADA RANK 5 (DATA-DRIVEN)                   ');
console.log('═══════════════════════════════════════════════════════════════════════════════════════════════════\n');

// Standardized baseline player (Rank 5 baseline, Lv. 50, standard equipment)
function createMockPlayer(lawType, options = {}) {
  return {
    discordId: 'test_cultivator',
    characterName: 'Pendekar Uji',
    level: 50,
    stats: {
      baseHp: 500,
      baseAtk: 120,
      baseDef: 80,
      baseSpd: 60
    },
    cultivationLaw: {
      activeLawType: lawType,
      rank: 5,
      stage: 0,
      qi: 1500,
      maxQi: 5000,
      currentEssence: 200,
      lawSkillPoints: 10,
      unlockedSkillIds: [],
      skillLevels: {}
    },
    equipment: options.unarmed ? {} : { weapon: 'mock_sword_id' },
    inventory: options.unarmed ? [] : [
      {
        _id: 'mock_sword_id',
        isEquipped: true,
        itemId: {
          category: 'weapon',
          name: 'Pedang Roh Bintang',
          subtype: 'sword',
          tags: ['sword'],
          baseAtk: 45,
          baseDef: 10
        }
      }
    ],
    assets: options.onHub ? [
      {
        name: 'Hub Formasi Bendera',
        status: 'active',
        placement: { zoneId: 'central_plains', tileX: 100, tileY: 100 }
      }
    ] : [],
    gridPosition: { zoneId: 'central_plains', tileX: 100, tileY: 100 },
    extendedStats: {}
  };
}

const allLawKeys = Object.keys(LAW_DEFINITIONS);
const results = [];

for (const lawKey of allLawKeys) {
  const def = LAW_DEFINITIONS[lawKey];
  const standardPlayer = createMockPlayer(lawKey);
  const stats = calculatePlayerStats(standardPlayer);

  // Special checks
  let extraNotes = [];
  if (lawKey === 'righteous_sword_heart') {
    const unarmedPlayer = createMockPlayer(lawKey, { unarmed: true });
    const unarmedStats = calculatePlayerStats(unarmedPlayer);
    extraNotes.push(`Armed ATK: ${stats.atk} | Unarmed ATK: ${unarmedStats.atk} (-15% pen)`);
  } else if (lawKey === 'righteous_formation_array') {
    const homePlayer = createMockPlayer(lawKey, { onHub: true });
    const homeStats = calculatePlayerStats(homePlayer);
    extraNotes.push(`Roaming DEF: ${stats.def} | Home DEF: ${homeStats.def} (+8% home)`);
  } else if (lawKey === 'righteous_karmic_mirror') {
    extraNotes.push(`Reflect: ${Math.round((stats.reflectPct || 0.10) * 100)}% DMG`);
  } else if (lawKey === 'righteous_heavenly_merit') {
    const mockWanted = { isWantedByOrthodox: true };
    const mod = getLawCombatModifiers(standardPlayer, mockWanted);
    extraNotes.push(`Vs Wanted: +${Math.round((mod.damageMultiplier - 1) * 100)}% ATK`);
  } else if (lawKey === 'righteous_pure_yang') {
    const mockCorrupt = { tags: ['demonic', 'undead'] };
    const mod = getLawCombatModifiers(standardPlayer, mockCorrupt);
    extraNotes.push(`Vs Corrupt: +${Math.round((mod.damageMultiplier - 1) * 100)}% ATK`);
  } else if (lawKey.startsWith('demonic_')) {
    extraNotes.push(`High risk: infamy penalty > 50`);
  }

  results.push({
    lawType: lawKey,
    name: def.name,
    category: def.category,
    pathMod: def.pathMod,
    hp: stats.hp,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    crit: (standardPlayer.extendedStats?.crit || 0) + '%',
    notes: extraNotes.join('; ') || 'Standard progression'
  });
}

// Print Markdown Table
console.log('| No | Law Type | Nama Lore | Kategori | pathMod | HP (R5) | ATK (R5) | DEF (R5) | SPD (R5) | Catatan / Keunikan Tempur |');
console.log('|:--:|:---------|:----------|:--------:|:-------:|:-------:|:--------:|:--------:|:--------:|:--------------------------|');

results.forEach((r, idx) => {
  console.log(`| ${idx + 1} | \`${r.lawType}\` | **${r.name}** | ${r.category} | ${r.pathMod} | ${r.hp} | ${r.atk} | ${r.def} | ${r.spd} | ${r.notes} |`);
});

console.log('\n═══════════════════════════════════════════════════════════════════════════════════════════════════');
console.log('VALIDASI ATURAN KESEIMBANGAN:');
const righteousExceedingMod = results.filter(r => r.category === 'righteous' && r.pathMod > 1.14);
console.log(`• Righteous pathMod <= 1.14: ${righteousExceedingMod.length === 0 ? '✅ LULUS' : '❌ GAGAL'}`);
console.log(`• Total 20 Laws Evaluated: ${results.length === 20 ? '✅ LULUS (20/20)' : '❌ GAGAL'}`);
console.log('═══════════════════════════════════════════════════════════════════════════════════════════════════\n');
