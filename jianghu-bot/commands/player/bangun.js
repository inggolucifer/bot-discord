const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const constructionService = require('../../services/constructionService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bangun')
    .setDescription('Mendirikan bangunan dan mengelola konstruksi aset di atas tanah milikmu')
    .addSubcommand(sub =>
      sub.setName('katalog')
        .setDescription('Lihat daftar cetak biru bangunan (Blueprint) yang tersedia')
    )
    .addSubcommand(sub =>
      sub.setName('mulai')
        .setDescription('Mulai mendirikan bangunan di atas petak tanah milikmu')
        .addStringOption(opt => opt.setName('blueprint').setDescription('ID Cetak Biru (contoh: rumah_panggung, bengkel_tempa)').setRequired(true))
        .addIntegerOption(opt => opt.setName('x').setDescription('Koordinat X petak tanah').setRequired(true))
        .addIntegerOption(opt => opt.setName('y').setDescription('Koordinat Y petak tanah').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('cek')
        .setDescription('Cek progres atau selesaikan konstruksi bangunan di petak tanahmu')
        .addIntegerOption(opt => opt.setName('x').setDescription('Koordinat X petak tanah').setRequired(true))
        .addIntegerOption(opt => opt.setName('y').setDescription('Koordinat Y petak tanah').setRequired(true))
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const discordId = interaction.user.id;

    if (subcommand === 'katalog') {
      const blueprints = await constructionService.getBlueprints();

      if (!blueprints || blueprints.length === 0) {
        return interaction.editReply({
          content: '📜 Belum ada cetak biru yang terdaftar di balai arsitektur.'
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('🏛️ Katalog Cetak Biru Bangunan (Blueprint)')
        .setDescription('Pilih cetak biru dan bangun di atas lahan milikmu dengan `/bangun mulai`.');

      for (const bp of blueprints) {
        const matText = bp.requiredMaterials?.length > 0 
          ? bp.requiredMaterials.map(m => `\`${m.quantity}x ${m.itemName}\``).join(', ')
          : '*Tanpa material tambahan*';

        embed.addFields({
          name: `📌 ${bp.name} (\`${bp.blueprintId}\`)`,
          value: `Kategori: **${bp.category}**\n💰 Biaya: **${bp.requiredSilver} Perak** | ⏳ Waktu: **${Math.round(bp.buildDurationSeconds / 60)} Menit**\n🧱 Material: ${matText}`
        });
      }

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'mulai') {
      const blueprintId = interaction.options.getString('blueprint');
      const targetX = interaction.options.getInteger('x');
      const targetY = interaction.options.getInteger('y');

      const result = await constructionService.startConstruction(discordId, guildId, targetX, targetY, blueprintId);

      if (!result.ok) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('❌ Gagal Memulai Konstruksi')
          .setDescription(result.error);
        return interaction.editReply({ embeds: [errEmbed] });
      }

      const embed = new EmbedBuilder()
        .setColor(0xF39C12)
        .setTitle(`🔨 Konstruksi Dimulai: ${result.blueprintName}`)
        .setDescription(`Para tukang bangunan mulai memasang pondasi di petak \`(${targetX}, ${targetY})\`.`)
        .addFields(
          { name: '⏳ Estimasi Selesai', value: `<t:${Math.floor(result.finishAt.getTime() / 1000)}:R>`, inline: true },
          { name: '🪙 Sisa Perak', value: `${result.remainingSilver} Perak`, inline: true }
        )
        .setFooter({ text: 'Gunakan /bangun cek x: y: untuk memeriksa atau menyelesaikan konstruksi.' });

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'cek') {
      const targetX = interaction.options.getInteger('x');
      const targetY = interaction.options.getInteger('y');

      const result = await constructionService.checkAndFinalizeConstruction(guildId, 'xingcun_village', targetX, targetY);

      if (!result.ok) {
        return interaction.editReply({ content: `❌ ${result.error}` });
      }

      const embed = new EmbedBuilder();
      if (result.isBuildingDone) {
        embed.setColor(0x2ECC71)
          .setTitle(`🎉 ${result.buildingName} Selesai Dibangun!`)
          .setDescription(result.message)
          .setFooter({ text: 'Berdirilah di depan petak ini dan gunakan /masuk untuk masuk ke interior.' });
      } else {
        embed.setColor(0xF1C40F)
          .setTitle(`⏳ Konstruksi Sedang Berjalan`)
          .setDescription(result.message);
      }

      return interaction.editReply({ embeds: [embed] });
    }
  }
};
