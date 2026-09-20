const { SlashCommandBuilder } = require('discord.js');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const Pet = require('../../models/Pet');
const Asset = require('../../models/Asset');
const Sect = require('../../models/Sect');
const { buildPlayerProfileEmbed } = require('../../utils/embeds');
const { syncPlayerCultivation } = require('../../utils/cultivation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Lihat profil karakter (milikmu sendiri atau orang lain)')
    .addUserOption((opt) => opt.setName('user').setDescription('Player yang ingin dilihat profilnya').setRequired(false)),

  async execute(interaction) {
    const url = process.env.FRONTEND_URL || "https://immortal-x.online";
    return interaction.reply({ content: `Fitur ini sudah dipindahkan ke website. Main di: ${url}`, ephemeral: true });
  },
};

