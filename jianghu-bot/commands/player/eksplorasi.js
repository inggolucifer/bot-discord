const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Player = require('../../models/Player');
const Exploration = require('../../models/Exploration');
const Item = require('../../models/Item');
const { escapeRegex } = require('../../utils/escapeRegex');
const mongoose = require('mongoose');

// Helper to match Web API LOCATIONS config
const LOCATIONS = [
    {
        id: 'hutan_rimba',
        name: 'Hutan Rimba Tepi Desa',
        description: 'Hutan biasa yang relatif aman. Cocok untuk pemula mencari resource dasar.',
        minRealmLevel: 0,
        durations: [1, 2, 4],
        drops: {
            currency: { copper: [5, 15] },
            items: [
                { name: 'Rumput Kering', chance: 0.8, min: 1, max: 3 },
                { name: 'Kayu Mentah', chance: 0.8, min: 1, max: 3 },
                { name: 'Daun Herbal Pereda Nyeri', chance: 0.4, min: 1, max: 2 },
                { name: 'Buah Liar', chance: 0.6, min: 1, max: 2 }
            ]
        }
    },
    {
        id: 'lembah_iblis',
        name: 'Lembah Iblis Beracun',
        description: 'Tempat berbahaya yang penuh dengan racun dan monster. Risiko tinggi, hadiah tinggi.',
        minRealmLevel: 1,
        durations: [3, 6, 12],
        drops: {
            currency: { copper: [20, 50], silver: [0, 1] },
            items: [
                { name: 'Jamur Beracun', chance: 0.7, min: 1, max: 4 },
                { name: 'Tulang Hewan', chance: 0.6, min: 1, max: 2 },
                { name: 'Akar Stamina', chance: 0.3, min: 1, max: 2 },
                { name: 'Kulit Mentah', chance: 0.5, min: 1, max: 2 }
            ]
        }
    },
    {
        id: 'gua_kristal',
        name: 'Gua Kristal Roh',
        description: 'Gua kuno yang mengandung energi Qi tebal. Sangat langka materialnya.',
        minRealmLevel: 2,
        durations: [6, 12, 24],
        drops: {
            currency: { silver: [1, 3] },
            items: [
                { name: 'Batu Bara', chance: 0.6, min: 2, max: 5 },
                { name: 'Bijih Besi', chance: 0.5, min: 1, max: 3 },
                { name: 'Batu Roh Kasar', chance: 0.1, min: 1, max: 1 },
                { name: 'Bunga Penurun Panas', chance: 0.4, min: 1, max: 2 }
            ]
        }
    }
];

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
