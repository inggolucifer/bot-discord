function calculateProgress(assetOwned) {
  if (!assetOwned.lastProgressUpdate) return 0;

  const elapsedMs = Date.now() - assetOwned.lastProgressUpdate.getTime();
  if (elapsedMs <= 0) return 0;

  // Filter only active workers (contract not expired)
  let activeWorkers = 0;
  if (assetOwned.assignedWorkers && assetOwned.assignedWorkers.length > 0) {
    for (const w of assetOwned.assignedWorkers) {
       // w.endTime must be tracked. In our current implementation we need to handle it.
       // Let's rely on the global worker sync or we just pass the valid active worker count.
       // For now, if we don't have contract info inside assetOwned, we will assume they are active
       // unless we modify the caller to pass it.
       // Wait, we can check w.endTime if we store it!
       if (w.endTime && w.endTime.getTime() < Date.now()) {
          continue; // expired
       }
       activeWorkers++;
    }
  }

  let buff = 1.0;
  if (activeWorkers > 0) {
    buff += (activeWorkers * 0.1);
  }

  if (buff > 1.4) buff = 1.4;

  return Math.floor(elapsedMs * buff);
}

module.exports = { calculateProgress };
