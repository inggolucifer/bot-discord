// Normalisasi currency SUPAYA OTOMATIS naik tingkat: 100 Silver -> 1 Gold, 100 Gold -> 1 Jade, 100 Jade -> 1 Spirit.
// Dipanggil dari pre-save hook Player & Sect, jadi berlaku OTOMATIS di semua transaksi tanpa
// perlu ditulis manual di tiap command (daily, transfer, shop, admin-grant, donasi, dll -- semuanya lewat .save()).

const RATE_TO_COPPER = {
  copper: 1,
  silver: 100,
  gold: 10000,
  jade: 1000000,
  spirit: 100000000,
};

function normalizeCurrency(currency) {
  if (!currency) return currency;

  currency.copper = Math.round(currency.copper || 0);
  currency.silver = Math.round(currency.silver || 0);
  currency.gold = Math.round(currency.gold || 0);
  currency.jade = Math.round(currency.jade || 0);
  currency.spirit = Math.round(currency.spirit || 0);

  // Jika ada nilai negatif (akibat deduction persentase/desimal sebelumnya), pinjam dari tingkatan atas
  // dengan cara melebur semuanya ke copper, lalu menormalisasinya kembali.
  if (currency.copper < 0 || currency.silver < 0 || currency.gold < 0 || currency.jade < 0 || currency.spirit < 0) {
    let totalCopper = currency.copper + (currency.silver * 100) + (currency.gold * 10000) + (currency.jade * 1000000) + (currency.spirit * 100000000);

    if (totalCopper < 0) {
        // Jika total hutang melebihi kekayaan, pasang 0 untuk keamanan
        currency.copper = 0; currency.silver = 0; currency.gold = 0; currency.jade = 0; currency.spirit = 0;
    } else {
        currency.spirit = Math.floor(totalCopper / 100000000);
        totalCopper %= 100000000;
        currency.jade = Math.floor(totalCopper / 1000000);
        totalCopper %= 1000000;
        currency.gold = Math.floor(totalCopper / 10000);
        totalCopper %= 10000;
        currency.silver = Math.floor(totalCopper / 100);
        totalCopper %= 100;
        currency.copper = Math.round(totalCopper);
        return currency;
    }
  }

  currency.silver = (currency.silver || 0) + Math.floor((currency.copper || 0) / 100);
  currency.copper = (currency.copper || 0) % 100;

  currency.gold = (currency.gold || 0) + Math.floor((currency.silver || 0) / 100);
  currency.silver = (currency.silver || 0) % 100;

  currency.jade = (currency.jade || 0) + Math.floor((currency.gold || 0) / 100);
  currency.gold = (currency.gold || 0) % 100;

  currency.spirit = (currency.spirit || 0) + Math.floor((currency.jade || 0) / 100);
  currency.jade = (currency.jade || 0) % 100;

  // Spirit Stone adalah unit tertinggi, tidak naik tingkat lagi ke mana pun -- terus terkumpul.
  return currency;
}

function convertFromCopper(totalCopper) {
    let rem = Math.max(0, Math.round(Number(totalCopper) || 0));
    let spirit = Math.floor(rem / RATE_TO_COPPER.spirit);
    rem %= RATE_TO_COPPER.spirit;
    let jade = Math.floor(rem / RATE_TO_COPPER.jade);
    rem %= RATE_TO_COPPER.jade;
    let gold = Math.floor(rem / RATE_TO_COPPER.gold);
    rem %= RATE_TO_COPPER.gold;
    let silver = Math.floor(rem / RATE_TO_COPPER.silver);
    rem %= RATE_TO_COPPER.silver;
    let copper = Math.round(rem);
    return { copper, silver, gold, jade, spirit };
}

function convertToCopper(currency) {
    if (!currency) return 0;
    return (currency.copper || 0) * RATE_TO_COPPER.copper +
           (currency.silver || 0) * RATE_TO_COPPER.silver +
           (currency.gold || 0) * RATE_TO_COPPER.gold +
           (currency.jade || 0) * RATE_TO_COPPER.jade +
           (currency.spirit || 0) * RATE_TO_COPPER.spirit;
}

/** Total kekayaan dalam copper */
function getTotalCopper(currency) {
  return convertToCopper(currency || {});
}

/**
 * Cek apakah cukup bayar needCopper.
 * @param {object} currency
 * @param {number} needCopper
 * @returns {{ ok: boolean, totalCopper: number, needCopper: number, shortfall: number }}
 */
