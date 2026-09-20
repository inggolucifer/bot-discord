require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const globalCommands = [];
const guildCommands = [];

if (!process.env.DISCORD_TOKEN) {
    console.warn("[DEPLOY] Skipping deployment: DISCORD_TOKEN is not set.");
    process.exit(0);
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`[DEPLOY] Mendaftarkan ${globalCommands.length} command global (player) dan ${guildCommands.length} command guild (admin)...`);

    // 1. Daftarkan Global Commands (Player commands)
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: globalCommands },
    );
    console.log(`[DEPLOY] Sukses! ${globalCommands.length} Command didaftarkan secara GLOBAL (bisa butuh ~1 jam untuk muncul).`);

    const allCommands = [...globalCommands, ...guildCommands];
    console.log(`[DEPLOY] Mengambil daftar server bot untuk pendaftaran instan (${allCommands.length} command)...`);
    const guilds = await rest.get(Routes.userGuilds());
    for (const guild of guilds) {
      try {
        await rest.put(
          Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id),
          { body: allCommands },
        );
        console.log(`[DEPLOY] Sukses! ${allCommands.length} Command (Player + Admin) aktif INSTAN di server: ${guild.name} (${guild.id})`);
      } catch (err) {
        console.error(`[DEPLOY] Gagal mendaftarkan command di server ${guild.name} (${guild.id}):`, err.message);
      }
    }
    console.log('[DEPLOY] Pendaftaran Command Admin ke semua server selesai.');
  } catch (error) {
    console.error('[DEPLOY] Gagal mendaftarkan command:', error);
  }
})();
