const { SlashCommandBuilder } = require('discord.js');
const WorkerContract = require('../../models/WorkerContract');
const { refreshWorkerChannel } = require('../../services/workerChannelService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('batal-worker')
    .setDescription('Membatalkan penawaran jasa sebagai Worker'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const contract = await WorkerContract.findOne({ guildId: interaction.guildId, workerId: interaction.user.id });
    if (!contract) return interaction.editReply({ content: '❌ Kamu tidak sedang mendaftar sebagai Worker.' });

    if (contract.status === 'working') {
      return interaction.editReply({ content: '❌ Kamu sedang bekerja dan tidak bisa membatalkan penawaran secara sepihak.' });
    }

    await WorkerContract.deleteOne({ _id: contract._id });
    await refreshWorkerChannel(interaction.client, interaction.guildId);

    return interaction.editReply({ content: '✅ Penawaran jasamu sebagai Worker telah dibatalkan.' });
  },
};
