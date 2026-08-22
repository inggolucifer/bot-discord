const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const Pet = require('../../models/Pet');
const Asset = require('../../models/Asset');
const { logTransaction } = require('../../utils/logger');
const { CURRENCY_LABEL, CURRENCY_EMOJI } = require('../../utils/currency');
const { isUnderConstruction } = require('../../utils/crafting');

const SELL_RATE = 0.2; // 20% dari harga dasar
const MODEL_MAP = { item: Item, pet: Pet, asset: Asset };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jual')
    .setDescription('Jual item/pet/asset milikmu ke sistem seharga 20% dari harga dasar')
    .addStringOption((o) => o.setName('kategori').setDescription('Kategori').setRequired(true).addChoices(
      { name: 'Item', value: 'item' }, { name: 'Pet', value: 'pet' }, { name: 'Asset', value: 'asset' },
    ))
    .addStringOption((o) => o.setName('nama').setDescription('Nama barang yang mau dijual').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('jumlah').setDescription('Jumlah (default 1, tidak berlaku untuk pet)').setMinValue(1)),

  async autocomplete(interaction) {
    const kategori = interaction.options.getString('kategori');
    const focused = interaction.options.getFocused();
    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player || !kategori) return interaction.respond([]);

    let ownedIds = [];
    let Model = MODEL_MAP[kategori];
    if (kategori === 'item') ownedIds = player.inventory.map((i) => i.itemId);
    else if (kategori === 'pet') ownedIds = player.pets.map((p) => p.petId);
    else if (kategori === 'asset') ownedIds = player.assets.map((a) => a.assetId);

    const docs = await Model.find({ _id: { $in: ownedIds }, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(docs.map((d) => ({ name: d.name, value: d.name })));
  },

  async execute(interaction) {
    await interaction.deferReply();

    const kategori = interaction.options.getString('kategori');
    const nama = interaction.options.getString('nama');
    const jumlah = interaction.options.getInteger('jumlah') || 1;

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });
    if (player.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${player.status}**, tidak bisa menjual.` });

    const Model = MODEL_MAP[kategori];
    const doc = await Model.findOne({ guildId: interaction.guildId, name: new RegExp(`^${nama}$`, 'i') });
    if (!doc) return interaction.editReply({ content: `❌ "${nama}" tidak ditemukan di kategori ${kategori}.` });

    if (!doc.basePrice || doc.basePrice <= 0) {
      return interaction.editReply({ content: `❌ "${doc.name}" tidak punya harga dasar, tidak bisa dijual ke sistem. Minta admin set harga dasar dulu lewat /admin-edit-${kategori}.` });
    }

    let ownedList, ownedField;
    if (kategori === 'item') { ownedList = player.inventory; ownedField = 'itemId'; }
    else if (kategori === 'pet') { ownedList = player.pets; ownedField = 'petId'; }
    else { ownedList = player.assets; ownedField = 'assetId'; }

    const owned = ownedList.find((x) => x[ownedField].equals(doc._id));
    if (!owned) return interaction.editReply({ content: `❌ Kamu tidak memiliki "${doc.name}".` });

    if (kategori === 'asset' && isUnderConstruction(owned)) {
      return interaction.editReply({ content: `❌ Aset "${doc.name}" masih dalam tahap pembangunan dan tidak bisa dijual.` });
    }

    const jualJumlah = kategori === 'pet' ? 1 : jumlah; // pet dijual satuan (pakai entry terpisah per ekor)
    if (owned.quantity < jualJumlah) {
      return interaction.editReply({ content: `❌ Kamu hanya punya ${owned.quantity}x "${doc.name}", tidak cukup untuk menjual ${jualJumlah}.` });
    }

    const totalHarga = Math.floor(doc.basePrice * jualJumlah * SELL_RATE);

    owned.quantity -= jualJumlah;
    if (owned.quantity <= 0) {
      if (kategori === 'item') player.inventory = player.inventory.filter((x) => !x.itemId.equals(doc._id));
      else if (kategori === 'pet') player.pets = player.pets.filter((x) => !x.petId.equals(doc._id));
      else player.assets = player.assets.filter((x) => !x.assetId.equals(doc._id));
    }

    player.currency[doc.priceCurrency] += totalHarga;
    await player.save();

    await logTransaction(interaction.client, {
      guildId: interaction.guildId,
      type: 'sell_to_system',
      fromUserId: interaction.user.id,
      currency: doc.priceCurrency,
      amount: totalHarga,
      itemDescription: `${jualJumlah}x ${doc.name} (${kategori}) dijual ke sistem`,
      balanceAfter: player.currency,
    });

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('💵 Berhasil Dijual ke Sistem')
      .setDescription(
        `Kamu menjual **${jualJumlah}x ${doc.name}** ke sistem.\n` +
        `Harga dasar: ${CURRENCY_EMOJI[doc.priceCurrency]} ${doc.basePrice} x ${jualJumlah} = ${doc.basePrice * jualJumlah}\n` +
        `Diterima (20%): **${CURRENCY_EMOJI[doc.priceCurrency]} ${totalHarga} ${CURRENCY_LABEL[doc.priceCurrency]}**`
      );
    return interaction.editReply({ embeds: [embed] });
  },
};
