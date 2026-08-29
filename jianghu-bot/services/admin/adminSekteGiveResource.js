const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Sect = require('../../models/Sect');
const Item = require('../../models/Item');
const { logAdminAction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-sekte-give-resource')
    .setDescription('[ADMIN] Beri sumber daya (item bahan) ke stok sekte')
    .addStringOption((o) => o.setName('nama-sekte').setDescription('Nama sekte').setRequired(true).setAutocomplete(true))
    .addStringOption((o) => o.setName('nama-item').setDescription('Nama item/bahan').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('jumlah').setDescription('Jumlah').setRequired(true).setMinValue(1)),

  async autocomplete(interaction) {
    const focusedOpt = interaction.options.getFocused(true);
    if (focusedOpt.name === 'nama-sekte') {
      const list = await Sect.find({ guildId: interaction.guildId, name: new RegExp(escapeRegex(focusedOpt.value), 'i') }).limit(25);
      return interaction.respond(list.map((s) => ({ name: s.name, value: s.name })));
    }
    const items = await Item.find({ guildId: interaction.guildId, name: new RegExp(escapeRegex(focusedOpt.value), 'i') }).limit(25);
    return interaction.respond(items.map((i) => ({ name: i.name, value: i.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaSekte = interaction.options.getString('nama-sekte');
    const namaItem = interaction.options.getString('nama-item');
    const jumlah = interaction.options.getInteger('jumlah');

    const sect = await Sect.findOne({ guildId: interaction.guildId, name: new RegExp(`^\\s*${escapeRegex(namaSekte)}\\s*$`, 'i') });
    if (!sect) return interaction.editReply({ content: `❌ Sekte "${namaSekte}" tidak ditemukan.` });

    const item = await Item.findOne({ guildId: interaction.guildId, name: new RegExp(`^\\s*${escapeRegex(namaItem)}\\s*$`, 'i') });
    if (!item) return interaction.editReply({ content: `❌ Item "${namaItem}" tidak ditemukan.` });

    const owned = sect.resources.find((r) => r.itemId.equals(item._id));
    if (owned) owned.quantity += jumlah; else sect.resources.push({ itemId: item._id, quantity: jumlah });
    await sect.save();

    await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'SECT_GIVE_RESOURCE', details: `${sect.name}: +${jumlah} ${item.name}` });

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x2980b9).setTitle('✅ Sumber Daya Ditambahkan').setDescription(`Sekte **${sect.name}** menerima **${jumlah}x ${item.name}**.`)] });
  },
};

