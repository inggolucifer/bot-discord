const BattleSession = require('../models/BattleSession');
const Player = require('../models/Player');
const { v4: uuidv4 } = require('uuid');

class InteractiveBattleService {
  /**
   * Mulai pertempuran baru
   */
  static async startBattle(player, enemiesInput, type = 'pve', zoneId = 'unknown') {
    // Validasi apakah player sedang dalam battle
    const existing = await BattleSession.findOne({
      'player.entityId': player.discordId,
      status: 'ongoing'
    });
    if (existing) {
      throw new Error('Kamu masih berada dalam pertempuran lain!');
    }

    // Parse Player to Entity
    const playerEntity = {
      entityId: player.discordId,
      entityType: 'player',
      name: player.characterName || 'Pendekar',
      level: player.level || 1,
      imageUrl: player.characterImage || player.imageUrl,
      hp: player.currentHp || player.maxHp,
      maxHp: player.maxHp,
      qi: player.currentQi || 0,
      maxQi: player.maxQi || 100,
      stamina: player.currentStamina || 100,
      maxStamina: player.maxStamina || 100,
      attack: player.stats?.attack || 10,
      defense: player.stats?.defense || 10,
      speed: player.stats?.speed || 10,
      atb: 0,
      maxAtb: 1000,
      stance: player.stats?.stance || 100,
      maxStance: player.stats?.stance || 100,
      skills: this.formatPlayerSkills(player)
    };

    // Parse Enemies
    const enemies = enemiesInput.map((e, index) => ({
      entityId: e.id || `enemy_${index}_${uuidv4().slice(0,6)}`,
      entityType: type === 'pvp' ? 'player' : 'monster', // Ghost AI for PvP
      name: e.name || 'Musuh Misterius',
      level: e.level || 1,
      imageUrl: e.imageUrl || null,
      hp: e.hp || e.maxHp || 50,
      maxHp: e.maxHp || 50,
      qi: e.qi || 0,
      maxQi: e.maxQi || 100,
      stamina: 100,
      maxStamina: 100,
      attack: e.attack || 5,
      defense: e.defense || 5,
      speed: e.speed || 5,
      atb: Math.floor(Math.random() * 200), // Random starting ATB
      maxAtb: 1000,
      stance: e.stance || 100,
      maxStance: e.stance || 100,
      skills: e.skills || [{
        skillId: 'basic_attack',
        name: 'Serangan Biasa',
        description: 'Serangan fisik standar',
        type: 'attack',
        power: 10,
        qiCost: 0,
        cooldown: 0,
        currentCooldown: 0
      }]
    }));

    const battleId = `BTL-${uuidv4().slice(0,8).toUpperCase()}`;
    const session = new BattleSession({
      battleId,
      type,
      zoneId,
      player: playerEntity,
      enemies,
      logs: [{
        tick: 0,
        actor: 'System',
        action: 'start',
        message: `Pertempuran melawan ${enemies.map(e => e.name).join(', ')} dimulai!`
      }]
    });

    await session.save();
    return session;
  }

  static formatPlayerSkills(player) {
    const skills = [
      {
        skillId: 'basic_attack',
        name: 'Pukulan Biasa',
        description: 'Serangan fisik dasar tanpa Qi.',
        type: 'attack',
        power: 10,
        qiCost: 0,
        cooldown: 0,
        currentCooldown: 0
      }
    ];

    // Map learned manuals to active skills if equipped
    if (player.manuals) {
      player.manuals.forEach(m => {
        if (m.equipped && m.manualId) {
          skills.push({
            skillId: m.manualId._id.toString(),
            name: m.manualId.name,
            description: m.manualId.description || 'Jurus bela diri',
            type: m.manualId.type === 'healing' ? 'heal' : 'attack',
            power: m.manualId.basePower || 25,
            qiCost: m.manualId.qiCost || 20,
            cooldown: m.manualId.cooldown || 2,
            currentCooldown: 0
          });
        }
      });
    }

    // Add Qi Overload Ultimate (if level is high enough or has condition)
    if (player.level >= 10) {
      skills.push({
        skillId: 'qi_overload',
        name: 'Ledakan Qi (Ultimate)',
        description: 'Mengorbankan semua Qi untuk serangan fatal mengabaikan 50% defense musuh.',
        type: 'ultimate',
        power: 50,
        qiCost: 100,
        cooldown: 5,
        currentCooldown: 0
      });
    }

    return skills;
  }

