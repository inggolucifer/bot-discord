const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');
const Asset = require('../../models/Asset');
const PlayerListing = require('../../models/PlayerListing');
const { CURRENCIES, CURRENCY_LABEL } = require('../../utils/currency');
const { logTransaction } = require('../../utils/logger');
const { isUnderConstruction } = require('../../utils/crafting');

const MAX_LISTING_PER_PLAYER = 10;
const LISTING_FEE_RATE = 0.05;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jual-asset-listing')
    .setDescription(`Listing jual aset ke sesama pemain (biaya ${LISTING_FEE_RATE * 100}% dipotong saat laku)`)
    .addStringOption((o) => o.setName('nama-aset').setDescription('Nama aset yang mau dijual').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('jumlah').setDescription('Jumlah yang dijual').setRequired(true).setMinValue(1))
    .addIntegerOption((o) => o.setName('harga-per-unit').setDescription('Harga per 1 aset').setRequired(true).setMinValue(1))
    .addStringOption((o) => o.setName('currency').setDescription('Jenis currency').setRequired(true).addChoices(...CURRENCIES.map((c) => ({ name: CURRENCY_LABEL[c], value: c })))),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.respond([]);
    const assets = await Asset.find({ _id: { $in: player.assets.map((a) => a.assetId) }, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    await interaction.deferReply();

    const namaAset = interaction.options.getString('nama-aset');
    const jumlah = interaction.options.getInteger('jumlah');
    const hargaPerUnit = interaction.options.getInteger('harga-per-unit');
    const currency = interaction.options.getString('currency');

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });

    const activeCount = await PlayerListing.countDocuments({ guildId: interaction.guildId, sellerId: interaction.user.id, status: 'active' });
    if (activeCount >= MAX_LISTING_PER_PLAYER) {
      return interaction.editReply({ content: `❌ Kamu sudah punya ${activeCount} listing aktif.` });
    }

    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaAset}$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${namaAset}" tidak ditemukan.` });

    const owned = player.assets.find((a) => a.assetId.equals(asset._id));
    if (!owned || owned.quantity < jumlah) {
      return interaction.editReply({ content: `❌ Aset "${asset.name}" kamu tidak cukup. Kamu punya ${owned?.quantity || 0}.` });
    }

    if (isUnderConstruction(owned)) {
      return interaction.editReply({ content: `❌ Aset "${asset.name}" masih dalam tahap pembangunan dan tidak bisa dijual.` });
    }

    // Aset ditahan escrow
    owned.quantity -= jumlah;
    if (owned.quantity <= 0) player.assets = player.assets.filter((a) => !a.assetId.equals(asset._id));
    await player.save();

    const listing = await PlayerListing.create({
      guildId: interaction.guildId,
      sellerId: interaction.user.id,
      sellerName: player.characterName,
      type: 'asset',
      refId: asset._id,
      itemName: asset.name,
      quantity: jumlah,
      pricePerUnit: hargaPerUnit,
      currency,
    });

    await logTransaction(interaction.client, {
      guildId: interaction.guildId, type: 'player_listing_create', fromUserId: interaction.user.id,
      itemDescription: `Listing ${jumlah}x Aset ${asset.name} @ ${hargaPerUnit} ${currency}`,
    });

    const kode = listing._id.toString().slice(-6).toUpperCase();
    const totalHarga = hargaPerUnit * jumlah;
    const perkiraanDiterima = Math.floor(totalHarga * (1 - LISTING_FEE_RATE));

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('📋 Listing Aset Dibuat!')
      .setDescription(
        `**${jumlah}x ${asset.name}** dipasang di player shop seharga **${hargaPerUnit} ${CURRENCY_LABEL[currency]}/unit** (total ${totalHarga}).\n\n` +
        `Kode listing: \`${kode}\` (dipakai orang lain untuk beli via \`/beli-listing\`)\n` +
        `Kalau laku, kamu terima **${perkiraanDiterima} ${CURRENCY_LABEL[currency]}**.`
      );
    return interaction.editReply({ embeds: [embed] });
  },
};
