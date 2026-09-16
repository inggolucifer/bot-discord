const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const craftingService = require('../../services/craftingService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('masak')
    .setDescription('Memasak makanan penambah stamina dari hasil bertani atau memancing')
    .addStringOption(opt =>
      opt.setName('resep')
        .setDescription('Pilih masakan yang ingin diracik')
        .setRequired(true)
        .addChoices(
          { name: '🍲 Sup Ikan Mas (Pulihkan 25 Stamina)', value: 'Sup Ikan Mas' },
          { name: '🍞 Roti Gandum Panggang (Pulihkan 20 Stamina)', value: 'Roti Gandum Panggang' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const resep = interaction.options.getString('resep');
    const guildId = interaction.guildId;
    const discordId = interaction.user.id;

    const result = await craftingService.craftCooking(discordId, guildId, resep);

    if (!result.ok) {
      const errEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🍲 Gagal Memasak')
        .setDescription(result.error);
      return interaction.editReply({ embeds: [errEmbed] });
    }

    const embed = new EmbedBuilder()
      .setColor(0xE67E22)
      .setTitle(`🍲 Aroma Sedap Menguar: ${result.craftedDish}!`)
      .setDescription(`Masakan matang sempurna! Semangkuk **${result.craftedDish}** siap disantap.`)
      .addFields(
        { name: '📦 Masuk ke Tas', value: `\`+1x ${result.craftedDish}\``, inline: true },
        { name: '📈 Level Memasak', value: `Level ${result.cookingLevel} ${result.leveledUp ? '🎉 **LEVEL UP!**' : ''}`, inline: true },
        { name: '⚡ Sisa Stamina', value: `${Math.floor(result.remainingStamina)}`, inline: true }
      )
      .setFooter({ text: 'Gunakan makanan ini kapan saja untuk memulihkan stamina.' });

    return interaction.editReply({ embeds: [embed] });
  }
};
