const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Player = require('../../models/Player');
const { calculatePlayerStats } = require('../../utils/playerCombat');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playerbattle')
    .setDescription('Tantang pemain lain untuk berduel!')
    .addUserOption(o => o.setName('lawan').setDescription('Pilih pemain yang ingin ditantang').setRequired(true)),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
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
         let isLogTrimmed = false;

         // Helper for narrative and skill effects
         const p1Skills = challenger.manuals.filter(m => m?.manualId).map(m => ({
             name: m.manualId.name,
             type: m.manualId.effectType || 'damage',
             value: m.manualId.effectValue || 1.2,
             triggerChance: m.manualId.triggerChance !== undefined ? m.manualId.triggerChance : 0.5
         }));
         const p2Skills = opponent.manuals.filter(m => m?.manualId).map(m => ({
             name: m.manualId.name,
             type: m.manualId.effectType || 'damage',
             value: m.manualId.effectValue || 1.2,
             triggerChance: m.manualId.triggerChance !== undefined ? m.manualId.triggerChance : 0.5
         }));

         // Elemental Advantage check
         const getElement = (playerObj) => playerObj.laws && playerObj.laws.length > 0 ? playerObj.laws[0].element.toLowerCase() : 'netral';
         const p1Element = getElement(challenger);
         const p2Element = getElement(opponent);

         const checkAdvantage = (atkElem, defElem) => {
             // Siklus Dasar (Wu Xing)
             if (atkElem === 'air' && defElem === 'api') return true;
             if (atkElem === 'api' && defElem === 'logam') return true;
             if (atkElem === 'logam' && defElem === 'kayu') return true;
             if (atkElem === 'kayu' && defElem === 'tanah') return true;
             if (atkElem === 'tanah' && defElem === 'air') return true;
             // Siklus Varian (Mutasi Alam)
             if (atkElem === 'petir' && defElem === 'angin') return true;
             if (atkElem === 'angin' && defElem === 'es') return true;
             if (atkElem === 'es' && defElem === 'petir') return true;
             // Cross-Siklus
             if (atkElem === 'api' && defElem === 'es') return true;
             if (atkElem === 'tanah' && defElem === 'petir') return true;
             if (atkElem === 'logam' && defElem === 'angin') return true;
             // Siklus Kosmik
             if ((atkElem === 'cahaya' && defElem === 'kegelapan') || (atkElem === 'kegelapan' && defElem === 'cahaya')) return true;

             return false;
         };

         const checkDisadvantage = (atkElem, defElem) => {
             // Disadvantage is the inverse of Advantage, except for Cosmic
             if ((atkElem === 'cahaya' && defElem === 'kegelapan') || (atkElem === 'kegelapan' && defElem === 'cahaya')) return false;
             return checkAdvantage(defElem, atkElem);
         };

         let p1Action = 0;
         let p2Action = 0;
         const actionThreshold = Math.max(1, Math.max(p1Stats.spd, p2Stats.spd) * 2);

         let p1StunResist = 0;
         let p2StunResist = 0;

         let p1ConsecutiveTurns = 0;
         let p2ConsecutiveTurns = 0;

         let p1PoisonStacks = 0;
         let p2PoisonStacks = 0;

         while (p1Hp > 0 && p2Hp > 0 && round <= 20) {
             // ATB tick loop
             while (p1Action < actionThreshold && p2Action < actionThreshold) {
                 p1Action += Math.max(1, p1Stats.spd);
                 p2Action += Math.max(1, p2Stats.spd);
             }

             // Determine whose turn it is based on ATB
             const p1Turn = p1Action >= actionThreshold && (p1Action >= p2Action || p2Action < actionThreshold);

             // ATB Speed-Lock Pity System
             if (p1Turn) {
                 p1ConsecutiveTurns++;
                 p2ConsecutiveTurns = 0;
                 if (p1ConsecutiveTurns >= 3) {
                     p2Action = actionThreshold; // Pity Boost
                     p1ConsecutiveTurns = 0;
                 }
             } else {
                 p2ConsecutiveTurns++;
                 p1ConsecutiveTurns = 0;
                 if (p2ConsecutiveTurns >= 3) {
                     p1Action = actionThreshold; // Pity Boost
                     p2ConsecutiveTurns = 0;
                 }
             }

             let attacker = p1Turn ? challenger : opponent;
             let defender = p1Turn ? opponent : challenger;
             let atkStat = p1Turn ? p1Stats.atk : p2Stats.atk;
             let defStat = p1Turn ? p2Stats.def : p1Stats.def;
             let atkSpd = p1Turn ? p1Stats.spd : p2Stats.spd;
             let defSpd = p1Turn ? p2Stats.spd : p1Stats.spd;
             let attackerSkills = p1Turn ? p1Skills : p2Skills;

             let attackerElement = p1Turn ? p1Element : p2Element;
             let defenderElement = p1Turn ? p2Element : p1Element;

             let attackNotes = [];
             let preAttackNotes = [];
             let skillText = '';
             let isDodged = false;

             // Poison DoT Processing at the start of turn
             let activePoisonStacks = p1Turn ? p1PoisonStacks : p2PoisonStacks;
             if (activePoisonStacks > 0) {
                 const poisonMaxHp = p1Turn ? p1Stats.hp : p2Stats.hp;
                 const applierAtk = p1Turn ? p2Stats.atk : p1Stats.atk;
                 // Poison DoT base calculation. E.g., 2% of Max HP per stack
                 let poisonDoT = Math.floor(poisonMaxHp * (0.02 * activePoisonStacks));
                 // Cap DoT damage to not instantly wipe heavily stacked players, using the applier's ATK
                 poisonDoT = Math.min(poisonDoT, Math.max(10, applierAtk * 2));

                 if (p1Turn) {
                     p1Hp -= poisonDoT;
                 } else {
                     p2Hp -= poisonDoT;
                 }
                 preAttackNotes.push(`🤢 *Terkena ${poisonDoT} DoT Racun (${activePoisonStacks} Stack)*`);

                 // Death Check
                 if ((p1Turn && p1Hp <= 0) || (!p1Turn && p2Hp <= 0)) {
                     // Log the death and break the turn, ATB loop condition will catch it
                     battleLog += `Round ${round}: **${attacker.characterName}** ${preAttackNotes.join(' | ')}\n   ↳ 💀 **Tumbang karena racun!**\n`;
                     break;
                 }
             }

             // Dodge/Evasion Calculation (Counter-Stats & Diminishing Returns)
             const effectiveDefSpd = Math.max(0, defSpd - (atkStat * 0.1));
             const dodgeChance = effectiveDefSpd / (effectiveDefSpd + 50000);
             if (Math.random() < dodgeChance) {
                 isDodged = true;
             }

             let dmg = 0;
             if (!isDodged) {
                 let effectiveDef = defStat - (atkSpd * 0.2);
                 effectiveDef = Math.max(0, effectiveDef);
                 dmg = Math.max(1, Math.floor(atkStat - (effectiveDef * 0.5)));

                 // Attacker Skill Trigger
                 let chosenSkill = null;
                 if (attackerSkills.length > 0) {
                     const randomSkill = attackerSkills[Math.floor(Math.random() * attackerSkills.length)];
                     // Cleanse triggers defensively at the start of attack phase if attacker has poison
                     if (randomSkill.type === 'cleanse' && activePoisonStacks > 0) {
                         if (Math.random() < randomSkill.triggerChance) {
                             chosenSkill = randomSkill;
                             skillText = ` dengan memurnikan diri menggunakan **${chosenSkill.name}** lalu menyerang`;
                         }
                     }
                     // Other offensive skills
                     else if (['damage', 'lifesteal', 'stun', 'poison'].includes(randomSkill.type)) {
                         if (Math.random() < randomSkill.triggerChance) {
                             chosenSkill = randomSkill;
                             skillText = ` dengan menggunakan jurus **${chosenSkill.name}**`;
                         }
                     }
                 }

                 // Defender Skill Trigger (Shield / Reflect)
                 let defenderSkills = p1Turn ? p2Skills : p1Skills;
                 let chosenDefSkill = null;
                 if (defenderSkills.length > 0) {
                     const randomDefSkill = defenderSkills[Math.floor(Math.random() * defenderSkills.length)];
                     if (['shield', 'reflect'].includes(randomDefSkill.type)) {
                         if (Math.random() < randomDefSkill.triggerChance) {
                             chosenDefSkill = randomDefSkill;
                         }
                     }
                 }

                 // Elemental Calc
                 if (checkAdvantage(attackerElement, defenderElement)) {
                     dmg = Math.floor(dmg * 1.15);
                     attackNotes.push('🔥 *Serangan Super Efektif!*');
                 } else if (checkDisadvantage(attackerElement, defenderElement)) {
                     dmg = Math.max(1, Math.floor(dmg * 0.85));
                     attackNotes.push('🛡️ *Serangan Teredam Elemen...*');
                 }

                 // Critical Hit (Counter-Stats & Diminishing Returns)
                 const effectiveAtkSpd = Math.max(0, atkSpd - (defStat * 0.1));
                 const critChance = effectiveAtkSpd / (effectiveAtkSpd + 50000);
                 if (Math.random() < critChance) {
                     dmg = Math.floor(dmg * 1.5);
                     attackNotes.push('💥 **CRITICAL HIT!**');
                 }

                 // Apply Defender Skills (Shield / Reflect)
                 if (chosenDefSkill) {
                     if (chosenDefSkill.type === 'shield') {
                         const reduction = Math.floor(dmg * chosenDefSkill.value);
                         dmg = Math.max(1, dmg - reduction);
                         attackNotes.push(`🛡️ *${defender.characterName} menahan serangan dengan ${chosenDefSkill.name} (-${reduction} DMG)*`);
                     } else if (chosenDefSkill.type === 'reflect') {
                         const reflectDmg = Math.floor(dmg * chosenDefSkill.value);
                         if (p1Turn) {
                             p1Hp -= reflectDmg;
                         } else {
                             p2Hp -= reflectDmg;
                         }
                         attackNotes.push(`🪞 *${defender.characterName} memantulkan ${reflectDmg} DMG dengan ${chosenDefSkill.name}*`);
                     }
                 }

                 // Apply Unique Skill Effects
                 if (chosenSkill) {
                     const effectVal = chosenSkill.value;
                     switch (chosenSkill.type) {
                         case 'damage':
                             dmg = Math.floor(dmg * effectVal);
                             break;
                         case 'lifesteal':
                             const defenderCurrentHp = p1Turn ? p2Hp : p1Hp;
                             const actualDamageDealt = Math.min(defenderCurrentHp, dmg);
                             const healAmount = Math.floor(actualDamageDealt * effectVal);
                             const maxHp = p1Turn ? p1Stats.hp : p2Stats.hp;
                             if (p1Turn) {
                                 p1Hp = Math.min(maxHp, p1Hp + healAmount);
                             } else {
                                 p2Hp = Math.min(maxHp, p2Hp + healAmount);
                             }
                             attackNotes.push(`🩸 *Menyerap ${healAmount} HP*`);
                             break;
                         case 'stun':
                             const defenderStunResist = p1Turn ? p2StunResist : p1StunResist;
                             const gaugeReduction = (actionThreshold * effectVal) * (1 - defenderStunResist);
                             if (p1Turn) {
                                 p2Action -= gaugeReduction;
                                 p2StunResist = Math.min(0.8, p2StunResist + 0.2);
                             } else {
                                 p1Action -= gaugeReduction;
                                 p1StunResist = Math.min(0.8, p1StunResist + 0.2);
                             }
                             attackNotes.push(`⚡ *Lawan terkena Stun! Action mundur*`);
                             break;
                         case 'poison':
                             if (p1Turn) {
                                 p2PoisonStacks++;
                             } else {
                                 p1PoisonStacks++;
                             }
                             attackNotes.push(`☠️ *Meracuni lawan! (+1 Stack Racun)*`);
                             break;
                         case 'cleanse':
                             if (p1Turn) {
                                 p1PoisonStacks = 0;
                                 const heal = Math.floor(p1Stats.hp * chosenSkill.value);
                                 p1Hp = Math.min(p1Stats.hp, p1Hp + heal);
                                 attackNotes.push(`✨ *Racun dimurnikan! Memulihkan ${heal} HP*`);
                             } else {
                                 p2PoisonStacks = 0;
                                 const heal = Math.floor(p2Stats.hp * chosenSkill.value);
                                 p2Hp = Math.min(p2Stats.hp, p2Hp + heal);
                                 attackNotes.push(`✨ *Racun dimurnikan! Memulihkan ${heal} HP*`);
                             }
                             break;
                     }
                 }
             }

             let extraLog = '';
             if (preAttackNotes.length > 0) {
                 extraLog += `\n   ↳ ${preAttackNotes.join(' | ')}`;
             }
             if (isDodged) {
                 extraLog += `\n   ↳ 💨 *Meleset! ${defender.characterName} bergerak terlalu cepat!*`;
             } else if (attackNotes.length > 0) {
                 extraLog += `\n   ↳ ${attackNotes.join(' | ')}`;
             }

             let roundLog = '';
             if (p1Turn) {
                 if (!isDodged) p2Hp -= dmg;
                 roundLog = `Round ${round}: **${attacker.characterName}** menyerang${skillText}! Memberikan **${isDodged ? 0 : dmg}** DMG! (${defender.characterName} HP: ${Math.max(0, p2Hp)})${extraLog}\n`;
             } else {
                 if (!isDodged) p1Hp -= dmg;
                 roundLog = `Round ${round}: **${attacker.characterName}** menyerang${skillText}! Memberikan **${isDodged ? 0 : dmg}** DMG! (${defender.characterName} HP: ${Math.max(0, p1Hp)})${extraLog}\n`;
             }

             // Reduce gauge
             if (p1Turn) {
                 p1Action -= actionThreshold;
             } else {
                 p2Action -= actionThreshold;
             }

             if (!isLogTrimmed) {
                 if (battleLog.length > 3000) {
                     battleLog += `\n*... [Pertarungan berlangsung sangat sengit hingga kecepatan mereka tak bisa lagi diikuti oleh mata telanjang] ...*\n`;
                     isLogTrimmed = true;
                 } else {
                     battleLog += roundLog;
                 }
             }
             round++;
         }

         let winner;
         let loser;

         if (p1Hp > 0 && p2Hp > 0 && round > 20) {
             // Tie-Breaker based on HP percentage
             const p1HpPercentage = (p1Hp / p1Stats.hp) * 100;
             const p2HpPercentage = (p2Hp / p2Stats.hp) * 100;

             if (p1HpPercentage > p2HpPercentage) {
                 winner = challenger;
                 loser = opponent;
             } else {
                 // Defender (opponent) wins if p2HpPercentage > p1HpPercentage OR if they are equal
                 winner = opponent;
                 loser = challenger;
             }
             battleLog += `\n⏳ **Batas 20 Ronde Tercapai!**\nSisa HP ${challenger.characterName}: ${p1HpPercentage.toFixed(1)}% | ${opponent.characterName}: ${p2HpPercentage.toFixed(1)}%\n`;
         } else {
             winner = p1Hp > 0 ? challenger : opponent;
             loser = p1Hp > 0 ? opponent : challenger;
         }

         battleLog += `\n🏆 **${winner.characterName}** memenangkan duel ini!`;

         const resultEmbed = new EmbedBuilder()
            .setColor(0xe67e22)
            .setTitle(`⚔️ Hasil Duel: ${challenger.characterName} vs ${opponent.characterName}`)
            .setDescription(battleLog);

         await msg.edit({ content: null, embeds: [resultEmbed], components: [] });

      } catch (e) {
         if (e.code === 'InteractionCollectorError') {
             await msg.edit({ content: `⏱️ Tantangan batal karena tidak ada respon.`, embeds: [], components: [] }).catch(() => {});
         } else {
             console.error(e);
             await msg.edit({ content: '❌ Terjadi kesalahan saat duel.', embeds: [], components: [] }).catch(() => {});
         }
      }

    } catch (e) {
      console.error(e);
      const msg = '❌ Terjadi kesalahan pada sistem playerbattle.';
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: msg }).catch(() => {});
      } else {
        await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
      }
    }
  }
};
