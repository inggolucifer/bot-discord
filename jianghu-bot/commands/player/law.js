const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Player = require('../../models/Player');
const Law = require('../../models/Law');
const { getRealmIndex } = require('../../utils/cultivation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('law')
    .setDescription('Sistem Hukum Alam (Law)')
    .addSubcommand(sub => sub.setName('list').setDescription('Lihat daftar Hukum Alam yang tersedia di dunia ini'))
    .addSubcommand(sub => sub.setName('my_laws').setDescription('Lihat Hukum Alam yang sudah kamu pelajari'))
    .addSubcommand(sub => sub.setName('learn')
        .setDescription('Pelajari Hukum Alam (Hanya bisa di tahap Mortal)')
        .addStringOption(opt => opt.setName('nama_law').setDescription('Nama Hukum Alam yang ingin dipelajari').setRequired(true).setAutocomplete(true))
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const laws = await Law.find({ guildId: interaction.guildId, name: { $regex: new RegExp(focusedValue, 'i') } }).limit(10);
    await interaction.respond(
      laws.map(law => ({ name: law.name, value: law.name }))
    );
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const sub = interaction.options.getSubcommand();
      let player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId }).populate('laws');

      if (!player) return interaction.editReply('❌ Kamu belum terdaftar.');

      if (sub === 'list') {
        const laws = await Law.find({ guildId: interaction.guildId });
        if (laws.length === 0) return interaction.editReply('📜 Belum ada Hukum Alam yang tercatat di dunia ini.');

        const embed = new EmbedBuilder()
            .setTitle('📜 Daftar Hukum Alam')
            .setColor(0x9b59b6);

        let desc = '';
        for (const law of laws) {
             desc += `**${law.name}** (Elemen: ${law.element})\n`;
             desc += `*${law.description}*\n`;
             if (law.multiplierBonus) {
                 desc += `Bonus: +${(law.multiplierBonus.atk * 100).toFixed(0)}% ATK, +${(law.multiplierBonus.hp * 100).toFixed(0)}% HP\n`;
             }
             desc += '\n';
        }
        embed.setDescription(desc.substring(0, 4000));
        return interaction.editReply({ embeds: [embed] });
      }

      if (sub === 'my_laws') {
        if (!player.laws || player.laws.length === 0) {
            return interaction.editReply('Kamu belum memahami satupun Hukum Alam.');
        }
        const embed = new EmbedBuilder()
            .setTitle('🌌 Pemahaman Hukum Alammu')
            .setColor(0x8e44ad);

        let desc = '';
        for (const law of player.laws) {
             desc += `**${law.name}** (${law.element})\n`;
             desc += `*${law.description}*\n\n`;
        }
        embed.setDescription(desc);
        return interaction.editReply({ embeds: [embed] });
      }

      if (sub === 'learn') {
        // Validation: Only Mortal can learn Law!
        const realmIdx = getRealmIndex(player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)');

        if (player.isNormalCultivator || realmIdx > 0) {
            return interaction.editReply('❌ Terlambat! Tubuh fanamu sudah beradaptasi dengan Qi biasa. Kamu tidak bisa lagi mempelajari Hukum Alam (Hanya bisa di tahap Mortal).');
        }

        const lawName = interaction.options.getString('nama_law');
        const lawToLearn = await Law.findOne({ guildId: interaction.guildId, name: new RegExp(`^\\s*${lawName}\\s*$`, 'i') });

        if (!lawToLearn) return interaction.editReply('❌ Hukum Alam tersebut tidak ditemukan.');

        // Limit to 1 Law
        if (player.laws.length >= 1) {
            return interaction.editReply('❌ Jiwa fanamu hanya mampu menampung satu Hukum Alam semesta. Kamu sudah mengikat takdirmu dengan hukum alam lain.');
        }

        player.laws.push(lawToLearn._id);
        await player.save();

        return interaction.editReply(`🌌 Luar biasa! Kamu berhasil memahami **${lawToLearn.name}**. Fondasi jalan dewamu semakin kuat!`);
      }

    } catch (e) {
      console.error(e);
      await interaction.editReply('❌ Terjadi kesalahan.');
    }
  }
};
