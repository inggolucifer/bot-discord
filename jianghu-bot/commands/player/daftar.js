const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');
const { syncRealmRole } = require('../../utils/realmRole');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daftar')
    .setDescription('Daftar karakter baru untuk memulai petualangan di Jianghu World')
    .addStringOption((opt) =>
      opt.setName('nama').setDescription('Nama karakter kamu').setRequired(true).setMaxLength(32)
    )
    .addStringOption((opt) =>
      opt.setName('jenis-kelamin').setDescription('Jenis kelamin karakter').setRequired(true)
        .addChoices({ name: 'Laki-laki', value: 'Laki-laki' }, { name: 'Perempuan', value: 'Perempuan' })
    )
    .addIntegerOption((opt) =>
      opt.setName('umur').setDescription('Umur karakter (default: 16)').setRequired(false).setMinValue(1).setMaxValue(9999)
    ),

  async execute(interaction) {
    const url = process.env.FRONTEND_URL || "https://immortal-x.online";
    return interaction.reply({ content: `Fitur ini sudah dipindahkan ke website. Main di: ${url}`, ephemeral: true });
  },
};

