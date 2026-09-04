const { SlashCommandBuilder } = require('discord.js');
const helpAdminService = require('../../services/admin/helpAdmin');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help-admin')
    .setDescription('[ADMIN] Lihat semua command admin'),

  async execute(interaction) {
    try {
    return await helpAdminService.execute(interaction);
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
