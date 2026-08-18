const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Player = require('../../models/Player');
const { logAdminAction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-unfreeze')
    .setDescription('[ADMIN] Cabut pembekuan karakter player')
    .addUserOption((o) => o.setName('user').setDescription('Target player').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });
    const target = interaction.options.getUser('user');
    const player = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: `❌ ${target.username} belum terdaftar.` });

    player.status = 'active';
    await player.save();
    await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'UNFREEZE_PLAYER', targetUserId: target.id });

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x27ae60).setTitle('✅ Pembekuan Dicabut').setDescription(`**${player.characterName}** (${target}) sudah aktif kembali.`)] });
  },
};
