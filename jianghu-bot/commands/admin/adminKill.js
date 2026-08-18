const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../../utils/permissions');
const Player = require('../../models/Player');
const LootPool = require('../../models/LootPool');
const { logAdminAction } = require('../../utils/logger');
const { rollPartialLoot } = require('../../utils/dice');
const { CURRENCIES, CURRENCY_LABEL } = require('../../utils/currency');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-kill')
    .setDescription('[ADMIN] Tandai karakter mati; SEBAGIAN harta (acak, seperti loot sungguhan) pindah ke loot pool')
    .addUserOption((o) => o.setName('user').setDescription('Karakter yang mati').setRequired(true))
    .addUserOption((o) => o.setName('loot-untuk').setDescription('Player yang berhak mengambil harta peninggalan').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!(await isAdmin(interaction))) return interaction.editReply({ content: '❌ Kamu bukan admin.' });

    const target = interaction.options.getUser('user');
    const lootTarget = interaction.options.getUser('loot-untuk');

    const player = await Player.findOne({ discordId: target.id, guildId: interaction.guildId });
    if (!player) return interaction.editReply({ content: `❌ ${target.username} belum terdaftar.` });

    const lootReceiver = await Player.findOne({ discordId: lootTarget.id, guildId: interaction.guildId });
    if (!lootReceiver) return interaction.editReply({ content: `❌ ${lootTarget.username} (penerima loot) belum terdaftar.` });

    // ==== Roll dadu per currency: cuma SEBAGIAN yang jadi loot, sisanya hilang (musnah, bukan didapat siapapun) ====
    const lootedCurrency = { silver: 0, gold: 0, jade: 0, spirit: 0 };
    const currencySummary = [];
    for (const c of CURRENCIES) {
      const fullAmount = player.currency[c] || 0;
      const looted = rollPartialLoot(fullAmount);
      lootedCurrency[c] = looted;
      if (fullAmount > 0) currencySummary.push(`${CURRENCY_LABEL[c]}: ${looted}/${fullAmount} jadi loot`);
    }

    // ==== Roll dadu per item: cuma sebagian quantity yang jadi loot ====
    const lootedInventory = [];
    const itemSummary = [];
    for (const invItem of player.inventory) {
      const looted = rollPartialLoot(invItem.quantity);
      if (looted > 0) {
        lootedInventory.push({ itemId: invItem.itemId, quantity: looted });
        itemSummary.push(`${looted}/${invItem.quantity}`);
      }
    }

    // ==== Roll dadu per pet: pet itu utuh (tidak dipecah quantity), jadi peluang loot 1 ekor per entry ====
    const lootedPets = [];
    const originalPetCount = player.pets.length; // simpan SEBELUM dikosongkan, dipakai di ringkasan embed
    for (const petEntry of player.pets) {
      const looted = rollPartialLoot(petEntry.quantity);
      if (looted > 0) lootedPets.push({ petId: petEntry.petId, nickname: petEntry.nickname, quantity: looted });
    }

    await LootPool.create({
      guildId: interaction.guildId,
      deceasedUserId: target.id,
      deceasedCharacterName: player.characterName,
      targetUserId: lootTarget.id,
      currency: lootedCurrency,
      inventory: lootedInventory,
      pets: lootedPets,
    });

    // Player yang mati kehilangan SEMUANYA (bukan cuma yang jadi loot -- sisanya musnah/tercecer, bukan didapat siapapun)
    player.status = 'dead';
    player.currency = { silver: 0, gold: 0, jade: 0, spirit: 0 };
    player.inventory = [];
    player.pets = [];
    await player.save();

    await logAdminAction(interaction.client, {
      guildId: interaction.guildId, adminId: interaction.user.id, action: 'KILL_PLAYER', targetUserId: target.id,
      details: `${player.characterName} meninggal. Loot (acak) ditujukan untuk ${lootTarget.tag || lootTarget.username} (gunakan /loot ${player.characterName})`,
    });

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle('☠️ Karakter Meninggal')
      .setDescription(`**${player.characterName}** telah ditandai meninggal.\n\nSeperti kematian sungguhan, TIDAK SEMUA harta bisa diselamatkan -- hanya sebagian yang berhasil jadi loot (hasil roll dadu), sisanya musnah/tercecer.\n\n${lootTarget} bisa mengambil loot dengan \`/loot ${player.characterName}\`.`)
      .addFields(
        { name: '💰 Currency yang Jadi Loot', value: currencySummary.length ? currencySummary.join('\n') : '_(tidak ada currency)_' },
        { name: '🎒 Item yang Jadi Loot', value: itemSummary.length ? `${itemSummary.length} jenis item, jumlah: ${itemSummary.join(', ')}` : '_(tidak ada item yang jadi loot)_' },
        { name: '🐾 Pet yang Jadi Loot', value: `${lootedPets.length} dari ${originalPetCount} entry pet` },
      );

    return interaction.editReply({ embeds: [embed] });
  },
};

