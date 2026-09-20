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
  }
};
