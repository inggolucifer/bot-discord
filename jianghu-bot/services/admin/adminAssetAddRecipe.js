const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Asset = require('../../models/Asset');
const Item = require('../../models/Item');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-asset-add-recipe')
    .setDescription('[ADMIN] Tambah resep crafting ke sebuah aset (mis. Tungku Tempa bisa buat Pedang)')
    .addStringOption((o) => o.setName('nama-aset').setDescription('Nama aset (jadi stasiun crafting)').setRequired(true).setAutocomplete(true))
    .addStringOption((o) => o.setName('nama-resep').setDescription('Nama resep, cth: Pedang Baja').setRequired(true))
    .addStringOption((o) => o.setName('item-hasil').setDescription('Nama item yang dihasilkan').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('jumlah-hasil').setDescription('Jumlah item yang dihasilkan (default 1)').setRequired(true).setMinValue(1))
    .addStringOption((o) => o.setName('materials').setDescription('Material (Contoh: Kayu:2,Besi:1)').setRequired(true)),

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    if (focusedOption.name === 'nama-aset') {
      const assets = await Asset.find({ name: new RegExp(escapeRegex(focusedOption.value), 'i') }).limit(25);
      return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
    } else if (focusedOption.name === 'item-hasil') {
      const items = await Item.find({ name: new RegExp(escapeRegex(focusedOption.value), 'i') }).limit(25);
      return interaction.respond(items.map((i) => ({ name: i.name, value: i.name })));
    }
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaAset = interaction.options.getString('nama-aset');
    const namaResep = interaction.options.getString('nama-resep').trim();
    const namaHasil = interaction.options.getString('item-hasil');
    const jumlahHasil = interaction.options.getInteger('jumlah-hasil') || 1;
    const materialsStr = interaction.options.getString('materials');

    const asset = await Asset.findOne({ name: new RegExp(`^\\s*${escapeRegex(namaAset)}\\s*$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${namaAset}" tidak ditemukan.` });

    const resultItem = await Item.findOne({ name: new RegExp(`^\\s*${escapeRegex(namaHasil)}\\s*$`, 'i') });
    if (!resultItem) return interaction.editReply({ content: `❌ Item hasil "${namaHasil}" tidak ditemukan. Buat dulu itemnya lewat /admin-add-item.` });

    const materials = [];
    const matParts = materialsStr.split(',');

    for (const part of matParts) {
        const [bahanNama, jumlahStr] = part.split(':').map(s => s.trim());
        if (!bahanNama || !jumlahStr) {
            return interaction.editReply({ content: `❌ Format material salah pada "${part}". Harus "NamaItem:Jumlah", contoh: Kayu:2` });
        }

        const bahanJumlah = parseInt(jumlahStr, 10);
        if (isNaN(bahanJumlah) || bahanJumlah < 1) {
             return interaction.editReply({ content: `❌ Jumlah material tidak valid pada "${part}".` });
        }

        const matItem = await Item.findOne({ name: new RegExp(`^\\s*${escapeRegex(bahanNama)}\\s*$`, 'i') });
        if (!matItem) return interaction.editReply({ content: `❌ Item bahan "${bahanNama}" tidak ditemukan. Buat dulu itemnya lewat /admin-add-item.` });

        materials.push({ itemId: matItem._id, itemName: matItem.name, quantity: bahanJumlah });
    }

    if (!materials.length) return interaction.editReply({ content: '❌ Minimal harus ada 1 bahan untuk resep ini.' });

    asset.isCraftingStation = true;
    asset.recipes = asset.recipes.filter((r) => r.recipeName.toLowerCase() !== namaResep.toLowerCase()); // replace kalau nama sama
    asset.recipes.push({
      recipeName: namaResep,
      resultItemId: resultItem._id,
      resultItemName: resultItem.name,
      resultQuantity: jumlahHasil,
      materials,
    });
    await asset.save();

    const matLines = materials.map((m) => `${m.quantity}x ${m.itemName}`).join(', ');
    const embed = new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('⚒️ Resep Ditambahkan')
      .setDescription(`Aset **${asset.name}** sekarang bisa dipakai untuk resep **"${namaResep}"**:\n${matLines} → ${jumlahHasil}x **${resultItem.name}**\n\nPlayer/sekte yang memiliki aset ini bisa \`/craft\` atau \`/sekte-craft\`.`);
    return interaction.editReply({ embeds: [embed] });
  },
};
