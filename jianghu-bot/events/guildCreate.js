const { Events, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    console.log(`[BOT] Bot bergabung dengan server baru: ${guild.name} (${guild.id}).`);

    try {
      const guildCommands = [];
      const adminCommandsPath = path.join(__dirname, '..', 'commands', 'admin');
      const adminCommandFiles = fs.readdirSync(adminCommandsPath).filter((f) => f.endsWith('.js'));

      for (const file of adminCommandFiles) {
        const command = require(path.join(adminCommandsPath, file));
        if (command?.data) guildCommands.push(command.data.toJSON());
      }

      if (guildCommands.length > 0) {
        console.log(`[DEPLOY] Mendaftarkan ${guildCommands.length} command guild (admin) untuk server baru ${guild.name}...`);
        const rest = new REST().setToken(process.env.DISCORD_TOKEN);

        await rest.put(
          Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id),
          { body: guildCommands },
        );
        console.log(`[DEPLOY] Sukses! Command Admin terdaftar di server baru ${guild.name} (${guild.id}).`);
      }
    } catch (error) {
      console.error(`[DEPLOY] Gagal mendaftarkan command di server baru ${guild.name} (${guild.id}):`, error);
    }
  },
};
