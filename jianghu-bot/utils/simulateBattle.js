const { calculatePlayerStats } = require('./playerCombat');

function simulateBattle(challenger, opponent) {
    const p1Stats = calculatePlayerStats(challenger, challenger.laws, challenger.manuals);
    const p2Stats = calculatePlayerStats(opponent, opponent.laws, opponent.manuals);

    let p1Hp = p1Stats.hp;
    let p2Hp = p2Stats.hp;
    const p1MaxHp = p1Stats.hp;
    const p2MaxHp = p2Stats.hp;

    let round = 1;
    let combatLogs = [];

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

    const getElement = (playerObj) => playerObj.laws && playerObj.laws.length > 0 ? playerObj.laws[0].element.toLowerCase() : 'netral';
    const p1Element = getElement(challenger);
    const p2Element = getElement(opponent);

    const checkAdvantage = (atkElem, defElem) => {
        if (atkElem === 'air' && defElem === 'api') return true;
        if (atkElem === 'api' && defElem === 'logam') return true;
        if (atkElem === 'logam' && defElem === 'kayu') return true;
        if (atkElem === 'kayu' && defElem === 'tanah') return true;
        if (atkElem === 'tanah' && defElem === 'air') return true;
        if (atkElem === 'petir' && defElem === 'angin') return true;
        if (atkElem === 'angin' && defElem === 'es') return true;
        if (atkElem === 'es' && defElem === 'petir') return true;
        if (atkElem === 'api' && defElem === 'es') return true;
        if (atkElem === 'tanah' && defElem === 'petir') return true;
        if (atkElem === 'logam' && defElem === 'angin') return true;
        if ((atkElem === 'cahaya' && defElem === 'kegelapan') || (atkElem === 'kegelapan' && defElem === 'cahaya')) return true;
        return false;
    };

    const p1HasAdvantage = checkAdvantage(p1Element, p2Element);
    const p2HasAdvantage = checkAdvantage(p2Element, p1Element);

    let p1Atb = 0;
    let p2Atb = 0;
    const actionThreshold = Math.max(p1Stats.spd, p2Stats.spd) * 2;
    let p1ConsecutiveTurns = 0;
    let p2ConsecutiveTurns = 0;

    let p1PoisonStacks = 0;
    let p2PoisonStacks = 0;
    let p1Stunned = false;
    let p2Stunned = false;
    let p1Shield = 0;
    let p2Shield = 0;
    let p1StunResist = 0;
    let p2StunResist = 0;

    const pushLog = (text, type = 'info', actionData = null) => {
        combatLogs.push({
            round,
            text,
            type,
            actionData,
            p1Hp: Math.max(0, p1Hp),
            p2Hp: Math.max(0, p2Hp)
        });
    };

    while (p1Hp > 0 && p2Hp > 0 && round <= 20) {
        let currentAttacker = null;
        let p1TakesTurn = false;
        let p2TakesTurn = false;

        p1Atb += p1Stats.spd;
        p2Atb += p2Stats.spd;

        if (p1ConsecutiveTurns >= 3) {
            p2Atb = actionThreshold;
            p1Atb = 0;
            p1ConsecutiveTurns = 0;
        } else if (p2ConsecutiveTurns >= 3) {
            p1Atb = actionThreshold;
            p2Atb = 0;
            p2ConsecutiveTurns = 0;
        }

        if (p1Atb >= actionThreshold && p2Atb >= actionThreshold) {
            if (p1Stats.spd >= p2Stats.spd) p1TakesTurn = true;
            else p2TakesTurn = true;
        } else if (p1Atb >= actionThreshold) {
            p1TakesTurn = true;
        } else if (p2Atb >= actionThreshold) {
            p2TakesTurn = true;
        }

        if (!p1TakesTurn && !p2TakesTurn) continue;

        currentAttacker = p1TakesTurn ? 1 : 2;
        let attacker = currentAttacker === 1 ? challenger : opponent;
        let defender = currentAttacker === 1 ? opponent : challenger;
        let atkStats = currentAttacker === 1 ? p1Stats : p2Stats;
        let defStats = currentAttacker === 1 ? p2Stats : p1Stats;
        let atkSkills = currentAttacker === 1 ? p1Skills : p2Skills;
        let defSkills = currentAttacker === 1 ? p2Skills : p1Skills;
        let atkAdvantage = currentAttacker === 1 ? p1HasAdvantage : p2HasAdvantage;
        let defAdvantage = currentAttacker === 1 ? p2HasAdvantage : p1HasAdvantage;

        let getAtkPoison = () => currentAttacker === 1 ? p1PoisonStacks : p2PoisonStacks;
        let setAtkPoison = (val) => currentAttacker === 1 ? (p1PoisonStacks = val) : (p2PoisonStacks = val);
        let getDefPoison = () => currentAttacker === 1 ? p2PoisonStacks : p1PoisonStacks;
        let setDefPoison = (val) => currentAttacker === 1 ? (p2PoisonStacks = val) : (p1PoisonStacks = val);

        let getAtkStunned = () => currentAttacker === 1 ? p1Stunned : p2Stunned;
        let setAtkStunned = (val) => currentAttacker === 1 ? (p1Stunned = val) : (p2Stunned = val);
        let getDefStunned = () => currentAttacker === 1 ? p2Stunned : p1Stunned;
        let setDefStunned = (val) => currentAttacker === 1 ? (p2Stunned = val) : (p1Stunned = val);

        let getAtkShield = () => currentAttacker === 1 ? p1Shield : p2Shield;
        let setAtkShield = (val) => currentAttacker === 1 ? (p1Shield = val) : (p2Shield = val);
        let getDefShield = () => currentAttacker === 1 ? p2Shield : p1Shield;
        let setDefShield = (val) => currentAttacker === 1 ? (p2Shield = val) : (p1Shield = val);

        let getDefStunResist = () => currentAttacker === 1 ? p2StunResist : p1StunResist;
        let setDefStunResist = (val) => currentAttacker === 1 ? (p2StunResist = val) : (p1StunResist = val);

        if (currentAttacker === 1) {
            p1Atb -= actionThreshold;
            p1ConsecutiveTurns++;
            p2ConsecutiveTurns = 0;
        } else {
            p2Atb -= actionThreshold;
            p2ConsecutiveTurns++;
            p1ConsecutiveTurns = 0;
        }

        if (getAtkPoison() > 0) {
            let poisonDmg = Math.floor(getAtkPoison());
            if (currentAttacker === 1) p1Hp -= poisonDmg; else p2Hp -= poisonDmg;
            pushLog(`🤢 **${attacker.characterName}** terkena damage racun sebesar **${poisonDmg}**!`, 'poison_tick', { damage: poisonDmg, target: currentAttacker });
            if (p1Hp <= 0 || p2Hp <= 0) break;
        }

        let isCleansed = false;
        let cleanseSkill = atkSkills.find(s => s.type === 'cleanse');
        if (cleanseSkill && Math.random() < cleanseSkill.triggerChance && (getAtkPoison() > 0 || getAtkStunned())) {
            setAtkPoison(0);
            setAtkStunned(false);
            isCleansed = true;
            pushLog(`✨ **${attacker.characterName}** memicu jurus **[${cleanseSkill.name}]**, membersihkan semua debuff!`, 'cleanse', { skill: cleanseSkill.name, target: currentAttacker });
        }

        if (getAtkStunned() && !isCleansed) {
             pushLog(`💫 **${attacker.characterName}** masih dalam keadaan *Stun* dan tidak bisa bergerak!`, 'stun_skip', { target: currentAttacker });
             setAtkStunned(false);
             round++;
             continue;
        }

        let activeSkill = null;
        let randSkill = Math.random();
        for (let s of atkSkills) {
            if (['damage', 'lifesteal', 'stun', 'poison'].includes(s.type)) {
                if (randSkill < s.triggerChance) {
                    activeSkill = s;
                    break;
                }
                randSkill -= s.triggerChance;
            }
        }

        let effectiveDefSpd = Math.max(0, defStats.spd - (atkStats.atk * 0.1));
        let dodgeChance = effectiveDefSpd / (effectiveDefSpd + 50000);

        if (Math.random() < dodgeChance) {
             pushLog(`💨 **${defender.characterName}** bergerak lincah dan menghindari serangan!`, 'dodge', { attacker: currentAttacker, defender: currentAttacker === 1 ? 2 : 1 });
             round++;
             continue;
        }

        let effectiveDef = Math.max(0, defStats.def - (atkStats.spd * 0.2));
        let dmg = Math.floor(atkStats.atk - (effectiveDef * 0.5));

        let isCrit = false;
        let effectiveAtkSpd = Math.max(0, atkStats.spd - (defStats.def * 0.1));
        let critChance = effectiveAtkSpd / (effectiveAtkSpd + 50000);
        if (Math.random() < critChance) {
             dmg = Math.floor(dmg * 1.5);
             isCrit = true;
        }

        if (atkAdvantage && !defAdvantage) dmg = Math.floor(dmg * 1.15);
        if (!atkAdvantage && defAdvantage) dmg = Math.floor(dmg * 0.85);

        if (activeSkill && activeSkill.type === 'damage') {
             dmg = Math.floor(dmg * activeSkill.value);
        }

        dmg = Math.max(1, dmg);

        let defShieldSkill = defSkills.find(s => s.type === 'shield');
        if (defShieldSkill && getDefShield() <= 0 && Math.random() < defShieldSkill.triggerChance) {
            let shieldAmt = Math.floor(defStats.hp * (defShieldSkill.value - 1));
            setDefShield(shieldAmt);
            pushLog(`🛡️ **${defender.characterName}** memicu jurus **[${defShieldSkill.name}]**, mendapatkan perisai sebesar **${shieldAmt}**!`, 'shield_gain', { target: currentAttacker === 1 ? 2 : 1, amount: shieldAmt });
        }

        let actualDmgToHp = dmg;
        if (getDefShield() > 0) {
            let remainingShield = getDefShield() - dmg;
            if (remainingShield > 0) {
                setDefShield(remainingShield);
                actualDmgToHp = 0;
                pushLog(`🛡️ Perisai **${defender.characterName}** menyerap seluruh damage! (Sisa Perisai: **${remainingShield}**)`, 'shield_block');
            } else {
                setDefShield(0);
                actualDmgToHp = Math.abs(remainingShield);
                pushLog(`🛡️ Serangan menghancurkan perisai **${defender.characterName}**!`, 'shield_break');
            }
        }

        if (currentAttacker === 1) p2Hp -= actualDmgToHp; else p1Hp -= actualDmgToHp;

        let atkMsg = activeSkill
            ? `💥 **${attacker.characterName}** menggunakan **[${activeSkill.name}]** kepada **${defender.characterName}**! Menimbulkan **${actualDmgToHp}** damage.`
            : `⚔️ **${attacker.characterName}** menyerang **${defender.characterName}**! Menimbulkan **${actualDmgToHp}** damage.`;
        if (isCrit) atkMsg += ' *(Critical Hit!)*';

        pushLog(atkMsg, 'attack', {
            attacker: currentAttacker,
            defender: currentAttacker === 1 ? 2 : 1,
            damage: actualDmgToHp,
            isCrit,
            skill: activeSkill?.name
        });

        if (activeSkill && actualDmgToHp > 0) {
             if (activeSkill.type === 'lifesteal') {
                  let heal = Math.floor(actualDmgToHp * (activeSkill.value - 1));
                  if (currentAttacker === 1) p1Hp = Math.min(p1Stats.hp, p1Hp + heal);
                  else p2Hp = Math.min(p2Stats.hp, p2Hp + heal);
                  pushLog(`🩸 **${attacker.characterName}** menyerap **${heal}** HP!`, 'heal', { target: currentAttacker, amount: heal });
             } else if (activeSkill.type === 'poison') {
                  let poisonDmg = Math.floor(atkStats.hp * (activeSkill.value - 1));
                  poisonDmg = Math.min(poisonDmg, atkStats.atk * 2);
                  setDefPoison(getDefPoison() + poisonDmg);
                  pushLog(`☠️ **${defender.characterName}** terkena racun! (Stack bertambah)`, 'poison_apply', { target: currentAttacker === 1 ? 2 : 1 });
             } else if (activeSkill.type === 'stun') {
                  let resistChance = Math.min(0.8, getDefStunResist());
                  if (Math.random() > resistChance) {
                      setDefStunned(true);
                      setDefStunResist(getDefStunResist() + 0.2);
                      pushLog(`💫 **${defender.characterName}** terkena *Stun*!`, 'stun_apply', { target: currentAttacker === 1 ? 2 : 1 });
                  } else {
                      pushLog(`💢 **${defender.characterName}** menahan efek *Stun*!`, 'stun_resist', { target: currentAttacker === 1 ? 2 : 1 });
                  }
             }
        }

        let defReflectSkill = defSkills.find(s => s.type === 'reflect');
        if (defReflectSkill && actualDmgToHp > 0 && Math.random() < defReflectSkill.triggerChance) {
             let reflectDmg = Math.floor(actualDmgToHp * (defReflectSkill.value - 1));
             if (currentAttacker === 1) p1Hp -= reflectDmg; else p2Hp -= reflectDmg;
             pushLog(`🪞 **${defender.characterName}** memicu **[${defReflectSkill.name}]** memantulkan **${reflectDmg}** damage!`, 'reflect', { target: currentAttacker, damage: reflectDmg });
        }

        round++;
    }

    let winnerIdx = null;
    if (p1Hp > 0 && p2Hp > 0 && round > 20) {
        const p1HpPercentage = (p1Hp / p1Stats.hp) * 100;
        const p2HpPercentage = (p2Hp / p2Stats.hp) * 100;
        if (p1HpPercentage > p2HpPercentage) {
            winnerIdx = 1;
        } else {
            winnerIdx = 2; // Defender advantage
        }
        pushLog(`⏳ **Batas 20 Ronde Tercapai!**\nSisa HP ${challenger.characterName}: ${p1HpPercentage.toFixed(1)}% | ${opponent.characterName}: ${p2HpPercentage.toFixed(1)}%`, 'time_limit');
    } else {
        winnerIdx = p1Hp > 0 ? 1 : 2;
    }

    pushLog(`🏆 **${winnerIdx === 1 ? challenger.characterName : opponent.characterName}** memenangkan duel ini!`, 'battle_end', { winner: winnerIdx });

    return {
        logs: combatLogs,
        winnerIdx,
        p1Hp,
        p2Hp,
        p1MaxHp,
        p2MaxHp,
        p1Stats,
        p2Stats
    };
}

module.exports = { simulateBattle };