  /**
   * ATB Tick System
   * Advances the ATB bars based on speed until someone reaches maxAtb
   */
  static async processTick(battleId) {
    const session = await BattleSession.findOne({ battleId, status: 'ongoing' });
    if (!session) return null;

    if (session.turnQueue.length > 0) {
      // Someone is already ready to act, process AI if it's their turn
      await this.processAIQueue(session);
      return session;
    }

    // Find the next entity to reach 1000 ATB
    let ticksToNextTurn = 9999;
    let nextActorId = null;

    const entities = [session.player, ...session.enemies.filter(e => !e.isDead)];
    
    entities.forEach(entity => {
      if (entity.isDead) return;
      const speed = Math.max(1, entity.speed);
      const remainingAtb = entity.maxAtb - entity.atb;
      const ticksNeeded = Math.ceil(remainingAtb / speed);
      
      if (ticksNeeded < ticksToNextTurn) {
        ticksToNextTurn = ticksNeeded;
        nextActorId = entity.entityId;
      }
    });

    if (!nextActorId) return session; // All dead?

    // Advance everyone's ATB by ticksToNextTurn
    entities.forEach(entity => {
      if (entity.isDead) return;
      entity.atb += entity.speed * ticksToNextTurn;
      if (entity.atb >= entity.maxAtb) {
        entity.atb = entity.maxAtb;
        if (!session.turnQueue.includes(entity.entityId)) {
          session.turnQueue.push(entity.entityId);
        }
      }
    });

    session.currentTick += ticksToNextTurn;
    
    // Reduce cooldowns for the entity whose turn it is
    session.turnQueue.forEach(id => {
        const actor = entities.find(e => e.entityId === id);
        if (actor) {
            actor.skills.forEach(s => {
                if (s.currentCooldown > 0) s.currentCooldown--;
            });
        }
    });

    await this.processAIQueue(session);

    await session.save();
    return session;
  }

  /**
   * Process AI actions if AI is in the queue
   */
  static async processAIQueue(session) {
    while (session.turnQueue.length > 0) {
      const actorId = session.turnQueue[0];
      if (actorId === session.player.entityId) {
        // It's player's turn, wait for user input
        break;
      }

      // It's enemy (AI) or Ghost Player
      const enemy = session.enemies.find(e => e.entityId === actorId);
      if (!enemy || enemy.isDead) {
        session.turnQueue.shift();
        continue;
      }

      // AI Logic: Pick target (only player for now since it's 1vN)
      const targetId = session.player.entityId;
      
      // AI Logic: Pick skill (random available)
      const availableSkills = enemy.skills.filter(s => s.currentCooldown <= 0 && enemy.qi >= (s.qiCost || 0));
      let skillToUse = availableSkills.find(s => s.skillId === 'basic_attack');
      if (availableSkills.length > 1 && Math.random() > 0.4) {
        const specials = availableSkills.filter(s => s.skillId !== 'basic_attack');
        if (specials.length > 0) {
           skillToUse = specials[Math.floor(Math.random() * specials.length)];
        }
      }

      if (!skillToUse) {
         // Fallback struggle
         skillToUse = { skillId: 'struggle', name: 'Merapal acak', type: 'attack', power: 5, qiCost: 0 };
      }

      await this.resolveAction(session, actorId, 'skill', skillToUse.skillId, targetId);
    }
  }

  /**
   * Player executes an action
   */
  static async executeAction(battleId, actorId, actionType, skillId, targetId) {
    const session = await BattleSession.findOne({ battleId, status: 'ongoing' });
    if (!session) throw new Error('Pertempuran tidak ditemukan atau sudah selesai.');

    if (session.turnQueue[0] !== actorId) {
      throw new Error('Belum giliranmu untuk menyerang!');
    }

    if (actionType === 'item') {
      throw new Error('Tidak boleh menggunakan item (potion) ketika dalam pertempuran!');
    }

    if (actionType === 'flee') {
      // Calculate flee chance based on speed
      const playerSpeed = session.player.speed;
      const maxEnemySpeed = Math.max(...session.enemies.filter(e => !e.isDead).map(e => e.speed));
      
      const fleeChance = Math.min(0.9, Math.max(0.1, (playerSpeed / maxEnemySpeed) * 0.5));
      if (Math.random() < fleeChance) {
        session.status = 'fled';
        session.logs.push({
          tick: session.currentTick,
          actor: session.player.name,
          action: 'flee',
          message: `${session.player.name} berhasil melarikan diri dari pertempuran!`
        });
        session.turnQueue.shift();
        await session.save();
        return session;
      } else {
        session.logs.push({
          tick: session.currentTick,
          actor: session.player.name,
          action: 'flee',
          message: `${session.player.name} mencoba kabur, tapi musuh terlalu cepat!`
        });
        
        const actor = session.player;
        actor.atb = 0;
        session.turnQueue.shift();
        await session.save();
        return this.processTick(battleId);
      }
    }

    await this.resolveAction(session, actorId, actionType, skillId, targetId);
    return await this.processTick(battleId); // advance to next turn automatically
  }

