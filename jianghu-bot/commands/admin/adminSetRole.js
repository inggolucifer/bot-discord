const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-set-role')
    .setDescription('[ADMIN] Tambahkan role yang dianggap sebagai Admin Bot')
    .addRoleOption((o) => o.setName('role').setDescription('Role yang akan dijadikan admin bot').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });
    const role = interaction.options.getRole('role');

    let config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config) config = new GuildConfig({ guildId: interaction.guildId });
    if (!config.adminRoleIds.includes(role.id)) config.adminRoleIds.push(role.id);
    await config.save();

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x2980b9).setTitle('✅ Role Admin Ditambahkan').setDescription(`Role ${role} sekarang dianggap Admin Bot.`)] });
  },
};
