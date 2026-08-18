const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const GuildConfig = require('../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-clear-logs')
    .setDescription('[ADMIN] Hapus log lama SEKARANG JUGA (manual, di luar jadwal otomatis)'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const config = await GuildConfig.findOne({ guildId: interaction.guildId });
    const retentionDays = config?.logRetentionDays || 30;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`confirm_clear_logs_${retentionDays}`).setLabel(`Ya, Hapus Log Lebih Lama dari ${retentionDays} Hari`).setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cancel_action').setLabel('Batal').setStyle(ButtonStyle.Secondary),
    );

    const embed = new EmbedBuilder()
      .setColor(0xc0392b)
      .setTitle('⚠️ Konfirmasi Hapus Log Manual')
      .setDescription(`Ini akan menghapus SEMUA log transaksi & log admin yang lebih tua dari **${retentionDays} hari** (sesuai pengaturan retensi saat ini). Data player/item/pet/asset TIDAK terpengaruh. Lanjutkan?`);

    return interaction.editReply({ embeds: [embed], components: [row] });
  },
};

