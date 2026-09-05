const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Player = require('../../models/Player');
const Law = require('../../models/Law');
const { getRealmIndex } = require('../../utils/cultivation');
const { logTransaction } = require('../../utils/logger');
const { escapeRegex } = require('../../utils/escapeRegex');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('law')
    .setDescription('Sistem Hukum Alam (Law)')
    .addSubcommand(sub => sub.setName('list').setDescription('Lihat daftar Hukum Alam yang tersedia di dunia ini'))
    .addSubcommand(sub => sub.setName('my_laws').setDescription('Lihat Hukum Alam yang sudah kamu pelajari'))
    .addSubcommand(sub => sub.setName('learn')
        .setDescription('Pelajari Hukum Alam (Hanya bisa di tahap Mortal)')
        .addStringOption(opt => opt.setName('nama_law').setDescription('Nama Hukum Alam yang ingin dipelajari').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(sub => sub.setName('reset')
        .setDescription('Reset Hukum Alam (Membakar item langka)')
        .addStringOption(opt => opt.setName('nama_item').setDescription('Item katalis reset (misal: Teratai Kelahiran Kembali)').setRequired(true).setAutocomplete(true))
    ),

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const sub = interaction.options.getSubcommand(false);

    if (sub === 'learn') {
        const laws = await Law.find({ guildId: interaction.guildId, name: { $regex: new RegExp(escapeRegex(focusedOption.value), 'i') } }).limit(10);
        return interaction.respond(laws.map(law => ({ name: law.name, value: law.name })));
    } else if (sub === 'reset') {
        const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId }).populate('inventory.itemId');
        if (!player) return interaction.respond([]);

        const items = player.inventory
            .filter(inv => inv.itemId && new RegExp(escapeRegex(focusedOption.value), 'i').test(inv.itemId.name))
            .map(inv => inv.itemId)
            .slice(0, 10);
        return interaction.respond(items.map(item => ({ name: item.name, value: item.name })));
    }
  },

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
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

        // Limit Law to 1
        if (player.laws.length >= 1) {
            const currentLaw = player.laws[0];
            return interaction.editReply(`❌ Jiwa fanamu hanya mampu menampung satu Hukum Alam semesta. Kamu sudah mengikat takdirmu dengan **${currentLaw.name}**.`);
        }

        // Check if already learned (though redundant now with the limit of 1, keeping for safety)
        if (player.laws.some(l => l._id.equals(lawToLearn._id))) {
            return interaction.editReply('❌ Kamu sudah memahami Hukum Alam ini.');
        }

        player.laws.push(lawToLearn._id);
        await player.save();

        return interaction.editReply(`🌌 Luar biasa! Kamu berhasil memahami **${lawToLearn.name}**. Fondasi jalan dewamu semakin kuat!`);
      }

      if (sub === 'reset') {
        if (!player.laws || player.laws.length === 0) {
            return interaction.editReply('❌ Kamu belum memahami Hukum Alam apapun untuk direset.');
        }

        const itemName = interaction.options.getString('nama_item');

        await player.populate('inventory.itemId');
        const inventorySlotIndex = player.inventory.findIndex(inv => inv.itemId && inv.itemId.name.toLowerCase() === itemName.toLowerCase());

        if (inventorySlotIndex === -1 || player.inventory[inventorySlotIndex].quantity <= 0) {
            return interaction.editReply(`❌ Kamu tidak memiliki item **${itemName}** di inventory.`);
        }

        const item = player.inventory[inventorySlotIndex].itemId;

        await player.populate('laws');

        const session = await Player.startSession();
        session.startTransaction();
        try {
            // Deduct item
            player.inventory[inventorySlotIndex].quantity -= 1;
            if (player.inventory[inventorySlotIndex].quantity <= 0) {
                player.inventory.splice(inventorySlotIndex, 1);
            }
            player.markModified('inventory');

            // Clear laws
            const oldLaw = player.laws[0];
            player.laws = [];
            player.markModified('laws');

            await player.save({ session });
            await session.commitTransaction();

            await logTransaction(interaction.guildId, player.discordId, 'law_reset', {}, `Digunakan: ${item.name}`);

            return interaction.editReply(`✨ Keajaiban terjadi! Kekuatan dari **${item.name}** mengalir ke seluruh meridianmu. Jiwamu disucikan kembali, menghapus ikatanmu dengan **${oldLaw.name}**. Kini kamu bebas mengukir takdir baru!`);
        } catch (err) {
            await session.abortTransaction();
            console.error(err);
            const msg = '❌ Terjadi kesalahan saat mencoba mereset Hukum Alam.';
            if (interaction.deferred || interaction.replied) {
              return interaction.editReply({ content: msg }).catch(() => {});
            } else {
              return interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
            }
        } finally {
            session.endSession();
        }
      }

    } catch (e) {
      console.error(e);
      const msg = '❌ Terjadi kesalahan.';
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: msg }).catch(() => {});
      } else {
        await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
      }
    }
  }
};
