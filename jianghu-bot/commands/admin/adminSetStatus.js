const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Player = require('../../models/Player');
const { logAdminAction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-set-status')
    .setDescription('[ADMIN] Ubah status karakter (custom / base status)')
    .addUserOption((o) => o.setName('user').setDescription('Player yang akan diubah statusnya').setRequired(true))
    .addStringOption((o) => o.setName('base-status').setDescription('Status dasar karakter').setRequired(true).addChoices(
      { name: 'Active', value: 'active' },
      { name: 'Frozen', value: 'frozen' },
      { name: 'Dead', value: 'dead' },
    ))
    .addStringOption((o) => o.setName('custom-status').setDescription('Status kustom (contoh: Sedang Meditasi)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const targetUser = interaction.options.getUser('user');
    const baseStatus = interaction.options.getString('base-status');
    const customStatus = interaction.options.getString('custom-status') || null;

    const player = await Player.findOne({ discordId: targetUser.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Karakter tidak ditemukan di database server ini.' });

    player.status = baseStatus;
    player.customStatus = customStatus;
    await player.save();

    await logAdminAction(interaction.client, {
      guildId: interaction.guildId,
      adminId: interaction.user.id,
      action: 'SET_STATUS',
      targetUserId: targetUser.id,
      details: `Base: ${baseStatus}, Custom: ${customStatus || '-'}`,
    });

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('Status Diperbarui')
      .setDescription(`Status karakter **${player.characterName}** berhasil diubah.\n- Base Status: **${baseStatus}**\n- Custom Status: **${customStatus || '-'}**`);

    return interaction.editReply({ embeds: [embed] });
  },
};
