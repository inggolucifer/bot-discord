const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../../utils/permissions');
const GuildConfig = require('../../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-set-log')
    .setDescription('[ADMIN] Atur channel log transaksi & log admin')
    .addChannelOption((o) => o.setName('channel-transaksi').setDescription('Channel untuk log transaksi player').setRequired(false))
    .addChannelOption((o) => o.setName('channel-admin').setDescription('Channel untuk log aksi admin').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const logChannel = interaction.options.getChannel('channel-transaksi');
    const adminChannel = interaction.options.getChannel('channel-admin');
    if (!logChannel && !adminChannel) return interaction.editReply({ content: '❌ Pilih minimal satu channel.' });

    let config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config) config = new GuildConfig({ guildId: interaction.guildId });
    if (logChannel) config.logChannelId = logChannel.id;
    if (adminChannel) config.adminLogChannelId = adminChannel.id;
    await config.save();

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x2980b9).setTitle('✅ Konfigurasi Log Diperbarui')
      .setDescription(`Channel log transaksi: ${config.logChannelId ? `<#${config.logChannelId}>` : '_(belum diset)_'}\nChannel log admin: ${config.adminLogChannelId ? `<#${config.adminLogChannelId}>` : '_(belum diset)_'}`)] });
  },
};
