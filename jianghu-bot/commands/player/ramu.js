const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const forageTrainingService = require('../../services/forageTrainingService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ramu')
    .setDescription('Mengumpulkan tanaman herbal, menebang kayu, atau menambang bijih di alam liar'),

  async execute(interaction) {
    await interaction.deferReply();

    const guildId = interaction.guildId;
    const discordId = interaction.user.id;

    const result = await forageTrainingService.gatherResource(discordId, guildId);

    if (!result.ok) {
      const errEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🌿 Gagal Meramu')
        .setDescription(result.error);
      return interaction.editReply({ embeds: [errEmbed] });
    }

    const embed = new EmbedBuilder()
      .setColor(0x27AE60)
      .setTitle(`🌿 Pengumpulan Berhasil: ${result.itemName}!`)
      .setDescription(`Kamu cermat memetik dan mengumpulkan hasil alam dari petak sekitar.`)
      .addFields(
        { name: '📦 Masuk ke Tas', value: `\`+${result.quantity}x ${result.itemName}\``, inline: true },
        { name: '⚡ Sisa Stamina', value: `${Math.floor(result.remainingStamina)}`, inline: true },
        { name: '⏳ Waktu Respawn Node', value: `${result.cooldownSeconds} detik`, inline: true }
      )
      .setFooter({ text: 'Bahan alami dapat digunakan untuk resep tempa, racikan obat, atau konstruksi.' });

    return interaction.editReply({ embeds: [embed] });
  }
};
