/**
 * TEST SUITE: T6 - TOTAL WEALTH CALCULATION IN SILVER
 * Memverifikasi bahwa totalWealth dihitung dalam satuan SILVER (bukan copper):
 * 1 Silver = 100 Copper
 * 1 Gold = 100 Silver
 * 1 Jade = 100 Gold = 10,000 Silver
 * 1 Spirit = 100 Jade = 1,000,000 Silver
 */

const assert = require('assert');
const Player = require('../models/Player');

console.log('\n=== TEST SUITE: T6 - TOTAL WEALTH CALCULATION (SILVER UNITS) ===\n');

let passed = 0;
let failed = 0;

function it(name, fn) {
    try {
        fn();
        console.log(`[PASS] ${name}`);
        passed++;
    } catch (err) {
        console.error(`[FAIL] ${name}:`, err.message);
        failed++;
    }
}

it('totalWealth dihitung secara tepat dalam satuan Perak (Silver)', () => {
    const dummyPlayer = new Player({
        discordId: 'test_wealth_calc',
        characterName: 'WealthTester',
        currency: {
            copper: 50,
            silver: 3,
            gold: 2,
            jade: 1,
            spirit: 0
        }
    });

    // Simulasikan pre('save') hook
    const c = dummyPlayer.currency;
    const expectedSilver = (c.copper / 100) + c.silver + (c.gold * 100) + (c.jade * 10000) + (c.spirit * 1000000);
    assert.strictEqual(expectedSilver, 10203.5, 'Expected 10203.5 silver');

    // Trigger pre save
    dummyPlayer.schema.s.hooks.execPre('save', dummyPlayer, () => {
        assert.strictEqual(dummyPlayer.totalWealth, expectedSilver);
    });
});

console.log(`\n========================================`);
console.log(`HASIL: ${passed} LULUS, ${failed} GAGAL`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
