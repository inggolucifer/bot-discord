const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../../models/Player');
const PlayerListing = require('../../../models/PlayerListing');
const { CURRENCY_LABEL } = require('../../../utils/currency');
const { logTransaction } = require('../../../utils/logger');

const LISTING_FEE_RATE = 0.05;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('beli-listing')
    .setDescription('Beli item dari listing jualan pemain lain')
    .addStringOption((o) => o.setName('kode-listing').setDescription('Kode listing (6 karakter)').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const list = await PlayerListing.find({ guildId: interaction.guildId, status: 'active', sellerId: { $ne: interaction.user.id } }).limit(25);
    const filtered = focused
      ? list.filter((l) => l.itemName.toLowerCase().includes(focused.toLowerCase()) || l._id.toString().slice(-6).toUpperCase().includes(focused.toUpperCase()))
      : list;
    return interaction.respond(filtered.slice(0, 25).map((l) => {
      const kode = l._id.toString().slice(-6).toUpperCase();
      return { name: `${kode} — ${l.quantity}x ${l.itemName} @ ${l.pricePerUnit} ${l.currency} (${l.sellerName})`, value: kode };
    }));
  },

  async execute(interaction) {
    await interaction.deferReply();

    const kode = interaction.options.getString('kode-listing').trim().toUpperCase();

    const buyer = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!buyer) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });
    if (buyer.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${buyer.status}**.` });

    const activeListings = await PlayerListing.find({ guildId: interaction.guildId, status: 'active' });
    const listing = activeListings.find((l) => l._id.toString().slice(-6).toUpperCase() === kode);
    if (!listing) return interaction.editReply({ content: `❌ Listing dengan kode "${kode}" tidak ditemukan atau sudah tidak aktif.` });

    if (listing.sellerId === interaction.user.id) {
      return interaction.editReply({ content: '❌ Tidak bisa membeli listing milikmu sendiri. Gunakan `/cancel-listing` kalau mau menariknya.' });
    }

    const totalHarga = listing.pricePerUnit * listing.quantity;
    if (buyer.currency[listing.currency] < totalHarga) {
      return interaction.editReply({ content: `❌ ${CURRENCY_LABEL[listing.currency]} kamu tidak cukup. Butuh ${totalHarga}, saldo ${buyer.currency[listing.currency]}.` });
    }

    const seller = await Player.findOne({ discordId: listing.sellerId, guildId: interaction.guildId });
    if (!seller) return interaction.editReply({ content: '❌ Penjual listing ini sudah tidak terdaftar. Transaksi dibatalkan.' });

    // Re-cek status listing terbaru sesaat sebelum eksekusi (anti double-buy kalau ada 2 orang beli bersamaan)
    const freshListing = await PlayerListing.findById(listing._id);
    if (!freshListing || freshListing.status !== 'active') {
      return interaction.editReply({ content: '❌ Listing ini baru saja terjual/dibatalkan orang lain. Coba listing lain.' });
    }

    const fee = Math.floor(totalHarga * LISTING_FEE_RATE);
    const diterimaSeller = totalHarga - fee;

    buyer.currency[listing.currency] -= totalHarga;

    if (listing.type === 'item') {
      const refId = listing.refId || listing.itemId; const buyerOwned = buyer.inventory.find((i) => i.itemId.equals(refId));
      if (buyerOwned) buyerOwned.quantity += listing.quantity;
      else buyer.inventory.push({ itemId: refId, quantity: listing.quantity });
    } else if (listing.type === 'pet') {
      const buyerOwned = buyer.pets.find((p) => p.petId.equals(listing.refId));
      if (buyerOwned) buyerOwned.quantity += listing.quantity;
      else buyer.pets.push({ petId: listing.refId, quantity: listing.quantity });
    } else if (listing.type === 'asset') {
      const buyerOwned = buyer.assets.find((a) => a.assetId.equals(listing.refId));
      if (buyerOwned) buyerOwned.quantity += listing.quantity;
      else buyer.assets.push({
        assetId: listing.refId,
        quantity: listing.quantity,
        status: 'active',
        assignedWorkers: [],
        progressAccumulated: 0,
        lastProgressUpdate: new Date(),
      });
    }

    await buyer.save();

    seller.currency[listing.currency] += diterimaSeller;
    await seller.save();

    freshListing.status = 'sold';
    freshListing.buyerId = interaction.user.id;
    await freshListing.save();

    await logTransaction(interaction.client, {
      guildId: interaction.guildId, type: 'player_listing_sale', fromUserId: interaction.user.id, toUserId: listing.sellerId,
      currency: listing.currency, amount: totalHarga,
      itemDescription: `${listing.quantity}x ${listing.itemName} — pembeli bayar ${totalHarga}, penjual terima ${diterimaSeller} (fee ${fee})`,
    });

    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('🛒 Pembelian Berhasil')
      .setDescription(`Kamu membeli **${listing.quantity}x ${listing.itemName}** dari **${listing.sellerName}** seharga **${totalHarga} ${CURRENCY_LABEL[listing.currency]}**.`);
    return interaction.editReply({ embeds: [embed] });
  },
};

