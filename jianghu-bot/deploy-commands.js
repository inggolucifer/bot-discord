// Jalankan file ini SETIAP KALI kamu menambah/mengubah command:
//   node deploy-commands.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const commands = [];
const commandFolders = ['player', 'admin'];

for (const folder of commandFolders) {
  const commandsPath = path.join(__dirname, 'commands', folder);
  const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command?.data) commands.push(command.data.toJSON());
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`[DEPLOY] Mendaftarkan ${commands.length} slash command...`);

    if (process.env.GUILD_ID) {
      // Mode development: command langsung muncul di 1 server tertentu (instan)
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands },
      );
      console.log(`[DEPLOY] Sukses! Command terdaftar di server GUILD_ID=${process.env.GUILD_ID} (instan).`);
    } else {
      // Mode production: command global, bisa dipakai di semua server bot terpasang (butuh ~1 jam untuk sync)
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
      );
      console.log('[DEPLOY] Sukses! Command didaftarkan secara GLOBAL (bisa butuh ~1 jam untuk muncul di semua server).');
    }
  } catch (error) {
    console.error('[DEPLOY] Gagal mendaftarkan command:', error);
  }
})();
