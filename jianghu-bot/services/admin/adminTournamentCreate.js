const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Tournament = require('../../models/Tournament');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-tournament-create')
    .setDescription('[ADMIN] Buat turnamen bracket baru (sistem gugur)')
    .addStringOption((o) => o.setName('nama').setDescription('Nama turnamen').setRequired(true).setMaxLength(64)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const nama = interaction.options.getString('nama').trim();
    const exists = await Tournament.findOne({ guildId: interaction.guildId, name: new RegExp(`^${escapeRegex(nama)}$`, 'i') });
    if (exists) return interaction.editReply({ content: `❌ Turnamen dengan nama "${nama}" sudah ada.` });

    await Tournament.create({ guildId: interaction.guildId, name: nama, createdBy: interaction.user.id });

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('🏆 Turnamen Dibuat!')
      .setDescription(
        `Turnamen **"${nama}"** berhasil dibuat, status: **Pendaftaran Dibuka**.\n\n` +
        `Langkah selanjutnya:\n` +
        `1. \`/admin-tournament-add-player nama-turnamen:${nama} user:@player\` — daftarkan peserta (ulangi untuk tiap peserta)\n` +
        `2. \`/admin-tournament-start nama-turnamen:${nama}\` — mulai turnamen setelah semua peserta terdaftar\n` +
        `3. \`/admin-tournament-set-winner\` — tentukan pemenang tiap match, bracket otomatis lanjut ke babak berikutnya`
      );
    return interaction.editReply({ embeds: [embed] });
  },
};

