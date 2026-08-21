const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const Player = require('../../../models/Player');
const Pet = require('../../../models/Pet');
const Item = require('../../../models/Item');
const PetBattle = require('../../../models/PetBattle');
const { getExpRequired, addExp, parsePetItemEffect, simulateRound } = require('../../../services/petService');

module.exports = {
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const sub = interaction.options.getSubcommand();
    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId }).populate('pets.petId');

    if (!player) return interaction.respond([]);

    if (['status', 'feed', 'heal', 'rename', 'release', 'battle'].includes(sub)) {
       const petOption = interaction.options.getString(sub === 'battle' ? 'pet_kamu' : 'pet');
       if (petOption !== null) {
          const choices = player.pets.map(p => ({
            name: `${p.nickname || p.petId.name} (Lv.${p.level})`,
            value: p.instanceId
          }));
          const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));
          return interaction.respond(filtered.slice(0, 25));
       }
    }

    if (['feed', 'heal'].includes(sub)) {
        const itemOption = interaction.options.getString('item');
        if(itemOption !== null) {
            const itemIds = player.inventory.map(i => i.itemId);
            const items = await Item.find({ _id: { $in: itemIds } });

            const validItems = items.filter(item => {
                if (!item.effect) return false;
                const parsed = parsePetItemEffect(item.effect);
                if (!parsed) return false;
                if (sub === 'feed' && parsed.type === 'pet_food') return true;
                if (sub === 'heal' && parsed.type === 'pet_heal') return true;
                return false;
            });

            const choices = validItems.map(i => ({ name: i.name, value: i._id.toString() }));
            const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));
            return interaction.respond(filtered.slice(0, 25));
        }
    }
  },

  async execute(interaction) {
    await interaction.deferReply();

    const sub = interaction.options.getSubcommand();
    const player = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId }).populate('pets.petId');

    if (!player) return interaction.editReply({ content: '❌ Kamu belum terdaftar.' });

    if (sub === 'list') {
      if (!player.pets.length) return interaction.editReply({ content: '❌ Kamu belum memiliki pet.' });

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🐾 Daftar Pet Milikmu')
        .setDescription(player.pets.map((p, i) => {
          const name = p.nickname ? `${p.nickname} (${p.petId.name})` : p.petId.name;
          return `**${i+1}. ${name}** — Lv.${p.level} | ❤️ HP: ${p.hp}/${p.maxHp} | ⚔️ ${p.atk} 🛡️ ${p.def}`;
        }).join('\n'));

      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'status') {
      const instanceId = interaction.options.getString('pet');
      const pet = player.pets.find(p => p.instanceId === instanceId);
      if (!pet) return interaction.editReply({ content: '❌ Pet tidak ditemukan.' });

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
      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'rename') {
      const instanceId = interaction.options.getString('pet');
      const newName = interaction.options.getString('nama_baru').trim();

      if (newName.length > 16) return interaction.editReply({ content: '❌ Nickname maksimal 16 karakter.' });

      const petIndex = player.pets.findIndex(p => p.instanceId === instanceId);
      if (petIndex === -1) return interaction.editReply({ content: '❌ Pet tidak ditemukan.' });

      player.pets[petIndex].nickname = newName;
      await player.save();

      return interaction.editReply({ content: `✅ Nickname pet berhasil diubah menjadi **${newName}**.` });
    }

    if (sub === 'release') {
      const instanceId = interaction.options.getString('pet');
      const pet = player.pets.find(p => p.instanceId === instanceId);
      if (!pet) return interaction.editReply({ content: '❌ Pet tidak ditemukan.' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`release_confirm_${instanceId}`).setLabel('Ya, Lepaskan!').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`release_cancel_${instanceId}`).setLabel('Batal').setStyle(ButtonStyle.Secondary)
      );

      return interaction.editReply({
        content: `⚠️ Apakah kamu yakin ingin melepaskan **${pet.nickname || pet.petId.name}** selamanya? Tindakan ini tidak bisa dibatalkan!`,
        components: [row]
      });
    }

    if (sub === 'feed' || sub === 'heal') {
      const instanceId = interaction.options.getString('pet');
      const itemId = interaction.options.getString('item');

      const petIndex = player.pets.findIndex(p => p.instanceId === instanceId);
      if (petIndex === -1) return interaction.editReply({ content: '❌ Pet tidak ditemukan.' });

      const invIndex = player.inventory.findIndex(i => i.itemId.toString() === itemId);
      if (invIndex === -1) return interaction.editReply({ content: '❌ Kamu tidak memiliki item tersebut.' });

      const itemDoc = await Item.findById(itemId);
      if (!itemDoc || !itemDoc.effect) return interaction.editReply({ content: '❌ Item tidak memiliki efek pet.' });

      const effect = parsePetItemEffect(itemDoc.effect);
      if (!effect) return interaction.editReply({ content: '❌ Efek item tidak valid.' });

      if (sub === 'feed' && effect.type !== 'pet_food') return interaction.editReply({ content: '❌ Ini bukan makanan pet.' });
      if (sub === 'heal' && effect.type !== 'pet_heal') return interaction.editReply({ content: '❌ Ini bukan potion pet.' });

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

        if (pet.hp >= pet.maxHp) return interaction.editReply({ content: '❌ HP Pet sudah penuh.' });

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

      return interaction.editReply({ content: msg });
    }

    if (sub === 'buyslot') {
      if (player.petSlots >= 6) {
        return interaction.editReply({ content: '❌ Maksimal slot pet adalah 6.' });
      }

      // Harga awal untuk slot ke-3 adalah 10 Gold (1000 silver)
      // Slot 3: 1000 silver
      // Slot 4: 1200 silver (+20%)
      // Slot 5: 1440 silver (+20%)
      // Slot 6: 1728 silver (+20%)
      let baseCost = 1000;
      let cost = Math.floor(baseCost * Math.pow(1.2, player.petSlots - 2));

      if (player.totalWealth < cost) {
        return interaction.editReply({ content: `❌ Kekayaanmu tidak cukup. Biaya buka slot ke-${player.petSlots + 1} adalah ${(cost / 100).toFixed(2)} Gold.` });
      }

      let remaining = cost;
      if (player.currency.silver >= remaining) {
        player.currency.silver -= remaining;
        remaining = 0;
      } else {
        remaining -= player.currency.silver;
        player.currency.silver = 0;

        let goldNeeded = Math.ceil(remaining / 100);
        if (player.currency.gold >= goldNeeded) {
           player.currency.gold -= goldNeeded;
           player.currency.silver += (goldNeeded * 100) - remaining;
           remaining = 0;
        } else {
           remaining -= player.currency.gold * 100;
           player.currency.gold = 0;

           let jadeNeeded = Math.ceil(remaining / 10000);
           if (player.currency.jade >= jadeNeeded) {
              player.currency.jade -= jadeNeeded;
              player.currency.silver += (jadeNeeded * 10000) - remaining;
              remaining = 0;
           } else {
              remaining -= player.currency.jade * 10000;
              player.currency.jade = 0;

              let spiritNeeded = Math.ceil(remaining / 1000000);
              player.currency.spirit -= spiritNeeded;
              player.currency.silver += (spiritNeeded * 1000000) - remaining;
           }
        }
      }

      player.petSlots += 1;
      await player.save();

      return interaction.editReply({ content: `✅ Berhasil membuka pet slot ke-${player.petSlots}! (Biaya: ${(cost / 100).toFixed(2)} Gold)` });
    }

    if (sub === 'battle') {
      const lawan = interaction.options.getUser('lawan');
      const petKamuId = interaction.options.getString('pet_kamu');

      if (lawan.id === interaction.user.id) return interaction.editReply({ content: '❌ Kamu tidak bisa menantang dirimu sendiri.' });
      if (lawan.bot) return interaction.editReply({ content: '❌ Kamu tidak bisa menantang bot.' });

      const p1Pet = player.pets.find(p => p.instanceId === petKamuId);
      if (!p1Pet) return interaction.editReply({ content: '❌ Pet tidak ditemukan.' });
      if (p1Pet.isLocked) return interaction.editReply({ content: '❌ Pet ini sedang dalam battle lain.' });
      if (p1Pet.hunger < 20) return interaction.editReply({ content: '❌ Pet ini terlalu lapar untuk bertarung (Hunger < 20).' });
      if (p1Pet.hp < p1Pet.maxHp * 0.3) return interaction.editReply({ content: '❌ HP Pet terlalu rendah untuk bertarung (< 30%).' });

      const cooldownPet = 5 * 60 * 1000;
      if (p1Pet.lastBattledAt && (Date.now() - p1Pet.lastBattledAt.getTime() < cooldownPet)) {
        return interaction.editReply({ content: '❌ Pet ini masih kelelahan, tunggu beberapa saat lagi.' });
      }

      const lawanData = await Player.findOne({ discordId: lawan.id, guildId: interaction.guildId }).populate('pets.petId');
      if (!lawanData) return interaction.editReply({ content: '❌ Lawan belum terdaftar.' });

      const validLawanPets = lawanData.pets.filter(p => !p.isLocked && p.hunger >= 20 && p.hp >= (p.maxHp * 0.3));
      if (!validLawanPets.length) return interaction.editReply({ content: '❌ Lawan tidak memiliki pet yang siap bertarung.' });

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
        expiresAt: new Date(Date.now() + 2 * 60 * 1000)
      });

      p1Pet.isLocked = true;
      player.markModified('pets');
      await player.save();

      const response = await interaction.editReply({
        content: `⚔️ <@${lawan.id}>, kamu ditantang duel pet oleh **${player.characterName}** (Pet: **${p1Pet.nickname || p1Pet.petId.name}** Lv.${p1Pet.level})!\nSilakan pilih pet kamu untuk menerima tantangan ini (Waktu 2 menit):`,
        components: [row]
      });

      battleRecord.messageId = response.id;
      await battleRecord.save();
    }
  }
};
