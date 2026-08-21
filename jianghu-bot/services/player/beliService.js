const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');
const Shop = require('../../models/Shop');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const Pet = require('../../models/Pet');
const Asset = require('../../models/Asset');
const { logTransaction } = require('../../utils/logger');
const { CURRENCY_LABEL } = require('../../utils/currency');

const MODEL_MAP = { item: Item, pet: Pet, asset: Asset };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('beli')
    .setDescription('Beli item/pet/asset dari shop')
    .addStringOption((o) => o.setName('kategori').setDescription('Kategori').setRequired(true).addChoices(
      { name: 'Item', value: 'item' }, { name: 'Pet', value: 'pet' }, { name: 'Asset', value: 'asset' },
    ))
    .addStringOption((o) => o.setName('nama').setDescription('Nama barang').setRequired(true))
    .addIntegerOption((o) => o.setName('jumlah').setDescription('Jumlah (default 1)').setMinValue(1)),

  async execute(interaction) {
    await interaction.deferReply();

    const kategori = interaction.options.getString('kategori');
    const nama = interaction.options.getString('nama');
    const jumlah = interaction.options.getInteger('jumlah') || 1;

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });
    if (player.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${player.status}**.` });

    const Model = MODEL_MAP[kategori];
    const doc = await Model.findOne({ guildId: interaction.guildId, name: new RegExp(`^${nama}$`, 'i') });
    if (!doc) return interaction.editReply({ content: `❌ "${nama}" tidak ditemukan di kategori ${kategori}.` });

    const listing = await Shop.findOne({ guildId: interaction.guildId, category: kategori, refId: doc._id, isActive: true });
    if (!listing) return interaction.editReply({ content: `❌ "${doc.name}" tidak dijual di shop.` });

    if (listing.stock !== -1 && listing.stock < jumlah) {
      return interaction.editReply({ content: `❌ Stok "${doc.name}" tersisa ${listing.stock}, tidak cukup untuk ${jumlah}.` });
    }

    if (kategori === 'asset') {
      const currentTotalAssets = player.assets.reduce((sum, a) => sum + (a.quantity || 1), 0);
      const maxAssetSlots = player.assetSlots || 1;
      if (currentTotalAssets + jumlah > maxAssetSlots) {
        return interaction.editReply({ content: `❌ Lahan aset kamu tidak cukup untuk menampung ${jumlah} aset baru (${currentTotalAssets}/${maxAssetSlots}). Gunakan \`/asset tambah-slot\` untuk menambah kapasitas.` });
      }
    }

    const totalHarga = listing.price * jumlah;
    if (player.currency[listing.priceCurrency] < totalHarga) {
      return interaction.editReply({ content: `❌ ${CURRENCY_LABEL[listing.priceCurrency]} kamu tidak cukup. Butuh ${totalHarga}, saldo ${player.currency[listing.priceCurrency]}.` });
    }

    player.currency[listing.priceCurrency] -= totalHarga;

    if (kategori === 'item') {
      const owned = player.inventory.find((i) => i.itemId.equals(doc._id));
      if (owned) owned.quantity += jumlah; else player.inventory.push({ itemId: doc._id, quantity: jumlah });
    } else if (kategori === 'pet') {
      // Pet doesn't stack in quantity according to the schema (but old logic assumed it did)
      // Since max pet is 6, limit the total pet count
      const totalPetsToBe = player.pets.length + jumlah;
      if (totalPetsToBe > 6) {
        return interaction.editReply({ content: `❌ Pembelian gagal. Maksimal pet adalah 6. Saat ini kamu punya ${player.pets.length} pet.` });
      }
      for (let i = 0; i < jumlah; i++) {
        player.pets.push({
          instanceId: crypto.randomUUID(),
          petId: doc._id
        });
      }
    } else if (kategori === 'asset') {
      const owned = player.assets.find((a) => a.assetId.equals(doc._id));
      if (owned) {
        owned.quantity += jumlah; // aset yang sudah pernah selesai dibangun sebelumnya tidak perlu dibangun ulang
      } else {
        const constructionCompleteAt = doc.constructionTimeHours > 0
          ? new Date(Date.now() + doc.constructionTimeHours * 60 * 60 * 1000)
          : null;
        player.assets.push({ assetId: doc._id, quantity: jumlah, lastClaimAt: null, constructionCompleteAt });
      }
    }

    await player.save();

    if (listing.stock !== -1) {
      listing.stock -= jumlah;
      await listing.save();
    }

    await logTransaction(interaction.client, {
      guildId: interaction.guildId,
      type: 'shop_purchase',
      fromUserId: interaction.user.id,
      currency: listing.priceCurrency,
      amount: totalHarga,
      itemDescription: `${jumlah}x ${doc.name} (${kategori})`,
      balanceAfter: player.currency,
    });

    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('🛒 Pembelian Berhasil')
      .setDescription(`Kamu membeli **${jumlah}x ${doc.name}** seharga **${totalHarga} ${CURRENCY_LABEL[listing.priceCurrency]}**.`);
    if (kategori === 'asset' && doc.constructionTimeHours > 0) {
      embed.addFields({ name: '🚧 Sedang Dibangun', value: `Aset ini butuh **${doc.constructionTimeHours} jam** sebelum bisa di-claim-profit/craft (kalau ini pembelian pertamamu untuk aset ini).` });
    }
    return interaction.editReply({ embeds: [embed] });
  },
};

