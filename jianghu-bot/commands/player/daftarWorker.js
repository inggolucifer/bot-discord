const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Player = require('../../models/Player');
const WorkerContract = require('../../models/WorkerContract');
const { refreshWorkerChannel } = require('../../services/workerChannelService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daftar-worker')
    .setDescription('Tawarkan jasamu sebagai Worker untuk dipekerjakan oleh player lain')
    .addIntegerOption((o) => o.setName('harga').setDescription('Harga per jam (minimal 2 silver)').setRequired(true).setMinValue(2))
    .addIntegerOption((o) => o.setName('durasi-maks').setDescription('Durasi maksimal yang kamu tawarkan (dalam jam)').setRequired(true).setMinValue(1)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });
    if (player.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${player.status}**.` });

    const pricePerHour = interaction.options.getInteger('harga');
    const maxDurationHours = interaction.options.getInteger('durasi-maks');

    let contract = await WorkerContract.findOne({ guildId: interaction.guildId, workerId: interaction.user.id });

    if (contract && contract.status === 'working') {
      return interaction.editReply({ content: '❌ Kamu sedang terikat kontrak kerja dengan orang lain. Selesaikan dulu pekerjaanmu.' });
    }

    if (!contract) {
      contract = new WorkerContract({
        guildId: interaction.guildId,
        workerId: interaction.user.id,
        workerName: player.characterName,
      });
    }

    contract.pricePerHour = pricePerHour;
    contract.maxDurationHours = maxDurationHours;
    contract.status = 'available';
    await contract.save();

    await refreshWorkerChannel(interaction.client, interaction.guildId);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Berhasil Mendaftar sebagai Worker')
      .setDescription(`Kamu telah terdaftar dengan tarif **${pricePerHour} Silver/jam** selama maksimal **${maxDurationHours} jam**.`);
    return interaction.editReply({ embeds: [embed] });
  },
};
