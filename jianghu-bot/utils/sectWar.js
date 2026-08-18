const { rollPartialLoot } = require('./dice');

/**
 * Eksekusi hasil perang: winner loot sebagian resource & asset loser (acak per stack),
 * loser kehilangan SEMUA resource/asset/currency-nya (hancur total, mulai dari 0).
 * Keanggotaan (leaderId dkk) TIDAK diubah -- sekte tetap ada, bisa dibangun ulang.
 *
 * @returns {{ lootedResources: Array, lootedAssets: Array }} ringkasan buat ditampilkan di embed
 */
function executeSectWar(winner, loser) {
  const lootedResources = [];
  const lootedAssets = [];

  // ==== Loot resource (material) ====
  for (const res of loser.resources) {
    const lootedQty = rollPartialLoot(res.quantity);
    if (lootedQty > 0) {
      const winnerOwned = winner.resources.find((r) => r.itemId.equals(res.itemId));
      if (winnerOwned) winnerOwned.quantity += lootedQty;
      else winner.resources.push({ itemId: res.itemId, quantity: lootedQty });
      lootedResources.push({ itemId: res.itemId, quantity: lootedQty, fullQuantity: res.quantity });
    }
  }

  // ==== Loot asset (bangunan yang sudah jadi -- dirampas dalam kondisi SUDAH selesai dibangun) ====
  for (const asset of loser.assets) {
    const lootedQty = rollPartialLoot(asset.quantity);
    if (lootedQty > 0) {
      const winnerOwned = winner.assets.find((a) => a.assetId.equals(asset.assetId));
      if (winnerOwned) {
        winnerOwned.quantity += lootedQty;
      } else {
        winner.assets.push({ assetId: asset.assetId, quantity: lootedQty, lastClaimAt: null, constructionCompleteAt: null });
      }
      lootedAssets.push({ assetId: asset.assetId, quantity: lootedQty, fullQuantity: asset.quantity });
    }
  }

  // ==== Loser hancur total: kembali ke 0 ====
  loser.resources = [];
  loser.assets = [];
  loser.currency = { silver: 0, gold: 0, jade: 0, spirit: 0 };

  return { lootedResources, lootedAssets };
}

module.exports = { executeSectWar };

