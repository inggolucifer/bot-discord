const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const Item = require('../../models/Item');
const PetBattle = require('../../models/PetBattle');
const { getExpRequired, addExp, parsePetItemEffect, simulateRound } = require('../../services/petService');
const { buildPetEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pet')
    .setDescription('Sistem Pet RPG Jianghu')
    .addSubcommand(sub => sub.setName('list').setDescription('Lihat daftar pet milikmu'))
    .addSubcommand(sub =>
      sub.setName('status')
      .setDescription('Lihat status detail pet')
      .addStringOption(opt => opt.setName('pet').setDescription('Pilih pet (nama/nickname)').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(sub =>
      sub.setName('feed')
      .setDescription('Beri makan pet untuk menambah EXP & Hunger')
      .addStringOption(opt => opt.setName('pet').setDescription('Pilih pet').setRequired(true).setAutocomplete(true))
      .addStringOption(opt => opt.setName('item').setDescription('Item makanan').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(sub =>
      sub.setName('heal')
      .setDescription('Sembuhkan HP pet dengan potion')
      .addStringOption(opt => opt.setName('pet').setDescription('Pilih pet').setRequired(true).setAutocomplete(true))
      .addStringOption(opt => opt.setName('item').setDescription('Item potion').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(sub =>
      sub.setName('rename')
      .setDescription('Ganti nickname pet')
      .addStringOption(opt => opt.setName('pet').setDescription('Pilih pet').setRequired(true).setAutocomplete(true))
      .addStringOption(opt => opt.setName('nama_baru').setDescription('Nickname baru (maks 16 karakter)').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('release')
      .setDescription('Lepaskan pet (permanen)')
      .addStringOption(opt => opt.setName('pet').setDescription('Pilih pet').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(sub =>
      sub.setName('battle')
      .setDescription('Tantang player lain duel pet')
      .addUserOption(opt => opt.setName('lawan').setDescription('Pemain lawan').setRequired(true))
      .addStringOption(opt => opt.setName('pet_kamu').setDescription('Pilih pet jagoanmu').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(sub => sub.setName('leaderboard').setDescription('Lihat top 10 pet terkuat di server')),

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === 'pet' || focusedOption.name === 'pet_kamu') {
      const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId }).populate('pets.petId');
      if (!player) return interaction.respond([]);

      const choices = player.pets.map(p => ({
        name: `${p.nickname || p.petId.name} (Lv.${p.level})`,
        value: p.instanceId
      }));

      const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedOption.value.toLowerCase())).slice(0, 25);
      return interaction.respond(filtered);
    }

    if (focusedOption.name === 'item') {
      const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId }).populate('inventory.itemId');
      if (!player) return interaction.respond([]);

      const typeFilter = sub === 'feed' ? 'pet_food' : 'pet_heal';

      const choices = player.inventory
        .filter(inv => {
           if (!inv.itemId || !inv.itemId.effect) return false;
           const parsed = parsePetItemEffect(inv.itemId.effect);
           return parsed && parsed.type === typeFilter;
        })
        .map(inv => ({ name: `${inv.itemId.name} (x${inv.quantity})`, value: inv.itemId._id.toString() }));

      const filtered = choices.filter(c => c.name.toLowerCase().includes(focusedOption.value.toLowerCase())).slice(0, 25);
      return interaction.respond(filtered);
    }
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'leaderboard') {
      await interaction.deferReply();
      const players = await Player.find({ guildId: interaction.guildId }).populate('pets.petId');

      let allPets = [];
      players.forEach(p => {
        p.pets.forEach(petInst => {
          allPets.push({ owner: p.characterName, pet: petInst });
        });
      });

      allPets.sort((a, b) => b.pet.level - a.pet.level || b.pet.wins - a.pet.wins);
      const topPets = allPets.slice(0, 10);

      if (!topPets.length) return interaction.editReply({ content: 'Belum ada pet di server ini.' });

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🏆 Top 10 Pet Terkuat di Server')
        .setDescription(topPets.map((x, i) => {
           const p = x.pet;
           return `**#${i+1}** ${p.nickname || p.petId.name} (Lv.${p.level}) - ⚔️ ${p.wins} Wins | Owner: **${x.owner}**`;
        }).join('\n'));

      return interaction.editReply({ embeds: [embed] });
    }

    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId }).populate('pets.petId');
    if (!player) return interaction.reply({ content: '❌ Kamu belum terdaftar.', ephemeral: true });

    if (sub === 'list') {
      if (!player.pets.length) return interaction.reply({ content: '❌ Kamu belum memiliki pet.', ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🐾 Daftar Pet Milikmu')
        .setDescription(player.pets.map((p, i) => {
          const name = p.nickname ? `${p.nickname} (${p.petId.name})` : p.petId.name;
          return `**${i+1}. ${name}** — Lv.${p.level} | ❤️ HP: ${p.hp}/${p.maxHp} | ⚔️ ${p.atk} 🛡️ ${p.def}`;
        }).join('\n'));

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const instanceId = interaction.options.getString('pet');
      const pet = player.pets.find(p => p.instanceId === instanceId);
      if (!pet) return interaction.reply({ content: '❌ Pet tidak ditemukan.', ephemeral: true });

      const expReq = getExpRequired(pet.level);
      const expPercent = Math.min(100, Math.floor((pet.exp / expReq) * 100));
      const expBar = '█'.repeat(Math.floor(expPercent/10)) + '░'.repeat(10 - Math.floor(expPercent/10));

      const hpPercent = Math.min(100, Math.floor((pet.hp / pet.maxHp) * 100));
      const hpBar = '█'.repeat(Math.floor(hpPercent/10)) + '░'.repeat(10 - Math.floor(hpPercent/10));

      const hungerPercent = pet.hunger;
      const hungerBar = '█'.repeat(Math.floor(hungerPercent/10)) + '░'.repeat(10 - Math.floor(hungerPercent/10));

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`📊 Status: ${pet.nickname || pet.petId.name}`)
        .addFields(
          { name: '🌟 Level & Element', value: `Lv. ${pet.level} | 🔮 ${pet.element}`, inline: true },
          { name: '⚔️ Battle Stats', value: `ATK: ${pet.atk} | DEF: ${pet.def} | SPD: ${pet.spd}`, inline: true },
          { name: '🏆 Record', value: `Wins: ${pet.wins} | Losses: ${pet.losses}`, inline: true },
          { name: '❤️ HP', value: `${hpBar} ${pet.hp}/${pet.maxHp} (${hpPercent}%)`, inline: false },
          { name: '🍖 Hunger', value: `${hungerBar} ${pet.hunger}/100`, inline: false },
          { name: '✨ EXP', value: `${expBar} ${pet.exp}/${expReq} (${expPercent}%)`, inline: false },
        );

      if (pet.petId.imageUrl) embed.setThumbnail(pet.petId.imageUrl);
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'rename') {
      const instanceId = interaction.options.getString('pet');
      const newName = interaction.options.getString('nama_baru').trim();

      if (newName.length > 16) return interaction.reply({ content: '❌ Nickname maksimal 16 karakter.', ephemeral: true });

      const petIndex = player.pets.findIndex(p => p.instanceId === instanceId);
      if (petIndex === -1) return interaction.reply({ content: '❌ Pet tidak ditemukan.', ephemeral: true });

      player.pets[petIndex].nickname = newName;
      await player.save();

      return interaction.reply({ content: `✅ Nickname pet berhasil diubah menjadi **${newName}**.` });
    }

    if (sub === 'release') {
      const instanceId = interaction.options.getString('pet');
      const pet = player.pets.find(p => p.instanceId === instanceId);
      if (!pet) return interaction.reply({ content: '❌ Pet tidak ditemukan.', ephemeral: true });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`release_confirm_${instanceId}`).setLabel('Ya, Lepaskan!').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`release_cancel_${instanceId}`).setLabel('Batal').setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({
        content: `⚠️ Apakah kamu yakin ingin melepaskan **${pet.nickname || pet.petId.name}** selamanya? Tindakan ini tidak bisa dibatalkan!`,
        components: [row]
      });
    }

    if (sub === 'feed' || sub === 'heal') {
      const instanceId = interaction.options.getString('pet');
      const itemId = interaction.options.getString('item');

      const petIndex = player.pets.findIndex(p => p.instanceId === instanceId);
      if (petIndex === -1) return interaction.reply({ content: '❌ Pet tidak ditemukan.', ephemeral: true });

      const invIndex = player.inventory.findIndex(i => i.itemId.toString() === itemId);
      if (invIndex === -1) return interaction.reply({ content: '❌ Kamu tidak memiliki item tersebut.', ephemeral: true });

      const itemDoc = await Item.findById(itemId);
      if (!itemDoc || !itemDoc.effect) return interaction.reply({ content: '❌ Item tidak memiliki efek pet.', ephemeral: true });

      const effect = parsePetItemEffect(itemDoc.effect);
      if (!effect) return interaction.reply({ content: '❌ Efek item tidak valid.', ephemeral: true });

      if (sub === 'feed' && effect.type !== 'pet_food') return interaction.reply({ content: '❌ Ini bukan makanan pet.', ephemeral: true });
      if (sub === 'heal' && effect.type !== 'pet_heal') return interaction.reply({ content: '❌ Ini bukan potion pet.', ephemeral: true });

      const pet = player.pets[petIndex];
      let msg = '';

      if (sub === 'feed') {
        const expAdd = parseInt(effect.params.exp) || 0;
        const hungerAdd = parseInt(effect.params.hunger) || 0;

        pet.hunger = Math.min(100, pet.hunger + hungerAdd);
        pet.affinity = Math.min(100, pet.affinity + 1);
        pet.lastFedAt = new Date();

        const levelUpMsgs = addExp(pet, expAdd, pet.petId);

        msg = `Kamu memberi makan **${pet.nickname || pet.petId.name}** dengan **${itemDoc.name}**.\n🍖 Hunger bertambah ${hungerAdd}.\n✨ EXP bertambah ${expAdd}.`;
        if (levelUpMsgs.length > 0) {
          msg += `\n\n🎉 **LEVEL UP!**\n` + levelUpMsgs.join('\n');
        }
      } else if (sub === 'heal') {
        const isFull = effect.params.full === 'true';
        const healAmt = parseInt(effect.params.amount) || 0;

        if (pet.hp >= pet.maxHp) return interaction.reply({ content: '❌ HP Pet sudah penuh.', ephemeral: true });

        if (isFull) {
          pet.hp = pet.maxHp;
          msg = `Kamu menggunakan **${itemDoc.name}** pada **${pet.nickname || pet.petId.name}**.\n❤️ HP pulih sepenuhnya!`;
        } else {
          pet.hp = Math.min(pet.maxHp, pet.hp + healAmt);
          msg = `Kamu menggunakan **${itemDoc.name}** pada **${pet.nickname || pet.petId.name}**.\n❤️ HP bertambah ${healAmt}.`;
        }
      }

      player.inventory[invIndex].quantity -= 1;
      if (player.inventory[invIndex].quantity <= 0) player.inventory.splice(invIndex, 1);

      player.markModified('pets');
      await player.save();

      return interaction.reply({ content: msg });
    }

    if (sub === 'battle') {
      const lawan = interaction.options.getUser('lawan');
      const petKamuId = interaction.options.getString('pet_kamu');

      if (lawan.id === interaction.user.id) return interaction.reply({ content: '❌ Kamu tidak bisa menantang dirimu sendiri.', ephemeral: true });
      if (lawan.bot) return interaction.reply({ content: '❌ Kamu tidak bisa menantang bot.', ephemeral: true });

      const p1Pet = player.pets.find(p => p.instanceId === petKamuId);
      if (!p1Pet) return interaction.reply({ content: '❌ Pet tidak ditemukan.', ephemeral: true });
      if (p1Pet.isLocked) return interaction.reply({ content: '❌ Pet ini sedang dalam battle lain.', ephemeral: true });
      if (p1Pet.hunger < 20) return interaction.reply({ content: '❌ Pet ini terlalu lapar untuk bertarung (Hunger < 20).', ephemeral: true });
      if (p1Pet.hp < p1Pet.maxHp * 0.3) return interaction.reply({ content: '❌ HP Pet terlalu rendah untuk bertarung (< 30%).', ephemeral: true });

      const cooldownPet = 5 * 60 * 1000;
      if (p1Pet.lastBattledAt && (Date.now() - p1Pet.lastBattledAt.getTime() < cooldownPet)) {
        return interaction.reply({ content: '❌ Pet ini masih kelelahan, tunggu beberapa saat lagi.', ephemeral: true });
      }

      const lawanData = await Player.findOne({ discordId: lawan.id, guildId: interaction.guildId }).populate('pets.petId');
      if (!lawanData) return interaction.reply({ content: '❌ Lawan belum terdaftar.', ephemeral: true });

      const validLawanPets = lawanData.pets.filter(p => !p.isLocked && p.hunger >= 20 && p.hp >= (p.maxHp * 0.3));
      if (!validLawanPets.length) return interaction.reply({ content: '❌ Lawan tidak memiliki pet yang siap bertarung.', ephemeral: true });

      // Tanya lawan untuk pilih pet
      const options = validLawanPets.map(p => ({
        label: `${p.nickname || p.petId.name} (Lv.${p.level})`,
        description: `HP: ${p.hp}/${p.maxHp} | ATK: ${p.atk} | DEF: ${p.def}`,
        value: p.instanceId
      })).slice(0, 25);

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_pet_battle')
        .setPlaceholder('Pilih pet untuk bertarung...')
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const battleRecord = await PetBattle.create({
        guildId: interaction.guildId,
        challengerId: interaction.user.id,
        opponentId: lawan.id,
        challengerPetInstanceId: p1Pet.instanceId,
        opponentPetInstanceId: 'TBD',
        status: 'pending',
        expiresAt: new Date(Date.now() + 2 * 60 * 1000) // 2 menit expire
      });

      // Lock p1 pet
      p1Pet.isLocked = true;
      player.markModified('pets');
      await player.save();

      const response = await interaction.reply({
        content: `⚔️ <@${lawan.id}>, kamu ditantang duel pet oleh **${player.characterName}** (Pet: **${p1Pet.nickname || p1Pet.petId.name}** Lv.${p1Pet.level})!\nSilakan pilih pet kamu untuk menerima tantangan ini (Waktu 2 menit):`,
        components: [row]
      });

      battleRecord.messageId = response.id;
      await battleRecord.save();
    }
  }
};
