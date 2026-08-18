// Logika inti crafting, dipakai oleh command player (/craft) MAUPUN sekte (/sekte-craft).
// Beroperasi generik terhadap "kantong material" (array [{itemId, quantity}]) supaya bisa
// dipakai baik untuk player.inventory maupun sect.resources tanpa duplikasi logika.

/** Cek apakah kantong material mencukupi untuk sebuah resep. Return {ok, missing: [{itemName, need, have}]} */
function checkMaterials(materialBag, recipe) {
  const missing = [];
  for (const mat of recipe.materials) {
    const owned = materialBag.find((m) => m.itemId.equals(mat.itemId));
    const have = owned ? owned.quantity : 0;
    if (have < mat.quantity) missing.push({ itemName: mat.itemName, need: mat.quantity, have });
  }
  return { ok: missing.length === 0, missing };
}

/** Kurangi material dari kantong sesuai resep (mutasi array secara langsung). Panggil checkMaterials dulu sebelum ini. */
function consumeMaterials(materialBag, recipe) {
  for (const mat of recipe.materials) {
    const idx = materialBag.findIndex((m) => m.itemId.equals(mat.itemId));
    materialBag[idx].quantity -= mat.quantity;
  }
  return materialBag.filter((m) => m.quantity > 0);
}

/** Cek apakah sebuah instance aset (subdokumen owned) sudah selesai dibangun & boleh dipakai */
function isUnderConstruction(ownedAssetSubdoc) {
  if (!ownedAssetSubdoc.constructionCompleteAt) return false;
  return new Date(ownedAssetSubdoc.constructionCompleteAt) > new Date();
}

function formatRemainingTime(targetDate) {
  const ms = new Date(targetDate).getTime() - Date.now();
  if (ms <= 0) return 'sudah selesai';
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours} jam ${minutes} menit lagi`;
  return `${minutes} menit lagi`;
}

module.exports = { checkMaterials, consumeMaterials, isUnderConstruction, formatRemainingTime };

