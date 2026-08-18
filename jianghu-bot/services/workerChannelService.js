const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const WorkerContract = require('../models/WorkerContract');

async function refreshWorkerChannel(client, guildId) {
  try {
    const config = await GuildConfig.findOne({ guildId });
    if (!config || !config.workerChannelId) return;

    const channel = await client.channels.fetch(config.workerChannelId).catch(() => null);
    if (!channel) return;

    const workers = await WorkerContract.find({ guildId, status: 'available' });

    // Hapus pesan bot sebelumnya di channel ini
    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
    if (messages) {
      const botMessages = messages.filter(m => m.author.id === client.user.id);
      for (const msg of botMessages.values()) {
        await msg.delete().catch(() => {});
      }
    }

    if (workers.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0x95a5a6)
        .setTitle('👷 Daftar Worker Tersedia')
        .setDescription('Saat ini tidak ada Worker yang menawarkan jasanya.');
      return channel.send({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('👷 Daftar Worker Tersedia')
      .setDescription('Berikut adalah daftar pemain yang menawarkan jasa sebagai Worker untuk membangun asetmu.');

    const rows = [];
    let currentRow = new ActionRowBuilder();

    workers.forEach((w, index) => {
      embed.addFields({
        name: `👤 ${w.workerName}`,
        value: `Harga: **${w.pricePerHour} Silver/jam**\nDurasi Maksimal: **${w.maxDurationHours} jam**`,
        inline: true
      });

      currentRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`hire_worker_${w.workerId}`)
          .setLabel(`Sewa ${w.workerName}`)
          .setStyle(ButtonStyle.Primary)
      );

      if (currentRow.components.length === 5 || index === workers.length - 1) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder();
      }
    });

    await channel.send({ embeds: [embed], components: rows.slice(0, 5) }); // Discord limit 5 ActionRows
  } catch (err) {
    console.error('[ERROR] refreshWorkerChannel gagal:', err);
  }
}

module.exports = { refreshWorkerChannel };
