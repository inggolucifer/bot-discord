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

    .addSubcommand(sub => sub.setName('accelerate')
        .setDescription('Gunakan Pil Pencerahan untuk memotong waktu meditasi')
        .addStringOption(opt => opt.setName('nama_manual').setDescription('Manual yang sedang dimeditasi').setRequired(true).setAutocomplete(true))
        .addStringOption(opt => opt.setName('item').setDescription('Item pemotong waktu dari inventory').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(sub => sub.setName('upgrade')
        .setDescription('Selesaikan meditasi dan bayar biaya untuk naik level')
        .addStringOption(opt => opt.setName('nama_manual').setDescription('Nama Manual milikmu').setRequired(true).setAutocomplete(true))
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const sub = interaction.options.getSubcommand();


    if (sub === 'accelerate') {
        const focusedOption = interaction.options.getFocused(true);
        const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId })
            .populate('manuals.manualId')
            .populate('inventory.itemId');
        if (!player) return interaction.respond([]);

        if (focusedOption.name === 'nama_manual') {
             const manuals = player.manuals.map(m => m.manualId).filter(m => m && m.name.match(new RegExp(focusedOption.value, 'i'))).slice(0, 10);
             return interaction.respond(manuals.map(m => ({ name: m.name, value: m.name })));
        }
        if (focusedOption.name === 'item') {
             // Filter items that have effect "time_skip_X"
             const items = player.inventory.filter(i => i.quantity > 0 && i.itemId && i.itemId.effect && i.itemId.effect.match(/time_skip_\d+/i));
             const filtered = items.filter(i => i.itemId.name.match(new RegExp(focusedOption.value, 'i'))).slice(0, 10);
             return interaction.respond(filtered.map(i => ({ name: `${i.itemId.name} (x${i.quantity})`, value: i.itemId._id.toString() })));
        }
    }

    if (sub === 'learn' || sub === 'list') {
       const manuals = await Manual.find({ guildId: interaction.guildId, name: { $regex: new RegExp(focusedValue, 'i') } }).limit(10);
       return interaction.respond(manuals.map(m => ({ name: m.name, value: m.name })));
    } else {
       // my_manuals, comprehend, upgrade
       const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId }).populate('manuals.manualId');
       if (!player) return interaction.respond([]);

       const manuals = player.manuals.map(m => m.manualId).filter(m => m && m.name.match(new RegExp(focusedValue, 'i'))).slice(0, 10);
       return interaction.respond(manuals.map(m => ({ name: m.name, value: m.name })));
    }
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
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


      if (sub === 'accelerate') {
          const manualName = interaction.options.getString('nama_manual');
          const itemIdStr = interaction.options.getString('item');

          await player.populate('inventory.itemId');
          const pm = player.manuals.find(m => m.manualId && m.manualId.name.toLowerCase() === manualName.toLowerCase());

          if (!pm) return interaction.editReply('❌ Kamu tidak memiliki manual ini.');
          if (!pm.isComprehending) return interaction.editReply('❌ Manual ini tidak sedang dalam proses comprehend.');

          const invIndex = player.inventory.findIndex(i => i.itemId && i.itemId._id.toString() === itemIdStr);
          if (invIndex === -1 || player.inventory[invIndex].quantity < 1) {
              return interaction.editReply('❌ Kamu tidak memiliki item tersebut.');
          }

          const itemObj = player.inventory[invIndex].itemId;
          const match = itemObj.effect ? itemObj.effect.match(/time_skip_(\d+)/i) : null;

          if (!match) {
              return interaction.editReply('❌ Item ini tidak memiliki efek akselerasi waktu.');
          }

          const hoursToSkip = parseInt(match[1]);

          // Deduct item
          player.inventory[invIndex].quantity -= 1;

          // Modify startTime backwards
          const st = new Date(pm.comprehendStartTime);
          st.setHours(st.getHours() - hoursToSkip);
          pm.comprehendStartTime = st;

          player.markModified('inventory');
          player.markModified('manuals');
          await player.save();

          // Log transaction
          await logTransaction(interaction.guildId, player.discordId, 'comprehend_manual', {}, `Consume ${itemObj.name} for ${hoursToSkip}h skip`);

          return interaction.editReply(`⏳ Kamu menelan **${itemObj.name}**. Pikiranmu menjadi jernih, waktu pemahaman **${pm.manualId.name}** dipotong sebanyak **${hoursToSkip} Jam**!`);
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
      await interaction.editReply('❌ Terjadi kesalahan.');
    }
  }
};
