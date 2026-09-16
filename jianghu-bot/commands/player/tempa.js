const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const craftingService = require('../../services/craftingService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempa')
    .setDescription('Menempa senjata dan alat kerja di bengkel pandai besi')
    .addStringOption(opt =>
      opt.setName('resep')
        .setDescription('Pilih barang yang ingin ditempa')
        .setRequired(true)
        .addChoices(
          { name: '⚔️ Pedang Besi Tempa', value: 'Pedang Besi Tempa' },
          { name: '⛏️ Cangkul Baja Kokoh', value: 'Cangkul Baja Kokoh' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const resep = interaction.options.getString('resep');
    const guildId = interaction.guildId;
    const discordId = interaction.user.id;

    const result = await craftingService.craftSmithing(discordId, guildId, resep);

    if (!result.ok) {
      const errEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('⚒️ Gagal Menempa')
        .setDescription(result.error);
      return interaction.editReply({ embeds: [errEmbed] });
    }

    const embed = new EmbedBuilder()
      .setColor(0xE67E22)
      .setTitle(`⚒️ Dentingan Landasan Tempa: ${result.craftedItem}!`)
      .setDescription(`Percikan api memercik! Kamu berhasil menyelesaikan tempaan **${result.craftedItem}**!`)
      .addFields(
        { name: '📦 Hasil Tempaan', value: `\`+1x ${result.craftedItem}\` (Masuk ke tas)`, inline: true },
        { name: '📈 Level Pandai Besi', value: `Level ${result.smithingLevel} ${result.leveledUp ? '🎉 **LEVEL UP!**' : ''}`, inline: true },
        { name: '⚡ Sisa Stamina', value: `${Math.floor(result.remainingStamina)}`, inline: true }
      );

    return interaction.editReply({ embeds: [embed] });
  }
};
