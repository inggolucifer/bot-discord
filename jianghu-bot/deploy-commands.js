// Jalankan file ini SETIAP KALI kamu menambah/mengubah command:
//   node deploy-commands.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const globalCommands = [];
const guildCommands = [];

// Load player commands as global
const playerCommandsPath = path.join(__dirname, 'commands', 'player');
const playerCommandFiles = fs.readdirSync(playerCommandsPath).filter((f) => f.endsWith('.js'));
for (const file of playerCommandFiles) {
  const command = require(path.join(playerCommandsPath, file));
  if (command?.data) globalCommands.push(command.data.toJSON());
}

// Load admin commands as guild-specific
const adminCommandsPath = path.join(__dirname, 'commands', 'admin');
const adminCommandFiles = fs.readdirSync(adminCommandsPath).filter((f) => f.endsWith('.js'));
for (const file of adminCommandFiles) {
  const command = require(path.join(adminCommandsPath, file));
  if (command?.data) guildCommands.push(command.data.toJSON());
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

    // 2. Daftarkan Guild Commands (Admin commands)
    if (process.env.GUILD_ID) {
      // Mode development: command admin langsung muncul di 1 server tertentu
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: guildCommands },
      );
      console.log(`[DEPLOY] Sukses! ${guildCommands.length} Command Admin terdaftar di server GUILD_ID=${process.env.GUILD_ID}.`);
    } else {
      // Mode production: cari semua server tempat bot berada dan daftarkan admin commands ke tiap server
      console.log('[DEPLOY] Mengambil daftar server bot...');
      const guilds = await rest.get(Routes.userGuilds());

      for (const guild of guilds) {
        try {
          await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id),
            { body: guildCommands },
          );
          console.log(`[DEPLOY] Command Admin terdaftar di server: ${guild.name} (${guild.id})`);
        } catch (err) {
          console.error(`[DEPLOY] Gagal mendaftarkan command di server ${guild.name} (${guild.id}):`, err.message);
        }
      }
      console.log('[DEPLOY] Pendaftaran Command Admin ke semua server selesai.');
    }
  } catch (error) {
    console.error('[DEPLOY] Gagal mendaftarkan command:', error);
  }
})();
