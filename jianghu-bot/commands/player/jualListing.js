const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const PlayerListing = require('../../models/PlayerListing');
const { CURRENCIES, CURRENCY_LABEL } = require('../../utils/currency');
const { logTransaction } = require('../../utils/logger');

const MAX_LISTING_PER_PLAYER = 10;
const LISTING_FEE_RATE = 0.05; // 5%, dipotong dari HASIL PENJUALAN saat listing laku (bukan di muka)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jual-listing')
    .setDescription(`Listing jual item ke sesama pemain (biaya ${LISTING_FEE_RATE * 100}% dipotong saat laku, maks ${MAX_LISTING_PER_PLAYER} slot)`)
    .addStringOption((o) => o.setName('nama-item').setDescription('Nama item yang mau dijual').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('jumlah').setDescription('Jumlah yang dijual').setRequired(true).setMinValue(1))
    .addIntegerOption((o) => o.setName('harga-per-unit').setDescription('Harga per 1 buah item').setRequired(true).setMinValue(1))
    .addStringOption((o) => o.setName('currency').setDescription('Jenis currency').setRequired(true).addChoices(...CURRENCIES.map((c) => ({ name: CURRENCY_LABEL[c], value: c })))),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.respond([]);
    const items = await Item.find({ _id: { $in: player.inventory.map((i) => i.itemId) }, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(items.map((i) => ({ name: i.name, value: i.name })));
  },

  async execute(interaction) {
    await interaction.deferReply();

    const namaItem = interaction.options.getString('nama-item');
    const jumlah = interaction.options.getInteger('jumlah');
    const hargaPerUnit = interaction.options.getInteger('harga-per-unit');
    const currency = interaction.options.getString('currency');

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });
    if (player.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${player.status}**.` });

    const activeCount = await PlayerListing.countDocuments({ guildId: interaction.guildId, sellerId: interaction.user.id, status: 'active' });
    if (activeCount >= MAX_LISTING_PER_PLAYER) {
      return interaction.editReply({ content: `❌ Kamu sudah punya ${activeCount} listing aktif (maksimal ${MAX_LISTING_PER_PLAYER}). Batalkan salah satu dulu dengan \`/cancel-listing\`.` });
    }

    const item = await Item.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaItem}$`, 'i') });
    if (!item) return interaction.editReply({ content: `❌ Item "${namaItem}" tidak ditemukan.` });

    const owned = player.inventory.find((i) => i.itemId.equals(item._id));
    if (!owned || owned.quantity < jumlah) {
      return interaction.editReply({ content: `❌ Item "${item.name}" kamu tidak cukup. Kamu punya ${owned?.quantity || 0}.` });
    }

    // Item ditahan (escrow) dari inventory selama listing aktif, dikembalikan kalau di-cancel
    owned.quantity -= jumlah;
    if (owned.quantity <= 0) player.inventory = player.inventory.filter((i) => !i.itemId.equals(item._id));
    await player.save();

    const listing = await PlayerListing.create({
      guildId: interaction.guildId,
      sellerId: interaction.user.id,
      sellerName: player.characterName,
      type: 'item',
      refId: item._id,
      itemName: item.name,
      quantity: jumlah,
      pricePerUnit: hargaPerUnit,
      currency,
    });

    await logTransaction(interaction.client, {
      guildId: interaction.guildId, type: 'player_listing_create', fromUserId: interaction.user.id,
      itemDescription: `Listing ${jumlah}x ${item.name} @ ${hargaPerUnit} ${currency}`,
    });

    const kode = listing._id.toString().slice(-6).toUpperCase();
    const totalHarga = hargaPerUnit * jumlah;
    const perkiraanDiterima = Math.floor(totalHarga * (1 - LISTING_FEE_RATE));

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('📋 Listing Dibuat!')
      .setDescription(
        `**${jumlah}x ${item.name}** dipasang di player shop seharga **${hargaPerUnit} ${CURRENCY_LABEL[currency]}/unit** (total ${totalHarga}).\n\n` +
        `Kode listing: \`${kode}\` (dipakai orang lain untuk beli via \`/beli-listing\`)\n` +
        `Kalau laku, kamu terima **${perkiraanDiterima} ${CURRENCY_LABEL[currency]}** (setelah dipotong biaya listing 5%).\n\n` +
        `Slot listing terpakai: ${activeCount + 1}/${MAX_LISTING_PER_PLAYER}`
      );
    return interaction.editReply({ embeds: [embed] });
  },
};

