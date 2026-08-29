const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const crypto = require('crypto');
const { isAdmin } = require('../../utils/permissions');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const { logAdminAction } = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-give-pet')
    .setDescription('[ADMIN] Beri pet ke player')
    .addUserOption((o) => o.setName('user').setDescription('Target player').setRequired(true))
    .addStringOption((o) => o.setName('nama').setDescription('Nama pet').setRequired(true).setAutocomplete(true))
    .addStringOption((o) => o.setName('nickname').setDescription('Nickname pet (opsional)')),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const pets = await Pet.find({ guildId: interaction.guildId, name: new RegExp(escapeRegex(focused), 'i') }).limit(25);
    await interaction.respond(pets.map((p) => ({ name: p.name, value: p.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const target = interaction.options.getUser('user');
    const nama = interaction.options.getString('nama');
    const nickname = interaction.options.getString('nickname') || null;

    const player = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: `❌ ${target.username} belum terdaftar.` });
    const pet = await Pet.findOne({ guildId: interaction.guildId, name: new RegExp(`^${escapeRegex(nama)}$`, 'i') });
    if (!pet) return interaction.editReply({ content: `❌ Pet "${nama}" tidak ditemukan.` });

    player.pets.push({
      instanceId: crypto.randomUUID(),
      petId: pet._id,
      nickname
    });
    await player.save();

    await logAdminAction(interaction.client, {
      guildId: interaction.guildId, adminId: interaction.user.id, action: 'GIVE_PET', targetUserId: target.id,
      details: `${pet.name}${nickname ? ` (nickname: ${nickname})` : ''}`,
    });

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x2980b9).setTitle('✅ Pet Diberikan').setDescription(`${target} menerima pet **${pet.name}**.`)] });
  },
};
