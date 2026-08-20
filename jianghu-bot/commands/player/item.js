const { SlashCommandBuilder } = require('discord.js');
const cekItemService = require('../../services/player/item/cekItem');
const cariItemService = require('../../services/player/item/cariItem');
const craftService = require('../../services/player/item/craft');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('item')
    .setDescription('Sistem Item')
    .addSubcommand(sub => sub.setName('cek').setDescription('Lihat detail sebuah item').addStringOption(o => o.setName('nama').setDescription('Nama item').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('cari').setDescription('Cari di mana sebuah item bisa didapatkan').addStringOption(o => o.setName('nama-item').setDescription('Nama item').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('craft').setDescription('Gunakan aset pribadi untuk membuat (craft/refine) item').addStringOption(o => o.setName('nama-aset').setDescription('Pilih asetmu yang bisa digunakan untuk crafting').setRequired(true).setAutocomplete(true)).addStringOption(o => o.setName('nama-resep').setDescription('Resep yang mau dibuat').setRequired(true).setAutocomplete(true)).addIntegerOption(o => o.setName('jumlah').setDescription('Berapa kali craft').setMinValue(1))),

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'cek' && cekItemService.autocomplete) return cekItemService.autocomplete(interaction);
    if (sub === 'cari' && cariItemService.autocomplete) return cariItemService.autocomplete(interaction);
    if (sub === 'craft' && craftService.autocomplete) return craftService.autocomplete(interaction);
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'cek') return cekItemService.execute(interaction);
    if (sub === 'cari') return cariItemService.execute(interaction);
    if (sub === 'craft') return craftService.execute(interaction);
  }
};
