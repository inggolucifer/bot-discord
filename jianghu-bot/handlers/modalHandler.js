const { EmbedBuilder, MessageFlags } = require('discord.js');
const { isAdmin } = require('../utils/permissions');
const Item = require('../models/Item');
const Pet = require('../models/Pet');
const Asset = require('../models/Asset');
const Player = require('../models/Player');
const WorkerContract = require('../models/WorkerContract');
const { logAdminAction, logTransaction } = require('../utils/logger');
const { syncRealmRole } = require('../utils/realmRole');
const { refreshWorkerChannel } = require('../services/workerChannelService');

const VALID_RANKS = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical'];
const VALID_CURRENCIES = ['silver', 'gold', 'jade', 'spirit'];

function normalizeRank(input) {
  const found = VALID_RANKS.find((r) => r.toLowerCase() === input.trim().toLowerCase());
  return found || null;
}
function parseRankTier(text) {
  const parts = text.trim().split(/\s+/);
  const tierRaw = parts[parts.length - 1];
  const tier = parseInt(tierRaw, 10);
  if (!Number.isInteger(tier) || tier < 1 || tier > 9) return { error: `Format salah. Gunakan "Rank Tier", contoh: "Epic 5". Tier harus angka 1-9.` };
  const rankRaw = parts.slice(0, -1).join(' ');
  const rank = normalizeRank(rankRaw);
  if (!rank) return { error: `Rank "${rankRaw}" tidak valid. Gunakan: ${VALID_RANKS.join(', ')}` };
  return { rank, tier };
}
function parseAmountCurrency(text) {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) return { error: 'Format salah. Gunakan "angka currency", contoh: "500 silver".' };
  const amount = parseInt(parts[0], 10);
  const currency = parts[1].toLowerCase();
  if (!Number.isInteger(amount) || amount < 0) return { error: 'Jumlah harus angka >= 0.' };
  if (!VALID_CURRENCIES.includes(currency)) return { error: `Currency "${parts[1]}" tidak valid. Gunakan: ${VALID_CURRENCIES.join(', ')}` };
  return { amount, currency };
}
function parseAmountCurrencyRank(text) {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) return { error: 'Format salah. Gunakan "angka currency [rank]", contoh: "500 silver Epic".' };
  const amount = parseInt(parts[0], 10);
  const currency = parts[1].toLowerCase();
  if (!Number.isInteger(amount) || amount < 0) return { error: 'Jumlah harus angka >= 0.' };
  if (!VALID_CURRENCIES.includes(currency)) return { error: `Currency "${parts[1]}" tidak valid. Gunakan: ${VALID_CURRENCIES.join(', ')}` };
  let rank = null;
  if (parts[2]) {
    rank = normalizeRank(parts.slice(2).join(' '));
    if (!rank) return { error: `Rank "${parts.slice(2).join(' ')}" tidak valid. Gunakan: ${VALID_RANKS.join(', ')} (atau kosongkan).` };
  }
  return { amount, currency, rank };
}
function parseRealm(text) {
  const realm = text.trim();
  if (!realm) return { error: 'Nama ranah tidak boleh kosong.' };
  return { realm };
}

