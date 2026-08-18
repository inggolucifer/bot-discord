const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const WorkerContract = require('../../models/WorkerContract');
const Asset = require('../../models/Asset');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pekerja-saya')
    .setDescription('Lihat daftar Worker yang sedang kamu sewa'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const workers = await WorkerContract.find({ guildId: interaction.guildId, currentEmployerId: interaction.user.id, status: 'working' });

    if (!workers.length) {
      return interaction.editReply({ content: 'Kamu belum menyewa pekerja sama sekali.' });
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('Daftar Pekerja yang Disewa')
      .setDescription('Berikut adalah daftar orang yang sedang bekerja untukmu:');

    const assetIds = workers.map(w => w.currentAssetId).filter(Boolean);
    const assets = await Asset.find({ _id: { $in: assetIds } });

    workers.forEach(w => {
      let location = 'Belum ditempatkan di aset mana pun (Pending)';
      if (w.currentAssetId) {
         const ast = assets.find(a => a._id.toString() === w.currentAssetId);
         if (ast) location = `Bekerja di: **${ast.name}**`;
      }
      const timeLeft = Math.max(0, Math.floor((w.workingUntil.getTime() - Date.now()) / 60000));
      embed.addFields({
        name: `👤 ${w.workerName}`,
        value: `${location}\nWaktu tersisa: **${timeLeft} menit**`,
      });
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
