const assert = require('assert');
const { resolveWeaponDiscipline, getKungfuLevel, awardKungfuExp } = require('./utils/kungfuMastery');
const { simulateBattle } = require('./utils/simulateBattle');

console.log('=== RUNNING RIGOROUS KUNGFU COMBAT MASTERY VERIFICATION ===');

// 1. Verify resolveWeaponDiscipline fallbacks
assert.strictEqual(resolveWeaponDiscipline(null), 'fist', 'Null weapon must resolve to fist');
assert.strictEqual(resolveWeaponDiscipline(undefined), 'fist', 'Undefined weapon must resolve to fist');
assert.strictEqual(resolveWeaponDiscipline('random_string'), 'fist', 'String weapon must resolve to fist');
assert.strictEqual(resolveWeaponDiscipline({}), 'fist', 'Empty object must resolve to fist');
assert.strictEqual(resolveWeaponDiscipline({ name: 'Batu Kali' }), 'fist', 'Non-weapon object must resolve to fist');
assert.strictEqual(resolveWeaponDiscipline({ name: 'Pedang Bambu Hijau' }), 'sword', 'Pedang must resolve to sword');
assert.strictEqual(resolveWeaponDiscipline({ name: 'Golok Naga Emas' }), 'saber', 'Golok must resolve to saber');
assert.strictEqual(resolveWeaponDiscipline({ name: 'Tongkat Shaolin' }), 'staff', 'Tongkat must resolve to staff');
assert.strictEqual(resolveWeaponDiscipline({ name: 'Jarum Racun Hujan' }), 'hiddenWeapon', 'Jarum must resolve to hiddenWeapon');
console.log('✅ Test 1 Passed: resolveWeaponDiscipline never gives sword by default.');

// 2. Simulate combat for barehanded player (no weapon equipped)
const barehandedChallenger = {
    characterName: 'Pendekar Tangan Kosong',
    discordId: 'p1_barehanded',
    currentHp: 200,
    status: 'active',
    laws: [],
    manuals: [
        {
            manualId: {
                name: 'Tebasan Pedang Melayang',
                effectType: 'damage',
                effectValue: 1.5,
                triggerChance: 1.0, // 100% chance but requires sword!
                requiredSkillType: 'sword'
            }
        },
        {
            manualId: {
                name: 'Totokan Jari Meridian',
                effectType: 'damage',
                effectValue: 1.2,
                triggerChance: 1.0,
                requiredSkillType: 'finger'
            }
        }
    ],
    equipment: {}, // no weapon equipped!
    inventory: [],
    kungfuSkills: {}
};

const dummyOpponent = {
    characterName: 'Lawan Latihan',
    discordId: 'p2_dummy',
    currentHp: 150,
    statBlock: {
        hp: 150,
        atk: 5,
        def: 5,
        spd: 5
    },
    laws: [],
    manuals: []
};

const barehandedResult = simulateBattle(barehandedChallenger, dummyOpponent, { isPvE: true });
assert.strictEqual(barehandedResult.kungfuGains.weaponDiscipline, 'fist', 'Barehanded player must have fist discipline');
assert(barehandedResult.kungfuGains.weaponExp > 0, 'Barehanded player should earn combat EXP');
assert.strictEqual(barehandedResult.kungfuGains.weaponItemName, null, 'Weapon item name should be null for barehanded player');
// Verify that sword skill was NOT used and NOT included in usedSkills
assert(!barehandedResult.kungfuGains.usedSkills.includes('sword'), 'Sword discipline must NOT be earned without sword');
console.log('✅ Test 2 Passed: Barehanded player gains fist EXP, cannot use sword skills, and never gains sword EXP.');

// 3. Simulate combat for player equipped with a Sword
const swordItem = {
    _id: 'item_sword_001',
    name: 'Pedang Bintang Tujuh',
    weaponType: 'sword',
    category: 'weapon'
};

const armedChallenger = {
    characterName: 'Pendekar Pedang',
    discordId: 'p1_swordsman',
    currentHp: 300,
    status: 'active',
    laws: [],
    manuals: [
        {
            manualId: {
                name: 'Tebasan Pedang Melayang',
                effectType: 'damage',
                effectValue: 1.5,
                triggerChance: 1.0,
                requiredSkillType: 'sword'
            }
        }
    ],
    equipment: { weapon: 'inv_subdoc_001' },
    inventory: [
        {
            _id: 'inv_subdoc_001',
            itemId: swordItem,
            isEquipped: true
        }
    ],
    kungfuSkills: {}
};

const armedResult = simulateBattle(armedChallenger, dummyOpponent, { isPvE: true });
assert.strictEqual(armedResult.kungfuGains.weaponDiscipline, 'sword', 'Armed player must have sword discipline');
assert.strictEqual(armedResult.kungfuGains.weaponItemName, 'Pedang Bintang Tujuh');
assert(armedResult.kungfuGains.weaponExp > 0, 'Armed player earns sword combat EXP');
assert(armedResult.kungfuGains.usedSkills.includes('sword'), 'Sword skill was recorded');

// Award Kungfu EXP
awardKungfuExp(armedChallenger, armedResult.kungfuGains.weaponDiscipline, armedResult.kungfuGains.weaponExp, { allowLevelUp: true });
assert(armedChallenger.kungfuSkills.sword > 0, 'Player kungfuSkills.sword must increase after sword combat');
assert.strictEqual(armedChallenger.kungfuSkills.saber || 0, 0, 'Saber skill must remain 0');
console.log(`✅ Test 3 Passed: Armed player with Sword earned ${armedChallenger.kungfuSkills.sword} sword EXP properly through turn-based RPG battle!`);

console.log('🎉 ALL KUNGFU COMBAT RIGIDITY TESTS PASSED!');
