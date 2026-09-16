/**
 * Helper Harga Kavling Tanah (Frontend)
 * Aturan User:
 * - Tanah ke-1 (ownedPlotsCount = 0): 1 Gold
 * - Tanah ke-2 (ownedPlotsCount = 1): 10 Gold
 * - Tanah ke-3 (ownedPlotsCount = 2): 50 Gold
 * - Tanah ke-4 (ownedPlotsCount = 3): 1 Jade
 * - Tanah ke-5 (ownedPlotsCount = 4): 10 Jade
 * - Seterusnya dibuat semakin mahal (eksponensial/prestise tinggi):
 *   * Tanah ke-6: 50 Jade
 *   * Tanah ke-7: 150 Jade
 *   * Tanah ke-8: 400 Jade
 *   * Tanah ke-9: 1,000 Jade
 *   * Tanah ke-10: 2,500 Jade
 *   * Tanah ke-N (N >= 11): 2,500 * 2^(N - 10) Jade
 */

export interface LandPriceInfo {
  plotNumber: number;
  currency: 'gold' | 'jade';
  amount: number;
  unitLabel: string;
  label: string;
}

export function getLandPriceForPlayer(ownedPlotsCount: number): LandPriceInfo {
  const count = Math.max(0, Math.floor(ownedPlotsCount) || 0);
  const nextPlotNumber = count + 1;

  let currency: 'gold' | 'jade' = 'gold';
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
    amount = 2500 * Math.pow(2, count - 9);
    currency = 'jade';
  }

  const unitLabel = currency === 'gold' ? 'Gold Tael' : 'Jade Tael';
  const label = `${amount.toLocaleString('id-ID')} ${unitLabel}`;

  return {
    plotNumber: nextPlotNumber,
    currency,
    amount,
    unitLabel,
    label,
  };
}
