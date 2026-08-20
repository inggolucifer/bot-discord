const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-panel')
    .setDescription('[ADMIN] Buka panel admin interaktif utama'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const embed = new EmbedBuilder()
      .setColor(0x8e5b3c)
      .setTitle('🛡️ Dashboard Admin — Jianghu World')
      .setDescription('Gunakan menu di bawah untuk melakukan manajemen server Jianghu World. Menu ini akan membuka modal form atau informasi spesifik yang dibutuhkan admin untuk aksi lebih lanjut.\n\nUntuk aksi yang membutuhkan target player/channel/role spesifik, mohon gunakan slash command biasa (contoh: `/admin player give-item`) karena Modal Discord tidak mendukung mention.');

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('admin_dashboard_select')
      .setPlaceholder('Pilih aksi admin...')
      .addOptions([
        { label: 'Manajemen Item', value: 'panel_manage_item', description: 'Menu tambah, hapus, dan atur item', emoji: '🗡️' },
        { label: 'Manajemen Pet', value: 'panel_manage_pet', description: 'Menu tambah, hapus, dan atur pet', emoji: '🐾' },
        { label: 'Manajemen Aset', value: 'panel_manage_asset', description: 'Menu tambah, hapus, dan atur aset', emoji: '🏠' },
        { label: 'Manajemen Shop', value: 'panel_manage_shop', description: 'Bantuan mengatur shop', emoji: '🏪' },
        { label: 'Manajemen Pemain', value: 'panel_manage_player', description: 'Bantuan mengatur pemain', emoji: '🧍' },
        { label: 'Manajemen Sekte', value: 'panel_manage_sekte', description: 'Bantuan mengatur sekte', emoji: '🏯' },
        { label: 'Manajemen Turnamen', value: 'panel_manage_tournament', description: 'Bantuan mengatur turnamen', emoji: '🏆' },
        { label: 'Clear Logs', value: 'panel_clear_logs', description: 'Hapus log lama manual', emoji: '🗑️' },
        { label: 'Lihat Panduan Admin', value: 'panel_help_admin', description: 'Buka bantuan admin lengkap', emoji: '📖' },
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    return interaction.editReply({ embeds: [embed], components: [row] });
  },
};
