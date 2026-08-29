// Logika mata uang: Copper -> Silver -> Gold -> Jade -> Spirit (tetap 1:100)
const CURRENCIES = ['copper', 'silver', 'gold', 'jade', 'spirit'];

const CURRENCY_LABEL = {
  copper: 'Copper Tael (铜钱)',
  silver: 'Silver Tael (银两)',
  gold: 'Gold Tael (金两)',
  jade: 'Jade Tael (玉两)',
  spirit: 'Spirit Stone (灵石)',
};

const CURRENCY_EMOJI = {
  copper: '🟤',
  silver: '🪙',
  gold: '🥇',
  jade: '💠',
  spirit: '💎',
};

// Rate konversi ke Silver Tael (unit dasar), supaya perhitungan antar currency gampang
// 100 Copper = 1 Silver | 1 Gold = 100 Silver | 1 Jade = 100 Gold = 10.000 Silver | 1 Spirit = 100 Jade = 1.000.000 Silver
const RATE_TO_SILVER = {
  copper: 0.01,
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

const RATE_TO_COPPER = {
  copper: 1,
  silver: 100,
  gold: 10000,
  jade: 1000000,
  spirit: 100000000,
};

function getTotalCopper(currencyObj) {
  if (!currencyObj) return 0;
  return Math.round(
    (currencyObj.copper || 0) * RATE_TO_COPPER.copper +
    (currencyObj.silver || 0) * RATE_TO_COPPER.silver +
    (currencyObj.gold || 0) * RATE_TO_COPPER.gold +
    (currencyObj.jade || 0) * RATE_TO_COPPER.jade +
    (currencyObj.spirit || 0) * RATE_TO_COPPER.spirit
  );
}

function hasEnoughCurrency(currencyObj, amount, currencyType) {
  const priceCopper = Math.round(amount * (RATE_TO_COPPER[currencyType] || 0));
  const totalCopper = getTotalCopper(currencyObj);
  return totalCopper >= priceCopper;
}

function payCurrency(currencyObj, amount, currencyType) {
  const priceCopper = Math.round(amount * (RATE_TO_COPPER[currencyType] || 0));
  const totalCopper = getTotalCopper(currencyObj);

  if (Number.isNaN(priceCopper) || totalCopper < priceCopper) {
    return false;
  }

  let rem = totalCopper - priceCopper;

  currencyObj.spirit = Math.floor(rem / RATE_TO_COPPER.spirit);
  rem %= RATE_TO_COPPER.spirit;

  currencyObj.jade = Math.floor(rem / RATE_TO_COPPER.jade);
  rem %= RATE_TO_COPPER.jade;

  currencyObj.gold = Math.floor(rem / RATE_TO_COPPER.gold);
  rem %= RATE_TO_COPPER.gold;

  currencyObj.silver = Math.floor(rem / RATE_TO_COPPER.silver);
  rem %= RATE_TO_COPPER.silver;

  currencyObj.copper = Math.round(rem);

  return true;
}

module.exports = {
  CURRENCIES, CURRENCY_LABEL, CURRENCY_EMOJI, RATE_TO_SILVER, RATE_TO_COPPER,
  isValidCurrency, formatCurrencyLine, getTotalCopper, hasEnoughCurrency, payCurrency,
};
