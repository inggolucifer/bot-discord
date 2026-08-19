const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../../utils/permissions');
const GuildConfig = require('../../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder().setName('admin-channel-list').setDescription('[ADMIN] Lihat daftar channel yang diizinkan untuk bot'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const config = await GuildConfig.findOne({ guildId: interaction.guildId });
    const list = config?.allowedChannelIds || [];

    const embed = new EmbedBuilder().setColor(0x8e5b3c).setTitle('📋 Daftar Channel yang Diizinkan');
    if (!list.length) {
      embed.setDescription('Belum ada channel yang di-set. Artinya bot saat ini bisa dipakai **di semua channel**.\nGunakan `/admin-channel-add` untuk mulai membatasi.');
    } else {
      embed.setDescription(list.map((id) => `<#${id}>`).join('\n'));
    }
    return interaction.editReply({ embeds: [embed] });
  },
};
