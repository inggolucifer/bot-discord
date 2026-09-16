const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const movementService = require('../../services/movementService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jalan')
    .setDescription('Melangkah di peta grid pemukiman atau alam liar Jianghu')
    .addStringOption(option =>
      option.setName('arah')
        .setDescription('Pilih arah langkah')
        .setRequired(true)
        .addChoices(
          { name: '⬆️ Utara', value: 'utara' },
          { name: '⬇️ Selatan', value: 'selatan' },
          { name: '➡️ Timur', value: 'timur' },
          { name: '⬅️ Barat', value: 'barat' },
          { name: '↗️ Timur Laut', value: 'timurlaut' },
          { name: '↖️ Barat Laut', value: 'baratlaut' },
          { name: '↘️ Tenggara', value: 'tenggara' },
          { name: '↙️ Barat Daya', value: 'baratdaya' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const arah = interaction.options.getString('arah');
    const result = await movementService.movePlayer(interaction.user.id, interaction.guildId, arah);

    if (!result.ok) {
      const errEmbed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('❌ Perjalanan Terhenti')
        .setDescription(result.error)
        .setFooter({ text: 'Periksa stamina atau jalur di sekitarmu.' });
      return interaction.editReply({ embeds: [errEmbed] });
    }

    const { newPosition, staminaCost, currentStamina, maxStamina, tileInfo } = result;

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`🧭 Melangkah ke Arah ${result.direction}`)
      .setDescription(`Kamu melangkah mantap di wilayah **${newPosition.zoneId}**.`)
      .addFields(
        { 
          name: '📍 Koordinat Baru', 
          value: `\`X: ${newPosition.tileX}, Y: ${newPosition.tileY}\` (Hadap: ${result.direction})`, 
          inline: true 
        },
        { 
          name: '⚡ Stamina', 
          value: `\`${Math.floor(currentStamina)} / ${maxStamina}\` (🔻 -${staminaCost})`, 
          inline: true 
        }
      );

    if (tileInfo) {
      let desc = [];
      if (tileInfo.label) desc.push(`📌 **${tileInfo.label}**`);
      if (tileInfo.buildingName) desc.push(`🏛️ **${tileInfo.buildingName}**`);
      if (tileInfo.isDoor) desc.push('🚪 *Ini adalah pintu masuk! Gunakan `/masuk` untuk melangkah ke dalam.*');
      if (tileInfo.isClaimable) desc.push('📜 *Tanah ini masih kosong dan dapat diklaim via `/tanah beli`.*');
      if (tileInfo.resourceType) desc.push(`🌾 *Terdapat sumber daya alam (${tileInfo.resourceType}) di sini!*`);

      if (desc.length > 0) {
        embed.addFields({ name: '🔍 Pengamatan di Petak Ini', value: desc.join('\n') });
      }
    }

    return interaction.editReply({ embeds: [embed] });
  }
};
