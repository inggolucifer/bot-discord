const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Sect = require('../../models/Sect');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-sekte-create')
    .setDescription('[ADMIN] Buat sekte baru')
    .addStringOption((o) => o.setName('nama').setDescription('Nama sekte').setRequired(true).setMaxLength(64))
    .addStringOption((o) => o.setName('deskripsi').setDescription('Deskripsi sekte'))
    .addStringOption((o) => o.setName('gambar-url').setDescription('URL gambar/lambang sekte')),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const nama = interaction.options.getString('nama').trim();
    const deskripsi = interaction.options.getString('deskripsi') || '-';
    const gambarUrl = interaction.options.getString('gambar-url') || null;

    const exists = await Sect.findOne({ guildId: interaction.guildId, name: new RegExp(`^${nama}$`, 'i') });
    if (exists) return interaction.editReply({ content: `❌ Sekte dengan nama "${nama}" sudah ada.` });

    await Sect.create({ guildId: interaction.guildId, name: nama, description: deskripsi, imageUrl: gambarUrl, createdBy: interaction.user.id });

    const embed = new EmbedBuilder()
      .setColor(0x2c3e50)
      .setTitle('🏯 Sekte Dibuat!')
      .setDescription(`Sekte **"${nama}"** berhasil dibuat.\n\nLangkah selanjutnya: gunakan \`/admin-sekte-assign\` untuk mengangkat Ketua, Wakil Ketua, Tetua, atau menambah Anggota.`);
    return interaction.editReply({ embeds: [embed] });
  },
};

