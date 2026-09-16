const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const expeditionService = require('../../services/expeditionService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ekspedisi')
    .setDescription('Menembus zona ekspedisi berbahaya dan memburu pusaka kuno Jianghu')
    .addSubcommand(sub =>
      sub.setName('katalog')
        .setDescription('Lihat daftar zona ekspedisi yang tersedia dan syarat ranah kultivasi')
    )
    .addSubcommand(sub =>
      sub.setName('mulai')
        .setDescription('Mulai ekspedisi ke reruntuhan kuno')
        .addStringOption(opt =>
          opt.setName('dungeon')
            .setDescription('Pilih zona ekspedisi')
            .setRequired(true)
            .addChoices(
              { name: '🏛️ Reruntuhan Lembah Kuno (Min: Kondensasi Qi)', value: 'reruntuhan_kuno' },
              { name: '⚔️ Makam Pedang Terlarang (Min: Pendirian Fondasi)', value: 'makam_pedang_terlarang' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('cari')
        .setDescription('Menyisir petak reruntuhan untuk mencari peti harta atau relik pusaka')
    )
    .addSubcommand(sub =>
      sub.setName('keluar')
        .setDescription('Mengevakuasi diri kembali ke Desa Xingcun dengan membawa seluruh hasil jarahan')
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const discordId = interaction.user.id;

    if (subcommand === 'katalog') {
      const dungeons = expeditionService.getDungeons();

      const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('🗺️ Peta Zona Ekspedisi & Reruntuhan Kuno')
        .setDescription('Zona berbahaya dengan ancaman tinggi dan pusaka berharga. Memerlukan ranah kultivasi tertentu.');

      for (const [key, d] of Object.entries(dungeons)) {
        embed.addFields({
          name: `🏛️ ${d.name} (\`${key}\`)`,
          value: `⚠️ Tingkat Bahaya: **Tier ${d.dangerTier}**\n🧘 Syarat Ranah: **${d.minRealmName}**\n⏳ Durasi Maksimal: **${d.durationMinutes} Menit**\n⚡ Multiplier Stamina: **${d.staminaCostMultiplier}x**`
        });
      }

      embed.setFooter({ text: 'Gunakan /ekspedisi mulai [dungeon] untuk menembus kabut zona.' });
      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'mulai') {
      const dungeon = interaction.options.getString('dungeon');
      const result = await expeditionService.startExpedition(discordId, guildId, dungeon);

      if (!result.ok) {
        const errEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('🚫 Akses Ekspedisi Ditolak')
          .setDescription(result.error);
        return interaction.editReply({ embeds: [errEmbed] });
      }

      const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setTitle(`💀 Memasuki: ${result.dungeonName}`)
        .setDescription('Udara dingin menusuk tulang saat kamu melangkah menembus gerbang reruntuhan.')
        .addFields(
          { name: '⚠️ Bahaya', value: `Danger Tier ${result.dangerTier}`, inline: true },
          { name: '⏳ Batas Waktu Evakuasi', value: `<t:${Math.floor(result.expiresAt.getTime() / 1000)}:R>`, inline: true },
          { name: '⚡ Sisa Stamina', value: `${Math.floor(result.remainingStamina)}`, inline: true }
        )
        .setFooter({ text: 'Gunakan /ekspedisi cari untuk mencari relik, atau /ekspedisi keluar untuk mundur.' });

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'cari') {
      const result = await expeditionService.searchLoot(discordId, guildId);

      if (!result.ok) {
        return interaction.editReply({ content: `❌ ${result.error}` });
      }

      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('💎 Pusaka Ditemukan!')
        .setDescription(`Matamu menangkap kilauan di balik reruntuhan batu! Kamu memperoleh **${result.lootName}**!`)
        .addFields(
          { name: '✨ Kelangkaan', value: `\`${result.rarity.toUpperCase()}\``, inline: true },
          { name: '🎒 Total Jarahan Ekspedisi', value: `${result.totalLootCount} barang`, inline: true },
          { name: '⚡ Sisa Stamina', value: `${Math.floor(result.remainingStamina)}`, inline: true }
        );

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'keluar') {
      const result = await expeditionService.evacuateExpedition(discordId, guildId);

      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('🛡️ Evakuasi Ekspedisi Berhasil')
        .setDescription(`Kamu berhasil keluar dari zona bahaya dan tiba kembali dengan selamat di **${result.settlement}**.`)
        .addFields(
          { name: '📍 Posisi Aman', value: `Koordinat \`X: ${result.spawnCoords.tileX}, Y: ${result.spawnCoords.tileY}\``, inline: true },
          { name: '📦 Total Pusaka Diamankan', value: `${result.lootsRetrieved} barang jarahan`, inline: true }
        );

      return interaction.editReply({ embeds: [embed] });
    }
  }
};
