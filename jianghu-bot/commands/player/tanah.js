const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const landService = require('../../services/landService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tanah')
    .setDescription('Sistem kepemilikan dan jual-beli kavling tanah pemukiman')
    .addSubcommand(sub =>
      sub.setName('lihat')
        .setDescription('Lihat daftar kavling tanah yang dapat dibeli di suatu wilayah')
        .addStringOption(opt => opt.setName('zona').setDescription('Nama ID zona (default: zona saat ini)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('milik')
        .setDescription('Lihat daftar kavling tanah yang kamu miliki')
    )
    .addSubcommand(sub =>
      sub.setName('beli')
        .setDescription('Beli kavling tanah yang tersedia')
        .addIntegerOption(opt => opt.setName('x').setDescription('Koordinat X petak tanah').setRequired(true))
        .addIntegerOption(opt => opt.setName('y').setDescription('Koordinat Y petak tanah').setRequired(true))
        .addStringOption(opt => opt.setName('zona').setDescription('ID zona (opsional, default: zona saat ini)').setRequired(false))
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const discordId = interaction.user.id;

    if (subcommand === 'lihat') {
      const zoneId = interaction.options.getString('zona') || 'xingcun_village';
      const plots = await landService.getAvailablePlots(guildId, zoneId);

      if (!plots || plots.length === 0) {
        return interaction.editReply({
          content: `🏞️ Tidak ada kavling tanah yang tersedia untuk dijual di wilayah **${zoneId}** saat ini.`
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle(`📜 Kavling Tanah Tersedia di ${zoneId}`)
        .setDescription(`Ditemukan **${plots.length}** petak tanah kosong yang siap dibangun.`);

      const listText = plots.slice(0, 10).map(p => 
        `• Petak \`(${p.tileX}, ${p.tileY})\` — 💰 **${p.plotPriceSilver || 100} Perak** (${p.label || 'Kavling Kosong'})`
      ).join('\n');

      embed.addFields({ name: 'Daftar Kavling', value: listText });
      embed.setFooter({ text: 'Gunakan /tanah beli x: y: untuk membeli petak yang diinginkan.' });

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'milik') {
      const lands = await landService.getPlayerLands(guildId, discordId);

      if (!lands || lands.length === 0) {
        return interaction.editReply({
          content: '📜 Kamu belum memiliki kavling tanah. Gunakan `/tanah lihat` untuk mencari petak tanah yang tersedia.'
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('🏡 Sertifikat Kepemilikan Tanah Milikmu')
        .setDescription(`Total Lahan: **${lands.length} / 3** petak maksimal.`);

      const landList = lands.map((l, idx) => 
        `**${idx + 1}. Wilayah ${l.zoneId}** — Koordinat \`(${l.tileX}, ${l.tileY})\`\n   🏷️ Label: *${l.label || '-'}* | Status Bangunan: ${l.buildingName ? `🏛️ ${l.buildingName}` : '🌱 Lahan Kosong'}`
      ).join('\n\n');

      embed.addFields({ name: 'Daftar Properti Tanah', value: landList });
      embed.setFooter({ text: 'Kamu dapat membangun struktur di atas tanah ini via /bangun.' });

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'beli') {
      const targetX = interaction.options.getInteger('x');
      const targetY = interaction.options.getInteger('y');
      const zoneId = interaction.options.getString('zona');

      const result = await landService.purchaseLandPlot(discordId, guildId, targetX, targetY, zoneId);

      if (!result.ok) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('❌ Gagal Membeli Tanah')
          .setDescription(result.error);
        return interaction.editReply({ embeds: [errEmbed] });
      }

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('🎉 Transaksi Akta Tanah Berhasil!')
        .setDescription(`Selamat! Kamu resmi menjadi pemilik sah petak tanah di koordinat \`(${targetX}, ${targetY})\`.`)
        .addFields(
          { name: '💰 Biaya Pembelian', value: `${result.pricePaid} Perak`, inline: true },
          { name: '🪙 Sisa Perak', value: `${result.remainingSilver} Perak`, inline: true },
          { name: '📊 Kuota Kepemilikan', value: `${result.totalOwnedPlots} / 3 Petak`, inline: true }
        )
        .setFooter({ text: 'Gunakan /bangun untuk mendirikan bangunan di atas lahan ini.' });

      return interaction.editReply({ embeds: [embed] });
    }
  }
};
