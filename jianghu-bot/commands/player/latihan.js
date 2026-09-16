const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const forageTrainingService = require('../../services/forageTrainingService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('latihan')
    .setDescription('Melatih jurus bela diri di sasana Dojo untuk meningkatkan kemahiran kungfu')
    .addStringOption(opt =>
      opt.setName('jurus')
        .setDescription('Pilih kategori jurus silat')
        .setRequired(true)
        .addChoices(
          { name: '🗡️ Pedang (Sword)', value: 'sword' },
          { name: '🔪 Golok (Saber)', value: 'saber' },
          { name: '🥢 Tongkat (Staff)', value: 'staff' },
          { name: '👊 Tinju & Pukulan (Fist)', value: 'fist' },
          { name: '👉 Totokan Jari (Finger)', value: 'finger' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const jurus = interaction.options.getString('jurus');
    const guildId = interaction.guildId;
    const discordId = interaction.user.id;

    const result = await forageTrainingService.trainKungfu(discordId, guildId, jurus);

    if (!result.ok) {
      const errEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🥋 Latihan Terhenti')
        .setDescription(result.error);
      return interaction.editReply({ embeds: [errEmbed] });
    }

    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle(`🥋 Latihan Silat: Aliran ${result.skill.toUpperCase()}`)
      .setDescription(`Hawa murni berputar di meridianmu saat mengulang gerakan jurus bertubi-tubi.`)
      .addFields(
        { name: '📈 Penguasaan Jurus', value: `\`+${result.expGained} Kemahiran\` (Total: ${result.newSkillLevel})`, inline: true },
        { name: '📅 Sesi Hari Ini', value: `Sesi ke-${result.sessionToday}`, inline: true },
        { name: '⚡ Sisa Stamina', value: `${Math.floor(result.remainingStamina)}`, inline: true },
        { name: '⚖️ Efisiensi Latihan', value: `*${result.returnTier}*` }
      )
      .setFooter({ text: 'Efisiensi latihan menurun seiring banyaknya sesi per hari untuk menjaga keseimbangan Qi.' });

    return interaction.editReply({ embeds: [embed] });
  }
};
