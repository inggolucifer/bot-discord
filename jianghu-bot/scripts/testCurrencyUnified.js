const assert = require('assert');
const {
  RATE_TO_COPPER,
  getTotalCopper,
  convertToCopper,
  convertFromCopper,
  deductCopper,
  addCopper,
  addCurrencyAmount,
  normalizeCurrency
} = require('../utils/currencyNormalize');

const {
  hasEnoughCurrency,
  payCurrency,
  CURRENCIES
} = require('../utils/currency');

console.log('--- TEST CURRENCY UNIFIED (FASE B) ---');

// Test 1: Rates check (5 tiers x100)
assert.strictEqual(RATE_TO_COPPER.copper, 1);
assert.strictEqual(RATE_TO_COPPER.silver, 100);
assert.strictEqual(RATE_TO_COPPER.gold, 10000);
assert.strictEqual(RATE_TO_COPPER.jade, 1000000);
assert.strictEqual(RATE_TO_COPPER.spirit, 100000000);
console.log('✓ Rates test passed');

// Test 2: Wallet { gold: 1 } bayar 50 silver → sukses, total turun
const wallet1 = { copper: 0, silver: 0, gold: 1, jade: 0, spirit: 0 };
const initialCopper1 = getTotalCopper(wallet1);
assert.strictEqual(initialCopper1, 10000);
assert.strictEqual(hasEnoughCurrency(wallet1, 50, 'silver'), true);

const payRes1 = payCurrency(wallet1, 50, 'silver');
assert.strictEqual(payRes1, true);
assert.strictEqual(getTotalCopper(wallet1), 5000);
assert.strictEqual(wallet1.gold, 0);
assert.strictEqual(wallet1.silver, 50);
assert.strictEqual(wallet1.copper, 0);
console.log('✓ Wallet { gold: 1 } bayar 50 silver passed');

// Test 3: Wallet { spirit: 1 } bayar 1 gold → sukses
const wallet2 = { copper: 0, silver: 0, gold: 0, jade: 0, spirit: 1 };
const initialCopper2 = getTotalCopper(wallet2);
assert.strictEqual(initialCopper2, 100000000);
assert.strictEqual(hasEnoughCurrency(wallet2, 1, 'gold'), true);

const payRes2 = payCurrency(wallet2, 1, 'gold');
assert.strictEqual(payRes2, true);
assert.strictEqual(getTotalCopper(wallet2), 100000000 - 10000); // 99,990,000 copper
// 99,990,000 copper = 0 spirit, 99 jade, 99 gold, 0 silver, 0 copper
assert.strictEqual(wallet2.spirit, 0);
assert.strictEqual(wallet2.jade, 99);
assert.strictEqual(wallet2.gold, 99);
assert.strictEqual(wallet2.silver, 0);
assert.strictEqual(wallet2.copper, 0);
console.log('✓ Wallet { spirit: 1 } bayar 1 gold passed');

// Test 4: Kurang → false / throw
const wallet3 = { copper: 50, silver: 0, gold: 0, jade: 0, spirit: 0 };
assert.strictEqual(hasEnoughCurrency(wallet3, 1, 'silver'), false);
assert.strictEqual(payCurrency(wallet3, 1, 'silver'), false);
assert.throws(() => {
  deductCopper(wallet3, 100, 'Test Deduct');
}, /saldo tidak cukup/);
console.log('✓ Kurang saldo test passed');

// Test 5: addCopper + normalize tidak negatif, copper < 100 setelah normalize
const wallet4 = { copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 };
addCopper(wallet4, 250);
assert.strictEqual(getTotalCopper(wallet4), 250);
assert.strictEqual(wallet4.silver, 2);
assert.strictEqual(wallet4.copper, 50);
assert(wallet4.copper < 100);

addCurrencyAmount(wallet4, 3, 'silver'); // + 300 copper -> 550 copper
assert.strictEqual(getTotalCopper(wallet4), 550);
assert.strictEqual(wallet4.silver, 5);
assert.strictEqual(wallet4.copper, 50);

normalizeCurrency(wallet4);
assert(wallet4.copper >= 0 && wallet4.copper < 100);
assert(wallet4.silver >= 0 && wallet4.silver < 100);
assert(wallet4.gold >= 0);
console.log('✓ addCopper and addCurrencyAmount passed');

// Test 6: Object cost compatibility (e.g. { silver: 2 })
const wallet5 = { copper: 0, silver: 5, gold: 0, jade: 0, spirit: 0 };
assert.strictEqual(hasEnoughCurrency(wallet5, { silver: 2 }), true);
assert.strictEqual(payCurrency(wallet5, { silver: 2 }), true);
assert.strictEqual(getTotalCopper(wallet5), 300);
assert.strictEqual(wallet5.silver, 3);
console.log('✓ Object cost compatibility passed');

console.log('ALL CURRENCY TESTS PASSED SUCCESSFULLY!');
