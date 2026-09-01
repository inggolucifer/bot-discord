const { MessageFlags, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Player = require('../models/Player');
const PetBattle = require('../models/PetBattle');
const GuildConfig = require('../models/GuildConfig');
const { simulateRound } = require('../services/petService');
const { isAdmin } = require('../utils/permissions');

async function handleSelectMenu(interaction) {
  if (interaction.customId === 'admin_dashboard_select') {
    if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });

    const value = interaction.values[0];

    if (value === 'panel_manage_item') {
      const modal = new ModalBuilder().setCustomId('modal_add_item').setTitle('Tambah Item Baru');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Nama Item').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rankTier').setLabel('Rank & Tier (contoh: Epic 5)').setStyle(TextInputStyle.Short).setValue('Common 1').setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('priceInfo').setLabel('Harga Dasar & Currency').setStyle(TextInputStyle.Short).setValue('0 silver').setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Deskripsi').setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('category').setLabel('Kategori (weapon, material, dll)').setStyle(TextInputStyle.Short).setValue('none').setRequired(false)),
      );
      return interaction.showModal(modal);
    }

    if (value === 'panel_manage_pet') {
      const modal = new ModalBuilder().setCustomId('modal_add_pet').setTitle('Tambah Pet Baru');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Nama Pet').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rankTier').setLabel('Rank & Tier (contoh: Epic 5)').setStyle(TextInputStyle.Short).setValue('Common 1').setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('priceInfo').setLabel('Harga Dasar & Currency').setStyle(TextInputStyle.Short).setValue('0 silver').setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Deskripsi').setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('imageUrl').setLabel('URL Gambar (opsional)').setStyle(TextInputStyle.Short).setRequired(false)),
      );
      return interaction.showModal(modal);
    }

    if (value === 'panel_manage_asset') {
      const modal = new ModalBuilder().setCustomId('modal_add_asset').setTitle('Buat Aset Baru');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Nama Aset').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Deskripsi').setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('profitInfo').setLabel('Profit Harian & Currency').setStyle(TextInputStyle.Short).setValue('0 silver').setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('priceInfo').setLabel('Harga Beli, Currency, Rank').setStyle(TextInputStyle.Short).setValue('0 silver').setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('imageUrl').setLabel('URL Gambar (opsional)').setStyle(TextInputStyle.Short).setRequired(false)),
      );
      return interaction.showModal(modal);
    }

    if (value === 'panel_manage_shop') {
        const embed = new EmbedBuilder().setColor(0x16a085).setTitle('🏪 Panduan Manajemen Shop')
        .setDescription('Gunakan slash command untuk mengatur shop karena interaksi membutuhkan pilihan item/pet/aset yang sudah ada.\n\n`/admin shop add` - Menambah barang ke toko\n`/admin shop remove` - Menghapus barang');
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (value === 'panel_manage_player') {
        const embed = new EmbedBuilder().setColor(0x2980b9).setTitle('🧍 Panduan Manajemen Pemain')
        .setDescription('Gunakan slash command untuk mengatur pemain.\n\n`/admin player edit` - Edit stat player\n`/admin player give-currency` - Beri uang\n`/admin player freeze` - Bekukan akun\n`/admin player kill` - Bunuh karakter');
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (value === 'panel_manage_sekte') {
        const embed = new EmbedBuilder().setColor(0x2c3e50).setTitle('🏯 Panduan Manajemen Sekte')
        .setDescription('Gunakan slash command untuk mengatur sekte.\n\n`/admin sekte create` - Buat sekte\n`/admin sekte assign` - Set ketua\n`/admin sekte war` - Mulai perang antar sekte');
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (value === 'panel_manage_tournament') {
        const embed = new EmbedBuilder().setColor(0x9b59b6).setTitle('🏆 Panduan Manajemen Turnamen')
        .setDescription('Gunakan slash command untuk mengatur turnamen.\n\n`/admin tournament create` - Buat turnamen\n`/admin tournament add-player` - Tambah peserta\n`/admin tournament start` - Mulai babak');
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (value === 'panel_clear_logs') {
        const config = await GuildConfig.findOne({ guildId: interaction.guildId });
        const retentionDays = config?.logRetentionDays || 30;

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`confirm_clear_logs_${retentionDays}`).setLabel(`Ya, Hapus Log (>${retentionDays} Hari)`).setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('cancel_action').setLabel('Batal').setStyle(ButtonStyle.Secondary),
        );

        const embed = new EmbedBuilder()
          .setColor(0xc0392b)
          .setTitle('⚠️ Konfirmasi Hapus Log Manual')
          .setDescription(`Ini akan menghapus SEMUA log transaksi & log admin yang lebih tua dari **${retentionDays} hari** (sesuai pengaturan retensi saat ini). Data player/item/pet/asset TIDAK terpengaruh. Lanjutkan?`);

        return interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
    }

    if (value === 'panel_help_admin') {
      const helpAdmin = interaction.client.commands.get('help-admin');
      if(helpAdmin) return helpAdmin.execute(interaction);
      return interaction.reply({ content: '❌ Command help admin tidak ditemukan.', flags: MessageFlags.Ephemeral });
    }

    return interaction.reply({ content: 'Fitur sedang dalam pengembangan.', flags: MessageFlags.Ephemeral });
  }

  if (interaction.customId === 'select_pet_battle') {
    const battleRecord = await PetBattle.findOne({ messageId: interaction.message.id });
    if (!battleRecord) return interaction.reply({ content: '❌ Data duel tidak ditemukan atau sudah kadaluarsa.', flags: MessageFlags.Ephemeral });
    if (battleRecord.opponentId !== interaction.user.id) return interaction.reply({ content: '❌ Kamu bukan target duel ini.', flags: MessageFlags.Ephemeral });
    if (battleRecord.status !== 'pending') return interaction.reply({ content: '❌ Duel ini sudah diproses.', flags: MessageFlags.Ephemeral });

    const p2InstanceId = interaction.values[0];
    const p2 = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId }).populate('pets.petId');
    const p1 = await Player.findOne({ discordId: battleRecord.challengerId, guildId: interaction.guildId }).populate('pets.petId');

    const pet2 = p2.pets.find(p => p.instanceId === p2InstanceId);
    const pet1 = p1.pets.find(p => p.instanceId === battleRecord.challengerPetInstanceId);

    if (!pet2 || !pet1) return interaction.reply({ content: '❌ Salah satu pet tidak valid.', flags: MessageFlags.Ephemeral });
    if (pet2.isLocked) return interaction.reply({ content: '❌ Pet kamu sedang dipakai di duel lain.', flags: MessageFlags.Ephemeral });

    // Import utilitas kultivasi untuk mengambil index Realm
    const { getRealmIndex } = require('../utils/cultivation');
    const p1RealmIdx = p1.systemCultivation ? getRealmIndex(p1.systemCultivation.realm) : 0;
    const p2RealmIdx = p2.systemCultivation ? getRealmIndex(p2.systemCultivation.realm) : 0;

    pet2.isLocked = true;
    p2.markModified('pets');
    await p2.save();

    battleRecord.opponentPetInstanceId = pet2.instanceId;
    battleRecord.status = 'accepted';
    await battleRecord.save();

    await interaction.update({ content: `⚔️ **${p1.characterName}** (${pet1.nickname || pet1.petId.name}) VS **${p2.characterName}** (${pet2.nickname || pet2.petId.name}) dimulai!`, components: [] });

    let rounds = [];
    let p1Hp = pet1.hp;
    let p2Hp = pet2.hp;

    let winner = null;
    for (let i = 1; i <= 8; i++) { // Max 8 turn
      const result = simulateRound(pet1, pet2, pet1.nickname || pet1.petId.name, pet2.nickname || pet2.petId.name, p1RealmIdx, p2RealmIdx);
      rounds.push(`**Turn ${i}**: ${result.log}`);

      if (pet1.hp <= 0) { winner = 2; break; }
      if (pet2.hp <= 0) { winner = 1; break; }
    }

    if (!winner) {
      winner = pet1.hp >= pet2.hp ? 1 : 2; // Tie breaker by HP left
    }

    if (winner === 1) {
      pet1.wins += 1;
      pet2.losses += 1;
    } else {
      pet2.wins += 1;
      pet1.losses += 1;
    }

    pet1.isLocked = false;
    pet2.isLocked = false;
    pet1.lastBattledAt = new Date();
    pet2.lastBattledAt = new Date();

    p1.markModified('pets');
    p2.markModified('pets');
    await p1.save();
    await p2.save();

    battleRecord.status = 'finished';
    await battleRecord.save();

    const winName = winner === 1 ? p1.characterName : p2.characterName;
    const winPet = winner === 1 ? (pet1.nickname || pet1.petId.name) : (pet2.nickname || pet2.petId.name);

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('⚔️ Hasil Duel Pet')
      .setDescription(rounds.join('\n'))
      .addFields({ name: '🏆 Pemenang', value: `**${winName}** dengan pet **${winPet}**!`});

    return interaction.followUp({ embeds: [embed] });
  }
}

module.exports = { handleSelectMenu };
