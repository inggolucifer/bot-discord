const { SlashCommandBuilder } = require('discord.js');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const Pet = require('../../models/Pet');
const Asset = require('../../models/Asset');
const Sect = require('../../models/Sect');
const { buildPlayerProfileEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Lihat profil karakter (milikmu sendiri atau orang lain)')
    .addUserOption((opt) => opt.setName('user').setDescription('Player yang ingin dilihat profilnya').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user') || interaction.user;

    const player = await Player.findOne({ discordId: targetUser.id, guildId: interaction.guildId });
    if (!player) {
      const isSelf = targetUser.id === interaction.user.id;
      return interaction.editReply({
        content: isSelf
          ? '❌ Kamu belum terdaftar. Gunakan `/daftar [nama karakter]` dulu.'
          : `❌ ${targetUser.username} belum terdaftar sebagai karakter.`,
      });
    }

    // Ambil detail item/pet/asset dari inventory
    const itemIds = player.inventory.map((i) => i.itemId);
    const petIds = player.pets.map((p) => p.petId);
    const assetIds = player.assets.map((a) => a.assetId);

    const [itemDocsRaw, petDocsRaw, assetDocsRaw] = await Promise.all([
      Item.find({ _id: { $in: itemIds } }),
      Pet.find({ _id: { $in: petIds } }),
      Asset.find({ _id: { $in: assetIds } }),
    ]);

    const itemDocs = player.inventory.map((i) => ({
      doc: itemDocsRaw.find((d) => d._id.equals(i.itemId)),
      quantity: i.quantity,
    })).filter((x) => x.doc);

    const petDocs = player.pets.map((p) => ({
      doc: petDocsRaw.find((d) => d._id.equals(p.petId)),
      nickname: p.nickname,
      quantity: p.quantity,
    })).filter((x) => x.doc);

    const assetDocs = player.assets.map((a) => ({
      doc: assetDocsRaw.find((d) => d._id.equals(a.assetId)),
      quantity: a.quantity,
      owned: a, // subdokumen asli, dibutuhkan buildPlayerProfileEmbed untuk cek status pembangunan
    })).filter((x) => x.doc);

    // Cari jabatan player di sekte (kalau dia anggota sekte manapun) untuk ditampilkan di profil
    const sect = await Sect.findOne({
      guildId: interaction.guildId,
      $or: [{ leaderId: targetUser.id }, { viceLeaderId: targetUser.id }, { elderIds: targetUser.id }, { memberIds: targetUser.id }],
    });
    const sectRole = sect ? sect.getRoleOf(targetUser.id) : null;

    const embed = buildPlayerProfileEmbed(player, targetUser, itemDocs, petDocs, assetDocs, sectRole);
    return interaction.editReply({ embeds: [embed] });
  },
};

