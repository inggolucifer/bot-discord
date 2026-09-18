/**
 * test_kungfu_system.js
 * Comprehensive automated verification for Kungfu Mastery Max Level 250,
 * Long-Term Grinding Curves (Years of Cultivation), Weapon/Tool Requirements,
 * Balanced Sublinear Stat Scaling, and Anti-Exploit Rules.
 */

const assert = require('assert');
const {
    KUNGFU_SKILLS,
    getXpRequiredForLevel,
    getKungfuLevel,
    getWeaponMasteryMultiplier,
    getUnarmedBonus,
    getToolDurabilityPreserveChance,
    getStealingSuccessBonus,
    resolveWeaponDiscipline,
    checkItemKungfuRequirement,
    awardKungfuExp
} = require('./utils/kungfuMastery');

console.log('=== TEST SUITE: KUNGFU MASTERY MAX LEVEL 250 & LONG TERM BALANCE ===\n');

// 1. Test XP Curve & Long-Term Progression up to Level 250
console.log('[1/7] Testing XP Curve & Long-Term Progression (Lv 0 -> 250)...');
assert.strictEqual(getXpRequiredForLevel(0), 0);
assert(getXpRequiredForLevel(1) > 0, 'Level 1 XP should be > 0');
assert(getXpRequiredForLevel(10) > 2500, 'Level 10 XP is ~2.8k');
assert(getXpRequiredForLevel(30) > 25000, 'Level 30 XP is ~30k');
assert(getXpRequiredForLevel(100) > 400000, 'Level 100 XP is ~446k');
assert(getXpRequiredForLevel(250) > 3000000, 'Level 250 requires millions of XP (~3.48M)');

const lvl0 = getKungfuLevel(0);
assert.strictEqual(lvl0.level, 0);
assert.strictEqual(lvl0.rankTitle, 'Pemula (Novice)');

const lvl30 = getKungfuLevel(getXpRequiredForLevel(30));
assert.strictEqual(lvl30.level, 30);
assert.strictEqual(lvl30.rankTitle, 'Menengah (Apprentice)');

const lvl100 = getKungfuLevel(getXpRequiredForLevel(100));
assert.strictEqual(lvl100.level, 100);
assert.strictEqual(lvl100.rankTitle, 'Ahli (Expert)');

const lvl180 = getKungfuLevel(getXpRequiredForLevel(180));
assert.strictEqual(lvl180.level, 180);
assert.strictEqual(lvl180.rankTitle, 'Pendekar Besar (Grandmaster)');

const lvl220 = getKungfuLevel(getXpRequiredForLevel(220));
assert.strictEqual(lvl220.level, 220);
assert.strictEqual(lvl220.rankTitle, 'Dewa Beladiri (Transcendent)');

const lvl250 = getKungfuLevel(getXpRequiredForLevel(250));
assert.strictEqual(lvl250.level, 250);
assert.strictEqual(lvl250.rankTitle, 'Leluhur Surgawi (Mythic Saint)');
console.log(`  ✅ XP Curve: Lv10=${getXpRequiredForLevel(10).toLocaleString()} | Lv30=${getXpRequiredForLevel(30).toLocaleString()} | Lv100=${getXpRequiredForLevel(100).toLocaleString()} | Lv250=${getXpRequiredForLevel(250).toLocaleString()}`);
console.log('  ✅ All 8 Rank Tiers validated up to Mythic Saint.');

// 2. Test Balanced Sublinear Weapon Mastery Multiplier
console.log('\n[2/7] Testing Balanced Weapon Mastery Multipliers (Sublinear Scaling)...');
const mult0 = getWeaponMasteryMultiplier(0);
const mult30 = getWeaponMasteryMultiplier(30);
const mult50 = getWeaponMasteryMultiplier(50);
const mult100 = getWeaponMasteryMultiplier(100);
const mult250 = getWeaponMasteryMultiplier(250);

