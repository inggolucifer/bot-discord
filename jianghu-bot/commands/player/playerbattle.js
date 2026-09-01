const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Player = require('../../models/Player');
const { calculatePlayerStats } = require('../../utils/playerCombat');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playerbattle')
    .setDescription('Tantang pemain lain untuk berduel!')
    .addUserOption(o => o.setName('lawan').setDescription('Pilih pemain yang ingin ditantang').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const opponentUser = interaction.options.getUser('lawan');

      if (opponentUser.id === interaction.user.id) {
          return interaction.editReply('❌ Kamu tidak bisa menantang dirimu sendiri.');
      }

      if (opponentUser.bot) {
          return interaction.editReply('❌ Kamu tidak bisa menantang Bot.');
      }

      // 1. Fetch challenger
      const challenger = await Player.findOne({ discordId: interaction.user.id, guildId: interaction.guildId })
        .populate('laws')
        .populate('manuals.manualId');

      if (!challenger) return interaction.editReply('❌ Kamu belum terdaftar.');

      // 2. Fetch opponent
      const opponent = await Player.findOne({ discordId: opponentUser.id, guildId: interaction.guildId })
        .populate('laws')
        .populate('manuals.manualId');

      if (!opponent) return interaction.editReply('❌ Lawan belum terdaftar di dunia ini.');

      // 3. Stats Calculation
      const p1Stats = calculatePlayerStats(challenger, challenger.laws, challenger.manuals);
      const p2Stats = calculatePlayerStats(opponent, opponent.laws, opponent.manuals);

      // Challenge Embed
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('pb_accept').setLabel('Terima Tantangan').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('pb_decline').setLabel('Tolak').setStyle(ButtonStyle.Secondary)
      );

      const challengeEmbed = new EmbedBuilder()
        .setColor(0xc0392b)
        .setTitle('⚔️ Tantangan Duel Kultivator!')
        .setDescription(`<@${opponentUser.id}>, kamu ditantang berduel oleh **${challenger.characterName}**!`)
        .addFields(
            { name: challenger.characterName, value: `Realm: ${challenger.systemCultivation?.realm || 'Mortal'}\nHP: ${p1Stats.hp} | ATK: ${p1Stats.atk}`, inline: true },
            { name: opponent.characterName, value: `Realm: ${opponent.systemCultivation?.realm || 'Mortal'}\nHP: ${p2Stats.hp} | ATK: ${p2Stats.atk}`, inline: true }
        )
        .setFooter({ text: 'Lawan memiliki waktu 60 detik untuk merespon.' });

      // Send to public channel so opponent can click
      const msg = await interaction.channel.send({ content: `<@${opponentUser.id}>`, embeds: [challengeEmbed], components: [row] });
      await interaction.editReply('Tantangan telah dikirim!');

      const filter = i => i.user.id === opponentUser.id && i.message.id === msg.id;

      try {
         const btnInteract = await msg.awaitMessageComponent({ filter, time: 60000 });

         if (btnInteract.customId === 'pb_decline') {
              await btnInteract.update({ content: `❌ **${opponent.characterName}** menolak tantangan duel.`, embeds: [], components: [] });
              return;
         }

         // Duel Logic (Simple Auto-Battle)
         await btnInteract.deferUpdate();

         let p1Hp = p1Stats.hp;
         let p2Hp = p2Stats.hp;

         let battleLog = `⚔️ **DUEL DIMULAI!**\n**${challenger.characterName}** vs **${opponent.characterName}**\n\n`;
         let round = 1;

         // Helper for narrative
         const p1Skills = challenger.manuals.filter(m => m.manualId).map(m => m.manualId.name);
         const p2Skills = opponent.manuals.filter(m => m.manualId).map(m => m.manualId.name);

         while (p1Hp > 0 && p2Hp > 0 && round <= 20) {
             // Speed determines who attacks first, simple rng for now
             const p1Turn = p1Stats.spd + Math.random() * 20 > p2Stats.spd + Math.random() * 20;

             let attacker = p1Turn ? challenger : opponent;
             let defender = p1Turn ? opponent : challenger;
             let atkStat = p1Turn ? p1Stats.atk : p2Stats.atk;
             let defStat = p1Turn ? p2Stats.def : p1Stats.def;
             let attackerSkills = p1Turn ? p1Skills : p2Skills;

             let dmg = Math.max(1, Math.floor(atkStat - (defStat * 0.5)));

             let skillText = '';
             if (attackerSkills.length > 0 && Math.random() > 0.5) {
                 skillText = ` dengan menggunakan jurus **${attackerSkills[Math.floor(Math.random() * attackerSkills.length)]}**`;
                 dmg = Math.floor(dmg * 1.2); // 20% bonus dmg for skill proc
             }

             if (p1Turn) {
                 p2Hp -= dmg;
                 battleLog += `Round ${round}: **${attacker.characterName}** menyerang${skillText}! Memberikan **${dmg}** DMG! (${defender.characterName} HP: ${Math.max(0, p2Hp)})\n`;
             } else {
                 p1Hp -= dmg;
                 battleLog += `Round ${round}: **${attacker.characterName}** menyerang${skillText}! Memberikan **${dmg}** DMG! (${defender.characterName} HP: ${Math.max(0, p1Hp)})\n`;
             }
             round++;
         }

         let winner = p1Hp > 0 ? challenger : opponent;
         let loser = p1Hp > 0 ? opponent : challenger;

         battleLog += `\n🏆 **${winner.characterName}** memenangkan duel ini!`;

         const resultEmbed = new EmbedBuilder()
            .setColor(0xe67e22)
            .setTitle(`⚔️ Hasil Duel: ${challenger.characterName} vs ${opponent.characterName}`)
            .setDescription(battleLog);

         await msg.edit({ content: null, embeds: [resultEmbed], components: [] });

      } catch (e) {
         if (e.code === 'InteractionCollectorError') {
             await msg.edit({ content: `⏱️ Tantangan batal karena tidak ada respon.`, embeds: [], components: [] });
         } else {
             console.error(e);
             await msg.edit({ content: '❌ Terjadi kesalahan saat duel.', embeds: [], components: [] });
         }
      }

    } catch (e) {
      console.error(e);
      await interaction.editReply('❌ Terjadi kesalahan pada sistem playerbattle.');
    }
  }
};
