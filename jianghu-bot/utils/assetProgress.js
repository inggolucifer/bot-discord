function calculateProgress(assetOwned) {
  if (!assetOwned.lastProgressUpdate) return 0;

  const elapsedMs = Date.now() - assetOwned.lastProgressUpdate.getTime();
  if (elapsedMs <= 0) return 0;

  // Filter only active workers (contract not expired)
  let activeWorkers = 0;
  if (assetOwned.assignedWorkers && assetOwned.assignedWorkers.length > 0) {
    for (const w of assetOwned.assignedWorkers) {
       if (w.endTime && w.endTime.getTime() < Date.now()) {
          continue; // expired
       }
       activeWorkers++;
    }
  }

  // Jika sedang masa pembangunan (pending/building atau punya constructionCompleteAt di masa depan)
  // kecepatan dasar adalah 1.0 (meskipun tanpa pekerja). Pekerja mempercepat hingga 1.4 (maks 4 pekerja)
  let isBuilding = false;
  if (assetOwned.status === 'pending' || assetOwned.status === 'building' ||
      (assetOwned.constructionCompleteAt && assetOwned.constructionCompleteAt.getTime() > Date.now())) {
      isBuilding = true;
  }

  let buff = 1.0;
  if (isBuilding) {
     buff = 1.0 + (activeWorkers * 0.1);
     if (buff > 1.4) buff = 1.4;
  } else {
     // Aset sudah jadi (mode produksi)
     if (activeWorkers === 0) {
       buff = 0.0;
     } else if (activeWorkers > 0) {
       buff = 1.0 + (activeWorkers * 0.1);
     }
     if (buff > 1.4) buff = 1.4;
  }

  return Math.floor(elapsedMs * buff);
}

module.exports = { calculateProgress };