  static async resolveAction(session, actorId, actionType, skillId, targetId) {
    const isPlayer = actorId === session.player.entityId;
    const actor = isPlayer ? session.player : session.enemies.find(e => e.entityId === actorId);
    const target = isPlayer ? session.enemies.find(e => e.entityId === targetId) : session.player;

    if (!actor || actor.isDead) {
      session.turnQueue.shift();
      return;
    }
    
    if (!target && actionType !== 'flee' && actionType !== 'heal') {
       // Auto target random alive enemy if target is missing/dead
       const aliveEnemies = session.enemies.filter(e => !e.isDead);
       if (aliveEnemies.length === 0) {
           session.turnQueue.shift();
           return;
       }
       target = aliveEnemies[0];
    }

    let skill = null;
    if (actionType === 'skill' || actionType === 'attack') {
       skill = actor.skills.find(s => s.skillId === skillId);
       if (!skill && actionType === 'attack') skill = actor.skills.find(s => s.skillId === 'basic_attack');
       
       if (!skill) throw new Error('Skill tidak ditemukan.');
       if (skill.currentCooldown > 0) throw new Error('Skill masih cooldown!');
       if (actor.qi < (skill.qiCost || 0)) throw new Error('Qi tidak cukup!');

       actor.qi -= (skill.qiCost || 0);
       skill.currentCooldown = skill.cooldown || 0;
    }

    // Damage Calculation
    if (skill && (skill.type === 'attack' || skill.type === 'ultimate')) {
       // Stance Break mechanic: if target's stance is 0, they take 50% more damage
       const isStanceBroken = target.stance <= 0;
       
       // Qi Overload: Ultimate ignores 50% defense
       const defenseToUse = skill.type === 'ultimate' ? target.defense * 0.5 : target.defense;
       
       // Base formula: (Attack * Power / Defense) * Random(0.85, 1.15)
       let damage = Math.max(1, Math.floor((actor.attack * (skill.power / 10)) / (defenseToUse / 10 + 1)));
       
       // Modifiers
       if (isStanceBroken) damage = Math.floor(damage * 1.5);
       
       // Critical Hit (10% chance)
       const isCrit = Math.random() < 0.10;
       if (isCrit) damage = Math.floor(damage * 1.5);
       
       // Apply Variance
       damage = Math.floor(damage * (0.85 + Math.random() * 0.3));

       // Stance Damage
       const stanceDamage = Math.floor(damage * 0.2); // 20% of damage damages stance
       target.stance = Math.max(0, target.stance - stanceDamage);

       // HP Damage
       target.hp -= damage;
       if (target.hp <= 0) {
         target.hp = 0;
         target.isDead = true;
       }

       let logMsg = `${actor.name} menggunakan ${skill.name} ke ${target.name} memberikan ${damage} DMG!`;
       if (isCrit) logMsg += ' (Kritikal!)';
       if (target.stance <= 0 && target.stance + stanceDamage > 0) logMsg += ` Stance ${target.name} Hancur (Break)!`;
       if (target.isDead) logMsg += ` ${target.name} terbunuh!`;

       session.logs.push({
         tick: session.currentTick,
         actor: actor.name,
         target: target.name,
         action: 'skill',
         skillName: skill.name,
         damage: damage,
         critical: isCrit,
         message: logMsg
       });
    }

    // Reset ATB and shift queue
    actor.atb = 0;
    session.turnQueue.shift();
    
    // Check Win/Loss Condition
    this.checkWinCondition(session);
    await session.save();
  }

  static checkWinCondition(session) {
    if (session.player.isDead) {
      session.status = 'lost';
      session.logs.push({
        tick: session.currentTick,
        actor: 'System',
        action: 'end',
        message: 'Kamu kalah dalam pertempuran...'
      });
      return;
    }

    const allEnemiesDead = session.enemies.every(e => e.isDead);
    if (allEnemiesDead) {
      session.status = 'won';
      
      // Calculate Rewards
      let totalExp = 0;
      let totalSilver = 0;
      session.enemies.forEach(e => {
         totalExp += e.level * 10;
         totalSilver += e.level * 5;
      });
      
      session.rewards = {
        exp: totalExp,
        silver: totalSilver,
        items: []
      };

      session.logs.push({
        tick: session.currentTick,
        actor: 'System',
        action: 'end',
        message: `Kemenangan! Mendapat ${totalExp} EXP dan ${totalSilver} Keping Perak.`
      });
    }
  }
}

module.exports = InteractiveBattleService;
