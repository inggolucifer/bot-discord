/**
 * TEST SUITE: T5 - CURRENCY PILLS COMPONENT LOGIC
 * Menguji getVisibleCurrencyTiers:
 * - Menampilkan hanya mata uang bernilai > 0 jika showZero = false
 * - Menampilkan fallback 0 Tembaga jika seluruh kas kosong
 * - Menampilkan seluruh 5 tier jika showZero = true
 * - Sanitasi integer (Math.floor) terhadap nilai desimal
 */

const assert = require('assert');

const CURRENCY_TIERS = [
    { key: 'spirit', emoji: '🔮', label: 'Batu Roh', color: 'border-purple-600/40 text-purple-300' },
    { key: 'jade',   emoji: '💎', label: 'Giok',     color: 'border-emerald-600/40 text-emerald-300' },
    { key: 'gold',   emoji: '🥇', label: 'Emas',     color: 'border-amber-600/40 text-amber-200' },
    { key: 'silver', emoji: '🥈', label: 'Perak',    color: 'border-stone-500/40 text-stone-300' },
    { key: 'copper', emoji: '🟤', label: 'Tembaga',  color: 'border-amber-900/40 text-amber-600' },
];

function getVisibleCurrencyTiers(currency, showZero = false) {
    const c = currency || {};
    const tiers = CURRENCY_TIERS.map(t => ({
        ...t,
        value: Math.max(0, Math.floor(Number(c[t.key]) || 0))
    }));
    if (showZero) return tiers;
    const visible = tiers.filter(t => t.value > 0);
    return visible.length > 0 ? visible : [{ ...tiers[4], value: 0 }]; // fallback: 0 Tembaga
}

console.log('\n=== TEST SUITE: T5 - CURRENCY PILLS LOGIC ===\n');

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

it('Hanya menampilkan tier dengan value > 0 jika showZero = false', () => {
    const res = getVisibleCurrencyTiers({ copper: 50, silver: 0, gold: 2, jade: 1, spirit: 0 });
    const keys = res.map(r => r.key);
    assert.deepStrictEqual(keys, ['jade', 'gold', 'copper']);
    assert.strictEqual(res.find(r => r.key === 'gold').value, 2);
    assert.strictEqual(res.find(r => r.key === 'jade').value, 1);
});

it('Menampilkan fallback 1 tier (0 Tembaga) jika semua saldo 0 atau kosong', () => {
    const resEmpty = getVisibleCurrencyTiers({});
    assert.strictEqual(resEmpty.length, 1);
    assert.strictEqual(resEmpty[0].key, 'copper');
    assert.strictEqual(resEmpty[0].value, 0);

    const resZeros = getVisibleCurrencyTiers({ copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 });
    assert.strictEqual(resZeros.length, 1);
    assert.strictEqual(resZeros[0].key, 'copper');
    assert.strictEqual(resZeros[0].value, 0);
});

it('Menampilkan seluruh 5 tier jika showZero = true', () => {
    const res = getVisibleCurrencyTiers({ copper: 10 }, true);
    assert.strictEqual(res.length, 5);
    assert.strictEqual(res.find(r => r.key === 'spirit').value, 0);
    assert.strictEqual(res.find(r => r.key === 'copper').value, 10);
});

it('Melakukan sanitasi integer bulat (Math.floor) terhadap angka pecahan', () => {
    const res = getVisibleCurrencyTiers({ silver: 15.89, copper: 4.2 });
    assert.strictEqual(res.find(r => r.key === 'silver').value, 15);
    assert.strictEqual(res.find(r => r.key === 'copper').value, 4);
});

console.log(`\n========================================`);
console.log(`HASIL: ${passed} LULUS, ${failed} GAGAL`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
