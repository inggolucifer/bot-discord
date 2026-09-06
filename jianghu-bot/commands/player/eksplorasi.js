const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Player = require('../../models/Player');
const Exploration = require('../../models/Exploration');
const Item = require('../../models/Item');
const { escapeRegex } = require('../../utils/escapeRegex');
const mongoose = require('mongoose');
const { EXPLORATION_LOCATIONS: LOCATIONS } = require('../../config/explorationLocations');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eksplorasi')
    .setDescription('Fitur eksplorasi PvE untuk mencari item dan resource')
    .addSubcommand(sub =>
      sub.setName('lokasi')
         .setDescription('Lihat daftar lokasi eksplorasi yang tersedia')
    )
    .addSubcommand(sub =>
      sub.setName('status')
         .setDescription('Lihat status eksplorasi kamu saat ini')
    )
    .addSubcommand(sub =>
      sub.setName('klaim')
         .setDescription('Klaim hasil eksplorasi jika sudah selesai (Fitur lengkap di Web Dashboard)')
    )
    .addSubcommand(sub =>
      sub.setName('mulai')
         .setDescription('Mulai petualangan eksplorasi (Fitur ini dialihkan ke Web Dashboard)')
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const subcommand = interaction.options.getSubcommand(false);
      const discordId = interaction.user.id;

      if (subcommand === 'lokasi') {
        const embed = new EmbedBuilder()
          .setTitle('🗺️ Daftar Lokasi Eksplorasi')
          .setColor(0x3498db)
          .setDescription('Berikut adalah lokasi yang bisa kamu eksplorasi:');

        LOCATIONS.forEach(loc => {
          embed.addFields({
             name: loc.name,
             value: `*Realm Min:* ${loc.minRealmLevel}\n*Durasi:* ${loc.durations.join(', ')} Jam\n*Info:* ${loc.description}`,
             inline: false
          });
        });

        embed.setFooter({ text: 'Untuk mulai eksplorasi, kunjungi Web Dashboard!' });
        return interaction.editReply({ embeds: [embed] });
      }

      if (subcommand === 'status') {
         const activeExp = await Exploration.findOne({ discordId: discordId, status: 'exploring' }).populate('drops.items.itemId');
         if (!activeExp) {
            return interaction.editReply({ content: '❌ Kamu tidak memiliki eksplorasi yang aktif.' });
         }

         const now = new Date();
         const isDone = now >= activeExp.endTime;

         const embed = new EmbedBuilder()
            .setTitle('🧭 Status Eksplorasi')
            .setColor(isDone ? 0x2ecc71 : 0xf1c40f)
            .addFields(
               { name: 'Lokasi', value: activeExp.location, inline: true },
               { name: 'Mulai', value: `<t:${Math.floor(activeExp.startTime.getTime() / 1000)}:R>`, inline: true },
               { name: 'Selesai', value: `<t:${Math.floor(activeExp.endTime.getTime() / 1000)}:R>`, inline: true },
               { name: 'Status', value: isDone ? '✅ Selesai (Gunakan `/eksplorasi klaim` atau via Web)' : '⏳ Sedang Berjalan', inline: false }
            );

         if (isDone) {
            embed.setDescription('Eksplorasi telah selesai! Silahkan klaim menggunakan `/eksplorasi klaim` atau login ke **Web Dashboard** untuk mengambil hasil petualanganmu.');
         } else {
             embed.setDescription('Karaktermu sedang dalam perjalanan. Harap tunggu hingga waktu selesai.');
         }

         return interaction.editReply({ embeds: [embed] });
      }

      if (subcommand === 'klaim') {
          return interaction.editReply({ content: '💡 **Untuk mendapatkan notifikasi visual loot yang lebih baik**, silahkan klaim melalui [Web Dashboard](https://immortal-x.online/explore).' });
      }

      if (subcommand === 'mulai') {
          return interaction.editReply({ content: '💡 **Fitur ini eksklusif di Website!**\nSilahkan kunjungi [Web Dashboard](https://immortal-x.online/explore) untuk memilih lokasi, durasi, dan memulai Eksplorasi dengan tampilan UI yang lebih lengkap dan estetik.' });
      }

    } catch (error) {
       console.error('[Eksplorasi Cmd Error]:', error);
       if (interaction.deferred || interaction.replied) {
           await interaction.editReply({ content: 'Terjadi kesalahan sistem saat memuat data eksplorasi.' }).catch(() => {});
       } else {
           await interaction.reply({ content: 'Terjadi kesalahan sistem.', ephemeral: true }).catch(() => {});
       }
    }
  }
};
