const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Pet = require('../../models/Pet');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-pet-stats')
    .setDescription('[ADMIN] Edit base stats & atribut RPG sebuah pet')
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

    const modal = new ModalBuilder()
      .setCustomId(`modal_edit_pet_stats_${pet._id}`)
      .setTitle(`Edit Stats: ${pet.name}`);

    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('baseStats').setLabel('Base HP,ATK,DEF,SPD (pisahkan koma)').setStyle(TextInputStyle.Short).setValue(`${pet.baseHp},${pet.baseAtk},${pet.baseDef},${pet.baseSpd}`).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('element').setLabel('Elemen (Api/Air/Tanah/Angin/Petir/Cahaya/Kegelapan/Netral)').setStyle(TextInputStyle.Short).setValue(pet.element).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('growthRate').setLabel('Growth Rate (0.8 - 1.5)').setStyle(TextInputStyle.Short).setValue(pet.growthRate.toString()).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('maxLevel').setLabel('Max Level').setStyle(TextInputStyle.Short).setValue(pet.maxLevel.toString()).setRequired(true))
    );

    return interaction.showModal(modal);
  },
};
