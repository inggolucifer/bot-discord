const { Events, ActivityType } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`[BOT] Login berhasil sebagai ${client.user.tag}`);
    console.log(`[BOT] Aktif di ${client.guilds.cache.size} server.`);
    client.user.setActivity('Jianghu World 江湖世界', { type: ActivityType.Watching });
  },
};
