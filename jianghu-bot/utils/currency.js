// Logika mata uang: Copper -> Silver -> Gold -> Jade -> Spirit (tetap 1:100)
const {
  RATE_TO_COPPER,
  getTotalCopper,
  convertToCopper,
  deductCopper,
  addCopper,
  addCurrencyAmount
} = require('./currencyNormalize');

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

function hasEnoughCurrency(currencyObj, amount, currencyType) {
  let needCopper = 0;
  if (typeof amount === 'object' && amount !== null) {
    needCopper = convertToCopper(amount);
  } else {
    const rate = RATE_TO_COPPER[currencyType] || 0;
    needCopper = Math.round((Number(amount) || 0) * rate);
  }
  if (Number.isNaN(needCopper) || needCopper < 0) return false;
  const totalCopper = getTotalCopper(currencyObj);
  return totalCopper >= needCopper;
}

function payCurrency(currencyObj, amount, currencyType = 'copper') {
  try {
    let needCopper = 0;
    if (typeof amount === 'object' && amount !== null) {
      needCopper = convertToCopper(amount);
    } else {
      const rate = RATE_TO_COPPER[currencyType] || 0;
      needCopper = Math.round((Number(amount) || 0) * rate);
    }
    if (Number.isNaN(needCopper) || needCopper < 0) return false;
    deductCopper(currencyObj, needCopper, 'Pembayaran');
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  CURRENCIES,
  CURRENCY_LABEL,
  CURRENCY_EMOJI,
  RATE_TO_SILVER,
  RATE_TO_COPPER,
  isValidCurrency,
  formatCurrencyLine,
  getTotalCopper,
  hasEnoughCurrency,
  payCurrency,
  addCopper,
  addCurrencyAmount
};

