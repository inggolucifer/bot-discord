const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-panel')
    .setDescription('[ADMIN] Buka panel admin dengan tombol (tanpa perlu ketik command)'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const embed = new EmbedBuilder()
      .setColor(0x8e5b3c)
      .setTitle('🛡️ Panel Admin — Jianghu World')
      .setDescription('Klik tombol di bawah untuk membuka form. Untuk aksi yang butuh target player (beri currency, edit player, freeze, dll), gunakan command slash biasa karena Discord modal tidak mendukung pilih user — ketik `/admin-` untuk melihat semua opsinya.');

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('panel_add_item').setLabel('Tambah Item').setEmoji('🗡️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('panel_add_pet').setLabel('Tambah Pet').setEmoji('🐾').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('panel_add_asset').setLabel('Buat Aset').setEmoji('🏠').setStyle(ButtonStyle.Primary),
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('panel_help_admin').setLabel('Lihat Semua Command Admin').setEmoji('📖').setStyle(ButtonStyle.Secondary),
    );

    return interaction.editReply({ embeds: [embed], components: [row1, row2] });
  },
};
