const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Tournament = require('../../models/Tournament');

module.exports = {
  data: new SlashCommandBuilder().setName('admin-tournament-list').setDescription('[ADMIN] Lihat semua turnamen di server ini'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const list = await Tournament.find({ guildId: interaction.guildId }).sort({ createdAt: -1 }).limit(25);
    if (!list.length) return interaction.editReply({ content: 'Belum ada turnamen. Buat dengan `/admin-tournament-create`.' });

    const statusEmoji = { registration: '📋', ongoing: '⚔️', finished: '🏆', cancelled: '❌' };
    const lines = list.map((t) => `${statusEmoji[t.status]} **${t.name}** — ${t.status} (${t.participants.length} peserta)${t.winnerName ? ` — Juara: ${t.winnerName}` : ''}`);

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x8e5b3c).setTitle('📋 Daftar Turnamen').setDescription(lines.join('\n'))] });
  },
};