async function handleModal(interaction) {
  const id = interaction.customId;

  // ---- Sewa Worker ----
  if (id.startsWith('modal_hire_worker_')) {
    const workerId = id.replace('modal_hire_worker_', '');
    const hoursInput = interaction.fields.getTextInputValue('hours').trim();
    const hours = parseInt(hoursInput, 10);

    if (!Number.isInteger(hours) || hours <= 0) return interaction.reply({ content: '❌ Durasi harus berupa angka bulat lebih dari 0.', flags: MessageFlags.Ephemeral });

    const employer = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId });
    if (!employer) return interaction.reply({ content: '❌ Kamu belum terdaftar.', flags: MessageFlags.Ephemeral });

    const contract = await WorkerContract.findOne({ guildId: interaction.guildId, workerId });
    if (!contract || contract.status !== 'available') return interaction.reply({ content: '❌ Worker ini sudah tidak tersedia atau sedang bekerja.', flags: MessageFlags.Ephemeral });

    if (hours > contract.maxDurationHours) return interaction.reply({ content: `❌ Worker ini hanya menawarkan maksimal ${contract.maxDurationHours} jam.`, flags: MessageFlags.Ephemeral });

    const totalCost = contract.pricePerHour * hours;
    if (employer.currency.silver < totalCost) return interaction.reply({ content: `❌ Uangmu tidak cukup. Biaya sewa adalah ${totalCost} Silver, saldomu ${employer.currency.silver} Silver.`, flags: MessageFlags.Ephemeral });

    employer.currency.silver -= totalCost;
    await employer.save();

    contract.status = 'working';
    contract.currentEmployerId = interaction.user.id;
    contract.workingSince = new Date();
    contract.workingUntil = new Date(Date.now() + (hours * 3600000));
    await contract.save();

    await refreshWorkerChannel(interaction.client, interaction.guildId);

    await logTransaction(interaction.client, {
      guildId: interaction.guildId, type: 'hire_worker', fromUserId: interaction.user.id, toUserId: workerId,
      currency: 'silver', amount: totalCost, itemDescription: `Menyewa worker selama ${hours} jam`
    });

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x27ae60).setTitle('✅ Worker Berhasil Disewa').setDescription(`Kamu menyewa **${contract.workerName}** selama ${hours} jam dengan biaya **${totalCost} Silver**.\n\nSekarang kamu bisa memasukkannya ke dalam asetmu lewat command \`/worker pindah\`.`)] });
  }

  // ---- Tambah Item ----
  if (id === 'modal_add_item') {
    if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
    const name = interaction.fields.getTextInputValue('name').trim();
    const description = interaction.fields.getTextInputValue('description').trim();
    let categoryInput = 'none';
    try { categoryInput = interaction.fields.getTextInputValue('category').trim().toLowerCase(); } catch (e) {}
    const allowedCategories = ['weapon', 'cloth', 'herb', 'pill', 'consume', 'material', 'artifact', 'accessories', 'none'];
    const category = allowedCategories.includes(categoryInput) ? categoryInput : 'none';

    const rt = parseRankTier(interaction.fields.getTextInputValue('rankTier'));
    if (rt.error) return interaction.reply({ content: `❌ ${rt.error}`, flags: MessageFlags.Ephemeral });
    const pc = parseAmountCurrency(interaction.fields.getTextInputValue('priceInfo'));
    if (pc.error) return interaction.reply({ content: `❌ ${pc.error}`, flags: MessageFlags.Ephemeral });

    const exists = await Item.findOne({ guildId: interaction.guildId, name: new RegExp(`^${name}$`, 'i') });
    if (exists) return interaction.reply({ content: `❌ Item dengan nama "${name}" sudah ada.`, flags: MessageFlags.Ephemeral });

    await Item.create({ guildId: interaction.guildId, name, rank: rt.rank, tier: rt.tier, description, category, basePrice: pc.amount, priceCurrency: pc.currency, createdBy: interaction.user.id });
    await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'ADD_ITEM', details: name });
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x27ae60).setTitle('✅ Item Ditambahkan').setDescription(`**${name}** (${rt.rank} T${rt.tier}) berhasil dibuat.\nHarga dasar: ${pc.amount} ${pc.currency}`)] });
  }

  // ---- Edit Item ----
  if (id.startsWith('modal_edit_item_')) {
    if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
    const itemId = id.replace('modal_edit_item_', '');
    const item = await Item.findById(itemId);
    if (!item) return interaction.reply({ content: '❌ Item tidak ditemukan (mungkin sudah dihapus).', flags: MessageFlags.Ephemeral });

    const name = interaction.fields.getTextInputValue('name').trim();
    const description = interaction.fields.getTextInputValue('description').trim();
    let categoryInput = 'none';
    try { categoryInput = interaction.fields.getTextInputValue('category').trim().toLowerCase(); } catch (e) {}
    const allowedCategories = ['weapon', 'cloth', 'herb', 'pill', 'consume', 'material', 'artifact', 'accessories', 'none'];
    const category = allowedCategories.includes(categoryInput) ? categoryInput : 'none';

    const rt = parseRankTier(interaction.fields.getTextInputValue('rankTier'));
    if (rt.error) return interaction.reply({ content: `❌ ${rt.error}`, flags: MessageFlags.Ephemeral });
    const pc = parseAmountCurrency(interaction.fields.getTextInputValue('priceInfo'));
    if (pc.error) return interaction.reply({ content: `❌ ${pc.error}`, flags: MessageFlags.Ephemeral });

    item.name = name; item.rank = rt.rank; item.tier = rt.tier; item.description = description; item.category = category; item.basePrice = pc.amount; item.priceCurrency = pc.currency;
    await item.save();
    await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'EDIT_ITEM', details: name });
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2980b9).setTitle('✅ Item Diperbarui').setDescription(`**${name}** berhasil diupdate.`)] });
  }

  // ---- Tambah Pet ----
  if (id === 'modal_add_pet') {
    if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
    const name = interaction.fields.getTextInputValue('name').trim();
    const description = interaction.fields.getTextInputValue('description').trim();
    let imageUrl = null;
    try { imageUrl = interaction.fields.getTextInputValue('imageUrl')?.trim() || null; } catch (e) {}
    const rt = parseRankTier(interaction.fields.getTextInputValue('rankTier'));
    if (rt.error) return interaction.reply({ content: `❌ ${rt.error}`, flags: MessageFlags.Ephemeral });
    const pc = parseAmountCurrency(interaction.fields.getTextInputValue('priceInfo'));
    if (pc.error) return interaction.reply({ content: `❌ ${pc.error}`, flags: MessageFlags.Ephemeral });

    const exists = await Pet.findOne({ guildId: interaction.guildId, name: new RegExp(`^${name}$`, 'i') });
    if (exists) return interaction.reply({ content: `❌ Pet dengan nama "${name}" sudah ada.`, flags: MessageFlags.Ephemeral });

    await Pet.create({ guildId: interaction.guildId, name, rank: rt.rank, tier: rt.tier, description, imageUrl, basePrice: pc.amount, priceCurrency: pc.currency, createdBy: interaction.user.id });
    await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'ADD_PET', details: name });
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x27ae60).setTitle('✅ Pet Ditambahkan').setDescription(`**${name}** (${rt.rank} T${rt.tier}) berhasil dibuat.\nHarga dasar: ${pc.amount} ${pc.currency}`)] });
  }

  // ---- Edit Pet ----
  if (id.startsWith('modal_edit_pet_')) {
    if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
    const petId = id.replace('modal_edit_pet_', '');
    const pet = await Pet.findById(petId);
    if (!pet) return interaction.reply({ content: '❌ Pet tidak ditemukan.', flags: MessageFlags.Ephemeral });

    const name = interaction.fields.getTextInputValue('name').trim();
    const description = interaction.fields.getTextInputValue('description').trim();
    let imageUrl = null;
    try { imageUrl = interaction.fields.getTextInputValue('imageUrl')?.trim() || null; } catch (e) {}
    const rt = parseRankTier(interaction.fields.getTextInputValue('rankTier'));
    if (rt.error) return interaction.reply({ content: `❌ ${rt.error}`, flags: MessageFlags.Ephemeral });
    const pc = parseAmountCurrency(interaction.fields.getTextInputValue('priceInfo'));
    if (pc.error) return interaction.reply({ content: `❌ ${pc.error}`, flags: MessageFlags.Ephemeral });

    pet.name = name; pet.rank = rt.rank; pet.tier = rt.tier; pet.description = description; pet.imageUrl = imageUrl; pet.basePrice = pc.amount; pet.priceCurrency = pc.currency;
    await pet.save();
    await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'EDIT_PET', details: name });
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2980b9).setTitle('✅ Pet Diperbarui').setDescription(`**${name}** berhasil diupdate.`)] });
  }

  // ---- Edit Pet Stats ----
  if (id.startsWith('modal_edit_pet_stats_')) {
    if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
    const petId = id.replace('modal_edit_pet_stats_', '');
    const pet = await Pet.findById(petId);
    if (!pet) return interaction.reply({ content: '❌ Pet tidak ditemukan.', flags: MessageFlags.Ephemeral });

    const baseStatsRaw = interaction.fields.getTextInputValue('baseStats').trim().split(',');
    if (baseStatsRaw.length !== 4) return interaction.reply({ content: '❌ Format Base Stats salah (HP,ATK,DEF,SPD).', flags: MessageFlags.Ephemeral });

    const baseHp = parseInt(baseStatsRaw[0]);
    const baseAtk = parseInt(baseStatsRaw[1]);
    const baseDef = parseInt(baseStatsRaw[2]);
    const baseSpd = parseInt(baseStatsRaw[3]);
    if (isNaN(baseHp) || isNaN(baseAtk) || isNaN(baseDef) || isNaN(baseSpd)) return interaction.reply({ content: '❌ Base Stats harus berupa angka.', flags: MessageFlags.Ephemeral });

    const element = interaction.fields.getTextInputValue('element').trim();
    const validElements = ['Api', 'Air', 'Tanah', 'Angin', 'Petir', 'Cahaya', 'Kegelapan', 'Netral'];
    if (!validElements.includes(element)) return interaction.reply({ content: '❌ Elemen tidak valid.', flags: MessageFlags.Ephemeral });

    const growthRate = parseFloat(interaction.fields.getTextInputValue('growthRate').trim());
    if (isNaN(growthRate) || growthRate < 0.1 || growthRate > 5.0) return interaction.reply({ content: '❌ Growth Rate tidak valid.', flags: MessageFlags.Ephemeral });

    const maxLevel = parseInt(interaction.fields.getTextInputValue('maxLevel').trim());
    if (isNaN(maxLevel) || maxLevel < 1 || maxLevel > 200) return interaction.reply({ content: '❌ Max Level tidak valid.', flags: MessageFlags.Ephemeral });

    pet.baseHp = baseHp; pet.baseAtk = baseAtk; pet.baseDef = baseDef; pet.baseSpd = baseSpd; pet.element = element; pet.growthRate = growthRate; pet.maxLevel = maxLevel;
    await pet.save();
    await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'EDIT_PET_STATS', details: pet.name });
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2980b9).setTitle('✅ Stats Pet Diperbarui').setDescription(`Atribut untuk **${pet.name}** berhasil diupdate.`)] });
  }

  // ---- Tambah Asset ----
  if (id === 'modal_add_asset') {
    if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
    const name = interaction.fields.getTextInputValue('name').trim();
    const description = interaction.fields.getTextInputValue('description').trim();
    let imageUrl = null;
    try { imageUrl = interaction.fields.getTextInputValue('imageUrl')?.trim() || null; } catch (e) {}
    const profit = parseAmountCurrency(interaction.fields.getTextInputValue('profitInfo'));
    if (profit.error) return interaction.reply({ content: `❌ ${profit.error}`, flags: MessageFlags.Ephemeral });
    const price = parseAmountCurrencyRank(interaction.fields.getTextInputValue('priceInfo'));
    if (price.error) return interaction.reply({ content: `❌ ${price.error}`, flags: MessageFlags.Ephemeral });

    const exists = await Asset.findOne({ guildId: interaction.guildId, name: new RegExp(`^${name}$`, 'i') });
    if (exists) return interaction.reply({ content: `❌ Aset dengan nama "${name}" sudah ada.`, flags: MessageFlags.Ephemeral });

    await Asset.create({ guildId: interaction.guildId, name, description, imageUrl, dailyProfit: profit.amount, profitCurrency: profit.currency, basePrice: price.amount, priceCurrency: price.currency, rank: price.rank, createdBy: interaction.user.id });
    await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'ADD_ASSET', details: name });
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x27ae60).setTitle('✅ Aset Dibuat').setDescription(`**${name}** berhasil dibuat dengan profit harian ${profit.amount} ${profit.currency}, harga beli ${price.amount} ${price.currency}.`)] });
  }

  // ---- Edit Asset ----
  if (id.startsWith('modal_edit_asset_')) {
    if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
    const assetId = id.replace('modal_edit_asset_', '');
    const asset = await Asset.findById(assetId);
    if (!asset) return interaction.reply({ content: '❌ Aset tidak ditemukan.', flags: MessageFlags.Ephemeral });

    const name = interaction.fields.getTextInputValue('name').trim();
    const description = interaction.fields.getTextInputValue('description').trim();
    let imageUrl = null;
    try { imageUrl = interaction.fields.getTextInputValue('imageUrl')?.trim() || null; } catch (e) {}
    const profit = parseAmountCurrency(interaction.fields.getTextInputValue('profitInfo'));
    if (profit.error) return interaction.reply({ content: `❌ ${profit.error}`, flags: MessageFlags.Ephemeral });
    const price = parseAmountCurrencyRank(interaction.fields.getTextInputValue('priceInfo'));
    if (price.error) return interaction.reply({ content: `❌ ${price.error}`, flags: MessageFlags.Ephemeral });

    asset.name = name; asset.description = description; asset.imageUrl = imageUrl; asset.dailyProfit = profit.amount; asset.profitCurrency = profit.currency; asset.basePrice = price.amount; asset.priceCurrency = price.currency; asset.rank = price.rank;
    await asset.save();
    await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'EDIT_ASSET', details: name });
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2980b9).setTitle('✅ Aset Diperbarui').setDescription(`**${name}** berhasil diupdate.`)] });
  }

  // ---- Edit Player ----
  if (id.startsWith('modal_edit_player_')) {
    if (!(await isAdmin(interaction))) return interaction.reply({ content: '❌ Kamu bukan admin.', flags: MessageFlags.Ephemeral });
    const discordId = id.replace('modal_edit_player_', '');
    const player = await Player.findOne({ discordId, guildId: interaction.guildId });
    if (!player) return interaction.reply({ content: '❌ Player tidak ditemukan.', flags: MessageFlags.Ephemeral });

    const rt = parseRealm(interaction.fields.getTextInputValue('realm'));
    if (rt.error) return interaction.reply({ content: `❌ ${rt.error}`, flags: MessageFlags.Ephemeral });

    let stage = '-';
    try { stage = interaction.fields.getTextInputValue('stage')?.trim() || '-'; } catch (e) {}
    const ageRaw = interaction.fields.getTextInputValue('age').trim();
    let genderRaw = '';
    try { genderRaw = interaction.fields.getTextInputValue('gender')?.trim() || ''; } catch (e) {}
    let characterImage = null;
    try { characterImage = interaction.fields.getTextInputValue('characterImage')?.trim() || null; } catch (e) {}

    const age = parseInt(ageRaw, 10);
    if (!Number.isInteger(age) || age < 0) return interaction.reply({ content: '❌ Umur harus angka valid.', flags: MessageFlags.Ephemeral });

    let gender = player.gender;
    if (genderRaw) {
      const normalized = ['Laki-laki', 'Perempuan'].find((g) => g.toLowerCase() === genderRaw.toLowerCase());
      if (!normalized) return interaction.reply({ content: '❌ Jenis kelamin harus "Laki-laki" atau "Perempuan" (atau kosongkan untuk tidak diubah).', flags: MessageFlags.Ephemeral });
      gender = normalized;
    }

    player.realm = rt.realm; player.stage = stage; player.age = age; player.gender = gender; player.characterImage = characterImage;
    await player.save();
    await logAdminAction(interaction.client, { guildId: interaction.guildId, adminId: interaction.user.id, action: 'EDIT_PLAYER', targetUserId: discordId, details: `Ranah: ${rt.realm}, Umur: ${age}` });

    syncRealmRole(interaction.client, interaction.guildId, discordId, rt.realm).catch((e) => console.error('[REALM-ROLE] Gagal sync:', e.message));
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x2980b9).setTitle('✅ Data Player Diperbarui').setDescription(`Profil **${player.characterName}** berhasil diupdate.`)] });
  }
}

module.exports = { handleModal };
