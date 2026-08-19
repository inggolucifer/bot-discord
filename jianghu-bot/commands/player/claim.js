const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const claimProfit = require('./handlers/claimProfit.js');
const loot = require('./handlers/loot.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('claim')
    .setDescription('Claim profit atau loot')
    .addSubcommand(sub => sub.setName('profit').setDescription('Klaim profit dari semua aset yang kamu miliki').addStringOption(opt => opt.setName('tipe').setDescription('Apa yang mau diklaim?').addChoices({name: 'Semua', value: 'all'}).addChoices({name: 'Currency Saja', value: 'currency'}).addChoices({name: 'Material Saja', value: 'item'})))
    .addSubcommand(sub => sub.setName('loot').setDescription('Ambil harta peninggalan karakter yang sudah meninggal (jika ditujukan padamu)').addStringOption(opt => opt.setName('nama').setDescription('Nama karakter yang meninggal').setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'profit') return claimProfit.execute(interaction);
    if (subcommand === 'loot') return loot.execute(interaction);
  }
};
