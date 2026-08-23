// Logika mata uang: Silver -> Gold -> Jade -> Spirit (tetap 1:100)
const CURRENCIES = ['silver', 'gold', 'jade', 'spirit'];

const CURRENCY_LABEL = {
  silver: 'Silver Tael (银两)',
  gold: 'Gold Tael (金两)',
  jade: 'Jade Tael (玉两)',
  spirit: 'Spirit Stone (灵石)',
};

const CURRENCY_EMOJI = {
  silver: '🪙',
  gold: '🥇',
  jade: '💠',
  spirit: '💎',
};

// Rate konversi ke Silver Tael (unit dasar), supaya perhitungan antar currency gampang
// 1 Gold = 100 Silver | 1 Jade = 100 Gold = 10.000 Silver | 1 Spirit = 100 Jade = 1.000.000 Silver
const RATE_TO_SILVER = {
  silver: 1,
  gold: 100,
  jade: 100 * 100,
  spirit: 100 * 100 * 100,
};

function isValidCurrency(code) {
  return CURRENCIES.includes(code);
}

function formatCurrencyLine(currencyObj) {
  return CURRENCIES.map(
    (c) => `${CURRENCY_EMOJI[c]} **${currencyObj?.[c] ?? 0}** ${CURRENCY_LABEL[c]}`
  ).join('\n');
}

module.exports = {
  CURRENCIES, CURRENCY_LABEL, CURRENCY_EMOJI, RATE_TO_SILVER,
  isValidCurrency, formatCurrencyLine,
};
