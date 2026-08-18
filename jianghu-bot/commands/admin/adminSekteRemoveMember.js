const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Sect = require('../../models/Sect');
const { syncPlayerSectLabel } = require('../../utils/sectSync');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-sekte-remove-member')
    .setDescription('[ADMIN] Keluarkan player dari sekte (jabatan apapun)')
    .addStringOption((o) => o.setName('nama-sekte').setDescription('Nama sekte').setRequired(true).setAutocomplete(true))
    .addUserOption((o) => o.setName('user').setDescription('Player yang dikeluarkan').setRequired(true)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const list = await Sect.find({ guildId: interaction.guildId, name: new RegExp(focused, 'i') }).limit(25);
    return interaction.respond(list.map((s) => ({ name: s.name, value: s.name })));
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const namaSekte = interaction.options.getString('nama-sekte');
    const target = interaction.options.getUser('user');

    const sect = await Sect.findOne({ guildId: interaction.guildId, name: new RegExp(`^${namaSekte}$`, 'i') });
    if (!sect) return interaction.editReply({ content: `❌ Sekte "${namaSekte}" tidak ditemukan.` });

    const wasIn = sect.leaderId === target.id || sect.viceLeaderId === target.id || sect.elderIds.includes(target.id) || sect.memberIds.includes(target.id);
    if (!wasIn) return interaction.editReply({ content: `❌ ${target.username} bukan anggota sekte ini.` });

    if (sect.leaderId === target.id) sect.leaderId = null;
    if (sect.viceLeaderId === target.id) sect.viceLeaderId = null;
    sect.elderIds = sect.elderIds.filter((id) => id !== target.id);
    sect.memberIds = sect.memberIds.filter((id) => id !== target.id);
    await sect.save();

    await syncPlayerSectLabel(interaction.guildId, target.id, null);

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('🗑️ Dikeluarkan dari Sekte').setDescription(`${target} telah dikeluarkan dari sekte **${sect.name}**.`)] });
  },
};

