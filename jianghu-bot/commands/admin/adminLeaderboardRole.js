const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const GuildConfig = require('../../models/GuildConfig');
const { updateTop3LeaderboardRoles } = require('../../utils/leaderboardRoles');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-leaderboard-role')
    .setDescription('[ADMIN] Atur role otomatis untuk peringkat 1/2/3 terkaya')
    .addIntegerOption((o) => o.setName('peringkat').setDescription('Peringkat 1, 2, atau 3').setRequired(true).addChoices(
      { name: 'Peringkat 1 (Terkaya)', value: 1 }, { name: 'Peringkat 2', value: 2 }, { name: 'Peringkat 3', value: 3 },
    ))
    .addRoleOption((o) => o.setName('role').setDescription('Role yang dipasang otomatis (kosongkan untuk menghapus mapping)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const peringkat = interaction.options.getInteger('peringkat');
    const role = interaction.options.getRole('role');

    let config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config) config = new GuildConfig({ guildId: interaction.guildId });
    if (!config.top3RoleIds || config.top3RoleIds.length !== 3) config.top3RoleIds = [null, null, null];

    config.top3RoleIds[peringkat - 1] = role ? role.id : null;
    // Reset holder di posisi ini supaya di transaksi berikutnya bot cek ulang & pasang role dari awal
    if (!config.top3RoleHolders || config.top3RoleHolders.length !== 3) config.top3RoleHolders = [null, null, null];
    config.top3RoleHolders[peringkat - 1] = null;
    config.markModified('top3RoleIds');
    config.markModified('top3RoleHolders');
    await config.save();

    // Langsung coba sinkronisasi sekali supaya efeknya terasa instan (bukan nunggu transaksi berikutnya)
    await updateTop3LeaderboardRoles(interaction.client, interaction.guildId).catch(() => {});

    const embed = new EmbedBuilder()
      .setColor(0x2980b9)
      .setTitle('✅ Role Leaderboard Diperbarui')
      .setDescription(role
        ? `Peringkat **${peringkat}** terkaya sekarang otomatis dapat role ${role}.`
        : `Mapping role untuk peringkat **${peringkat}** dihapus.`);
    return interaction.editReply({ embeds: [embed] });
  },
};

