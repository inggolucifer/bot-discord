const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Player = require('../../models/Player');
const Manual = require('../../models/Manual');
const { hasEnoughCurrency, payCurrency, formatCurrency } = require('../../utils/currency');
const { logTransaction } = require('../../utils/logger');
const ms = require('ms');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('manual')
    .setDescription('Sistem Kitab Jurus (Manual)')
    .addSubcommand(sub => sub.setName('list').setDescription('Lihat daftar Manual yang tersedia di dunia ini'))
    .addSubcommand(sub => sub.setName('my_manuals').setDescription('Lihat Manual yang sedang kamu pelajari'))
    .addSubcommand(sub => sub.setName('learn')
        .setDescription('Mulai pelajari Manual baru (Gratis level 0)')
        .addStringOption(opt => opt.setName('nama_manual').setDescription('Nama Manual').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(sub => sub.setName('comprehend')
        .setDescription('Mulai meditasi/comprehend untuk menaikkan level Manual')
        .addStringOption(opt => opt.setName('nama_manual').setDescription('Nama Manual milikmu').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(sub => sub.setName('upgrade')
        .setDescription('Selesaikan meditasi dan bayar biaya untuk naik level')
        .addStringOption(opt => opt.setName('nama_manual').setDescription('Nama Manual milikmu').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(sub => sub.setName('accelerate')
        .setDescription('Gunakan item (seperti Pil Pencerahan) untuk mempercepat waktu meditasi')
        .addStringOption(opt => opt.setName('nama_manual').setDescription('Nama Manual yang sedang dimeditasikan').setRequired(true).setAutocomplete(true))
        .addStringOption(opt => opt.setName('nama_item').setDescription('Nama Item Akselerator (misal: Pil Pencerahan)').setRequired(true).setAutocomplete(true))
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused(true);
    const sub = interaction.options.getSubcommand();

    if (focusedValue.name === 'nama_item') {
        const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId }).populate('inventory.itemId');
        if (!player) return interaction.respond([]);
        const items = player.inventory
            .filter(inv => inv.itemId && inv.quantity > 0 && inv.itemId.effect && inv.itemId.effect.startsWith('time_skip_') && inv.itemId.name.match(new RegExp(focusedValue.value, 'i')))
            .map(inv => ({ name: `${inv.itemId.name} (${inv.quantity}x)`, value: inv.itemId.name }))
            .slice(0, 10);
        return interaction.respond(items);
    }

    if (sub === 'learn' || sub === 'list') {
       const manuals = await Manual.find({ guildId: interaction.guildId, name: { $regex: new RegExp(focusedValue.value, 'i') } }).limit(10);
       return interaction.respond(manuals.map(m => ({ name: m.name, value: m.name })));
    } else {
       // my_manuals, comprehend, upgrade, accelerate
       const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId }).populate('manuals.manualId');
       if (!player) return interaction.respond([]);

       const manuals = player.manuals.map(m => m.manualId).filter(m => m && m.name.match(new RegExp(focusedValue.value, 'i'))).slice(0, 10);
       return interaction.respond(manuals.map(m => ({ name: m.name, value: m.name })));
    }
  },

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const sub = interaction.options.getSubcommand();
      let player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId }).populate('manuals.manualId');

      if (!player) return interaction.editReply('❌ Kamu belum terdaftar.');

      if (sub === 'list') {
        const manuals = await Manual.find({ guildId: interaction.guildId });
        if (manuals.length === 0) return interaction.editReply('📜 Belum ada Manual yang tercatat di dunia ini.');

        const embed = new EmbedBuilder()
            .setTitle('📖 Daftar Kitab Jurus (Manual)')
            .setColor(0x2c3e50);

        let desc = '';
        for (const m of manuals) {
             desc += `**${m.name}** (Max Lvl: ${m.maxLevel})\n`;
             desc += `*${m.description}*\n`;
             desc += `Biaya per level: ${m.baseCost} ${m.costCurrency}\n`;
             desc += `Waktu Comprehend: ${m.timeToComprehendHours} Jam\n\n`;
        }
        embed.setDescription(desc.substring(0, 4000));
        return interaction.editReply({ embeds: [embed] });
      }

      if (sub === 'my_manuals') {
        if (!player.manuals || player.manuals.length === 0) {
            return interaction.editReply('Kamu belum mempelajari satupun Manual.');
        }
        const embed = new EmbedBuilder()
            .setTitle('📖 Kitab Jurusmu')
            .setColor(0x34495e);

        let desc = '';
        for (const pm of player.manuals) {
             if (!pm.manualId) continue;
             const m = pm.manualId;
             desc += `**${m.name}** (Lvl ${pm.level}/${m.maxLevel})\n`;
             if (pm.isComprehending) {
                 const msPassed = Date.now() - new Date(pm.comprehendStartTime).getTime();
                 const hoursPassed = msPassed / (1000 * 60 * 60);
                 const progress = Math.min(100, Math.floor((hoursPassed / m.timeToComprehendHours) * 100));
                 desc += `🧘 Sedang Comprehend: Progress ${progress}%\n`;
             }
             desc += '\n';
        }
        embed.setDescription(desc);
        return interaction.editReply({ embeds: [embed] });
      }

      if (sub === 'learn') {
        const manualName = interaction.options.getString('nama_manual');
        const manualToLearn = await Manual.findOne({ guildId: interaction.guildId, name: new RegExp(`^\\s*${manualName}\\s*$`, 'i') });

        if (!manualToLearn) return interaction.editReply('❌ Manual tersebut tidak ditemukan.');

        if (player.manuals.some(m => m.manualId && m.manualId.equals(manualToLearn._id))) {
            return interaction.editReply('❌ Kamu sudah memiliki Manual ini.');
        }

        player.manuals.push({
            manualId: manualToLearn._id,
            level: 0,
            isComprehending: false,
            comprehendStartTime: null
        });
        await player.save();

        return interaction.editReply(`📖 Kamu mulai membaca **${manualToLearn.name}**. Gunakan \`/manual comprehend\` untuk menaikkan levelnya.`);
      }

      if (sub === 'comprehend') {
        const manualName = interaction.options.getString('nama_manual');
        const pm = player.manuals.find(m => m.manualId && m.manualId.name.toLowerCase() === manualName.toLowerCase());

        if (!pm) return interaction.editReply('❌ Kamu tidak memiliki manual ini.');
        if (pm.level >= pm.manualId.maxLevel) return interaction.editReply('❌ Manual ini sudah mencapai level maksimal.');
        if (pm.isComprehending) return interaction.editReply('❌ Kamu sudah sedang memediasikan manual ini.');

        // Cek apakah ada manual lain yang sedang dicomprehend (opsional: boleh dibatasi 1 manual at a time)
        const isAlreadyMeditating = player.manuals.some(m => m.isComprehending);
        if (isAlreadyMeditating) return interaction.editReply('❌ Kamu hanya bisa memediasikan satu manual pada satu waktu.');

        pm.isComprehending = true;
        pm.comprehendStartTime = new Date();
        player.markModified('manuals');
        await player.save();

        return interaction.editReply(`🧘 Kamu mulai memediasikan **${pm.manualId.name}**. Butuh **${pm.manualId.timeToComprehendHours} jam** untuk menyelesaikannya.`);
      }

      if (sub === 'accelerate') {
        const manualName = interaction.options.getString('nama_manual');
        const itemName = interaction.options.getString('nama_item');

        const pm = player.manuals.find(m => m.manualId && m.manualId.name.toLowerCase() === manualName.toLowerCase());
        if (!pm) return interaction.editReply('❌ Kamu tidak memiliki manual ini.');
        if (!pm.isComprehending) return interaction.editReply('❌ Kamu belum memulai comprehend untuk manual ini.');

        // Anti-Waste Protection Check
        const msPassed = Date.now() - new Date(pm.comprehendStartTime).getTime();
        const hoursPassed = msPassed / (1000 * 60 * 60);

        if (hoursPassed >= pm.manualId.timeToComprehendHours) {
             return interaction.editReply('❌ Meditasimu sudah mencapai puncaknya! Kamu hanya perlu melakukan `/manual upgrade`.');
        }

        // Verify player has the item and it's a time skip item
        await player.populate('inventory.itemId');
        const inventorySlotIndex = player.inventory.findIndex(inv => inv.itemId && inv.itemId.name.toLowerCase() === itemName.toLowerCase());

        if (inventorySlotIndex === -1 || player.inventory[inventorySlotIndex].quantity <= 0) {
            return interaction.editReply(`❌ Kamu tidak memiliki item **${itemName}** di inventory.`);
        }

        const item = player.inventory[inventorySlotIndex].itemId;

        if (!item.effect || !item.effect.startsWith('time_skip_')) {
             return interaction.editReply(`❌ Item **${item.name}** tidak bisa digunakan untuk mempercepat meditasi.`);
        }

        const hoursToSkip = parseInt(item.effect.split('_')[2], 10);
        if (isNaN(hoursToSkip) || hoursToSkip <= 0) {
            return interaction.editReply(`❌ Data efek item **${item.name}** tidak valid (time_skip_X).`);
        }

        const hoursLeft = pm.manualId.timeToComprehendHours - hoursPassed;
        if (hoursToSkip > hoursLeft + 2) {
             return interaction.editReply(`❌ Hentikan! Meditasimu hanya tersisa **${hoursLeft.toFixed(1)} jam**. Menggunakan **${item.name}** (${hoursToSkip} Jam) akan membuang sebagian besar khasiatnya. Gunakan pil dengan efek yang lebih kecil.`);
        }

        const session = await Player.startSession();
        session.startTransaction();

        try {
            // Deduct Item
            player.inventory[inventorySlotIndex].quantity -= 1;
            if (player.inventory[inventorySlotIndex].quantity <= 0) {
                player.inventory.splice(inventorySlotIndex, 1);
            }
            player.markModified('inventory');

            // Shift the start time to the past
            const currentStartTime = new Date(pm.comprehendStartTime);
            pm.comprehendStartTime = new Date(currentStartTime.getTime() - (hoursToSkip * 60 * 60 * 1000));
            player.markModified('manuals');

            await player.save({ session });
            await session.commitTransaction();

            await logTransaction(interaction.guildId, player.discordId, 'use_insight_pill', {}, `${item.name} on ${pm.manualId.name}`);

            return interaction.editReply(`✨ Kamu menelan **${item.name}**. Pikiranmu menjadi sangat jernih! Waktu meditasi **${pm.manualId.name}** dipersingkat sebanyak **${hoursToSkip} jam**.`);

        } catch (err) {
            await session.abortTransaction();
            console.error(err);
            const msg = '❌ Terjadi kesalahan saat menggunakan item akselerator.';
            if (interaction.deferred || interaction.replied) {
              return interaction.editReply({ content: msg }).catch(() => {});
            } else {
              return interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
            }
        } finally {
            session.endSession();
        }
      }

      if (sub === 'upgrade') {
        const manualName = interaction.options.getString('nama_manual');
        const pm = player.manuals.find(m => m.manualId && m.manualId.name.toLowerCase() === manualName.toLowerCase());

        if (!pm) return interaction.editReply('❌ Kamu tidak memiliki manual ini.');
        if (!pm.isComprehending) return interaction.editReply('❌ Kamu belum memulai comprehend untuk manual ini.');

        const m = pm.manualId;
        const msPassed = Date.now() - new Date(pm.comprehendStartTime).getTime();
        const hoursPassed = msPassed / (1000 * 60 * 60);

        if (hoursPassed < m.timeToComprehendHours) {
             const left = m.timeToComprehendHours - hoursPassed;
             return interaction.editReply(`⏳ Meditasi belum selesai. Tersisa sekitar ${left.toFixed(1)} jam.`);
        }

        // Calculate Cost
        const costCurrency = m.costCurrency;
        // Biaya naik per level (bisa dibikin scaling, sekarang flat baseCost * level baru)
        const nextLevel = pm.level + 1;
        const totalCost = m.baseCost * nextLevel;

        const costObj = {};
        costObj[costCurrency] = totalCost;

        if (!hasEnoughCurrency(player.currency, costObj)) {
            return interaction.editReply(`❌ Kamu butuh ${totalCost} ${costCurrency} untuk memantapkan pemahamanmu ke level ${nextLevel}. Uangmu tidak cukup.`);
        }

        payCurrency(player.currency, costObj);

        pm.level = nextLevel;
        pm.isComprehending = false;
        pm.comprehendStartTime = null;

        player.markModified('manuals');
        player.markModified('currency');
        await player.save();

        await logTransaction(interaction.guildId, player.discordId, 'comprehend_manual', costObj, m.name);

        return interaction.editReply(`🌟 BLING! Kamu memantapkan pemahamanmu. **${m.name}** kini mencapai Level **${nextLevel}**! (Menghabiskan ${totalCost} ${costCurrency})`);
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
