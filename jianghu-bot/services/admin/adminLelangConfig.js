const { EmbedBuilder, MessageFlags } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guildId;
    const auctionChannel = interaction.options.getChannel('auction-channel');
    const requestChannel = interaction.options.getChannel('request-channel');

    if (!auctionChannel && !requestChannel) {
      return interaction.editReply('❌ Kamu harus mengisi setidaknya satu channel (auction-channel atau request-channel).');
    }

    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
      config = new GuildConfig({ guildId });
    }

    let msg = '✅ Berhasil mengupdate konfigurasi lelang:\n';

    if (auctionChannel) {
      config.auctionChannelId = auctionChannel.id;
      msg += `- Channel Lelang (Live): <#${auctionChannel.id}>\n`;
    }

    if (requestChannel) {
      config.auctionRequestChannelId = requestChannel.id;
      msg += `- Channel Request Lelang: <#${requestChannel.id}>\n`;
    }

    await config.save();

    const embed = new EmbedBuilder()
      .setTitle('🔧 Konfigurasi Lelang Diperbarui')
      .setDescription(msg)
      .setColor('#00FF00');

    return interaction.editReply({ embeds: [embed] });
  }
};