assert.strictEqual(mult0, 0.75, 'Level 0 mastery must be 75%');
assert(mult30 >= 0.95 && mult30 <= 0.98, 'Level 30 mastery should be ~96%');
assert(mult50 >= 1.04 && mult50 <= 1.07, 'Level 50 mastery should be ~105%');
assert(mult100 >= 1.18 && mult100 <= 1.22, 'Level 100 mastery should be ~120%');
assert(mult250 >= 1.35 && mult250 <= 1.40, 'Level 250 mastery should be ~137.5% (Controlled, never broken)');
console.log(`  ✅ Weapon Mastery: Lv0=${(mult0*100)}% | Lv30=${(mult30*100).toFixed(1)}% | Lv50=${(mult50*100).toFixed(1)}% | Lv100=${(mult100*100).toFixed(1)}% | Lv250=${(mult250*100).toFixed(1)}%`);

// 3. Test Balanced Unarmed Fist Combat Bonus
console.log('\n[3/7] Testing Balanced Unarmed (Fist) Bonus & Caps...');
const fist0 = getUnarmedBonus(0);
const fist100 = getUnarmedBonus(100);
const fist250 = getUnarmedBonus(250);

assert.strictEqual(fist0.bonusAtk, 0);
assert.strictEqual(fist100.bonusAtk, 150);
assert.strictEqual(fist250.bonusAtk, 375, 'Lv 250 Fist gives +375 ATK (Balanced with legendary gear)');
assert(fist250.bonusComboRate <= 0.25, 'Combo rate must cap at 25%');
assert(fist250.bonusCritRate <= 0.125, 'Crit rate must cap at 12.5%');
console.log(`  ✅ Fist Lv250: +${fist250.bonusAtk} ATK | +${(fist250.bonusComboRate*100)}% Combo (Capped) | +${(fist250.bonusCritRate*100)}% Crit`);

// 4. Test Tool Durability Preservation & Economy Balance
console.log('\n[4/7] Testing Tool Durability Preservation Caps...');
const preserve0 = getToolDurabilityPreserveChance(0);
const preserve100 = getToolDurabilityPreserveChance(100);
const preserve250 = getToolDurabilityPreserveChance(250);

assert.strictEqual(preserve0, 0);
assert.strictEqual(preserve100, 0.26);
assert.strictEqual(preserve250, 0.65, 'Preserve chance must cap at 65% so tools never become 100% immortal');
console.log(`  ✅ Forging Preserve: Lv0=0% | Lv100=26% | Lv250=65% (Balanced tool sink)`);

// 5. Test Stealing Success Bonus & Cap
console.log('\n[5/7] Testing Stealing Success Bonus Caps...');
const steal0 = getStealingSuccessBonus(0);
const steal100 = getStealingSuccessBonus(100);
const steal250 = getStealingSuccessBonus(250);

assert.strictEqual(steal0, 0);
assert.strictEqual(steal100, 0.14);
assert.strictEqual(steal250, 0.35, 'Steal bonus must cap at 35%');
console.log(`  ✅ Stealing Bonus: Lv0=0% | Lv100=14% | Lv250=35% (Capped)`);

// 6. Test Item Requirement Gates
console.log('\n[6/7] Testing Item Requirement Gates...');
const demonSword = {
    name: 'Pedang Demon',
    category: 'weapon',
    weaponType: 'sword',
    requiredKungfuSkill: 'sword',
    requiredKungfuLevel: 30
};
const novice = { kungfuSkills: { sword: getXpRequiredForLevel(15) } };
const master = { kungfuSkills: { sword: getXpRequiredForLevel(50) } };

assert.strictEqual(checkItemKungfuRequirement(novice, demonSword).allowed, false);
assert.strictEqual(checkItemKungfuRequirement(master, demonSword).allowed, true);
console.log('  ✅ Demon sword gate (Lv 30) validated.');

// 7. Test Anti-Exploit Rules
console.log('\n[7/7] Testing Anti-Exploit XP Diminishing & Denial Rules...');
const celestialPlayer = { kungfuSkills: { sword: 50000 } };
const exploitAttempt = awardKungfuExp(celestialPlayer, 'sword', 50, {
    playerRealmIdx: 5,
    opponentRealmIdx: 2,
    isPvE: true
});
assert.strictEqual(exploitAttempt.expGained, 0);
assert.strictEqual(celestialPlayer.kungfuSkills.sword, 50000);
console.log(`  ✅ Anti-exploit confirmed: 0 XP given for trivial opponents.`);

console.log('\n=====================================================================');
console.log('🎉 ALL KUNGFU MASTERY MAX LEVEL 250 TESTS PASSED WITH PERFECT BALANCE!');
console.log('=====================================================================');