function canAffordCopper(currency, needCopper) {
  const total = getTotalCopper(currency);
  const need = Math.max(0, Math.ceil(Number(needCopper) || 0));
  const ok = total >= need;
  const shortfall = ok ? 0 : need - total;
  return { ok, totalCopper: total, needCopper: need, shortfall };
}

/**
 * Konversi nilai Silver ke Copper (1 Silver = 100 Copper)
 * @param {number} silverAmount
 * @returns {number}
 */
function silverToCopper(silverAmount) {
  return Math.ceil(Number(silverAmount) || 0) * (RATE_TO_COPPER.silver || 100);
}

/**
 * Format tampilan: "2 Gold 5 Silver 30 Copper" dari total copper
 * @param {number} totalCopper
 * @returns {string}
 */
function formatCopper(totalCopper) {
  const amount = Math.max(0, Math.round(Number(totalCopper) || 0));
  if (amount === 0) return '0 Copper';
  const { copper, silver, gold, jade, spirit } = convertFromCopper(amount);
  const parts = [];
  if (spirit > 0) parts.push(`${spirit} Spirit`);
  if (jade > 0) parts.push(`${jade} Jade`);
  if (gold > 0) parts.push(`${gold} Gold`);
  if (silver > 0) parts.push(`${silver} Silver`);
  if (copper > 0) parts.push(`${copper} Copper`);
  return parts.length > 0 ? parts.join(' ') : '0 Copper';
}

/**
 * Potong needCopper dari currency object (mutasi in-place).
 * Alur: total = convertToCopper → total -= need → Object.assign(currency, convertFromCopper(total))
 * Throw Error statusCode 400 jika tidak cukup, pesan human-readable.
 * @param {object} currency - Objek mata uang { copper, silver, gold, jade, spirit }
 * @param {number} needCopper - Jumlah copper yang harus dipotong
 * @param {string} label - Label biaya untuk pesan error
 * @returns {{ paidCopper: number, remaining: number }}
 */
function deductCopper(currency, needCopper, label = 'Biaya') {
  if (!currency) {
    const err = new Error(`${label}: data mata uang tidak valid.`);
    err.statusCode = 400;
    throw err;
  }
  const total = convertToCopper(currency);
  const need = Math.ceil(Number(needCopper) || 0);
  if (total < need) {
    const err = new Error(`${label}: saldo tidak cukup. Butuh ${formatCopper(need)}, punya ${formatCopper(total)}.`);
    err.statusCode = 400;
    throw err;
  }
  const remaining = total - need;
  const next = convertFromCopper(remaining);
  currency.copper = next.copper;
  currency.silver = next.silver;
  currency.gold = next.gold;
  currency.jade = next.jade || 0;
  currency.spirit = next.spirit || 0;
  return { paidCopper: need, remaining };
}

/**
 * Tambah sejumlah copper ke objek currency (mutasi in-place).
 * Otomatis melarutkan dan menata kembali ke 5 pecahan (copper, silver, gold, jade, spirit).
 * @param {object} currency
 * @param {number} amountCopper
 * @returns {object} currency
 */
function addCopper(currency, amountCopper) {
  if (!currency) return currency;
  const add = Math.max(0, Math.round(Number(amountCopper) || 0));
  const total = convertToCopper(currency) + add;
  const next = convertFromCopper(total);
  currency.copper = next.copper;
  currency.silver = next.silver;
  currency.gold = next.gold;
  currency.jade = next.jade || 0;
  currency.spirit = next.spirit || 0;
  return currency;
}

/**
 * Tambah currency berdasarkan unit tipe tertentu (mutasi in-place).
 * @param {object} currency
 * @param {number} amount
 * @param {string} currencyType
 * @returns {object} currency
 */
function addCurrencyAmount(currency, amount, currencyType = 'copper') {
  if (!currency) return currency;
  const rate = RATE_TO_COPPER[currencyType] || 1;
  const copper = Math.round((Number(amount) || 0) * rate);
  return addCopper(currency, copper);
}

module.exports = {
  normalizeCurrency,
  convertFromCopper,
  convertToCopper,
  RATE_TO_COPPER,
  getTotalCopper,
  canAffordCopper,
  deductCopper,
  addCopper,
  addCurrencyAmount,
  silverToCopper,
  formatCopper
};

