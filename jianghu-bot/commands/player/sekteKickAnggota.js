const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Sect = require('../../models/Sect');
const { syncPlayerSectLabel } = require('../../utils/sectSync');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sekte-kick-anggota')
    .setDescription('[KETUA SEKTE] Keluarkan seorang anggota (Wakil/Tetua/Anggota) dari sekte milikmu')
    .addUserOption((o) => o.setName('user').setDescription('Player yang dikeluarkan').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser('user');

    const mySect = await Sect.findOne({ guildId: interaction.guildId, leaderId: interaction.user.id });
    if (!mySect) return interaction.editReply({ content: '❌ Kamu bukan Ketua sekte manapun. Command ini khusus Ketua Sekte.' });

    if (target.id === interaction.user.id) {
      return interaction.editReply({ content: '❌ Tidak bisa mengeluarkan dirimu sendiri (Ketua). Hubungi admin kalau ingin membubarkan sekte.' });
    }

    const wasIn = mySect.viceLeaderId === target.id || mySect.elderIds.includes(target.id) || mySect.memberIds.includes(target.id);
    if (!wasIn) return interaction.editReply({ content: `❌ ${target.username} bukan anggota sekte ini.` });

    if (mySect.viceLeaderId === target.id) mySect.viceLeaderId = null;
    mySect.elderIds = mySect.elderIds.filter((id) => id !== target.id);
    mySect.memberIds = mySect.memberIds.filter((id) => id !== target.id);
    await mySect.save();

    await syncPlayerSectLabel(interaction.guildId, target.id, null);

    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xc0392b).setTitle('🗑️ Anggota Dikeluarkan').setDescription(`${target} telah dikeluarkan dari sekte **${mySect.name}**.`)] });
  },
};

