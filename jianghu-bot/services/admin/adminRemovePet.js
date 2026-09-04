const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const { logAdminAction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-remove-pet')
    .setDescription('[ADMIN] Hapus pet dari koleksi player tertentu')
    .addUserOption((o) => o.setName('user').setDescription('Target player').setRequired(true))
    .addStringOption((o) => o.setName('nama').setDescription('Nama pet').setRequired(true).setAutocomplete(true))
    .addStringOption((o) => o.setName('nickname').setDescription('Nickname spesifik (kalau player punya beberapa pet sama nama)')),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const targetId = interaction.options.get('user')?.value;
    if (!targetId) return interaction.respond([]);
    const player = await Player.findOne({ discordId: targetId, guildId: interaction.guildId });
    if (!player) return interaction.respond([]);
    const pets = await Pet.find({ _id: { $in: player.pets.map((p) => p.petId) }, name: new RegExp(escapeRegex(focused), 'i') }).limit(25);
    return interaction.respond(pets.map((p) => ({ name: p.name, value: p.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const target = interaction.options.getUser('user');
    const nama = interaction.options.getString('nama');
    const nickname = interaction.options.getString('nickname');

    const player = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: `❌ ${target.username} belum terdaftar.` });

    const pet = await Pet.findOne({ name: new RegExp(`^\\s*${escapeRegex(nama)}\\s*$`, 'i') });
    if (!pet) return interaction.editReply({ content: `❌ Pet "${nama}" tidak ditemukan.` });

    const idx = player.pets.findIndex((p) => p.petId.equals(pet._id) && (nickname ? p.nickname === nickname : true));
    if (idx === -1) return interaction.editReply({ content: `❌ ${target.username} tidak memiliki pet "${pet.name}"${nickname ? ` dengan nickname "${nickname}"` : ''}.` });

    const removed = player.pets[idx];
    player.pets.splice(idx, 1);
    await player.save();

    await logAdminAction(interaction.client, {
      guildId: interaction.guildId, adminId: interaction.user.id, action: 'REMOVE_PET', targetUserId: target.id,
      details: `${pet.name}${removed.nickname ? ` (${removed.nickname})` : ''}`,
    });

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('🗑️ Pet Dihapus').setDescription(`**${pet.name}**${removed.nickname ? ` (${removed.nickname})` : ''} dihapus dari koleksi ${target}.`)] });
  },
};

