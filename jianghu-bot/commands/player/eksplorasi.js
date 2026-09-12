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
          .setDescription('Berikut adalah lokasi (Provinsi) yang bisa kamu eksplorasi:');

        LOCATIONS.forEach(loc => {
          let m = loc.monsters ? loc.monsters.map(x => x.name).join(', ') : 'Tidak ada catatan monster';
          embed.addFields({
             name: loc.name,
             value: `*Realm Min:* ${loc.minRealmLevel}\n*Durasi:* ${loc.durations.join(', ')} Jam\n*Info:* ${loc.description}\n*Penghuni:* ${m}`,
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
         const userId = interaction.user.id;
         const player = await Player.findOne({ discordId: userId, guildId: interaction.guildId }).populate('inventory.itemId');
         if (!player) return interaction.editReply({ content: '❌ Karakter tidak ditemukan.' });

         const activeExp = await Exploration.findOne({ discordId: userId, status: 'exploring' }).populate('drops.items.itemId');
         if (!activeExp) return interaction.editReply({ content: '❌ Kamu tidak memiliki eksplorasi yang aktif.' });

         if (new Date() < activeExp.endTime) {
            return interaction.editReply({ content: '❌ Waktu eksplorasi belum selesai.' });
         }

         // Ambil detail lokasi untuk bestiary/world-building info
         const locationData = LOCATIONS.find(l => l.name === activeExp.location);

         // Process drops
         player.currency.copper += activeExp.drops.copper || 0;
         player.currency.silver += activeExp.drops.silver || 0;
         player.currency.gold += activeExp.drops.gold || 0;

         let itemDropText = [];
         for (const dropItem of activeExp.drops.items) {
             if (!dropItem.itemId) continue;
             const invItem = player.inventory.find(i => {
                  const id = i.itemId && i.itemId._id ? i.itemId._id.toString() : i.itemId.toString();
                  return id === dropItem.itemId._id.toString();
             });
             if (invItem) {
                 invItem.quantity += dropItem.quantity;
             } else {
                 player.inventory.push({ itemId: dropItem.itemId._id, quantity: dropItem.quantity });
             }
             const style = require('../../utils/dramatic').getRankStyle(dropItem.itemId.rank || 'Common');
             itemDropText.push(`${style.emoji} **${dropItem.itemId.name}** x${dropItem.quantity}`);
         }

         player.customStatus = null;
         await player.save();
         activeExp.status = 'claimed';
         await activeExp.save();

         // Log Transaction
         const TransactionLog = require('../../models/TransactionLog');
         await TransactionLog.create([{
             guildId: interaction.guildId,
             type: 'admin_grant',
             description: `[${player.characterName}] klaim hadiah eksplorasi ${activeExp.location}. (+${activeExp.drops.copper} Copper, +${activeExp.drops.silver} Silver)`
         }]);

         // Lore / Dramatic embed
         const { dramaticTitle, ansiColorize } = require('../../utils/dramatic');
         const embed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle(`🗺️ Eksplorasi Selesai: ${activeExp.location}`);

         let desc = `Kamu berhasil kembali dengan selamat dari **${activeExp.location}**.
`;

         if (locationData && locationData.monsters && locationData.monsters.length > 0) {
             const randomMonster = locationData.monsters[Math.floor(Math.random() * locationData.monsters.length)];
             desc += `\n⚔️ *Dalam perjalananmu, kamu sempat berhadapan dengan ${randomMonster.name} (${randomMonster.desc}). Berkat ketangkasanmu, kamu berhasil selamat dan membawa pulang barang berharga!*
`;
         }

         desc += `\n**💰 Perolehan Uang:**
`;
         if (activeExp.drops.copper) desc += `- ${activeExp.drops.copper} Copper Coins\n`;
         if (activeExp.drops.silver) desc += `- ${activeExp.drops.silver} Silver Taels\n`;
         if (activeExp.drops.gold) desc += `- ${activeExp.drops.gold} Gold Ingots\n`;
         if (!activeExp.drops.copper && !activeExp.drops.silver && !activeExp.drops.gold) desc += `- *Tidak ada*
`;

         desc += `\n**🎒 Perolehan Item:**
`;
         if (itemDropText.length > 0) {
             desc += itemDropText.join('\n');
         } else {
             desc += `- *Tidak ada*`;
         }

         embed.setDescription(desc);

         return interaction.editReply({ embeds: [embed] });
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
