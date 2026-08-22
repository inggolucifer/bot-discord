const { EmbedBuilder } = require('discord.js');
const { CURRENCY_EMOJI, CURRENCY_LABEL, formatCurrencyLine } = require('./currency');
const { getRankStyle, dramaticTitle } = require('./dramatic');
const { isUnderConstruction, formatRemainingTime } = require('./crafting');
const { calculateProgress } = require('./assetProgress');

function buildPlayerProfileEmbed(player, discordUser, itemDocs = [], petDocs = [], assetDocs = [], sectRole = null) {
  const embed = new EmbedBuilder()
    .setColor(0x8e5b3c)
    .setTitle(`📜 Profil: ${player.characterName}`)
    .setThumbnail(discordUser?.displayAvatarURL?.() || null)
    .addFields(
      { name: '⚔️ Ranah', value: `${player.realm}${player.stage && player.stage !== '-' ? ` — ${player.stage}` : ''}`, inline: true },
      { name: '🎂 Umur', value: `${player.age} tahun`, inline: true },
      { name: '⚧ Jenis Kelamin', value: player.gender || '_(belum diisi)_', inline: true },
      { name: '🏯 Sekte/Afiliasi', value: sectRole ? `${player.sect} (${sectRole})` : player.sect, inline: true },
      { name: '📌 Status', value: player.customStatus ? player.customStatus : (player.status === 'active' ? '✅ Aktif' : player.status === 'frozen' ? '🥶 Dibekukan' : '☠️ Meninggal'), inline: true },
      { name: '💰 Currency', value: `${formatCurrencyLine(player.currency)}\n\n**Currency Total**: 🪙 **${player.totalWealth}**` },
    );

  if (player.characterImage) embed.setImage(player.characterImage);

  const invLine = itemDocs.length
    ? itemDocs.map((it) => {
        const s = getRankStyle(it.doc.rank);
        return `${s.emoji} **${it.doc.name}** _(${s.label} T${it.doc.tier})_ x${it.quantity}`;
      }).join('\n')
    : '_Kosong_';
  embed.addFields({ name: '🎒 Inventory', value: invLine.slice(0, 1024) });

  const currentTotalAssets = player.assets.reduce((sum, a) => sum + (a.quantity || 1), 0);
  const assetSlots = player.assetSlots || 1;
  const assetLine = assetDocs.length
    ? assetDocs.map((a) => {
        const underConstruction = isUnderConstruction(a.owned);
        if (underConstruction) {
          return `🏠 **${a.doc.name}** x${a.quantity} 🚧 _(dibangun, ${formatRemainingTime(a.owned.constructionCompleteAt)})_`;
        }

        const progressMs = (a.owned.progressAccumulated || 0) + calculateProgress(a.owned);
        const timeRemaining = 3600000 - (progressMs % 3600000);
        const timeStr = formatRemainingTime(Date.now() + timeRemaining);

        let status = '⏱️';
        if (a.owned.isHalted) {
          status = '⏸️ _(kurang material)_';
        } else {
          let hasActiveWorker = false;
          if (a.owned.assignedWorkers && a.owned.assignedWorkers.length > 0) {
            hasActiveWorker = a.owned.assignedWorkers.some(w => !w.endTime || w.endTime.getTime() > Date.now());
          }
          if (!a.doc.isCraftingStation && !hasActiveWorker) {
            status = '⏸️ _(butuh pekerja)_';
          }
        }

        return `🏠 **${a.doc.name}** x${a.quantity} ${status} _(${timeStr} ke profit)_`;
      }).join('\n')
    : '_Belum punya aset_';
  embed.addFields({ name: `🏠 Asset (${currentTotalAssets}/${assetSlots} Slot Lahan)`, value: assetLine.slice(0, 1024) });

  const petLine = petDocs.length
    ? petDocs.map((p) => {
        const s = getRankStyle(p.doc.rank);
        return `${s.emoji} **${p.nickname || p.doc.name}** _(${p.doc.name}, ${s.label} T${p.doc.tier})_`;
      }).join('\n')
    : '_Belum punya pet_';
  embed.addFields({ name: '🐾 Pet', value: petLine.slice(0, 1024) });

  embed.setFooter({ text: `Terdaftar sejak ${new Date(player.registeredAt).toLocaleDateString('id-ID')}` });
  return embed;
}

