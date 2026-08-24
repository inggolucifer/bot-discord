const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');
const Player = require('../../models/Player');
const PlayerListing = require('../../models/PlayerListing');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cancel-listing')
    .setDescription('Batalkan listing jualanmu sendiri, item dikembalikan ke inventory')
    .addStringOption((o) => o.setName('kode-listing').setDescription('Kode listing (6 karakter)').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const list = await PlayerListing.find({ guildId: interaction.guildId, sellerId: interaction.user.id, status: 'active' }).limit(25);
    return interaction.respond(list.map((l) => {
      const kode = l._id.toString().slice(-6).toUpperCase();
      return { name: `${kode} — ${l.quantity}x ${l.itemName} @ ${l.pricePerUnit} ${l.currency}`, value: kode };
    }));
  },

  async execute(interaction) {
    await interaction.deferReply();

    const kode = interaction.options.getString('kode-listing').trim().toUpperCase();

    // Cari berdasarkan 6 karakter terakhir _id di antara listing aktif milik sendiri
    const myActiveListings = await PlayerListing.find({ guildId: interaction.guildId, sellerId: interaction.user.id, status: 'active' });
    const target = myActiveListings.find((l) => l._id.toString().slice(-6).toUpperCase() === kode);

    if (!target) return interaction.editReply({ content: `❌ Listing dengan kode "${kode}" tidak ditemukan di antara listing aktifmu.` });

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });

    if (target.type === 'item' || !target.type) {
      const refId = target.refId || target.itemId;
      const owned = player.inventory.find((i) => i.itemId.equals(refId));
      if (owned) owned.quantity += target.quantity;
      else player.inventory.push({ itemId: refId, quantity: target.quantity });
    } else if (target.type === 'pet') {
      if (player.pets.length + target.quantity > (player.petSlots || 2)) {
         return interaction.editReply({ content: `❌ Batal gagal. Slot pet kamu penuh. Maksimal ${player.petSlots || 2}.` });
      }
      for (let i = 0; i < target.quantity; i++) {
        player.pets.push({
          instanceId: crypto.randomUUID(),
          petId: target.refId
        });
      }
    } else if (target.type === 'asset') {
      const currentTotalAssets = player.assets.reduce((sum, a) => sum + (a.quantity || 1), 0);
      const maxAssetSlots = player.assetSlots || 1;
      if (currentTotalAssets + target.quantity > maxAssetSlots) {
        return interaction.editReply({ content: `❌ Batal gagal. Lahan aset kamu tidak cukup untuk menampung ${target.quantity} aset ini (${currentTotalAssets}/${maxAssetSlots}).` });
      }
      const owned = player.assets.find((a) => a.assetId.equals(target.refId));
      if (owned) owned.quantity += target.quantity;
      else player.assets.push({
        assetId: target.refId,
        quantity: target.quantity,
        status: 'active',
        assignedWorkers: [],
        progressAccumulated: 0,
        lastProgressUpdate: new Date(),
      });
    }

    await player.save();

    target.status = 'cancelled';
    await target.save();

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('❌ Listing Dibatalkan').setDescription(`Listing **${target.quantity}x ${target.itemName}** dibatalkan, dikembalikan ke inventarismu.`)] });
  },
};
