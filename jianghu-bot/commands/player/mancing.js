const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const farmingFishingService = require('../../services/farmingFishingService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mancing')
    .setDescription('Memancing ikan di tepi sungai atau dermaga pemukiman'),

  async execute(interaction) {
    await interaction.deferReply();

    const guildId = interaction.guildId;
    const discordId = interaction.user.id;

    const result = await farmingFishingService.goFishing(discordId, guildId);

    if (!result.ok) {
      const errEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🎣 Gagal Memancing')
        .setDescription(result.error);
      return interaction.editReply({ embeds: [errEmbed] });
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('🎣 Strike! Tangkapan Berhasil!')
      .setDescription(`Kailmu tersentak keras! Kamu menarik seekor **${result.fishName}**!`)
      .addFields(
        { name: '🐟 Hasil Tangkapan', value: `\`+${result.quantity}x ${result.fishName}\``, inline: true },
        { name: '📈 Level Memancing', value: `Level ${result.fishingLevel} ${result.leveledUp ? '🎉 **LEVEL UP!**' : ''}`, inline: true },
        { name: '⚡ Sisa Stamina', value: `${Math.floor(result.remainingStamina)}`, inline: true }
      )
      .setFooter({ text: 'Ikan dapat dimasak via /masak atau dijual di pasar.' });

    return interaction.editReply({ embeds: [embed] });
  }
};
