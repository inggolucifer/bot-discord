const WorkerContract = require('../models/WorkerContract');
const Player = require('../models/Player');
const { refreshWorkerChannel } = require('../services/workerChannelService');
const { logTransaction } = require('./logger');
const { addCurrencyAmount } = require('./currency');

// Fungsi ini akan dipanggil sebelum kalkulasi progress untuk memproses kontrak yang kadaluarsa
async function syncWorkerContracts(client, guildId) {
  const expiredContracts = await WorkerContract.find({
    guildId,
    status: 'working',
    workingUntil: { $lt: new Date() }
  });

  for (const contract of expiredContracts) {
    const employerId = contract.currentEmployerId;
    const workerId = contract.workerId;

    // Gaji Worker
    const hours = Math.ceil((contract.workingUntil.getTime() - contract.workingSince.getTime()) / 3600000);
    const salary = hours * contract.pricePerHour;

    const workerPlayer = await Player.findOne({ discordId: workerId, guildId });
    if (workerPlayer) {
      if (!workerPlayer.currency) workerPlayer.currency = { copper: 0, silver: 0, gold: 0, jade: 0, spirit: 0 };
      addCurrencyAmount(workerPlayer.currency, salary, 'silver');
      workerPlayer.markModified('currency');
      workerPlayer.customStatus = null; // Hapus status kerja
      await workerPlayer.save();
    }

    // Cabut dari aset
    if (contract.currentAssetId) {
      const employerPlayer = await Player.findOne({ discordId: employerId, guildId });
      if (employerPlayer) {
        const asset = employerPlayer.assets.find(a => a.assetId.toString() === contract.currentAssetId);
        if (asset && asset.assignedWorkers) {
          asset.assignedWorkers = asset.assignedWorkers.filter(w => w.workerId !== workerId);
          if (asset.assignedWorkers.length === 0) asset.status = 'pending';
        }
        await employerPlayer.save();
      }
    }

    contract.status = 'available';
    contract.currentAssetId = null;
    contract.currentEmployerId = null;
    contract.workingSince = null;
    contract.workingUntil = null;
    await contract.save();

    if (client) {
      await logTransaction(client, {
        guildId, type: 'worker_salary', fromUserId: employerId, toUserId: workerId,
        currency: 'silver', amount: salary,
        itemDescription: `Gaji worker untuk ${hours} jam kerja`
      });
    }
  }

  if (expiredContracts.length > 0 && client) {
    await refreshWorkerChannel(client, guildId);
  }
}



// Fungsi ini dipanggil dari cron job untuk mengecek dan memproses kontrak kadaluarsa di semua guild secara global
async function syncAllWorkerContracts(client) {
  const expiredContracts = await WorkerContract.find({
    status: 'working',
    workingUntil: { $lt: new Date() }
  });

  if (expiredContracts.length === 0) return;

  const affectedGuilds = new Set();
  for (const contract of expiredContracts) {
    affectedGuilds.add(contract.guildId);
  }

  for (const guildId of affectedGuilds) {
    await syncWorkerContracts(client, guildId).catch(console.error);
  }
}

module.exports = { syncWorkerContracts, syncAllWorkerContracts };
