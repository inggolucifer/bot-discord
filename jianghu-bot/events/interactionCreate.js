const { Events, MessageFlags } = require('discord.js');
const Player = require('../models/Player');
const { isAdmin, isChannelAllowed } = require('../utils/permissions');
const { handleButton } = require('../handlers/buttonHandler');
const { handleModal } = require('../handlers/modalHandler');
const { handleSelectMenu } = require('../handlers/selectMenuHandler'); // We will create this

// Command yang SELALU boleh dipakai di channel manapun (dipakai admin untuk setup awal / manage channel whitelist)
const CHANNEL_CHECK_EXEMPT = ['admin-channel-add', 'admin-channel-remove', 'admin-channel-list', 'admin'];

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {

    if (interaction.isStringSelectMenu()) {
      const { handleSelectMenu } = require('../handlers/selectMenuHandler');
      return handleSelectMenu(interaction);
    }

    // ================= SLASH COMMAND =================
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      // ---- Cek whitelist channel ----
      if (!CHANNEL_CHECK_EXEMPT.includes(interaction.commandName)) {
        const bypass = await isAdmin(interaction);
        if (!bypass) {
          const allowed = await isChannelAllowed(interaction);
          if (!allowed) {
            return interaction.reply({ content: '❌ Bot tidak aktif di channel ini. Hubungi admin.', flags: MessageFlags.Ephemeral });
          }
        }
      }

      // ---- Cek Kematian Player ----
      if (interaction.commandName !== 'restart-karakter' && interaction.commandName !== 'help') {
        const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
        if (player && player.status === 'dead') {
          return interaction.reply({
            content: '💀 Kamu telah meninggal. Cari pertolongan pemain lain yang memiliki kemampuan membangkitkanmu, atau restart akun dari awal dengan command: `/restart-karakter`',
            flags: MessageFlags.Ephemeral
          });
        }
      }

      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(`[ERROR] Command ${interaction.commandName} gagal:`, err);
        const payload = { content: '❌ Terjadi kesalahan saat menjalankan command ini. Coba lagi atau hubungi admin.', flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
        else await interaction.reply(payload).catch(() => {});
      }
      return;
    }

    // ================= AUTOCOMPLETE =================
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command?.autocomplete) return;
      try {
        await command.autocomplete(interaction);
      } catch (err) {
        console.error(`[ERROR] Autocomplete ${interaction.commandName} gagal:`, err);
      }
      return;
    }

    // ================= BUTTON =================
    if (interaction.isButton()) {
      try {
        await handleButton(interaction);
      } catch (err) {
        console.error('[ERROR] Button handler error:', err);
      }
      return;
    }

    // ================= MODAL SUBMIT =================
    if (interaction.isModalSubmit()) {
      try {
        await handleModal(interaction);
      } catch (err) {
        console.error('[ERROR] Modal submit gagal:', err);
        const payload = { content: '❌ Terjadi kesalahan saat memproses form ini.', flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
        else await interaction.reply(payload).catch(() => {});
      }
      return;
    }
  },
};
