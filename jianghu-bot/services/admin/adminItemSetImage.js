const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Item = require('../../models/Item');

module.exports = {
  // data is optional here since we define it in admin.js, but standard structure helps if needed
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const items = await Item.find({ guildId: interaction.guildId, name: new RegExp(escapeRegex(focused), 'i') }).limit(25);
    await interaction.respond(items.map((i) => ({ name: i.name, value: i.name })));
  },

  async execute(interaction) {
    if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });

    const nama = interaction.options.getString('nama-item');
    const imageUrl = interaction.options.getString('image-url');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const item = await Item.findOne({ guildId: interaction.guildId, name: new RegExp(`^\\s*${escapeRegex(nama)}\\s*$`, 'i') });
    if (!item) return interaction.editReply({ content: `❌ Item "${nama}" tidak ditemukan.` });

    item.imageUrl = imageUrl;
    await item.save();

    return interaction.editReply({ content: `✅ Gambar untuk item **${item.name}** berhasil diatur menjadi:\n${imageUrl}` });
  },
};
