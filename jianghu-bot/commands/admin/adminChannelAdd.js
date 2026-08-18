const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-channel-add')
    .setDescription('[ADMIN] Izinkan bot dipakai di channel ini (atau channel tertentu)')
    .addChannelOption((o) => o.setName('channel').setDescription('Channel yang diizinkan (default: channel ini)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const channel = interaction.options.getChannel('channel') || interaction.channel;

    let config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config) config = new GuildConfig({ guildId: interaction.guildId });

    if (config.allowedChannelIds.includes(channel.id)) {
      return interaction.editReply({ content: `ℹ️ ${channel} sudah ada di daftar channel yang diizinkan.` });
    }

    config.allowedChannelIds.push(channel.id);
    await config.save();

    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('✅ Channel Diizinkan')
      .setDescription(
        `Bot sekarang bisa dipakai player di ${channel}.\n\n` +
        `⚠️ **Penting**: begitu ada minimal 1 channel di daftar ini, bot **HANYA** akan merespon command player di channel-channel yang diizinkan (channel lain otomatis diblokir untuk player). Admin tetap bisa pakai command di channel manapun.\n\n` +
        `Total channel diizinkan sekarang: **${config.allowedChannelIds.length}**\nGunakan \`/admin-channel-list\` untuk lihat semua.`
      );
    return interaction.editReply({ embeds: [embed] });
  },
};
