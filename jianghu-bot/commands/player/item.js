const { SlashCommandBuilder } = require('discord.js');
const cekItemService = require('../../services/player/item/cekItem');
const craftService = require('../../services/player/item/craft');
const listItemService = require('../../services/player/item/listItem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('item')
    .setDescription('Sistem Item')
    .addSubcommand(sub => sub.setName('cek').setDescription('Lihat detail sebuah item').addStringOption(o => o.setName('nama').setDescription('Nama item').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('Lihat daftar keseluruhan item'))
    .addSubcommand(sub => sub.setName('craft').setDescription('Gunakan aset pribadi untuk membuat (craft/refine) item').addStringOption(o => o.setName('nama-aset').setDescription('Pilih asetmu yang bisa digunakan untuk crafting').setRequired(true).setAutocomplete(true)).addStringOption(o => o.setName('nama-resep').setDescription('Resep yang mau dibuat').setRequired(true).setAutocomplete(true)).addIntegerOption(o => o.setName('jumlah').setDescription('Berapa kali craft').setMinValue(1))),

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'cek' && cekItemService.autocomplete) return cekItemService.autocomplete(interaction);
    if (sub === 'craft' && craftService.autocomplete) return craftService.autocomplete(interaction);
  },

  async execute(interaction) {
    try {
    const sub = interaction.options.getSubcommand();
    if (sub === 'cek') return await cekItemService.execute(interaction);
    if (sub === 'list') return await listItemService.execute(interaction);
    if (sub === 'craft') return await craftService.execute(interaction);
      } catch (error) {
      console.error(error);
      const msg = "Terjadi kesalahan sistem saat memproses command ini.";
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: msg }).catch(() => {});
      } else {
        await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
      }
    }
  }
};