function buildItemEmbed(item, sourceData = null, usageData = null) {
  const style = getRankStyle(item.rank);
  const embed = new EmbedBuilder()
    .setColor(style.color)
    .setTitle(dramaticTitle(item.name, item.rank))
    .addFields(
      { name: 'Rank', value: `${style.emoji} **${style.label}** ${style.stars}`, inline: true },
      { name: 'Tier', value: `${item.tier}`, inline: true },
    )
    .setDescription(`${item.description || '-'}\n\n_${style.flourish}_`);
  if (item.effect) embed.addFields({ name: 'Efek', value: item.effect });
  if (item.origin) embed.addFields({ name: 'Asal-usul', value: item.origin });
  if (item.basePrice > 0) {
    embed.addFields({ name: '💰 Harga Dasar', value: `${CURRENCY_EMOJI[item.priceCurrency]} ${item.basePrice} ${CURRENCY_LABEL[item.priceCurrency]}`, inline: true });
  }

  if (sourceData) {
    let sourceText = '';

    if (sourceData.shop) {
      sourceText += `🛒 **Shop**: Dijual seharga ${CURRENCY_EMOJI[sourceData.shop.priceCurrency]} ${sourceData.shop.price} ${CURRENCY_LABEL[sourceData.shop.priceCurrency]}\n`;
    }

    if (sourceData.assets && sourceData.assets.length > 0) {
      const assetNames = sourceData.assets.map(a => `🏠 ${a.name}`).join(', ');
      sourceText += `🔨 **Asset**: ${assetNames}\n`;
    }

    if (!sourceText) {
      sourceText = '❓ _Tidak ditemukan sumber yang diketahui (Mungkin drop khusus atau event)_';
    }


    embed.addFields({ name: '📍 Cara Mendapatkan', value: sourceText.substring(0, 1024) });
  }

  if (usageData) {
    let usageText = '';

    if (usageData.asMaterial && usageData.asMaterial.length > 0) {
      const craftedItems = new Set();
      usageData.asMaterial.forEach(asset => {
        asset.recipes.forEach(recipe => {
          if (recipe.materials.some(m => m.itemId.toString() === item._id.toString())) {
            craftedItems.add(recipe.resultItemName);
          }
        });
      });
      if (craftedItems.size > 0) {
        usageText += `⚒️ **Crafting**: ${Array.from(craftedItems).join(', ')}\n`;
      }
    }

    if (usageData.toBuild && usageData.toBuild.length > 0) {
      const builtAssets = usageData.toBuild.map(a => a.name);
      usageText += `🏗️ **Bahan Bangunan**: ${builtAssets.join(', ')}\n`;
    }

    if (usageData.asInput && usageData.asInput.length > 0) {
      const inputAssets = usageData.asInput.map(a => a.name);
      usageText += `⚙️ **Operasional Asset**: ${inputAssets.join(', ')}\n`;
    }

    if (usageText) {
      embed.addFields({ name: '🛠️ Berguna Untuk', value: usageText.substring(0, 1024) });
    }
  }

  if (item.imageUrl) embed.setImage(item.imageUrl);

  return embed;
}

function buildPetEmbed(pet) {
  const style = getRankStyle(pet.rank);
  const embed = new EmbedBuilder()
    .setColor(style.color)
    .setTitle(dramaticTitle(pet.name, pet.rank))
    .addFields(
      { name: 'Rank', value: `${style.emoji} **${style.label}** ${style.stars}`, inline: true },
      { name: 'Tier', value: `${pet.tier}`, inline: true },
    )
    .setDescription(`${pet.description || '-'}\n\n_${style.flourish}_`);
  if (pet.effect) embed.addFields({ name: 'Efek', value: pet.effect });
  if (pet.origin) embed.addFields({ name: 'Asal-usul', value: pet.origin });
  if (pet.basePrice > 0) {
    embed.addFields({ name: '💰 Harga Dasar', value: `${CURRENCY_EMOJI[pet.priceCurrency]} ${pet.basePrice} ${CURRENCY_LABEL[pet.priceCurrency]}`, inline: true });
  }
  if (pet.imageUrl) embed.setImage(pet.imageUrl);
  return embed;
}

function buildAssetEmbed(asset) {
  const style = asset.rank ? getRankStyle(asset.rank) : null;
  const embed = new EmbedBuilder()
    .setColor(style ? style.color : 0x27ae60)
    .setTitle(style ? dramaticTitle(asset.name, asset.rank) : `🏠 ${asset.name}`)
    .setDescription(`${asset.description || '-'}${style ? `\n\n_${style.flourish}_` : ''}`);

  if (asset.dailyProfit > 0) {
    embed.addFields({ name: '💰 Profit Harian', value: `${CURRENCY_EMOJI[asset.profitCurrency]} ${asset.dailyProfit} ${CURRENCY_LABEL[asset.profitCurrency]}`, inline: true });
  }
  if (asset.workerOutputItemId && asset.workerOutputQuantity > 0) {
    embed.addFields({ name: '⛏️ Hasil Pekerja Harian', value: `${asset.workerOutputQuantity}x ${asset.workerOutputItemName}`, inline: true });
  }
  if (style) embed.addFields({ name: 'Rank', value: `${style.emoji} **${style.label}** ${style.stars}`, inline: true });
  if (asset.basePrice > 0) {
    embed.addFields({ name: '🛒 Harga Beli (Shop)', value: `${CURRENCY_EMOJI[asset.priceCurrency]} ${asset.basePrice} ${CURRENCY_LABEL[asset.priceCurrency]}`, inline: true });
  }
  if (asset.constructionTimeHours > 0) {
    embed.addFields({ name: '🚧 Waktu Pembangunan', value: `${asset.constructionTimeHours} jam`, inline: true });
  }
  if (asset.buildable && asset.buildRequirements?.length) {
    const buildMats = asset.buildRequirements.map((m) => `${m.quantity}x ${m.itemName}`).join(', ');
    embed.addFields({ name: '🔨 Bisa Dibangun Mandiri', value: `Butuh: ${buildMats}\nGunakan \`/bangun-asset\` atau \`/sekte-bangun-asset\`.` });
  }
  if (asset.isCraftingStation && asset.recipes.length) {
    const recipeLines = asset.recipes.map((r) => {
      const mats = r.materials.map((m) => `${m.quantity}x ${m.itemName}`).join(', ');
      return `**${r.recipeName}** → ${r.resultQuantity}x ${r.resultItemName} _(butuh: ${mats})_`;
    });
    embed.addFields({ name: '⚒️ Resep yang Bisa Dibuat', value: recipeLines.join('\n').slice(0, 1024) });
  }
  if (asset.imageUrl) embed.setImage(asset.imageUrl);
  return embed;
}

