const { SlashCommandBuilder } = require('discord.js');
const WorkerContract = require('../../models/WorkerContract');
const Player = require('../../models/Player');
const Asset = require('../../models/Asset');
const { calculateProgress } = require('../../utils/assetProgress');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pindah-worker')
    .setDescription('Pindahkan worker yang sedang kamu sewa ke aset tertentu')
    .addUserOption((o) => o.setName('worker').setDescription('Pilih worker (pemain) yang kamu sewa').setRequired(true))
    .addStringOption((o) => o.setName('aset').setDescription('Nama aset milikmu').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.respond([]);
    const assets = await Asset.find({ _id: { $in: player.assets.map(a => a.assetId) }, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(assets.map(a => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const workerUser = interaction.options.getUser('worker');
    const assetName = interaction.options.getString('aset');

    const contract = await WorkerContract.findOne({ guildId: interaction.guildId, workerId: workerUser.id, currentEmployerId: interaction.user.id, status: 'working' });
    if (!contract) return interaction.editReply({ content: '❌ Worker tersebut tidak sedang bekerja untukmu.' });

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    const assetDoc = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${assetName}$`, 'i') });
    if (!assetDoc) return interaction.editReply({ content: '❌ Aset tidak ditemukan.' });

    const ownedAsset = player.assets.find(a => a.assetId.equals(assetDoc._id));
    if (!ownedAsset) return interaction.editReply({ content: '❌ Kamu tidak memiliki aset tersebut.' });

    // Hapus dari aset lama jika ada
    if (contract.currentAssetId) {
       const oldAssetDoc = await Asset.findById(contract.currentAssetId);
       if (oldAssetDoc) {
          const oldOwnedAsset = player.assets.find(a => a.assetId.equals(oldAssetDoc._id));
          if (oldOwnedAsset && oldOwnedAsset.assignedWorkers) {
             // Simpan progress lama sebelum dicabut (penting mencegah bug progress reset)
             oldOwnedAsset.progressAccumulated += calculateProgress(oldOwnedAsset);
             oldOwnedAsset.lastProgressUpdate = new Date();

             oldOwnedAsset.assignedWorkers = oldOwnedAsset.assignedWorkers.filter(w => w.workerId !== workerUser.id);
             if (oldOwnedAsset.assignedWorkers.length === 0) {
               oldOwnedAsset.status = 'pending';
             }
          }
       }
    }

    contract.currentAssetId = assetDoc._id.toString();
    await contract.save();

    // Simpan progress aset baru sebelum buff diterapkan (penting mencegah retroactive buff)
    ownedAsset.progressAccumulated += calculateProgress(ownedAsset);
    ownedAsset.lastProgressUpdate = new Date();

    if (!ownedAsset.assignedWorkers) ownedAsset.assignedWorkers = [];
    ownedAsset.assignedWorkers.push({ workerId: workerUser.id, endTime: contract.workingUntil });
    if (ownedAsset.status === 'pending') ownedAsset.status = 'building';

    await player.save();

    const workerPlayer = await Player.findOne({ discordId: workerUser.id, guildId: interaction.guildId });
    if (workerPlayer) {
      workerPlayer.customStatus = `Sedang bekerja di asset ${assetDoc.name} milik ${player.characterName}`;
      await workerPlayer.save();
    }

    return interaction.editReply({ content: `✅ **${workerUser.username}** berhasil dipindahkan ke aset **${assetDoc.name}**.` });
  },
};
