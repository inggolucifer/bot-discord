const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const farmingFishingService = require('../../services/farmingFishingService');
const Player = require('../../models/Player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tani')
    .setDescription('Bercocok tanam dan panen hasil pertanian di lahan milikmu')
    .addSubcommand(sub =>
      sub.setName('tanam')
        .setDescription('Tanam bibit pertanian di petak tanah tempatmu berdiri')
        .addStringOption(opt => opt.setName('bibit').setDescription('Nama tanaman (contoh: Gandum Emas, Herba Ginseng)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('panen')
        .setDescription('Panen hasil tani yang sudah matang di petak ini')
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const discordId = interaction.user.id;

    const player = await Player.findOne({ discordId, guildId });
    if (!player) {
      return interaction.editReply({ content: '❌ Karakter belum terdaftar.' });
    }

    const px = player.gridPosition?.tileX ?? 16;
    const py = player.gridPosition?.tileY ?? 16;

    if (subcommand === 'tanam') {
      const cropName = interaction.options.getString('bibit') || 'Gandum Emas';
      const result = await farmingFishingService.plantCrop(discordId, guildId, px, py, cropName);

      if (!result.ok) {
        return interaction.editReply({ content: `❌ ${result.error}` });
      }

      const embed = new EmbedBuilder()
        .setColor(0x27AE60)
        .setTitle(`🌱 Menanam ${result.cropName}`)
        .setDescription(`Bibit berhasil ditanam di lahan \`(${px}, ${py})\`.`)
        .addFields(
          { name: '⏳ Waktu Tumbuh', value: `${result.growSeconds} detik (<t:${Math.floor(result.readyAt.getTime() / 1000)}:R>)`, inline: true },
          { name: '🌾 Level Farming', value: `Level ${result.farmingLevel}`, inline: true },
          { name: '⚡ Sisa Stamina', value: `${Math.floor(result.remainingStamina)}`, inline: true }
        )
        .setFooter({ text: 'Kembalilah setelah matang dan gunakan /tani panen.' });

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'panen') {
      const result = await farmingFishingService.harvestCrop(discordId, guildId, px, py);

      if (!result.ok) {
        return interaction.editReply({ content: `❌ ${result.error}` });
      }

      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle(`🌾 Panen Berhasil: ${result.cropName}!`)
        .setDescription(`Kamu berhasil memanen **${result.quantity}x ${result.cropName}** segar!`)
        .addFields(
          { name: '📦 Masuk ke Tas', value: `+${result.quantity} ${result.cropName}`, inline: true },
          { name: '📈 Level Farming', value: `Level ${result.farmingLevel} ${result.leveledUp ? '🎉 **LEVEL UP!**' : ''}`, inline: true }
        );

      return interaction.editReply({ embeds: [embed] });
    }
  }
};
