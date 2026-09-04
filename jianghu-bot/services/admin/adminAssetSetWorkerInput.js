const { escapeRegex } = require('../../utils/escapeRegex');
const { MessageFlags } = require('discord.js');
const Asset = require('../../models/Asset');
const Item = require('../../models/Item');

module.exports = {
  async autocomplete(interaction) {
    const focusedOpt = interaction.options.getFocused(true);
    if (focusedOpt.name === 'nama-aset') {
      const assets = await Asset.find({ name: new RegExp(escapeRegex(focusedOpt.value), 'i') }).limit(25);
      return interaction.respond(assets.map(a => ({ name: a.name, value: a.name })));
    }
    if (focusedOpt.name === 'item-bahan') {
      const items = await Item.find({ name: new RegExp(escapeRegex(focusedOpt.value), 'i') }).limit(25);
      return interaction.respond(items.map(i => ({ name: i.name, value: i.name })));
    }
    return interaction.respond([]);
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const namaAset = interaction.options.getString('nama-aset');
    const namaItem = interaction.options.getString('item-bahan');
    const jumlah = interaction.options.getInteger('jumlah-bahan');

    const asset = await Asset.findOne({ name: new RegExp(`^\\s*${escapeRegex(namaAset)}\\s*$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${namaAset}" tidak ditemukan.` });

    const item = await Item.findOne({ name: new RegExp(`^\\s*${escapeRegex(namaItem)}\\s*$`, 'i') });
    if (!item) return interaction.editReply({ content: `❌ Item "${namaItem}" tidak ditemukan.` });

    // Tambahkan atau update di list input materials
    let found = false;
    for (const mat of asset.workerInputMaterials) {
        if (mat.itemId.equals(item._id)) {
            mat.quantity = jumlah;
            found = true;
            break;
        }
    }

    if (!found) {
        asset.workerInputMaterials.push({
            itemId: item._id,
            itemName: item.name,
            quantity: jumlah
        });
    }

    await asset.save();
    return interaction.editReply({ content: `✅ Berhasil mengatur bahan baku untuk **${asset.name}**. Pekerja sekarang membutuhkan **${jumlah}x ${item.name}** per jam produksi.` });
  }
};
