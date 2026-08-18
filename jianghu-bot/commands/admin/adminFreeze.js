const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Player = require('../../models/Player');
const { logAdminAction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-freeze')
    .setDescription('[ADMIN] Bekukan (freeze) karakter player yang curang')
    .addUserOption((o) => o.setName('user').setDescription('Target player').setRequired(true))
    .addStringOption((o) => o.setName('alasan').setDescription('Alasan pembekuan').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });
    const target = interaction.options.getUser('user');
    const alasan = interaction.options.getString('alasan') || 'Tidak disebutkan';

    const player = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: `❌ ${target.username} belum terdaftar.` });

    player.status = 'frozen';
    await player.save();

    await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'FREEZE_PLAYER', targetUserId: target.id, details: alasan });

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x3498db).setTitle('🥶 Karakter Dibekukan').setDescription(`**${player.characterName}** (${target}) telah dibekukan.\nAlasan: ${alasan}`)] });
  },
};
