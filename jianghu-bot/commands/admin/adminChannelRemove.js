const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-channel-remove')
    .setDescription('[ADMIN] Cabut izin bot di channel tertentu')
    .addChannelOption((o) => o.setName('channel').setDescription('Channel yang mau dicabut izinnya (default: channel ini)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const config = await GuildConfig.findOne({ guildId: interaction.guildId });

    if (!config || !config.allowedChannelIds.includes(channel.id)) {
      return interaction.editReply({ content: `❌ ${channel} tidak ada di daftar channel yang diizinkan.` });
    }

    config.allowedChannelIds = config.allowedChannelIds.filter((id) => id !== channel.id);
    await config.save();

    const note = config.allowedChannelIds.length === 0
      ? '\n\n⚠️ Daftar channel sekarang kosong, artinya bot kembali bisa dipakai di **SEMUA** channel.'
      : '';

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('🗑️ Izin Channel Dicabut').setDescription(`Bot tidak lagi bisa dipakai player di ${channel}.${note}`)] });
  },
};
