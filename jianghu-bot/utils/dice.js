// Sistem "roll dice" generik untuk loot parsial (tidak pernah 100% didapat).
// Dipakai bareng oleh: loot karakter mati (admin-kill) DAN perang sekte (admin-sekte-war),
// supaya perilakunya konsisten -- benar-benar acak, bukan pura-pura acak.

const LOOT_CHANCE_PERCENT = 60; // peluang SATU tumpukan barang/currency ke-loot sama sekali (dari 100)

/** Lempar dadu 1-100 */
function rollD100() {
  return Math.floor(Math.random() * 100) + 1;
}

/** True/false apakah suatu tumpukan barang berhasil di-loot sama sekali */
function rollLootSuccess(chancePercent = LOOT_CHANCE_PERCENT) {
  return rollD100() <= chancePercent;
}

/**
 * Untuk satu tumpukan barang (quantity penuh), tentukan berapa yang berhasil di-loot.
 * Mengembalikan 0 kalau gagal total (dadu tidak beruntung), atau 1..fullQuantity kalau berhasil
 * (jumlahnya juga di-random, jadi tidak pernah otomatis semua).
 */
function rollPartialLoot(fullQuantity) {
  if (fullQuantity <= 0) return 0;
  if (!rollLootSuccess()) return 0;

  const percentLooted = rollD100(); // 1-100
  const looted = Math.max(1, Math.round((fullQuantity * percentLooted) / 100));
  return Math.min(looted, fullQuantity);
}

module.exports = { rollD100, rollLootSuccess, rollPartialLoot, LOOT_CHANCE_PERCENT };

