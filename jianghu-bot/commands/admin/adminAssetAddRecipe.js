const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Asset = require('../../models/Asset');
const Item = require('../../models/Item');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-asset-add-recipe')
    .setDescription('[ADMIN] Tambah resep crafting ke sebuah aset (mis. Tungku Tempa bisa buat Pedang)')
    .addStringOption((o) => o.setName('nama-aset').setDescription('Nama aset (jadi stasiun crafting)').setRequired(true).setAutocomplete(true))
    .addStringOption((o) => o.setName('nama-resep').setDescription('Nama resep, cth: Pedang Baja').setRequired(true))
    .addStringOption((o) => o.setName('item-hasil').setDescription('Nama item yang dihasilkan').setRequired(true))
    .addStringOption((o) => o.setName('bahan-1').setDescription('Nama item bahan #1').setRequired(true))
    .addIntegerOption((o) => o.setName('jumlah-1').setDescription('Jumlah bahan #1').setRequired(true).setMinValue(1))
    .addIntegerOption((o) => o.setName('jumlah-hasil').setDescription('Jumlah item yang dihasilkan (default 1)').setMinValue(1))
    .addStringOption((o) => o.setName('bahan-2').setDescription('Nama item bahan #2 (opsional)'))
    .addIntegerOption((o) => o.setName('jumlah-2').setDescription('Jumlah bahan #2').setMinValue(1))
    .addStringOption((o) => o.setName('bahan-3').setDescription('Nama item bahan #3 (opsional)'))
    .addIntegerOption((o) => o.setName('jumlah-3').setDescription('Jumlah bahan #3').setMinValue(1)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const assets = await Asset.find({ guildId: interaction.guildId, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(assets.map((a) => ({ name: a.name, value: a.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaAset = interaction.options.getString('nama-aset');
    const namaResep = interaction.options.getString('nama-resep').trim();
    const namaHasil = interaction.options.getString('item-hasil');
    const jumlahHasil = interaction.options.getInteger('jumlah-hasil') || 1;

    const asset = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaAset}$`, 'i') });
    if (!asset) return interaction.editReply({ content: `❌ Aset "${namaAset}" tidak ditemukan.` });

    const resultItem = await Item.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaHasil}$`, 'i') });
    if (!resultItem) return interaction.editReply({ content: `❌ Item hasil "${namaHasil}" tidak ditemukan. Buat dulu itemnya lewat /admin-add-item.` });

    const materials = [];
    for (let i = 1; i <= 3; i++) {
      const bahanNama = interaction.options.getString(`bahan-${i}`);
      const bahanJumlah = interaction.options.getInteger(`jumlah-${i}`);
      if (!bahanNama) continue;
      if (!bahanJumlah) return interaction.editReply({ content: `❌ Jumlah untuk bahan-${i} belum diisi.` });

      const matItem = await Item.findOne({ guildId: interaction.guildId, name: new RegExp(`^${bahanNama}$`, 'i') });
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
