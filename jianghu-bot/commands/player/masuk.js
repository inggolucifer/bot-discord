const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const interiorService = require('../../services/interiorService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('masuk')
    .setDescription('Masuk ke dalam bangunan yang ada di depanmu (Toko, Kediaman, Balai Desa)'),

  async execute(interaction) {
    await interaction.deferReply();

    const result = await interiorService.enterBuilding(interaction.user.id, interaction.guildId);

    if (!result.ok) {
      const errEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🚫 Tidak Dapat Masuk')
        .setDescription(result.error)
        .setFooter({ text: 'Pastikan kamu berdiri tepat di depan petak pintu (🚪).' });
      return interaction.editReply({ embeds: [errEmbed] });
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle(`🚪 Memasuki: ${result.structureName}`)
      .setDescription(`Kamu membuka pintu dan melangkah ke dalam **${result.structureName}** milik *${result.ownerName}*.`)
      .addFields(
        { name: '🏠 Tipe Bangunan', value: `\`${result.structureType}\``, inline: true },
        { name: '📐 Ukuran Ruangan', value: `\`${result.subGridWidth}x${result.subGridHeight}\` petak`, inline: true }
      );

    if (result.npcsInside && result.npcsInside.length > 0) {
      const npcList = result.npcsInside.map(n => `👤 **${n.name}** (${n.title || n.role || 'Penghuni'})`).join('\n');
      embed.addFields({ name: '👥 Orang di Dalam Ruangan', value: npcList });
    }

    embed.setFooter({ text: 'Gunakan /keluar kapan saja untuk kembali ke petak depan pintu luar.' });

    return interaction.editReply({ embeds: [embed] });
  }
};
