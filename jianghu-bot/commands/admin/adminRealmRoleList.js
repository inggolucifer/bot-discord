const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder().setName('admin-realm-role-list').setDescription('[ADMIN] Lihat semua mapping role ranah & role leaderboard'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const config = await GuildConfig.findOne({ guildId: interaction.guildId });

    const embed = new EmbedBuilder().setColor(0x8e5b3c).setTitle('📋 Role Otomatis — Ranah & Leaderboard');

    const realmLines = config?.realmRoles?.length
      ? config.realmRoles.map((r) => `**${r.realmName}** → <@&${r.roleId}>`).join('\n')
      : '_Belum ada mapping ranah._';
    embed.addFields({ name: '⚔️ Role Ranah', value: realmLines });

    const top3 = config?.top3RoleIds || [null, null, null];
    const top3Lines = [1, 2, 3].map((i) => `Peringkat ${i}: ${top3[i - 1] ? `<@&${top3[i - 1]}>` : '_(belum di-set)_'}`).join('\n');
    embed.addFields({ name: '🏆 Role Leaderboard Terkaya', value: top3Lines });

    return interaction.editReply({ embeds: [embed] });
  },
};