function buildTournamentEmbed(tournament) {
  const embed = new EmbedBuilder()
    .setColor(tournament.status === 'finished' ? 0xf1c40f : tournament.status === 'cancelled' ? 0x7f8c8d : 0x9b59b6)
    .setTitle(`🏆 Turnamen: ${tournament.name}`);

  if (tournament.status === 'registration') {
    const list = tournament.participants.length
      ? tournament.participants.map((p, i) => `${i + 1}. **${p.characterName}**`).join('\n')
      : '_Belum ada peserta_';
    embed.setDescription(`📋 **Status: Pendaftaran Dibuka**\n\nPeserta terdaftar (${tournament.participants.length}):\n${list}`);
    return embed;
  }

  if (tournament.status === 'cancelled') {
    embed.setDescription('❌ Turnamen ini telah dibatalkan.');
    return embed;
  }

  if (tournament.status === 'finished') {
    embed.setDescription(`🎉🏆 **JUARA: ${tournament.winnerName}** 🏆🎉\n\nSelamat kepada sang juara! Namanya akan dikenang di seluruh penjuru Jianghu!`);
  } else {
    embed.setDescription('⚔️ **Status: Sedang Berlangsung**');
  }

  for (const round of tournament.rounds) {
    const lines = round.matches.map((m) => {
      const p1 = m.player1Name || '_(kosong)_';
      const p2 = m.player2Name || '_BYE (otomatis lolos)_';
      if (m.status === 'completed') {
        const winnerName = m.winnerId === m.player1Id ? m.player1Name : m.player2Name;
        return `Match ${m.matchNumber}: ~~${m.player2Id ? `${p1} vs ${p2}` : p1}~~ → 🏅 **${winnerName}**`;
      }
      return `Match ${m.matchNumber}: **${p1}** 🆚 **${p2}** _(belum ada hasil)_`;
    });
    embed.addFields({ name: `📌 ${round.roundLabel}`, value: lines.join('\n').slice(0, 1024) });
  }

  return embed;
}

function buildSectEmbed(sect, resourceDocs = [], assetDocs = []) {
  const embed = new EmbedBuilder()
    .setColor(0x2c3e50)
    .setTitle(`🏯 Sekte: ${sect.name}`)
    .setDescription(sect.description || '-');

  if (sect.imageUrl) embed.setImage(sect.imageUrl);

  embed.addFields(
    { name: '👑 Ketua', value: sect.leaderId ? `<@${sect.leaderId}>` : '_(kosong)_', inline: true },
    { name: '🎖️ Wakil Ketua', value: sect.viceLeaderId ? `<@${sect.viceLeaderId}>` : '_(kosong)_', inline: true },
    { name: '💰 Kekayaan Sekte', value: formatCurrencyLine(sect.currency), inline: true },
    { name: '📿 Tetua', value: sect.elderIds.length ? sect.elderIds.map((id) => `<@${id}>`).join(', ') : '_(kosong)_' },
    { name: `👥 Anggota (${sect.memberIds.length})`, value: sect.memberIds.length ? sect.memberIds.map((id) => `<@${id}>`).join(', ').slice(0, 1000) : '_(kosong)_' },
  );

  const resourceLine = resourceDocs.length
    ? resourceDocs.map((r) => `• **${r.doc.name}** x${r.quantity}`).join('\n')
    : '_Belum ada sumber daya_';
  embed.addFields({ name: '📦 Sumber Daya Sekte', value: resourceLine.slice(0, 1024) });

  const assetLine = assetDocs.length
    ? assetDocs.map((a) => {
        const underConstruction = isUnderConstruction(a.owned);
        return `🏠 **${a.doc.name}** x${a.quantity}${underConstruction ? ` 🚧 _(dibangun, ${formatRemainingTime(a.owned.constructionCompleteAt)})_` : ''}`;
      }).join('\n')
    : '_Belum ada aset sekte_';
  embed.addFields({ name: '🏛️ Aset Sekte', value: assetLine.slice(0, 1024) });

  return embed;
}

module.exports = { buildPlayerProfileEmbed, buildItemEmbed, buildPetEmbed, buildAssetEmbed, buildTournamentEmbed, buildSectEmbed };

