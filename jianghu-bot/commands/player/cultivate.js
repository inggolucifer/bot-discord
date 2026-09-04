const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const { SYSTEM_REALMS, calculateCurrentQi, syncPlayerCultivation, attemptBreakthrough, updateCultivationRole } = require('../../utils/cultivation');
const { logTransaction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cultivate')
    .setDescription('Sistem Kultivasi - Tingkatkan alam spiritualmu')
    .addSubcommand(subcommand =>
      subcommand
        .setName('profile')
        .setDescription('Lihat profil kultivasi sistemmu (Qi, Realm, Kecepatan)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('breakthrough')
        .setDescription('Coba menerobos ke tahapan atau realm berikutnya')
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const subcommand = interaction.options.getSubcommand();
      let player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });

      if (!player) {
        return interaction.editReply('❌ Kamu belum terdaftar. Gunakan `/register` terlebih dahulu.');
      }

      // Sync and calculate current Qi
      const calcResult = await syncPlayerCultivation(player);
      // Simpan sinkronisasi
      player.markModified('systemCultivation');
      await player.save();

      const realmName = player.systemCultivation.realm;
      const stage = player.systemCultivation.stage;
      const realmData = SYSTEM_REALMS[calcResult.realmIdx];

      if (subcommand === 'profile') {
        const percentage = Math.floor((calcResult.currentQi / calcResult.maxQi) * 100);
        let progressBar = '';
        const totalBlocks = 10;
        const filledBlocks = Math.floor(percentage / 10);

        for (let i = 0; i < totalBlocks; i++) {
            if (i < filledBlocks) progressBar += '🟩';
            else progressBar += '⬛';
        }

        const embed = new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle('🧘 Profil Kultivasi Spiritual')
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setDescription(`**${player.characterName}**, berikut adalah pencapaian spiritualmu.`)
          .addFields(
            { name: 'Realm', value: `**${realmName}**`, inline: true },
            { name: 'Tahap (Stage)', value: calcResult.realmIdx === 0 ? '-' : `Tahap ${stage}`, inline: true },
            { name: '\u200B', value: '\u200B' },
            { name: 'Progress Qi', value: `${progressBar} **${percentage}%**\n(${calcResult.currentQi.toLocaleString()} / ${calcResult.maxQi.toLocaleString()})` },
            { name: 'Kecepatan Serap Qi', value: `⚡ **${calcResult.ratePerMinute.toLocaleString()}** Qi / menit`, inline: true },
            { name: 'Status', value: calcResult.isReadyForBreakthrough ? '🟢 Siap Menerobos!' : '🟡 Sedang Bermeditasi...', inline: true }
          );

        return interaction.editReply({ embeds: [embed] });
      }

      if (subcommand === 'breakthrough') {
        if (!calcResult.isReadyForBreakthrough) {
           return interaction.editReply(`❌ Qi-mu belum mencukupi untuk menerobos! (${calcResult.currentQi.toLocaleString()} / ${calcResult.maxQi.toLocaleString()})`);
        }

        if (calcResult.realmIdx === SYSTEM_REALMS.length - 1 && stage === realmData.maxStage) {
           return interaction.editReply('🏆 Kamu telah mencapai puncak kultivasi alam semesta! Tidak ada lagi batasan untuk diterobos.');
        }


        // Check for Law requirement on Mortal 9 -> Qi Refining 1
        let isMortalToQiRefining = (calcResult.realmIdx === 0 && stage === 9);
        let warnsAboutLaw = isMortalToQiRefining && (!player.laws || player.laws.length === 0);
        let acceptedWarning = false;

        // Hitung persentase dasar
        let baseSuccessRate = realmData.baseSuccessRate;
        if (stage > 0) baseSuccessRate -= (stage * 2);

        // Cari apakah player punya pil untuk realm ini
        let hasPill = false;
        let pillName = `Pil Terobosan: ${realmName}`;

        const pillItem = await Item.findOne({ name: pillName, guildId: interaction.guildId });
        if (pillItem) {
             const inventoryPill = player.inventory.find(i => i.itemId.equals(pillItem._id));
             if (inventoryPill && inventoryPill.quantity > 0) {
                 hasPill = true;
             }
        }

        const row = new ActionRowBuilder();

        const btnNormal = new ButtonBuilder()
            .setCustomId('cult_bt_normal')
            .setLabel(`Menerobos Normal (${baseSuccessRate}%)`)
            .setStyle(ButtonStyle.Primary);
        row.addComponents(btnNormal);

        if (hasPill) {
             const btnPill = new ButtonBuilder()
                .setCustomId('cult_bt_pill')
                .setLabel(`Gunakan Pil (+5% Success)`)
                .setStyle(ButtonStyle.Success);
             row.addComponents(btnPill);
        }

        const embed = new EmbedBuilder()
            .setColor(0xe67e22)
            .setTitle('⚡ Menerobos Batas Kultivasi')
            .setDescription(`Energi Qi-mu sudah memuncak!\n\n**Realm Saat Ini:** ${realmName} (Tahap ${stage})\n**Peluang Berhasil:** ${baseSuccessRate}%\n\nJika **GAGAL**, kamu akan kehilangan 25% dari kapasitas Max Qi-mu.\n\nApakah kamu siap menghadapi tribulasi?`);


        if (warnsAboutLaw) {
            embed.setColor(0xe74c3c)
                 .setTitle('⚠️ PERINGATAN KRUSIAL: Menerobos Tanpa Hukum Alam!')
                 .setDescription(`Kamu berada di ambang batas **Mortal** (Tahap 9). Energi Qi-mu sudah memuncak!

**Realm Saat Ini:** ${realmName} (Tahap ${stage})
**Peluang Berhasil:** ${baseSuccessRate}%

**PERHATIAN:** Kamu belum mempelajari satupun **Hukum Alam (Law)**. Jika kamu menerobos sekarang, tubuh fanamu akan tertutup dari pemahaman alam semesta selamanya. Kamu akan menjadi **Kultivator Normal** tanpa bonus stat dari sistem Law!

Jika **GAGAL**, kamu akan kehilangan 25% dari kapasitas Max Qi-mu.

Apakah kamu YAKIN ingin menerobos?`);

            btnNormal.setLabel(`Tetap Menerobos (${baseSuccessRate}%)`).setStyle(ButtonStyle.Danger);
            btnNormal.setCustomId('cult_bt_normal_warning');
        }

        if (!hasPill && calcResult.realmIdx > 0) {
            embed.setFooter({ text: `💡 Tip: Kamu bisa membeli "${pillName}" di Shop untuk meningkatkan peluang sebesar 5%.` });
        }

        const response = await interaction.editReply({ embeds: [embed], components: [row] });

        // Tunggu klik
        const filter = i => i.user.id === interaction.user.id && (i.customId.startsWith('cult_bt_') || i.customId === 'cult_bt_normal_warning');
        try {
            const confirmation = await response.awaitMessageComponent({ filter, time: 60000 });

            // Re-fetch player to prevent race conditions
            player = await Player.findById(player._id);
            const freshCalc = calculateCurrentQi(player);

            if (!freshCalc.isReadyForBreakthrough) {
                return confirmation.update({ content: '❌ Terjadi kesalahan sinkronisasi Qi. Silakan coba lagi nanti.', embeds: [], components: [] });
            }

            const usePill = confirmation.customId === 'cult_bt_pill';

            if (warnsAboutLaw) {
                if (confirmation.customId === 'cult_bt_normal_warning' || confirmation.customId === 'cult_bt_pill') {
                     acceptedWarning = true;
                     player.isNormalCultivator = true; // Lock out from laws
                } else {
                     return confirmation.update({ content: '❌ Terobosan dibatalkan.', embeds: [], components: [] });
                }
            }


            if (usePill) {
                 const currentPill = player.inventory.find(i => i.itemId.equals(pillItem._id));
                 if (!currentPill || currentPill.quantity < 1) {
                      return confirmation.update({ content: '❌ Kamu tidak lagi memiliki pil tersebut di inventory.', embeds: [], components: [] });
                 }
                 currentPill.quantity -= 1;
            }

            const attempt = attemptBreakthrough(freshCalc.realmIdx, player.systemCultivation.stage, usePill);

            if (attempt.isMaxLevel) {
                 return confirmation.update({ content: attempt.message, embeds: [], components: [] });
            }

            let resultEmbed = new EmbedBuilder();

            if (attempt.success) {
                 // Berhasil
                 let newRealmIdx = freshCalc.realmIdx;
                 let newStage = player.systemCultivation.stage + 1;
                 let isNewRealm = false;

                 if (newStage > realmData.maxStage) {
                     newRealmIdx++;
                     newStage = 1;
                     isNewRealm = true;
                 }

                 player.systemCultivation.realm = SYSTEM_REALMS[newRealmIdx].name;
                 player.systemCultivation.stage = newStage;
                 player.systemCultivation.qi = 0; // Reset Qi saat naik tingkat
                 player.systemCultivation.lastSyncAt = new Date();

                 resultEmbed.setColor(0x2ecc71)
                    .setTitle('🌟 Terobosan Berhasil!')
                    .setDescription(`Selamat! Kamu berhasil menerobos hambatan spiritualmu.\n\nKamu sekarang berada di tingkat:\n**${player.systemCultivation.realm}** (Tahap ${newStage})`);

                 if (isNewRealm) {
                     // Update Role discord kalau realm ganti
                     await updateCultivationRole(interaction, player.systemCultivation.realm);
                     resultEmbed.addFields({ name: '🎉 Naik Realm', value: `Kamu mendapatkan role khusus **${player.systemCultivation.realm}** di server!` });
                 }
            } else {
                 // Gagal
                 const penalty = Math.floor(freshCalc.maxQi * 0.25);
                 player.systemCultivation.qi = Math.max(0, player.systemCultivation.qi - penalty);
                 player.systemCultivation.lastSyncAt = new Date();

                 resultEmbed.setColor(0xe74c3c)
                    .setTitle('💥 Terobosan Gagal!')
                    .setDescription(`Pondasi spiritualmu tidak cukup kuat menahan gejolak energi.\n\nKamu kehilangan **${penalty.toLocaleString()}** Qi (25%).\nKamu harus bermeditasi lagi sebelum bisa mencoba menerobos.`);
            }

            player.markModified('systemCultivation');
            player.markModified('inventory');
            await player.save();

            await confirmation.update({ embeds: [resultEmbed], components: [] });

        } catch (e) {
            if (e.code === 'InteractionCollectorError') {
                 await interaction.editReply({ content: '⏱️ Waktu untuk memilih sudah habis.', embeds: [], components: [] });
            } else {
                 console.error(e);
                 await interaction.editReply({ content: '❌ Terjadi kesalahan sistem.', embeds: [], components: [] });
            }
        }
      }

    } catch (error) {
      console.error(error);
      const isReplied = interaction.replied || interaction.deferred;
      if (isReplied) {
          await interaction.editReply('❌ Terjadi kesalahan pada perintah cultivation.');
      } else {
          await interaction.reply({ content: '❌ Terjadi kesalahan pada perintah cultivation.', flags: MessageFlags.Ephemeral });
      }
    }
  },
};
