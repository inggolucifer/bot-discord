const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Pet = require('../../models/Pet');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-edit-pet')
    .setDescription('[ADMIN] Edit pet lewat form (modal)')
    .addStringOption((o) => o.setName('nama').setDescription('Nama pet').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const pets = await Pet.find({ name: new RegExp(escapeRegex(focused), 'i') }).limit(25);
    await interaction.respond(pets.map((p) => ({ name: p.name, value: p.name })));
  },

  async execute(interaction) {
    if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
    const nama = interaction.options.getString('nama');
    const pet = await Pet.findOne({ name: new RegExp(`^\\s*${escapeRegex(nama)}\\s*$`, 'i') });
    if (!pet) return interaction.reply({ content: `❌ Pet "${nama}" tidak ditemukan.`, flags: MessageFlags.Ephemeral });

    const modal = new ModalBuilder().setCustomId(`modal_edit_pet_${pet._id}`).setTitle(`Edit: ${pet.name}`.slice(0, 45));
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Nama Pet').setStyle(TextInputStyle.Short).setValue(pet.name).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rankTier').setLabel('Rank & Tier (contoh: Epic 5)').setStyle(TextInputStyle.Short).setValue(`${pet.rank} ${pet.tier}`).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('priceInfo').setLabel('Harga Dasar & Currency (contoh: 500 silver)').setStyle(TextInputStyle.Short).setValue(`${pet.basePrice} ${pet.priceCurrency}`).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Deskripsi').setStyle(TextInputStyle.Paragraph).setValue(pet.description || '').setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('imageUrl').setLabel('URL Gambar').setStyle(TextInputStyle.Short).setValue(pet.imageUrl || '').setRequired(false)),
    );
    await interaction.showModal(modal);
  },
};
