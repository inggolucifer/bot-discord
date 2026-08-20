const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-set-worker-channel')
    .setDescription('[ADMIN] Atur channel untuk menampilkan daftar Worker yang tersedia')
    .addChannelOption((o) => o.setName('channel').setDescription('Channel yang akan digunakan untuk Worker').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const channel = interaction.options.getChannel('channel');

    let config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config) config = new GuildConfig({ guildId: interaction.guildId });

    config.workerChannelId = channel.id;
    await config.save();

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('✅ Channel Worker Diatur')
      .setDescription(`Daftar Worker yang tersedia sekarang akan dimunculkan di channel <#${channel.id}>.`);
    return interaction.editReply({ embeds: [embed] });
  },
};
