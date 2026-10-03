const { getComputedStats } = require('./statCalculator');
const { COMBO_HIT_MULTIPLIER, BASE_CRIT_RATE, BASE_COMBO_RATE } = require('../config/combatRates');
const COMBAT_COND = require('../config/combatConditions');
const { resolveWeaponDiscipline, getKungfuLevel, getStealingSuccessBonus } = require('./kungfuMastery');
const { getLawCombatModifiers, applyLawDamageModifiers } = require('./lawCultivationEngine');
const { applyPillarCombatModifiers, getInjuryStatPenalties } = require('./combatBody');
const { onSkillHitLawExtras, onTurnStartLawExtras, getStatusBadges, applyStatus, ensureCombatState, tickStatuses, getDefenseDamageMultiplier } = require('./combatStatus');

function cloneConditions(conds) {
    if (!conds || !Array.isArray(conds)) return [];
    return conds.map(c => ({ ...c }));
}

function simulateBattle(challenger, opponent, options = {}) {
    let p1EquippedWeapon = null;
    if (challenger.inventory && challenger.equipment?.weapon) {
        const wId = challenger.equipment.weapon.toString();
        const invW = challenger.inventory.find(i => (i._id && i._id.toString() === wId) || (i.id && i.id.toString() === wId) || (i.itemId && i.itemId._id && i.itemId._id.toString() === wId));
        if (invW && invW.itemId) {
            p1EquippedWeapon = invW.itemId;
        }
    } else if (challenger.inventory) {
        const invW = challenger.inventory.find(i => i.isEquipped && (i.itemId?.category === 'weapon' || i.itemId?.type === 'weapon'));
        if (invW && invW.itemId) {
            p1EquippedWeapon = invW.itemId;
        }
    }

    const hasP1Weapon = !!(p1EquippedWeapon && typeof p1EquippedWeapon === 'object' && p1EquippedWeapon.name);
    // Jika tidak ada weapon atau bukan weapon valid, disiplin murni adalah fist (tinju tangan kosong)
    const p1WeaponDiscipline = hasP1Weapon ? resolveWeaponDiscipline(p1EquippedWeapon) : 'fist';

    const p1StatsRaw = getComputedStats(challenger, challenger.laws, challenger.manuals);
    // Opponents may not have currentHp saved
    let p2StatsRaw = opponent.statBlock ? { maxHp: opponent.statBlock.hp, atk: opponent.statBlock.atk, def: opponent.statBlock.def, spd: opponent.statBlock.spd, critHitRate: 0.05, critDmgRate: 1.5, comboRate: 0.05 } : getComputedStats(opponent, opponent.laws, opponent.manuals);
    if (!opponent.statBlock) {
        p2StatsRaw = { ...p2StatsRaw, hp: p2StatsRaw.maxHp };
    }

    const p1Stats = applyPillarCombatModifiers({ ...p1StatsRaw, hp: p1StatsRaw.maxHp }, challenger);
    const p2Stats = applyPillarCombatModifiers({ ...p2StatsRaw, hp: p2StatsRaw.maxHp }, opponent);

    let p1Hp = typeof challenger.currentHp === 'number' ? Math.max(1, challenger.currentHp) : p1Stats.maxHp;
    let p2Hp = typeof opponent.currentHp === 'number' ? Math.max(1, opponent.currentHp) : p2Stats.maxHp;
    const p1MaxHp = p1Stats.maxHp;
    const p2MaxHp = p2Stats.maxHp;

    challenger.hp = p1Hp;
    challenger.maxHp = p1MaxHp;
    opponent.hp = p2Hp;
    opponent.maxHp = p2MaxHp;
    if (challenger.combatConditions && typeof challenger.combatConditions === 'object' && !Array.isArray(challenger.combatConditions)) {
        challenger.conditions = { ...challenger.combatConditions };
    }
    if (opponent.combatConditions && typeof opponent.combatConditions === 'object' && !Array.isArray(opponent.combatConditions)) {
        opponent.conditions = { ...opponent.combatConditions };
    }
    ensureCombatState(challenger);
    ensureCombatState(opponent);
    let p1Conditions = challenger.conditions;
    let p2Conditions = opponent.conditions;

    let p1Shield = 0;
    let p2Shield = 0;

    let round = 1;
    let combatLogs = [];

    // Filter skill agar jurus senjata (pedang, golok, tongkat, senjata rahasia) HANYA bisa digunakan jika senjata terkait sedang di-equip!
    const isSkillUsable = (manualDoc, weaponDisc, hasWeapon) => {
        const reqType = manualDoc?.requiredSkillType;
        if (!reqType) return true;
        const weaponDisciplines = ['sword', 'saber', 'staff', 'hiddenWeapon'];
        if (weaponDisciplines.includes(reqType)) {
            return hasWeapon && weaponDisc === reqType;
        }
        return true;
    };

    const p1Skills = (challenger.manuals || [])
        .filter(m => m?.manualId && isSkillUsable(m.manualId, p1WeaponDiscipline, hasP1Weapon))
        .map(m => ({
            name: m.manualId?.name || 'Jurus Pendekar',
            type: m.manualId?.effectType || 'damage',
            value: m.manualId?.effectValue || 1.2,
            triggerChance: m.manualId?.triggerChance !== undefined ? m.manualId?.triggerChance : 0.5,
            requiredSkillType: m.manualId?.requiredSkillType || null,
            rootType: m.manualId?.rootType || null
        }));
    const p2Skills = (opponent.manuals || []).filter(m => m?.manualId).map(m => ({
        name: m.manualId?.name || 'Jurus Lawan',
        type: m.manualId?.effectType || 'damage',
        value: m.manualId?.effectValue || 1.2,
        triggerChance: m.manualId?.triggerChance !== undefined ? m.manualId?.triggerChance : 0.5,
        requiredSkillType: m.manualId?.requiredSkillType || null,
        rootType: m.manualId?.rootType || null
    }));

    const p1UsedSkillTypes = new Set();
    p1UsedSkillTypes.add(p1WeaponDiscipline);
    const p1UsedElementsCount = {};

    const getElement = (playerObj) => (playerObj?.laws && playerObj.laws.length > 0 && playerObj.laws[0]?.element && typeof playerObj.laws[0].element === 'string') ? playerObj.laws[0].element.toLowerCase() : 'netral';
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

    const actionThreshold = 10000;
    let p1Atb = 0;
    let p2Atb = 0;
    let p1ConsecutiveTurns = 0;
    let p2ConsecutiveTurns = 0;

    let stealAttempted = false;
    let stealSuccess = false;

    function pushLog(text, type, actionData = {}) {
        let hpAfter = { p1: p1Hp, p2: p2Hp };
        combatLogs.push({ turn: round, text, type, actionData, hpAfter, notes: '' });
    }

    function addCondition(conds, type, severity, turns) {
        let existing = conds.find(c => c.type === type);
        if (existing) {
            existing.severity += severity;
            if (turns !== undefined) existing.remainingTurns = Math.max(existing.remainingTurns, turns);
        } else {
            conds.push({ type, severity, remainingTurns: turns });
        }
    }

    function removeCondition(conds, type) {
        const idx = conds.findIndex(c => c.type === type);
        if (idx !== -1) conds.splice(idx, 1);
    }

    function applyConditionEffects(actorIdx, pStats, pHp, pMaxHp, actor) {
        let pName = actorIdx === 1 ? challenger.characterName : opponent.characterName;
        ensureCombatState(actor);
        actor.hp = pHp;
        actor.maxHp = pMaxHp;

        const tickRes = tickStatuses(actor, { maxHp: pMaxHp, actionType: 'attack' });
        let hpLoss = Math.abs(tickRes.hpDelta || 0);
        let skipTurn = tickRes.skipTurn;

        if (tickRes.logs && tickRes.logs.length > 0) {
            tickRes.logs.forEach(msg => {
                pushLog(msg, 'condition_tick', { damage: hpLoss, target: actorIdx });
            });
        }

        if (actor.conditions.knockback > 0) {
            skipTurn = true;
            actor.conditions.knockback = 0;
            pushLog(`💨 **${pName}** terdorong mundur dan kehilangan giliran!`, 'condition_tick', { type: 'knockback', target: actorIdx });
        }

        let missMultiplier = 0;
        if (actor.conditions.intox > 0) {
            missMultiplier += actor.conditions.intox * (COMBAT_COND.INTOX_MISS_RATE_PER_SEVERITY || 0.003);
        }

        let atkMod = 1;
        let defMod = 1;
        if (actor.conditions.injury > 0) {
            const injuryPen = getInjuryStatPenalties(actor.conditions);
            if (injuryPen && injuryPen.atkDefMult) {
                atkMod *= injuryPen.atkDefMult;
                defMod *= injuryPen.atkDefMult;
            }
            if (pStats.currentMp !== undefined) {
                let mpReduction = Math.floor(pStats.maxMp * (actor.conditions.injury * (COMBAT_COND.INJURY_MAX_MP_REDUCTION_PERCENT || 0.02)));
                pStats.maxMpEffective = Math.max(0, pStats.maxMp - mpReduction);
                pStats.currentMp = Math.min(pStats.currentMp, pStats.maxMpEffective);
            }
        }

        return { hpLoss, skipTurn, missMultiplier, atkMod, defMod, isDead: tickRes.isDead || actor.hp <= 0 };
    }

    while (p1Hp > 0 && p2Hp > 0 && round <= 20) {
        let p1TakesTurn = false;
        let p2TakesTurn = false;

        if (p1ConsecutiveTurns >= 2) {
            p2TakesTurn = true;
        } else if (p2ConsecutiveTurns >= 2) {
            p1TakesTurn = true;
        } else {
            p1Atb += p1Stats.spd;
            p2Atb += p2Stats.spd;
            if (p1Atb >= actionThreshold && p2Atb >= actionThreshold) {
                if (p1Atb > p2Atb) p1TakesTurn = true;
                else if (p2Atb > p1Atb) p2TakesTurn = true;
                else {
                    if (Math.random() < 0.5) p1TakesTurn = true;
                    else p2TakesTurn = true;
                }
            } else if (p1Atb >= actionThreshold) {
                p1TakesTurn = true;
            } else if (p2Atb >= actionThreshold) {
                p2TakesTurn = true;
            }
        }

        if (!p1TakesTurn && !p2TakesTurn) continue;

        let currentAttacker = p1TakesTurn ? 1 : 2;
        let attacker = currentAttacker === 1 ? challenger : opponent;
        let defender = currentAttacker === 1 ? opponent : challenger;
        let atkStats = currentAttacker === 1 ? p1Stats : p2Stats;
        let defStats = currentAttacker === 1 ? p2Stats : p1Stats;
        let atkSkills = currentAttacker === 1 ? p1Skills : p2Skills;
        let defSkills = currentAttacker === 1 ? p2Skills : p1Skills;
        let atkAdvantage = currentAttacker === 1 ? p1HasAdvantage : p2HasAdvantage;
        let defAdvantage = currentAttacker === 1 ? p2HasAdvantage : p1HasAdvantage;
        let atkConds = currentAttacker === 1 ? p1Conditions : p2Conditions;
        let defConds = currentAttacker === 1 ? p2Conditions : p1Conditions;
        let atkMaxHp = currentAttacker === 1 ? p1MaxHp : p2MaxHp;
        let defMaxHp = currentAttacker === 1 ? p2MaxHp : p1MaxHp;

        if (currentAttacker === 1) {
            p1Atb -= actionThreshold;
            p1ConsecutiveTurns++;
            p2ConsecutiveTurns = 0;
        } else {
            p2Atb -= actionThreshold;
            p2ConsecutiveTurns++;
            p1ConsecutiveTurns = 0;
        }

        let { hpLoss, skipTurn, missMultiplier, atkMod, defMod, isDead } = applyConditionEffects(currentAttacker, atkStats, currentAttacker === 1 ? p1Hp : p2Hp, atkMaxHp, attacker);

        if (currentAttacker === 1) p1Hp = Math.max(0, attacker.hp); else p2Hp = Math.max(0, attacker.hp);
        if (p1Hp <= 0 || p2Hp <= 0 || isDead) break;

        if (skipTurn) {
            round++;
            continue;
        }

        let isCleansed = false;
        let cleanseSkill = atkSkills.find(s => s.type === 'cleanse');
        if (cleanseSkill && Math.random() < cleanseSkill.triggerChance) {
            attacker.conditions.poison = 0;
            attacker.conditions.bleed = 0;
            attacker.conditions.burn = 0;
            attacker.conditions.intox = 0;
            isCleansed = true;
            pushLog(`✨ **${attacker.characterName}** memicu jurus **[${cleanseSkill.name}]**, membersihkan debuff!`, 'cleanse', { skill: cleanseSkill.name, target: currentAttacker });
        }

        // Steal check (only p1 PvE)
        if (currentAttacker === 1 && options.allowSteal && !stealAttempted) {
            const stealExp = challenger.kungfuSkills?.stealing || 0;
            const stealLevel = getKungfuLevel(stealExp).level;
            const stealChance = COMBAT_COND.STEAL_BASE_CHANCE + getStealingSuccessBonus(stealLevel);
            stealAttempted = true;
            if (Math.random() < stealChance) {
                pushLog(`🕵️ **${attacker.characterName}** memanfaatkan kelengahan lawan dan berhasil mencuri!`, 'steal_success');
                stealSuccess = true;
            } else {
                pushLog(`🕵️ **${attacker.characterName}** mencoba mencuri tapi lawan waspada.`, 'steal_fail');
                stealSuccess = false;
            }
        }

        // Sinergi Law turn start (Pure Yang cleanse, combatHpRegenPct dll)
        attacker.hp = currentAttacker === 1 ? p1Hp : p2Hp;
        const turnLawExtras = onTurnStartLawExtras({ entity: attacker });
        if (turnLawExtras.notes && turnLawExtras.notes.length > 0) {
            pushLog(turnLawExtras.notes.join(' '), 'law_turn_extra', { target: currentAttacker });
        }
        if (typeof attacker.hp === 'number') {
            if (currentAttacker === 1) p1Hp = Math.min(p1MaxHp, attacker.hp);
            else p2Hp = Math.min(p2MaxHp, attacker.hp);
        }

        let psychosisCond = atkConds.find(c => c.type === 'psychosis');
        let hitSelf = false;
        if (psychosisCond && Math.random() < COMBAT_COND.PSYCHOSIS_MISS_OR_SELF_HIT_CHANCE) {
            hitSelf = true;
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

        if (activeSkill && currentAttacker === 1) {
            if (activeSkill.requiredSkillType) p1UsedSkillTypes.add(activeSkill.requiredSkillType);
            if (activeSkill.rootType) {
                p1UsedElementsCount[activeSkill.rootType] = (p1UsedElementsCount[activeSkill.rootType] || 0) + 1;
            }
        }

        // Resonansi Elemen: Skill Air memadamkan Burn, Skill Api mencairkan Frozen
        if (activeSkill && activeSkill.rootType) {
            const root = activeSkill.rootType.toLowerCase();
            if (root === 'air' || root === 'water') {
                if (attacker.conditions.burn > 0) {
                    attacker.conditions.burn = 0;
                    pushLog(`💧 [Resonansi Air] Jurus **${activeSkill.name}** memadamkan kobaran api luka bakar pada tubuh ${attacker.characterName}!`, 'elemental_cleanse');
                }
            } else if (root === 'api' || root === 'fire') {
                if (attacker.conditions.frozen > 0) {
                    attacker.conditions.frozen = 0;
                    pushLog(`🔥 [Resonansi Api] Hawa Yang jurus **${activeSkill.name}** mencairkan pembekuan es pada tubuh ${attacker.characterName}!`, 'elemental_cleanse');
                }
            }
        }

        let effectiveDefSpd = Math.max(0, defStats.spd - (atkStats.atk * 0.1));
        let baseDodgeChance = effectiveDefSpd / (effectiveDefSpd + 50000);
        let totalDodgeChance = baseDodgeChance + missMultiplier;

        if (!hitSelf && Math.random() < totalDodgeChance) {
             pushLog(`💨 **${defender.characterName}** bergerak lincah dan menghindari serangan!`, 'dodge', { attacker: currentAttacker, defender: currentAttacker === 1 ? 2 : 1 });
             round++;
             continue;
        }

        let effectiveDef = Math.max(0, (defStats.def * (hitSelf ? atkMod : 1)) - (atkStats.spd * 0.2));
        let dmg = Math.floor((atkStats.atk * atkMod) - (effectiveDef * 0.5));
        const defMult = getDefenseDamageMultiplier(hitSelf ? attacker : defender);
        if (defMult < 1.0) {
            dmg = Math.max(1, Math.floor(dmg * defMult));
        }

        let isCrit = false;
        let critChance = atkStats.critHitRate || BASE_CRIT_RATE;
        if (Math.random() < critChance) {
             dmg = Math.floor(dmg * (atkStats.critDmgRate || 1.5));
             isCrit = true;
        } else if (atkStats.luckRerollEligible && Math.random() < critChance) {
             // Pilar Luck: reroll 1x jika serangan pertama gagal crit (maks 1 reroll)
             dmg = Math.floor(dmg * (atkStats.critDmgRate || 1.5));
             isCrit = true;
        }

        if (atkAdvantage && !defAdvantage && !hitSelf) dmg = Math.floor(dmg * 1.15);
        if (!atkAdvantage && defAdvantage && !hitSelf) dmg = Math.floor(dmg * 0.85);

        if (activeSkill && activeSkill.type === 'damage') {
             let multiplier = activeSkill.value;
             let hasIntox = (attacker.conditions.intox || 0) > 0;
             if (hasIntox && attacker.manuals?.find(m=>m.manualId?.name === activeSkill.name)?.manualId?.requiredSkillType === 'wineArt') {
                 multiplier *= COMBAT_COND.INTOX_WINE_ART_MULTIPLIER;
             }
             dmg = Math.floor(dmg * multiplier);
        }

        if (!hitSelf) {
             const hasHitDefender = currentAttacker === 1 ? !!opponent._hasBeenHitByP1 : !!challenger._hasBeenHitByP2;
             const lawRes = applyLawDamageModifiers(attacker, defender, dmg, { skipReflect: true, hasHitDefender });
             if (currentAttacker === 1) opponent._hasBeenHitByP1 = true;
             else challenger._hasBeenHitByP2 = true;
             dmg = lawRes.finalDamage;
        }

        dmg = Math.max(1, dmg);

        // Calculate hits (Combo)
        let hits = 1;
        let comboChance = atkStats.comboRate !== undefined ? (atkStats.comboRate <= 1 ? atkStats.comboRate : atkStats.comboRate / 100) : BASE_COMBO_RATE;
        if (Math.random() < comboChance) {
            hits = 2;
        }

        let getDefShield = () => currentAttacker === 1 ? p2Shield : p1Shield;
        let setDefShield = (val) => currentAttacker === 1 ? (p2Shield = val) : (p1Shield = val);

        let defShieldSkill = defSkills.find(s => s.type === 'shield');
        if (defShieldSkill && getDefShield() <= 0 && Math.random() < defShieldSkill.triggerChance) {
            let shieldAmt = Math.floor(defMaxHp * (defShieldSkill.value - 1));
            setDefShield(shieldAmt);
            pushLog(`🛡️ **${defender.characterName}** memicu jurus **[${defShieldSkill.name}]**, mendapatkan perisai sebesar **${shieldAmt}**!`, 'shield_gain', { target: currentAttacker === 1 ? 2 : 1, amount: shieldAmt });
        }

        let totalDmgDone = 0;
        let actTarget = hitSelf ? attacker : defender;
        let actTargetIdx = hitSelf ? currentAttacker : (currentAttacker === 1 ? 2 : 1);

        for (let i = 0; i < hits; i++) {
            let hitDmg = i === 1 ? Math.floor(dmg * COMBO_HIT_MULTIPLIER) : dmg;

            let actualDmgToHp = hitDmg;
            if (!hitSelf && getDefShield() > 0) {
                let remainingShield = getDefShield() - hitDmg;
                if (remainingShield > 0) {
                    setDefShield(remainingShield);
                    actualDmgToHp = 0;
                    pushLog(`🛡️ Perisai **${actTarget.characterName}** menyerap seluruh damage! (Sisa Perisai: **${remainingShield}**)`, 'shield_block');
                } else {
                    setDefShield(0);
                    actualDmgToHp = Math.abs(remainingShield);
                    pushLog(`🛡️ Serangan menghancurkan perisai **${actTarget.characterName}**!`, 'shield_break');
                }
            }

            if (actTargetIdx === 1) p1Hp -= actualDmgToHp; else p2Hp -= actualDmgToHp;
            totalDmgDone += actualDmgToHp;

            let atkMsg = activeSkill && i === 0
                ? `💥 **${attacker.characterName}** menggunakan **[${activeSkill.name}]** kepada **${actTarget.characterName}**! Menimbulkan **${actualDmgToHp}** damage.`
                : (hitSelf ? `😵 **${attacker.characterName}** linglung dan melukai diri sendiri sebesar **${actualDmgToHp}** damage!` : `⚔️ **${attacker.characterName}** menyerang **${actTarget.characterName}**! Menimbulkan **${actualDmgToHp}** damage.`);
            if (isCrit && i === 0) atkMsg += ' *(Critical Hit!)*';
            if (i === 1) atkMsg += ' *(Combo Hit!)*';

            pushLog(atkMsg, 'attack', {
                attacker: currentAttacker,
                defender: actTargetIdx,
                damage: actualDmgToHp,
                isCrit: isCrit && i === 0,
                isCombo: i === 1,
                skill: i === 0 ? activeSkill?.name : null
            });

            // Sinergi Law saat hit mendarat (termasuk Heavy Hit injury >= 15% maxHp via onSkillHitLawExtras)
            attacker.hp = currentAttacker === 1 ? p1Hp : p2Hp;
            defender.hp = actTargetIdx === 1 ? p1Hp : p2Hp;
            const lawExtras = onSkillHitLawExtras({
                attacker: attacker,
                defender: actTarget,
                skill: activeSkill,
                damage: actualDmgToHp,
                isCrit: isCrit && i === 0
            });
            if (lawExtras.notes && lawExtras.notes.length > 0) {
                pushLog(lawExtras.notes.join(' '), 'law_hit_extra', { target: actTargetIdx });
            }
            if (typeof attacker.hp === 'number') {
                if (currentAttacker === 1) p1Hp = Math.min(p1MaxHp, attacker.hp);
                else p2Hp = Math.min(p2MaxHp, attacker.hp);
            }

            if (actTargetIdx === 1 && p1Hp <= 0) break;
            if (actTargetIdx === 2 && p2Hp <= 0) {
                const beastHealPct = Math.min(0.08, challenger.extendedStats?.beastHealOnKillPct || 0);
                if (beastHealPct > 0 && p1Hp > 0) {
                    const healAmt = Math.max(1, Math.floor(p1MaxHp * beastHealPct));
                    p1Hp = Math.min(p1MaxHp, p1Hp + healAmt);
                    pushLog(`🐾 **${challenger.characterName}** menyerap vitalitas lawan gugur (+${healAmt} HP)!`, 'heal', { target: 1, amount: healAmt });
                }
                break;
            }
        }

        if (activeSkill && totalDmgDone > 0 && !hitSelf) {
             if (activeSkill.type === 'lifesteal') {
                  let heal = Math.floor(totalDmgDone * (activeSkill.value - 1));
                  let burnCond = atkConds.find(c => c.type === 'burn');
                  if (burnCond && burnCond.severity >= COMBAT_COND.BURN_INCINERATED_THRESHOLD) {
                      heal = Math.floor(heal * (1 - COMBAT_COND.HEALING_REDUCTION_INCINERATED));
                      pushLog(`🔥 Efek Incinerated mengurangi healing **${attacker.characterName}**!`, 'burn_incinerated');
                  }
                  if (currentAttacker === 1) p1Hp = Math.min(p1Stats.maxHp, p1Hp + heal);
                  else p2Hp = Math.min(p2Stats.maxHp, p2Hp + heal);
                  pushLog(`🩸 **${attacker.characterName}** menyerap **${heal}** HP!`, 'heal', { target: currentAttacker, amount: heal });
             } else if (activeSkill.type === 'poison') {
                  applyStatus(defender, 'poison', { stacks: 20 });
                  pushLog(`☠️ **${defender.characterName}** terkena racun!`, 'poison_apply', { target: currentAttacker === 1 ? 2 : 1 });
             } else if (activeSkill.type === 'stun') {
                  applyStatus(defender, 'stun', { duration: 1 });
                  pushLog(`💫 **${defender.characterName}** terkena efek Stun!`, 'stun_apply', { target: currentAttacker === 1 ? 2 : 1 });
             } else if (activeSkill.type === 'burn') {
                  applyStatus(defender, 'burn', { stacks: 25 });
                  pushLog(`🔥 **${defender.characterName}** terbakar!`, 'burn_apply', { target: currentAttacker === 1 ? 2 : 1 });
             }
        }

        let defReflectSkill = defSkills.find(s => s.type === 'reflect');
        if (defReflectSkill && totalDmgDone > 0 && !hitSelf && Math.random() < defReflectSkill.triggerChance) {
             let reflectDmg = Math.floor(totalDmgDone * (defReflectSkill.value - 1));
             if (currentAttacker === 1) p1Hp -= reflectDmg; else p2Hp -= reflectDmg;
             pushLog(`🪞 **${defender.characterName}** memicu **[${defReflectSkill.name}]** memantulkan **${reflectDmg}** damage!`, 'reflect', { target: currentAttacker, damage: reflectDmg });
        } else if (totalDmgDone > 0 && !hitSelf) {
             const lawRes = applyLawDamageModifiers(attacker, defender, totalDmgDone);
             if (lawRes.reflectedDamage > 0) {
                 if (currentAttacker === 1) p1Hp -= lawRes.reflectedDamage; else p2Hp -= lawRes.reflectedDamage;
                 pushLog(`🪞 **${defender.characterName}** memantulkan [Cermin Karma] **${lawRes.reflectedDamage}** damage!`, 'reflect', { target: currentAttacker, damage: lawRes.reflectedDamage });
             }
        }

        round++;
    }

    let winnerIdx = null;
    if (p1Hp > 0 && p2Hp > 0 && round > 20) {
        const p1HpPercentage = (p1Hp / p1Stats.maxHp) * 100;
        const p2HpPercentage = (p2Hp / p2Stats.maxHp) * 100;
        if (p1HpPercentage > p2HpPercentage) {
            winnerIdx = 1;
        } else {
            winnerIdx = 2;
        }
        pushLog(`⏳ **Batas 20 Ronde Tercapai!**\nSisa HP ${challenger.characterName}: ${p1HpPercentage.toFixed(1)}% | ${opponent.characterName}: ${p2HpPercentage.toFixed(1)}%`, 'time_limit');
    } else {
        winnerIdx = p1Hp > 0 ? 1 : 2;
    }

    // Ensure PVE loss leaves HP at 1
    if (winnerIdx === 2 && options.isPvE) {
        p1Hp = Math.max(1, p1Hp);
    } else {
        p1Hp = Math.max(0, p1Hp);
    }
    p2Hp = Math.max(0, p2Hp);

    pushLog(`🏆 **${winnerIdx === 1 ? challenger.characterName : opponent.characterName}** memenangkan duel ini!`, 'battle_end', { winner: winnerIdx });

    // Hitung perolehan Kungfu XP dari aksi nyata dalam pertarungan
    let baseCombatExp = Math.min(50, 15 + (round * 2));
    if (winnerIdx === 1) baseCombatExp += 10;
    let stealingExp = 0;
    if (stealAttempted) {
        stealingExp = stealSuccess ? 25 : 10;
    }

    // EXP disiplin senjata HANYA diberikan sesuai senjata yang benar-benar dibawa/diequip.
    // Jika tidak membawa senjata, p1WeaponDiscipline = 'fist' (tinju tangan kosong).
    // Disiplin sword HANYA diperoleh jika pemain benar-benar membawa/equip pedang!
    const kungfuGains = {
        weaponDiscipline: p1WeaponDiscipline,
        weaponExp: baseCombatExp,
        weaponItemName: hasP1Weapon ? (p1EquippedWeapon.name || 'Senjata') : null,
        usedSkills: Array.from(p1UsedSkillTypes),
        usedElementsCount: p1UsedElementsCount,
        stealingExp
    };

    return {
        logs: combatLogs,
        winnerIdx,
        p1Hp,
        p2Hp,
        p1MaxHp,
        p2MaxHp,
        p1Stats,
        p2Stats,
        p1Conditions: challenger.conditions,
        p2Conditions: opponent.conditions,
        p1StatusBadges: getStatusBadges(challenger),
        p2StatusBadges: getStatusBadges(opponent),
        stealSuccess,
        stealAttempted,
        kungfuGains
    };
}

module.exports = { simulateBattle };
