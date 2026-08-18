// Normalisasi currency SUPAYA OTOMATIS naik tingkat: 100 Silver -> 1 Gold, 100 Gold -> 1 Jade, 100 Jade -> 1 Spirit.
// Dipanggil dari pre-save hook Player & Sect, jadi berlaku OTOMATIS di semua transaksi tanpa
// perlu ditulis manual di tiap command (daily, transfer, shop, admin-grant, donasi, dll -- semuanya lewat .save()).

function normalizeCurrency(currency) {
  if (!currency) return currency;

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

