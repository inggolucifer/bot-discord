const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const Pet = require('../../models/Pet');
const Asset = require('../../models/Asset');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Lihat gabungan inventory, pet, dan asset yang kamu miliki')
    .addUserOption((opt) => opt.setName('user').setDescription('Player yang ingin dilihat inventory-nya (opsional)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const targetUser = interaction.options.getUser('user') || interaction.user;

    const player = await Player.findOne({ discordId: targetUser.id, guildId: interaction.guildId });
    if (!player) {
      const isSelf = targetUser.id === interaction.user.id;
      return interaction.editReply({
        content: isSelf
          ? '❌ Kamu belum terdaftar. Gunakan `/daftar [nama karakter]` dulu.'
          : `❌ ${targetUser.username} belum terdaftar sebagai karakter.`,
      });
    }

    const itemIds = player.inventory.map((i) => i.itemId);
    const petIds = player.pets.map((p) => p.petId);
    const assetIds = player.assets.map((a) => a.assetId);

    const [itemDocsRaw, petDocsRaw, assetDocsRaw] = await Promise.all([
      Item.find({ _id: { $in: itemIds } }),
      Pet.find({ _id: { $in: petIds } }),
      Asset.find({ _id: { $in: assetIds } }),
    ]);

    const itemDocs = player.inventory.map((i) => ({ doc: itemDocsRaw.find((d) => d._id.equals(i.itemId)), quantity: i.quantity })).filter((x) => x.doc);
    const petDocs = player.pets.map((p) => ({ doc: petDocsRaw.find((d) => d._id.equals(p.petId)), nickname: p.nickname, quantity: p.quantity })).filter((x) => x.doc);
    const assetDocs = player.assets.map((a) => ({ doc: assetDocsRaw.find((d) => d._id.equals(a.assetId)), quantity: a.quantity, owned: a })).filter((x) => x.doc);

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`🎒 Inventory & Kekayaan: ${player.characterName}`)
      .setDescription(`Daftar lengkap item, pet, dan aset yang dimiliki oleh **${player.characterName}**.`);

    let itemsText = itemDocs.map((i) => `• **${i.doc.name}** (x${i.quantity})`).join('\n');
    let petsText = petDocs.map((p) => `• **${p.doc.name}** (x${p.quantity})${p.nickname ? ` - *${p.nickname}*` : ''}`).join('\n');
    let assetsText = assetDocs.map((a) => {
        let status = a.owned.isConstructing ? ' (Sedang Dibangun)' : '';
        return `• **${a.doc.name}** (x${a.quantity})${status}`;
    }).join('\n');

    embed.addFields(
      { name: '🗡️ Items', value: itemsText || 'Kosong', inline: true },
      { name: '🐾 Pets', value: petsText || 'Kosong', inline: true },
      { name: '🏠 Assets', value: assetsText || 'Kosong', inline: false }
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
