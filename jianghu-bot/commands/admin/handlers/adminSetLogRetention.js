const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../../utils/permissions');
const GuildConfig = require('../../../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-set-log-retention')
    .setDescription('[ADMIN] Atur berapa lama log transaksi/admin disimpan sebelum dihapus otomatis')
    .addIntegerOption((o) => o.setName('hari').setDescription('Jumlah hari (1-3650). Default: 30').setRequired(true).setMinValue(1).setMaxValue(3650)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const hari = interaction.options.getInteger('hari');
    let config = await GuildConfig.findOne({ guildId: interaction.guildId });
    if (!config) config = new GuildConfig({ guildId: interaction.guildId });
    config.logRetentionDays = hari;
    await config.save();

    const embed = new EmbedBuilder()
      .setColor(0x2980b9)
      .setTitle('✅ Retensi Log Diperbarui')
      .setDescription(
        `Log transaksi & log admin yang lebih tua dari **${hari} hari** akan otomatis dihapus tiap kali proses cleanup berjalan (sekali per 24 jam).\n\n` +
        `⚠️ Ini HANYA menghapus catatan log, TIDAK PERNAH menghapus data player/item/pet/asset/aset kepemilikan.`
      );
    return interaction.editReply({ embeds: [embed] });
  },
};

