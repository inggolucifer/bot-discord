const { RATE_TO_COPPER } = require('./currencyNormalize');

/**
 * Menghitung harga kavling tanah berdasarkan jumlah petak tanah yang SUDAH dimiliki pemain.
 * Aturan Harga Pengguna:
 * - Tanah ke-1 (ownedPlotsCount = 0): 1 Gold
 * - Tanah ke-2 (ownedPlotsCount = 1): 10 Gold
 * - Tanah ke-3 (ownedPlotsCount = 2): 50 Gold
 * - Tanah ke-4 (ownedPlotsCount = 3): 1 Jade
 * - Tanah ke-5 (ownedPlotsCount = 4): 10 Jade
 * - Tanah ke-6+: Semakin mahal (progresi eksponensial/prestise tinggi):
 *   * Tanah ke-6 (ownedPlotsCount = 5): 50 Jade
 *   * Tanah ke-7 (ownedPlotsCount = 6): 150 Jade
 *   * Tanah ke-8 (ownedPlotsCount = 7): 400 Jade
 *   * Tanah ke-9 (ownedPlotsCount = 8): 1,000 Jade
 *   * Tanah ke-10 (ownedPlotsCount = 9): 2,500 Jade
 *   * Tanah ke-N (N >= 11): 2,500 * 2^(N - 10) Jade
 */
function getLandPriceForPlayer(ownedPlotsCount) {
  const count = Math.max(0, parseInt(ownedPlotsCount) || 0);
  const nextPlotNumber = count + 1;

  let currency = 'gold';
  let amount = 1;

  if (count === 0) {
    currency = 'gold';
    amount = 1;
  } else if (count === 1) {
    currency = 'gold';
    amount = 10;
  } else if (count === 2) {
    currency = 'gold';
    amount = 50;
  } else if (count === 3) {
    currency = 'jade';
    amount = 1;
  } else if (count === 4) {
    currency = 'jade';
    amount = 10;
  } else if (count === 5) {
    currency = 'jade';
    amount = 50;
  } else if (count === 6) {
    currency = 'jade';
    amount = 150;
  } else if (count === 7) {
    currency = 'jade';
    amount = 400;
  } else if (count === 8) {
    currency = 'jade';
    amount = 1000;
  } else if (count === 9) {
    currency = 'jade';
    amount = 2500;
  } else {
    // Eksponensial untuk tanah ke-11 ke atas
    amount = 2500 * Math.pow(2, count - 9);
    currency = 'jade';
  }

  const unitLabel = currency === 'gold' ? 'Gold Tael' : 'Jade Tael';
  const label = `${amount.toLocaleString('id-ID')} ${unitLabel}`;
  const rate = RATE_TO_COPPER[currency] || (currency === 'gold' ? 10000 : 1000000);
  const priceInCopper = amount * rate;

  return {
    plotNumber: nextPlotNumber,
    currency,
    amount,
    unitLabel,
    label,
    priceInCopper
  };
}

module.exports = {
  getLandPriceForPlayer
};
