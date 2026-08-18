const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const PlayerListing = require('../../models/PlayerListing');
const { CURRENCIES, CURRENCY_LABEL } = require('../../utils/currency');
const { logTransaction } = require('../../utils/logger');

const MAX_LISTING_PER_PLAYER = 10;
const LISTING_FEE_RATE = 0.05;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jual-pet-listing')
    .setDescription(`Listing jual pet ke sesama pemain (biaya ${LISTING_FEE_RATE * 100}% dipotong saat laku)`)
    .addStringOption((o) => o.setName('nama-pet').setDescription('Nama pet yang mau dijual').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('jumlah').setDescription('Jumlah yang dijual').setRequired(true).setMinValue(1))
    .addIntegerOption((o) => o.setName('harga-per-unit').setDescription('Harga per 1 ekor pet').setRequired(true).setMinValue(1))
    .addStringOption((o) => o.setName('currency').setDescription('Jenis currency').setRequired(true).addChoices(...CURRENCIES.map((c) => ({ name: CURRENCY_LABEL[c], value: c })))),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.respond([]);
    const pets = await Pet.find({ _id: { $in: player.pets.map((p) => p.petId) }, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(pets.map((p) => ({ name: p.name, value: p.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const namaPet = interaction.options.getString('nama-pet');
    const jumlah = interaction.options.getInteger('jumlah');
    const hargaPerUnit = interaction.options.getInteger('harga-per-unit');
    const currency = interaction.options.getString('currency');

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });

    const activeCount = await PlayerListing.countDocuments({ guildId: interaction.guildId, sellerId: interaction.user.id, status: 'active' });
    if (activeCount >= MAX_LISTING_PER_PLAYER) {
      return interaction.editReply({ content: `❌ Kamu sudah punya ${activeCount} listing aktif (maksimal ${MAX_LISTING_PER_PLAYER}).` });
    }

    const pet = await Pet.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaPet}$`, 'i') });
    if (!pet) return interaction.editReply({ content: `❌ Pet "${namaPet}" tidak ditemukan.` });

    const owned = player.pets.find((p) => p.petId.equals(pet._id));
    if (!owned || owned.quantity < jumlah) {
      return interaction.editReply({ content: `❌ Pet "${pet.name}" kamu tidak cukup. Kamu punya ${owned?.quantity || 0}.` });
    }

    owned.quantity -= jumlah;
    if (owned.quantity <= 0) player.pets = player.pets.filter((p) => !p.petId.equals(pet._id));
    await player.save();

    const listing = await PlayerListing.create({
      guildId: interaction.guildId,
      sellerId: interaction.user.id,
      sellerName: player.characterName,
      type: 'pet',
      refId: pet._id,
      itemName: pet.name,
      quantity: jumlah,
      pricePerUnit: hargaPerUnit,
      currency,
    });

    await logTransaction(interaction.client, {
      guildId: interaction.guildId, type: 'player_listing_create', fromUserId: interaction.user.id,
      itemDescription: `Listing ${jumlah}x Pet ${pet.name} @ ${hargaPerUnit} ${currency}`,
    });

    const kode = listing._id.toString().slice(-6).toUpperCase();
    const totalHarga = hargaPerUnit * jumlah;
    const perkiraanDiterima = Math.floor(totalHarga * (1 - LISTING_FEE_RATE));

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('📋 Listing Pet Dibuat!')
      .setDescription(
        `**${jumlah}x ${pet.name}** dipasang di player shop seharga **${hargaPerUnit} ${CURRENCY_LABEL[currency]}/unit** (total ${totalHarga}).\n\n` +
        `Kode listing: \`${kode}\` (dipakai orang lain untuk beli via \`/beli-listing\`)\n` +
        `Kalau laku, kamu terima **${perkiraanDiterima} ${CURRENCY_LABEL[currency]}**.`
      );
    return interaction.editReply({ embeds: [embed] });
  },
};
