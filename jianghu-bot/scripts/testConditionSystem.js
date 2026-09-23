/**
 * testConditionSystem.js
 * Comprehensive automated verification script for the Character Conditions System.
 */
const {
    CONDITION_METADATA,
    normalizeConditions,
    getConditionLevel,
    processElementalInteractions,
    applyKnockbackEffect,
    processCombatTurnConditions,
    processGridStepConditions,
    applyItemConditionCure
} = require('../utils/conditionEngine');
const { getComputedStats } = require('../utils/statCalculator');

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ PASSED: ${message}`);
    }
}

console.log('=== STARTING CONDITIONS SYSTEM VERIFICATION ===\n');

// 1. Normalization & Levels
const c0 = normalizeConditions({});
assert(c0.poison === 0 && c0.burn === 0 && c0.frozen === 0, 'Empty conditions normalize to 0 values');

const cNorm = normalizeConditions({ poison: 25.7, injury: '40', burn: -10, frozen: 150 });
assert(cNorm.poison === 25, 'Zero-decimal policy strictly applied (25.7 -> 25)');
assert(cNorm.injury === 40, 'String values correctly parsed and cast to integer');
assert(cNorm.burn === 0, 'Negative values clamped to 0');
assert(cNorm.frozen === 100, 'Values above 100 clamped to 100 max');

const lvl0 = getConditionLevel('poison', 0);
assert(lvl0.tier === 'Normal' && lvl0.label === 'Normal / Sehat', 'Value 0 is Normal / Sehat');

const lvlMid = getConditionLevel('burn', 45);
assert(lvlMid.tier === 'Sedang', 'Burn value 45 correctly recognized as Sedang');

const lvlInc = getConditionLevel('burn', 80);
assert(lvlInc.tier === 'Incinerated' && lvlInc.label.includes('Incinerated'), 'Burn >= 75 is Incinerated');

// 2. Standby Poison Immunity vs Active Attack
const battlerStandby = {
    name: 'Kultivator',
    hp: 100,
    maxHp: 100,
    conditions: { poison: 20 }
};
const turnStandby = processCombatTurnConditions(battlerStandby, { actionType: 'defend' });
assert(battlerStandby.hp === 100, 'Standby/Defend incurs 0 poison HP loss');
assert(turnStandby.some(e => e.type === 'poison_standby'), 'Event confirms poison standby immunity');

const battlerAttack = {
    name: 'Kultivator',
    hp: 100,
    maxHp: 100,
    conditions: { poison: 20 }
};
const turnAttack = processCombatTurnConditions(battlerAttack, { actionType: 'skill' });
assert(battlerAttack.hp < 100, `Active attack triggers poison damage (HP: ${battlerAttack.hp}/100)`);

// 3. Bleed Decay & Burn Ramp
const battlerBleedBurn = {
    name: 'Kultivator',
    hp: 100,
    maxHp: 100,
    conditions: { bleed: 30, burn: 20 }
};
processCombatTurnConditions(battlerBleedBurn, { actionType: 'skill' });
assert(battlerBleedBurn.conditions.bleed < 30, `Bleed naturally decays over turn (New Bleed: ${battlerBleedBurn.conditions.bleed})`);
assert(battlerBleedBurn.conditions.burn > 20, `Burn naturally worsens/ramps over turn (New Burn: ${battlerBleedBurn.conditions.burn})`);

// 4. Elemental Synergies: Water douses Burn, Fire melts Frozen
const battlerBurnActor = {
    name: 'Kultivator Terbakar',
    conditions: { burn: 60 }
};
const battlerBurnTarget = {
    name: 'Musuh Terbakar',
    conditions: { burn: 50 }
};
const waterSkill = { name: 'Pukulan Gelombang Samudra', element: 'water' };
const waterInteractions = processElementalInteractions(battlerBurnActor, waterSkill, battlerBurnTarget);
assert(battlerBurnActor.conditions.burn === 15, `Water skill cleanses 45 burn from caster (60 - 45 = ${battlerBurnActor.conditions.burn})`);
assert(battlerBurnTarget.conditions.burn === 20, `Water skill douses 30 burn from target in steam burst (50 - 30 = ${battlerBurnTarget.conditions.burn})`);
assert(waterInteractions.length === 2, 'Elemental interaction generated 2 water douse messages');

const battlerFrozenSelf = {
    name: 'Kultivator',
    conditions: { frozen: 65 }
};
const fireSkill = { name: 'Nafas Naga Api', element: 'fire' };
const fireInteractions = processElementalInteractions(battlerFrozenSelf, fireSkill, { name: 'Musuh' });
assert(battlerFrozenSelf.conditions.frozen === 15, `Fire skill melts 50 frozen points (65 - 50 = ${battlerFrozenSelf.conditions.frozen})`);

// 5. Knockback Turn-Based Effects
const targetKB = {
    name: 'Pendekar Lawan',
    hp: 100,
    maxHp: 100,
    stance: 50,
    maxStance: 100,
    conditions: { knockback: 0 },
    buffs: [{ type: 'defense_up', duration: 1 }]
};
const enemyQueue = [{ name: 'Cadangan 1' }];
const sessionMock = { enemies: [targetKB], enemyQueue };
const kbResult = applyKnockbackEffect(sessionMock, { name: 'Attacker' }, targetKB, 55);
assert(targetKB.conditions.knockback === 55, 'Knockback value applied to target');
assert(targetKB.stance < 50, 'Knockback inflicted flat stance damage');
assert(!targetKB.buffs.some(b => b.type === 'defense_up'), 'Knockback broke defense_up guard');
assert(kbResult.some(e => e.type === 'wall_slam'), 'Knockback >= 50 caused wall slam collision event');

// 6. Injury Stat Penalty
const mockPlayer = {
    systemCultivation: { realm: 'Qi Refining', stage: 1 },
    stats: { atk: 100, def: 50, hp: 500, maxHp: 500, mp: 200, maxMp: 200 },
    equipment: {},
    conditions: { injury: 50 } // 50% injury
};
const computed = getComputedStats(mockPlayer);
console.log(`Injury 50 Stats: ATK ${computed.atk}, DEF ${computed.def}, Max MP ${computed.maxMp}`);
assert(computed.atk < 100, 'Injury reduces ATK stat');
assert(computed.def < 50, 'Injury reduces DEF stat');
assert(computed.maxMp < 200, 'Injury reduces Max MP stat');

// 7. Grid Exploration Movement Block (Frozen) & Poison Step Damage
const frozenStep = processGridStepConditions({ conditions: { frozen: 35, poison: 0 }, hp: 100, maxHp: 100 });
assert(frozenStep.canMove === false, 'Movement is completely blocked on grid when frozen >= 30');

const poisonStep = processGridStepConditions({ conditions: { frozen: 0, poison: 20 }, stats: { baseHp: 100 } });
assert(poisonStep.canMove === true, 'Movement is allowed when not frozen');
assert(poisonStep.stepDamage > 0, `Moving while poisoned inflicts step damage (${poisonStep.stepDamage} HP)`);

// 8. Consumable Item Condition Cure
const sickPlayer = {
    conditions: { poison: 40, burn: 50, bleed: 30 }
};
const cureMsg1 = applyItemConditionCure(sickPlayer, { name: 'Pil Penawar Racun', description: 'Menyembuhkan racun' });
assert(sickPlayer.conditions.poison === 0, `Antidote reduced poison from 40 to ${sickPlayer.conditions.poison}`);
assert(cureMsg1.includes('Racun berkurang'), 'Item cure reported poison reduction message');

const cureMsg2 = applyItemConditionCure(sickPlayer, { name: 'Perban Sutra Emas', description: 'Menghentikan pendarahan' });
assert(sickPlayer.conditions.bleed === 0, `Bandage reduced bleed from 30 to ${sickPlayer.conditions.bleed}`);
assert(cureMsg2.includes('Pendarahan berkurang'), 'Item cure reported bleed reduction message');

console.log('\n=== ALL CONDITION SYSTEM AUTOMATED CHECKS PASSED PERFECTLY! ===');
