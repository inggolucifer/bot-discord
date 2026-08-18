const WorkerContract = require('../models/WorkerContract');
const Player = require('../models/Player');
const { refreshWorkerChannel } = require('../services/workerChannelService');
const { logTransaction } = require('./logger');

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
      workerPlayer.currency.silver += salary;
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

module.exports = { syncWorkerContracts };
