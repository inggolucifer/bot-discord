const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const interiorService = require('../../services/interiorService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('keluar')
    .setDescription('Keluar dari interior bangunan kembali ke peta luar (outdoor)'),

  async execute(interaction) {
    await interaction.deferReply();

    const result = await interiorService.exitBuilding(interaction.user.id, interaction.guildId);

    if (!result.ok) {
      const errEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🚫 Gagal Melangkah Keluar')
        .setDescription(result.error);
      return interaction.editReply({ embeds: [errEmbed] });
    }

    const { restoredPosition, exitedBuildingName } = result;

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`🚪 Melangkah Keluar dari ${exitedBuildingName}`)
      .setDescription('Kamu mendorong pintu dan kembali berdiri di bawah langit terbuka Jianghu.')
      .addFields(
        { 
          name: '📍 Posisi Luar Ruangan', 
          value: `Wilayah: **${restoredPosition.zoneId}**\nKoordinat: \`X: ${restoredPosition.tileX}, Y: ${restoredPosition.tileY}\`` 
        }
      )
      .setFooter({ text: 'Kamu kini berada di grid outdoor dan dapat melangkah dengan /jalan.' });

    return interaction.editReply({ embeds: [embed] });
  }
};
