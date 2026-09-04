const { SlashCommandBuilder } = require('discord.js');
const petService = require('../../services/player/pet/petService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pet')
    .setDescription('Sistem Pet')
    .addSubcommand(sub => sub.setName('list').setDescription('Lihat daftar pet milikmu'))
    .addSubcommand(sub => sub.setName('status').setDescription('Lihat status detail petmu').addStringOption(o => o.setName('pet').setDescription('Pilih pet').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('feed').setDescription('Beri makan pet').addStringOption(o => o.setName('pet').setDescription('Pilih pet').setRequired(true).setAutocomplete(true)).addStringOption(o => o.setName('item').setDescription('Pilih makanan dari inventory').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('heal').setDescription('Sembuhkan HP pet').addStringOption(o => o.setName('pet').setDescription('Pilih pet').setRequired(true).setAutocomplete(true)).addStringOption(o => o.setName('item').setDescription('Pilih potion dari inventory').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('rename').setDescription('Ubah nama panggilan pet').addStringOption(o => o.setName('pet').setDescription('Pilih pet').setRequired(true).setAutocomplete(true)).addStringOption(o => o.setName('nama_baru').setDescription('Nama baru (maks 16 karakter)').setRequired(true)))
    .addSubcommand(sub => sub.setName('release').setDescription('Lepaskan pet ke alam liar').addStringOption(o => o.setName('pet').setDescription('Pilih pet yang mau dilepas').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('battle').setDescription('Tantang pet pemain lain').addUserOption(o => o.setName('lawan').setDescription('Pemain lawan').setRequired(true)).addStringOption(o => o.setName('pet_kamu').setDescription('Pilih pet yang akan bertarung').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('buyslot').setDescription('Beli tambahan slot pet (Maks 6)')),

  async autocomplete(interaction) {
    if (petService.autocomplete) return petService.autocomplete(interaction);
  },

  async execute(interaction) {
    try {
    return await petService.execute(interaction);
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
