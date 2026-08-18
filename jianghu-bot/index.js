require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { connectDB } = require('./config/database');
const { runScheduledCleanup } = require('./utils/logCleanup');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,   // wajib untuk ubah nickname & baca role member
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.GuildMember],
});

client.commands = new Collection();

// ====== Load semua command dari commands/player dan commands/admin ======
const commandFolders = ['player', 'admin'];
for (const folder of commandFolders) {
  const commandsPath = path.join(__dirname, 'commands', folder);
  const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (!command?.data || !command?.execute) {
      console.warn(`[WARNING] Command di ${file} tidak punya "data" atau "execute", dilewati.`);
      continue;
    }
    client.commands.set(command.data.name, command);
  }
}
console.log(`[BOT] ${client.commands.size} command berhasil dimuat.`);

// ====== Load semua event dari folder events/ ======
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) client.once(event.name, (...args) => event.execute(...args));
  else client.on(event.name, (...args) => event.execute(...args));
}

// ====== Jalankan bot ======
(async () => {
  await connectDB();
  await client.login(process.env.DISCORD_TOKEN);

  // ====== Jadwal auto-cleanup log (SATU interval ringan, bukan proses/cron terpisah) ======
  // Jalan pertama kali 2 menit setelah bot nyala (kasih waktu koneksi stabil dulu),
  // lalu berulang setiap 24 jam. Ini TIDAK membebani RAM karena hanya 1 timer aktif sepanjang hidup proses,
  // dan yang dikerjakan cuma query deleteMany terjadwal -- bukan loop/polling terus-menerus.
  setTimeout(() => {
    runScheduledCleanup(client).catch((e) => console.error('[LOG-CLEANUP] Gagal cleanup awal:', e.message));
    setInterval(() => {
      runScheduledCleanup(client).catch((e) => console.error('[LOG-CLEANUP] Gagal cleanup terjadwal:', e.message));
    }, 24 * 60 * 60 * 1000); // 24 jam
  }, 2 * 60 * 1000); // tunggu 2 menit setelah startup
})();

// Tangani error yang tidak tertangkap supaya bot tidak crash diam-diam
process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED REJECTION]', err);
});

