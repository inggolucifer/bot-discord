const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const adminInspectService = require('../../services/adminInspectService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('db-inspect')
    .setDescription('Inspeksi read-only basis data MongoDB Atlas (Khusus OWNER)')
    .addSubcommand(sub =>
      sub.setName('collections')
        .setDescription('Lihat ringkasan seluruh koleksi dan jumlah dokumen MongoDB')
    )
    .addSubcommand(sub =>
      sub.setName('find')
        .setDescription('Kueri data read-only dari suatu koleksi')
        .addStringOption(opt => opt.setName('koleksi').setDescription('Nama koleksi (contoh: players, zonetiles)').setRequired(true))
        .addStringOption(opt => opt.setName('filter').setDescription('Filter JSON kueri (contoh: {"guildId": "123"})').setRequired(false))
        .addIntegerOption(opt => opt.setName('limit').setDescription('Jumlah dokumen maksimal (1-10)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('player')
        .setDescription('Inspeksi mendalam satu pemain lintas seluruh tabel data')
        .addUserOption(opt => opt.setName('target').setDescription('Pilih pemain yang ingin diinspeksi').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('land-map')
        .setDescription('Render peta spasial kepemilikan tanah dan bangunan suatu zona')
        .addStringOption(opt => opt.setName('zona').setDescription('ID Zona (contoh: xingcun_village)').setRequired(false))
    ),

  async execute(interaction) {
    const url = process.env.FRONTEND_URL || "https://immortal-x.online";
    return interaction.reply({ content: `Fitur ini sudah dipindahkan ke website. Main di: ${url}`, ephemeral: true });
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();
    const adminId = interaction.user.id;
    const guildId = interaction.guildId;

    if (!adminInspectService.isOwner(adminId)) {
      return interaction.editReply({
        content: '🚫 Akses Ditolak! Perintah inspeksi database hanya dapat diakses oleh Developer/Owner yang terdaftar di OWNER_IDS.'
      });
    }

    if (subcommand === 'collections') {
      const result = await adminInspectService.getCollectionsSummary(adminId, guildId);
      if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });

      const embed = new EmbedBuilder()
        .setColor(0x2C3E50)
        .setTitle('📊 Ringkasan Koleksi MongoDB Atlas')
        .setDescription(`Ditemukan **${result.totalCollections}** koleksi dalam database Jianghu:`);

      const listText = result.collections.slice(0, 15).map(c => 
        `📁 \`${c.name.padEnd(20, ' ')}\` : **${c.count.toLocaleString()}** dokumen`
      ).join('\n');

      embed.addFields({ name: 'Daftar Koleksi', value: `\`\`\`${listText}\`\`\`` });
      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'find') {
      const col = interaction.options.getString('koleksi');
      const filter = interaction.options.getString('filter') || '{}';
      const limit = interaction.options.getInteger('limit') || 3;

      const result = await adminInspectService.findCollectionDocs(adminId, guildId, col, filter, limit);
      if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });

      const embed = new EmbedBuilder()
        .setColor(0x34495E)
        .setTitle(`🔍 Hasil Kueri Koleksi: ${col}`)
        .setDescription(`Filter: \`${filter}\` (Ditemukan: ${result.returnedCount} dokumen)`);

      const jsonSnippet = JSON.stringify(result.docs, null, 2);
      const truncated = jsonSnippet.length > 3900 ? jsonSnippet.substring(0, 3900) + '\n... [TRUNCATED]' : jsonSnippet;

      embed.addFields({ name: 'Data Dokumen (Sensitive Redacted)', value: `\`\`\`json\n${truncated}\n\`\`\`` });
      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'player') {
      const targetUser = interaction.options.getUser('target');
      const result = await adminInspectService.inspectPlayer(adminId, guildId, targetUser.id);
      if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });

      const embed = new EmbedBuilder()
        .setColor(0x1ABC9C)
        .setTitle(`👤 Inspeksi Karakter: ${result.characterName} (${targetUser.username})`)
        .addFields(
          { name: '🧘 Ranah Kultivasi', value: `\`${result.realm}\` (Tahap ${result.stage}, Qi: ${result.qi})`, inline: true },
          { name: '⚡ Kondisi Fisik', value: `HP: \`${result.currentHp}\` | Stamina: \`${Math.floor(result.currentStamina || 0)}\``, inline: true },
          { name: '📍 Posisi Grid', value: `Wilayah: \`${result.position?.zoneId}\` (X: ${result.position?.tileX}, Y: ${result.position?.tileY})`, inline: false },
          { name: '💰 Keuangan', value: `Perak: \`${result.currency?.silver || 0}\`, Emas: \`${result.currency?.gold || 0}\``, inline: true },
          { name: '🏡 Kepemilikan Lahan', value: `${result.ownedPlots.length} petak (${result.ownedBuildings.length} bangunan)`, inline: true }
        );

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'land-map') {
      const zoneId = interaction.options.getString('zona') || 'xingcun_village';
      const result = await adminInspectService.renderLandMap(adminId, guildId, zoneId);
      if (!result.ok) return interaction.editReply({ content: `❌ ${result.error}` });

      const embed = new EmbedBuilder()
        .setColor(0x16A085)
        .setTitle(`🗺️ Peta Spasial Kepemilikan: ${result.zoneName}`)
        .setDescription(`Dimensi: **${result.dimensions}** | Total Petak: **${result.stats.totalTiles}**`)
        .addFields(
          { name: 'Render Grid (Area Sampel 16x16)', value: `\`\`\`\n${result.asciiMap}\n\`\`\`` },
          { name: 'Keterangan Legenda', value: `\`${result.legend}\`` }
        );

      return interaction.editReply({ embeds: [embed] });
    }
  }
};
