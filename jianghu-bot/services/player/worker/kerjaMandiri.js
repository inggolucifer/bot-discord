const { MessageFlags } = require('discord.js');
const Player = require('../../../models/Player');
const Asset = require('../../../models/Asset');
const WorkerContract = require('../../../models/WorkerContract');
const { calculateProgress } = require('../../../utils/assetProgress');
const { isUnderConstruction } = require('../../../utils/crafting');
const { refreshWorkerChannel } = require('../../../services/workerChannelService');
const WORKER_OPTIONS = require('../../../commands/player/workerOptions');

module.exports = {
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.respond([]);
    const assets = await Asset.find({ _id: { $in: player.assets.map(a => a.assetId) }, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(assets.map(a => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const assetName = interaction.options.getString(WORKER_OPTIONS.ASET);

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });

    // Pastikan player tidak sedang disewa orang lain
    let contract = await WorkerContract.findOne({ guildId: interaction.guildId, workerId: interaction.user.id });
    if (contract && contract.status === 'working') {
      return interaction.editReply({ content: '❌ Kamu sedang disewa oleh orang lain! Selesaikan dulu kontrak kerjamu.' });
    }

    const assetDoc = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${assetName}$`, 'i') });
    if (!assetDoc) return interaction.editReply({ content: '❌ Aset tidak ditemukan.' });

    const targetAsset = player.assets.find(a => a.assetId.equals(assetDoc._id));
    if (!targetAsset) return interaction.editReply({ content: '❌ Kamu tidak memiliki aset tersebut.' });

    if (!isUnderConstruction(targetAsset) && targetAsset.status !== 'pending' && targetAsset.status !== 'building') {
      if (!targetAsset.assignedWorkers) targetAsset.assignedWorkers = [];
      const activeWorkers = targetAsset.assignedWorkers.filter(w => !w.endTime || w.endTime.getTime() > Date.now()).length;
      if (activeWorkers >= targetAsset.quantity) {
        return interaction.editReply({ content: `❌ Aset yang sudah jadi hanya boleh maksimal memiliki 1 pekerja per unit (maks ${targetAsset.quantity} pekerja).` });
      }
    } else {
      if (!targetAsset.assignedWorkers) targetAsset.assignedWorkers = [];
      const activeWorkers = targetAsset.assignedWorkers.filter(w => !w.endTime || w.endTime.getTime() > Date.now()).length;
      if (activeWorkers >= 4) {
        return interaction.editReply({ content: `❌ Aset yang sedang dibangun maksimal menampung 4 pekerja.` });
      }
    }

    // Hapus dari listing worker jika ada
    if (contract && contract.status === 'available') {
      await WorkerContract.deleteOne({ _id: contract._id });
      await refreshWorkerChannel(interaction.client, interaction.guildId);
    }

    // Cabut dari aset mana pun miliknya yang sebelumnya dikerjakan sendiri
    for (const owned of player.assets) {
      if (owned.assignedWorkers) {
        const myIndex = owned.assignedWorkers.findIndex(w => w.workerId === interaction.user.id);
        if (myIndex !== -1) {
          owned.progressAccumulated = (owned.progressAccumulated || 0) + calculateProgress(owned);
          owned.lastProgressUpdate = new Date();
          owned.assignedWorkers.splice(myIndex, 1);
        }
      }
    }

    // Masukkan ke aset target (tan endTime = permanen)
    targetAsset.progressAccumulated = (targetAsset.progressAccumulated || 0) + calculateProgress(targetAsset);
    targetAsset.lastProgressUpdate = new Date();
    if (!targetAsset.assignedWorkers) targetAsset.assignedWorkers = [];
    targetAsset.assignedWorkers.push({ workerId: interaction.user.id, endTime: null });

    if (targetAsset.status === 'pending') targetAsset.status = 'building';

    player.customStatus = `Sedang bekerja di aset ${assetDoc.name} miliknya sendiri`;
    await player.save();

    return interaction.editReply({ content: `✅ Kamu mulai bekerja di aset **${assetDoc.name}** milikmu sendiri.` });
  }
};
