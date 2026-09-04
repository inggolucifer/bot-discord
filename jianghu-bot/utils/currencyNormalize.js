// Normalisasi currency SUPAYA OTOMATIS naik tingkat: 100 Silver -> 1 Gold, 100 Gold -> 1 Jade, 100 Jade -> 1 Spirit.
// Dipanggil dari pre-save hook Player & Sect, jadi berlaku OTOMATIS di semua transaksi tanpa
// perlu ditulis manual di tiap command (daily, transfer, shop, admin-grant, donasi, dll -- semuanya lewat .save()).

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

module.exports = { normalizeCurrency };


const RATE_TO_COPPER = {
  copper: 1,
  silver: 100,
  gold: 10000,
  jade: 1000000,
  spirit: 100000000,
};

function convertFromCopper(totalCopper) {
    let rem = totalCopper;
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





module.exports.convertFromCopper = convertFromCopper;
module.exports.convertToCopper = convertToCopper;
module.exports.RATE_TO_COPPER = RATE_TO_COPPER;
