const { escapeRegex } = require('../../utils/escapeRegex');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');
const LootPool = require('../../models/LootPool');
const Player = require('../../models/Player');
const { logTransaction } = require('../../utils/logger');
const { formatCurrencyLine } = require('../../utils/currency');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loot')
    .setDescription('Ambil harta peninggalan karakter yang sudah meninggal (jika ditujukan padamu)')
    .addStringOption((o) => o.setName('nama').setDescription('Nama karakter yang meninggal').setRequired(true)),

  async execute(interaction) {
    try {
    await interaction.deferReply();

    const nama = interaction.options.getString('nama');

    const pool = await LootPool.findOne({
      guildId: interaction.guildId,
      deceasedCharacterName: new RegExp(`^${escapeRegex(nama)}$`, 'i'),
      targetUserId: interaction.user.id,
      claimed: false,
    });

    if (!pool) {
      return interaction.editReply({ content: `❌ Tidak ada loot dari "${nama}" yang ditujukan untukmu (atau sudah diambil).` });
    }

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });
    if (player.status !== 'active') return interaction.editReply({ content: `❌ Karaktermu berstatus **${player.status}**.` });

    for (const c of ['copper', 'silver', 'gold', 'jade', 'spirit']) {
      player.currency[c] += pool.currency[c] || 0;
    }
    for (const it of pool.inventory) {
      const owned = player.inventory.find((i) => i.itemId.equals(it.itemId));
      if (owned) owned.quantity += it.quantity; else player.inventory.push({ itemId: it.itemId, quantity: it.quantity });
    }

    // Pets transfer logic. Max 6 limit
    let petLootedCount = 0;
    for (const p of pool.pets) {
      if (player.pets.length < 6) {
        // Create new instanceId when transferring pet to avoid duplicates
        // or just to ensure it has one if the original was broken
        const transferredPet = p.toObject ? p.toObject() : { ...p };
        transferredPet.instanceId = crypto.randomUUID();

        player.pets.push(transferredPet);
        petLootedCount++;
      }
    }

    let overLimitMsg = '';
    if (pool.pets.length > petLootedCount) {
      overLimitMsg = `\n_Catatan: ${pool.pets.length - petLootedCount} pet tidak diambil karena limit maksimal 6 pet per player._`;
    }

    await player.save();

    pool.claimed = true;
    pool.claimedAt = new Date();
    await pool.save();

    await logTransaction(interaction.client, {
      guildId: interaction.guildId,
      type: 'loot_claim',
      toUserId: interaction.user.id,
      note: `${interaction.user.tag} mengambil loot dari ${pool.deceasedCharacterName}`,
      balanceAfter: player.currency,
    });

    const embed = new EmbedBuilder()
      .setColor(0x7f8c8d)
      .setTitle(`☠️ Loot dari ${pool.deceasedCharacterName}`)
      .setDescription(`Kamu berhasil mengambil harta peninggalan.\n\n**Currency didapat:**\n${formatCurrencyLine(pool.currency)}\n\n**Item:** ${pool.inventory.length} jenis\n**Pet:** ${petLootedCount} ekor${overLimitMsg}`);
    return interaction.editReply({ embeds: [embed] });
      } catch (error) {
      console.error(error);
      const msg = "Terjadi kesalahan sistem saat memproses command ini.";
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: msg }).catch(() => {});
      } else {
        await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
      }
    }
  },
};
