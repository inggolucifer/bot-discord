const BattleSession = require('../models/BattleSession');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

class InteractiveBattleService {
  /**
   * Peta Adaptasi Basic Attack (Tackle) Berdasarkan Disiplin Senjata
   */
  static BASIC_ATTACK_MAP = {
    sword: {
      name: 'Tebasan Pedang',
      desc: 'Tebasan pedang cepat dan presisi menembus pertahanan lawan.',
      icon: '🗡️',
      element: 'metal',
      critBonus: 0.05,
      stanceDmgMult: 1.0,
      aoeAll: false,
      qiRegen: 0,
      debuffChance: 0,
      debuffType: null
    },
    saber: {
      name: 'Tebas Golok',
      desc: 'Tebasan miring bertenaga penuh yang mengacaukan keseimbangan lawan.',
      icon: '⚔️',
      element: 'metal',
      critBonus: 0,
      stanceDmgMult: 1.25,
      aoeAll: false,
      qiRegen: 0,
      debuffChance: 0,
      debuffType: null
    },
    staff: {
      name: 'Sapuan Senjata',
      desc: 'Sapuan horizontal senjata bertangkai panjang menyapu semua musuh aktif di depan.',
      icon: '🥢',
      element: 'earth',
      critBonus: 0,
      stanceDmgMult: 1.0,
      aoeAll: true, // Kena semua musuh aktif
      qiRegen: 0,
      debuffChance: 0,
      debuffType: null
    },
    fist: {
      name: 'Pukulan Telak',
      desc: 'Pukulan keras bertenaga otot murni tanpa Qi. Memulihkan +5 Qi saat mendarat.',
      icon: '👊',
      element: 'neutral',
      critBonus: 0,
      stanceDmgMult: 1.0,
      aoeAll: false,
      qiRegen: 5,
      debuffChance: 0,
      debuffType: null
    },
    hiddenWeapon: {
      name: 'Lemparan Rahasia',
      desc: 'Melempar proyektil rahasia dengan kecepatan tinggi. 15% peluang meracuni target.',
      icon: '🎯',
      element: 'neutral',
      critBonus: 0,
      stanceDmgMult: 1.0,
      aoeAll: false,
      qiRegen: 0,
      debuffChance: 0.15,
      debuffType: 'poison'
    },
    finger: {
      name: 'Totokan Meridian',
      desc: 'Menusuk titik saraf lawan dengan jari baja. 20% peluang melumpuhkan lawan 1 ronde.',
      icon: '👆',
      element: 'neutral',
      critBonus: 0,
      stanceDmgMult: 1.0,
      aoeAll: false,
      qiRegen: 0,
      debuffChance: 0.20,
      debuffType: 'stun'
    },
    default: {
      name: 'Tinju Tangan Kosong',
      desc: 'Serangan fisik dasar tanpa senjata. Memulihkan +5 Qi saat mendarat.',
      icon: '👊',
      element: 'neutral',
      critBonus: 0,
      stanceDmgMult: 1.0,
      aoeAll: false,
      qiRegen: 5,
      debuffChance: 0,
      debuffType: null
    }
  };

  /**
   * Bangun Basic Attack Adaptif
   */
  static buildAdaptiveBasicAttack(discipline, power) {
    const template = this.BASIC_ATTACK_MAP[discipline] || this.BASIC_ATTACK_MAP.default;
    return {
      skillId: 'basic_attack',
      name: template.name,
      description: template.desc,
      type: 'attack',
      icon: template.icon,
      power: Math.max(10, power),
      qiCost: 0,
      cooldown: 0,
      currentCooldown: 0,
      element: template.element,
      critBonus: template.critBonus,
      stanceDmgMult: template.stanceDmgMult,
      aoeAll: template.aoeAll,
      qiRegen: template.qiRegen,
      debuffChance: template.debuffChance,
      debuffType: template.debuffType,
      isBasicAttack: true,
      kungfuDiscipline: discipline
    };
  }

  /**
   * Format & generate skill pool untuk player:
   * Slot 1: Selalu Basic Attack adaptif sesuai senjata (atau tinju jika tanpa senjata).
   * Slot 2+: HANYA manual teknik yang sudah dipelajari dan dipahami dari player.manuals.
   * Tidak ada jurus hardcoded (Qi Strike, Iron Wall, Qi Overload telah dihapus).
   */
  static formatPlayerSkills(player) {
    const { resolveWeaponDiscipline, getKungfuLevel } = require('../utils/kungfuMastery');

    // 1. Deteksi senjata yang di-equip
    let equippedWeapon = null;
    let weaponDiscipline = 'fist';
    let weaponBaseAtk = 0;

    if (player.inventory && Array.isArray(player.inventory)) {
      const equipSlotIds = player.equipment
        ? Object.values(player.equipment).filter(v => v).map(v => v.toString())
        : [];

      for (const inv of player.inventory) {
        const isEquipped = inv.isEquipped || (inv._id && equipSlotIds.includes(inv._id.toString()));
        const item = inv.itemId;
        if (isEquipped && item && (item.category === 'weapon' || item.type === 'weapon')) {
          equippedWeapon = item;
          weaponDiscipline = resolveWeaponDiscipline(item);
          weaponBaseAtk = item.baseAtk || item.stats?.atk || 0;
          break;
        }
      }
    }

    // 2. Hitung level kemahiran senjata aktif
    const kungfuExp = player.kungfuSkills?.[weaponDiscipline] || 0;
    const kungfuLevel = getKungfuLevel(kungfuExp).level;

    // 3. Bangun basic attack adaptif
    const tacklePower = 10 + Math.floor(weaponBaseAtk * 0.3) + Math.floor(kungfuLevel * 0.1);
    const basicAttack = this.buildAdaptiveBasicAttack(weaponDiscipline, tacklePower);

    // 4. Hanya tambahkan manual teknik yang sudah dipelajari dari player.manuals
    const manualSkills = [];
    if (Array.isArray(player.manuals)) {
      for (const m of player.manuals) {
        if (!m || !m.manualId) continue;
        const manual = m.manualId;
        const isPopulated = typeof manual === 'object' && manual.name;
        if (!isPopulated) continue;

        const sId = manual._id ? manual._id.toString() : (manual.key || manual.name);
        if (manualSkills.some(s => s.skillId === sId)) continue; // Hindari duplikasi

        const sType = manual.type === 'healing' ? 'heal' : (manual.type === 'defend' ? 'defend' : 'attack');
        const sPower = (manual.basePower || 20) + (m.level || 0) * 5;
        const sCost = manual.qiCost !== undefined ? manual.qiCost : 20;
        const sCd = manual.cooldown !== undefined ? manual.cooldown : 2;

        manualSkills.push({
          skillId: sId,
          name: manual.name,
          description: manual.description || 'Jurus teknik bela diri tingkat tinggi.',
          type: sType,
          icon: sType === 'heal' ? '💚' : (sType === 'defend' ? '🛡️' : '✨'),
          power: sPower,
          qiCost: sCost,
          cooldown: sCd,
          currentCooldown: 0,
          element: manual.element || 'neutral',
          critBonus: manual.critBonus || 0,
          stanceDmgMult: manual.stanceDmgMult || 1.0,
          aoeAll: !!manual.aoeAll,
          qiRegen: manual.qiRegen || 0,
          debuffChance: manual.debuffChance || 0,
          debuffType: manual.debuffType || null,
          isBasicAttack: false,
          kungfuDiscipline: manual.requiredSkillType || weaponDiscipline
        });
      }
    }

    // 5. Skill pool: [Basic Attack Adaptif] + [Semua Manual Teknik yang Dipahami]
    return [basicAttack, ...manualSkills];
  }

  /**
   * Mulai pertempuran baru (PvE / PvP / Boss / Multi-Enemy / Allies)
   */
  static async startBattle(player, enemiesInput, type = 'pve', zoneId = 'unknown', alliesInput = [], options = {}) {
    // Bersihkan sesi pertempuran ongoing sebelumnya milik pemain ini
    await BattleSession.deleteMany({
      'player.entityId': player.discordId,
      status: 'ongoing'
    });

    // Hitung stat player
    const { getComputedStats } = require('../utils/statCalculator');
    const computedStats = getComputedStats(player, player.laws || [], player.manuals || []);
    const maxHp = computedStats.maxHp || player.stats?.maxHp || player.stats?.baseHp || 100;
    const currentHp = (player.currentHp !== null && player.currentHp !== undefined && !isNaN(player.currentHp))
      ? player.currentHp
      : maxHp;
    const maxQi = player.maxQi || 100;
    const currentQi = (player.currentQi !== null && player.currentQi !== undefined && player.currentQi > 0)
      ? player.currentQi
      : 30; // Qi awal pertarungan

    const playerEntity = {
      entityId: player.discordId,
      entityType: 'player',
      name: player.characterName || 'Pendekar',
      level: player.level || 1,
      imageUrl: player.characterImage || player.imageUrl || null,
      element: 'neutral',
      tierSize: 'small',
      isAlly: false,
      allyType: null,
      hp: currentHp,
      maxHp: maxHp,
      qi: currentQi,
      maxQi: maxQi,
      stamina: player.currentStamina || 100,
      maxStamina: player.maxStamina || 100,
      attack: computedStats.atk || player.stats?.atk || 15,
      defense: computedStats.def || player.stats?.def || 10,
      speed: computedStats.spd || player.stats?.spd || 10,
      atb: 1000,
      maxAtb: 1000,
      stance: player.stats?.stance || 100,
      maxStance: player.stats?.stance || 100,
      buffs: [],
      debuffs: [],
      skills: this.formatPlayerSkills(player)
    };

    // Konversi Sekutu (Allies: NPC / Pet)
    const allies = (alliesInput || []).slice(0, 3).map((a, idx) => ({
      entityId: a.entityId || `ally_${idx}_${uuidv4().slice(0, 6)}`,
      entityType: a.entityType || 'npc',
      name: a.name || 'Sekutu Roh',
      level: a.level || 1,
      imageUrl: a.imageUrl || null,
      element: a.element || 'neutral',
      tierSize: 'small',
      isAlly: true,
      allyType: a.allyType || 'pet',
      hp: a.hp || 80,
      maxHp: a.maxHp || 80,
      qi: a.qi || 0,
      maxQi: a.maxQi || 50,
      stamina: 100,
      maxStamina: 100,
      attack: a.attack || 14,
      defense: a.defense || 8,
      speed: a.speed || 9,
      atb: 500,
      maxAtb: 1000,
      stance: 80,
      maxStance: 80,
      buffs: [],
      debuffs: [],
      skills: a.skills || [{
        skillId: 'ally_strike',
        name: 'Bantuan Serangan',
        type: 'attack',
        power: 14,
        qiCost: 0,
        cooldown: 0
      }]
    }));

    // Konversi Semua Musuh (Mendukung hingga 8 musuh: max 4 aktif di medan tempur, sisanya di enemyQueue)
    const maxActive = options.maxActiveEnemies || 4;
    const allEnemiesConverted = enemiesInput.map((e, index) => ({
      entityId: e.id || e.entityId || `enemy_${index}_${uuidv4().slice(0, 6)}`,
      entityType: type === 'pvp' ? 'player' : 'monster',
      name: e.name || 'Musuh Misterius',
      level: e.level || e.tier || 1,
      imageUrl: e.imageUrl || null,
      element: e.element || 'neutral',
      tierSize: e.tierSize || (e.tier >= 4 ? 'boss' : (e.tier >= 3 ? 'large' : (e.tier >= 2 ? 'medium' : 'small'))),
      isAlly: false,
      allyType: null,
      hp: e.hp || e.maxHp || 60,
      maxHp: e.maxHp || e.hp || 60,
      qi: e.qi || 0,
      maxQi: e.maxQi || 100,
      stamina: 100,
      maxStamina: 100,
      attack: e.attack || e.atk || 12,
      defense: e.defense || e.def || 6,
      speed: e.speed || e.spd || 8,
      atb: 0,
      maxAtb: 1000,
      stance: e.stance || 100,
      maxStance: e.stance || 100,
      buffs: [],
      debuffs: [],
      skills: (e.skills && e.skills.length > 0) ? e.skills : [{
        skillId: 'basic_attack',
        name: 'Serangan Cakar Liar',
        description: 'Serangan fisik liar',
        type: 'attack',
        power: 12,
        qiCost: 0,
        cooldown: 0,
        currentCooldown: 0
      }]
    }));

    const activeEnemies = allEnemiesConverted.slice(0, maxActive);
    const enemyQueue = allEnemiesConverted.slice(maxActive);

    const battleId = `BTL-${uuidv4().slice(0, 8).toUpperCase()}`;
    const session = new BattleSession({
      battleId,
      type,
      zoneId,
      player: playerEntity,
      allies,
      enemies: activeEnemies,
      enemyQueue,
      battleConfig: {
        maxActiveEnemies: maxActive,
        isBossMode: !!options.isBossMode,
        eventContext: options.eventContext || null,
        tileKey: options.tileKey || null,
        zoneId
      },
      turnQueue: [playerEntity.entityId], // Giliran pertama selalu pemain
      currentTick: 1,
      logs: [{
        tick: 0,
        actor: 'System',
        action: 'start',
        message: `⚔️ Pertempuran dimulai! Menghadapi ${activeEnemies.map(e => e.name).join(', ')}${enemyQueue.length > 0 ? ` (+${enemyQueue.length} musuh cadangan dalam bayangan)` : ''}!`
      }]
    });

    await session.save();
    return session;
  }

  /**
   * Eksekusi Aksi Ronde Penuh (Round-Trip Instant Turn Engine)
   */
  static async executeAction(battleId, actorId, actionType, skillId, targetId) {
    const session = await BattleSession.findOne({ battleId, status: 'ongoing' });
    if (!session) throw new Error('Pertempuran tidak ditemukan atau sudah selesai.');

    if (session.player.entityId !== actorId) {
      throw new Error('Kamu bukan pemilik sesi pertempuran ini!');
    }

    if (session.player.isDead) {
      throw new Error('Karaktermu telah tumbang dan tidak dapat beraksi.');
    }

    // Auto-sync turnQueue
    if (!session.turnQueue || session.turnQueue.length === 0 || session.turnQueue[0] !== actorId) {
      session.turnQueue = [actorId];
    }

    // 1. Cek Apakah Pemain Terkena Stun
    const isPlayerStunned = Array.isArray(session.player.debuffs) && session.player.debuffs.some(d => d.type === 'stun' && d.duration > 0);
    if (isPlayerStunned) {
      session.logs.push({
        tick: session.currentTick,
        actor: session.player.name,
        action: 'effect',
        message: `⚡ ${session.player.name} terkena efek lumpuh/totokan saraf (Stun) dan tidak dapat bergerak ronde ini!`
      });
      // Lewati aksi pemain, langsung ke serangan balik musuh & tick status
    } else if (actionType === 'item') {
      const Player = require('../models/Player');
      const playerDoc = await Player.findOne({ discordId: actorId }).populate('inventory.itemId');
      if (!playerDoc) throw new Error('Karakter tidak ditemukan.');

      const inventoryIndex = playerDoc.inventory.findIndex(inv => inv.itemId && inv.itemId._id.toString() === skillId);
      if (inventoryIndex === -1 || playerDoc.inventory[inventoryIndex].quantity <= 0) {
        throw new Error('Kamu tidak memiliki item tersebut di inventory.');
      }

      const item = playerDoc.inventory[inventoryIndex].itemId;
      if (!item.usableInBattle) {
        throw new Error(`Item ${item.name} tidak dapat digunakan di dalam pertarungan.`);
      }

      const { applyConsumableEffects } = require('../utils/itemEffects');
      const buffMessage = applyConsumableEffects(playerDoc, item);
      if (item.restoresHp) {
        session.player.hp = playerDoc.currentHp;
      }

      playerDoc.inventory[inventoryIndex].quantity -= 1;
      if (playerDoc.inventory[inventoryIndex].quantity <= 0) {
        playerDoc.inventory.splice(inventoryIndex, 1);
      }
      playerDoc.markModified('inventory');
      await playerDoc.save();

      session.logs.push({
        tick: session.currentTick,
        actor: session.player.name,
        action: 'item',
        message: `🎒 ${session.player.name} menggunakan item [${item.name}].${buffMessage}`
      });

    } else if (actionType === 'flee') {
      // 2. Aksi Kabur (Run)
      const playerSpeed = session.player.speed || 10;
      const aliveEnemies = session.enemies.filter(e => !e.isDead);
      const maxEnemySpeed = aliveEnemies.length > 0 ? Math.max(...aliveEnemies.map(e => e.speed || 5)) : 5;
      const fleeChance = Math.min(0.85, Math.max(0.25, (playerSpeed / (maxEnemySpeed + 1)) * 0.65));

      if (Math.random() < fleeChance) {
        session.status = 'fled';
        session.logs.push({
          tick: session.currentTick,
          actor: session.player.name,
          action: 'flee',
          message: `🏃 ${session.player.name} menggunakan teknik meringankan tubuh (Qinggong) dan berhasil melarikan diri!`
        });
        session.turnQueue = [];
        await session.save();
        return session;
      } else {
        session.logs.push({
          tick: session.currentTick,
          actor: session.player.name,
          action: 'flee',
          message: `❌ ${session.player.name} mencoba kabur, tetapi musuh sigap mengunci jalan keluar!`
        });
      }
    } else {
      // 3. Aksi Skill / Serangan Pemain
      const skill = session.player.skills.find(s => s.skillId === (skillId || 'basic_attack'))
        || session.player.skills[0];

      if (!skill) throw new Error('Jurus tidak ditemukan.');
      if ((skill.currentCooldown || 0) > 0) {
        throw new Error(`Jurus "${skill.name}" masih dalam jeda (${skill.currentCooldown} ronde lagi)!`);
      }
      if (session.player.qi < (skill.qiCost || 0)) {
        throw new Error(`Qi tidak cukup untuk "${skill.name}" (Butuh ${skill.qiCost} Qi, kamu punya ${session.player.qi} Qi)!`);
      }

      // Konsumsi Qi & Pasang Cooldown
      session.player.qi -= (skill.qiCost || 0);
      skill.currentCooldown = skill.cooldown || 0;

      if (skill.type === 'defend') {
        // Tangkis / Bertahan
        session.player.stance = Math.min(session.player.maxStance, session.player.stance + 35);
        session.player.qi = Math.min(session.player.maxQi, session.player.qi + 15);
        session.player.buffs = (session.player.buffs || []).filter(b => b.name !== 'Kuda-Kuda Bertahan');
        session.player.buffs.push({
          name: 'Kuda-Kuda Bertahan',
          type: 'defense_up',
          value: 0.5,
          duration: 1,
          icon: '🛡️',
          description: 'Mengurangi damage serangan 50%'
        });

        session.logs.push({
          tick: session.currentTick,
          actor: session.player.name,
          action: 'skill',
          skillName: skill.name,
          message: `🛡️ ${session.player.name} memasang ${skill.name}! Memulihkan 35 Stance, +15 Qi, dan menahan 50% damage lawan ronde ini.`
        });
      } else if (skill.type === 'heal') {
        // Pemulihan HP
        const healAmt = Math.min(
          session.player.maxHp - session.player.hp,
          Math.floor(session.player.maxHp * 0.3) + (skill.power || 25)
        );
        session.player.hp = Math.min(session.player.maxHp, session.player.hp + healAmt);

        session.logs.push({
          tick: session.currentTick,
          actor: session.player.name,
          action: 'skill',
          skillName: skill.name,
          message: `✨ ${session.player.name} merapal ${skill.name} dan memulihkan ${healAmt} HP!`
        });
      } else {
        // Serangan fisik / spiritual (Single Target atau AoE)
        const aliveEnemies = session.enemies.filter(e => !e.isDead);
        if (aliveEnemies.length === 0) {
          this.promoteEnemiesFromQueue(session);
        }

        const targets = skill.aoeAll
          ? session.enemies.filter(e => !e.isDead)
          : [session.enemies.find(e => e.entityId === targetId && !e.isDead) || session.enemies.find(e => !e.isDead)].filter(Boolean);

        for (const target of targets) {
          const isStanceBroken = (target.stance || 0) <= 0;
          const targetDef = Math.max(1, target.defense || 5);
          let damage = Math.max(1, Math.floor((session.player.attack * (skill.power / 10)) / (targetDef / 10 + 1)));

          if (isStanceBroken) damage = Math.floor(damage * 1.5);

          const critRate = 0.10 + (skill.critBonus || 0);
          const isCrit = Math.random() < critRate;
          if (isCrit) damage = Math.floor(damage * 1.5);

          damage = Math.max(1, Math.floor(damage * (0.9 + Math.random() * 0.2)));

          // Kurangi Stance dan HP
          const stanceMultiplier = skill.stanceDmgMult || 1.0;
          const stanceDmg = Math.max(5, Math.floor(damage * 0.25 * stanceMultiplier));
          target.stance = Math.max(0, (target.stance || 0) - stanceDmg);
          target.hp = Math.max(0, target.hp - damage);

          if (target.hp <= 0) {
            target.hp = 0;
            target.isDead = true;
          }

          // Efek Debuff (Racun / Stun)
          let debuffTriggeredMsg = '';
          if (!target.isDead && skill.debuffChance > 0 && Math.random() < skill.debuffChance) {
            if (skill.debuffType === 'poison') {
              target.debuffs = target.debuffs || [];
              target.debuffs.push({
                name: 'Racun Senjata',
                type: 'poison',
                value: Math.max(5, Math.floor(damage * 0.2)),
                duration: 2,
                icon: '☠️',
                description: 'Kehilangan HP akibat racun'
              });
              debuffTriggeredMsg = ' ☠️ (Terkena Racun 2 Ronde!)';
            } else if (skill.debuffType === 'stun') {
              target.debuffs = target.debuffs || [];
              target.debuffs.push({
                name: 'Totokan Meridian',
                type: 'stun',
                value: 1,
                duration: 1,
                icon: '⚡',
                description: 'Lumpuh tidak dapat bergerak'
              });
              debuffTriggeredMsg = ' ⚡ (Lumpuh / Stun 1 Ronde!)';
            }
          }

          let logMsg = `⚔️ ${session.player.name} melancarkan ${skill.name} ke ${target.name} menghasilkan ${damage} DMG!`;
          if (isCrit) logMsg += ' 💥 (Kritikal!)';
          if (target.stance <= 0 && target.stance + stanceDmg > 0) logMsg += ' ⚡ (Stance Hancur!)';
          if (debuffTriggeredMsg) logMsg += debuffTriggeredMsg;
          if (target.isDead) logMsg += ` ☠️ (${target.name} tumbang!)`;

          session.logs.push({
            tick: session.currentTick,
            actor: session.player.name,
            target: target.name,
            action: 'skill',
            skillName: skill.name,
            damage,
            critical: isCrit,
            message: logMsg
          });
        }

        // Regenerasi Qi dari basic attack jika ada
        if (skill.qiRegen > 0) {
          session.player.qi = Math.min(session.player.maxQi, session.player.qi + skill.qiRegen);
        }
      }
    }

    // 4. Aksi Sekutu (Allies: NPC / Pet)
    if (Array.isArray(session.allies) && session.allies.length > 0) {
      for (const ally of session.allies) {
        if (ally.isDead) continue;
        const target = session.enemies.find(e => !e.isDead);
        if (!target) break;

        const allyDmg = Math.max(1, Math.floor((ally.attack * 1.2) / ((target.defense || 5) / 10 + 1)));
        target.hp = Math.max(0, target.hp - allyDmg);
        if (target.hp <= 0) {
          target.hp = 0;
          target.isDead = true;
        }

        session.logs.push({
          tick: session.currentTick,
          actor: ally.name,
          target: target.name,
          action: 'skill',
          skillName: 'Serangan Bantuan',
          damage: allyDmg,
          message: `🐾 ${ally.name} membantu menyerang ${target.name} memberikan ${allyDmg} DMG!${target.isDead ? ` ☠️ (${target.name} tumbang!)` : ''}`
        });
      }
    }

    // 5. Cek Musuh Tumbang & Promosi dari Antrian Cadangan (Enemy Queue Promotion)
    this.promoteEnemiesFromQueue(session);

    // 6. Cek Kemenangan Langsung setelah Serangan Tim Player
    if (this.checkAllEnemiesDefeated(session)) {
      this.resolveVictory(session);
      session.turnQueue = [];
      await session.save();
      return session;
    }

    // 7. Balasan Serangan AI Musuh yang Aktif dan Hidup
    const aliveEnemies = session.enemies.filter(e => !e.isDead);
    const hasDefendBuff = Array.isArray(session.player.buffs) && session.player.buffs.some(b => b.name === 'Kuda-Kuda Bertahan');

    for (const enemy of aliveEnemies) {
      if (session.player.isDead) break;

      // Cek apakah musuh terkena Stun
      const isEnemyStunned = Array.isArray(enemy.debuffs) && enemy.debuffs.some(d => d.type === 'stun' && d.duration > 0);
      if (isEnemyStunned) {
        session.logs.push({
          tick: session.currentTick,
          actor: enemy.name,
          action: 'effect',
          message: `⚡ ${enemy.name} kaku akibat totokan saraf dan tidak dapat menyerang ronde ini!`
        });
        continue;
      }

      // Pilih jurus musuh
      const availableSkills = (enemy.skills || []).filter(s => (s.currentCooldown || 0) <= 0);
      const eSkill = availableSkills.find(s => s.skillId !== 'basic_attack' && Math.random() < 0.4)
        || availableSkills[0]
        || { skillId: 'basic_attack', name: 'Serangan Liar', power: 12 };

      let eDamage = Math.max(1, Math.floor((enemy.attack * (eSkill.power / 10)) / (session.player.defense / 10 + 1)));
      if (hasDefendBuff) {
        eDamage = Math.max(1, Math.floor(eDamage * 0.5));
      }
      eDamage = Math.max(1, Math.floor(eDamage * (0.85 + Math.random() * 0.3)));

      const eStanceDmg = Math.max(3, Math.floor(eDamage * 0.2));
      session.player.stance = Math.max(0, session.player.stance - eStanceDmg);
      session.player.hp = Math.max(0, session.player.hp - eDamage);

      if (session.player.hp <= 0) {
        session.player.hp = 0;
        session.player.isDead = true;
      }

      let eLogMsg = `🩸 ${enemy.name} melancarkan ${eSkill.name} ke ${session.player.name} menghasilkan ${eDamage} DMG!`;
      if (hasDefendBuff) eLogMsg += ' 🛡️ (Tertahan Kuda-Kuda Bertahan -50%!)';
      if (session.player.isDead) eLogMsg += ` 💀 (${session.player.name} gugur!)`;

      session.logs.push({
        tick: session.currentTick,
        actor: enemy.name,
        target: session.player.name,
        action: 'skill',
        skillName: eSkill.name,
        damage: eDamage,
        message: eLogMsg
      });

      if (eSkill.cooldown) eSkill.currentCooldown = eSkill.cooldown;
    }

    // 8. Cek Kekalahan Pemain
    if (session.player.isDead) {
      session.status = 'lost';
      session.logs.push({
        tick: session.currentTick,
        actor: 'System',
        action: 'end',
        message: `💀 ${session.player.name} telah kehabisan darah dan dantian terluka parah... Pertempuran berakhir dengan kekalahan!`
      });
      session.turnQueue = [];
      await session.save();
      return session;
    }

    // 9. Tick Efek Status (Poison DoT & Pengurangan Durasi Buff/Debuff)
    this.processStatusEffects(session);

    // 10. Re-check Musuh Mati dari Efek Racun DoT & Promosi Queue
    this.promoteEnemiesFromQueue(session);
    if (this.checkAllEnemiesDefeated(session)) {
      this.resolveVictory(session);
      session.turnQueue = [];
      await session.save();
      return session;
    }

    // 11. Akhir Ronde: Kurangi Cooldown, Regenerasi Alami Qi (+10) & Stance (+10)
    session.player.skills.forEach(s => {
      if ((s.currentCooldown || 0) > 0) s.currentCooldown--;
    });
    session.enemies.forEach(e => {
      (e.skills || []).forEach(s => {
        if ((s.currentCooldown || 0) > 0) s.currentCooldown--;
      });
    });

    session.player.qi = Math.min(session.player.maxQi, session.player.qi + 10);
    session.player.stance = Math.min(session.player.maxStance, session.player.stance + 10);

    session.currentTick += 1;
    session.player.atb = 1000;
    session.turnQueue = [session.player.entityId]; // Siap untuk aksi selanjutnya

    await session.save();
    return session;
  }

  /**
   * Promosi Musuh dari Queue ke Medan Pertempuran Aktif
   */
  static promoteEnemiesFromQueue(session) {
    if (!session.enemyQueue || session.enemyQueue.length === 0) return;
    const maxActive = session.battleConfig?.maxActiveEnemies || 4;

    for (let i = 0; i < session.enemies.length; i++) {
      if (session.enemies[i].isDead && session.enemyQueue.length > 0) {
        const nextEnemy = session.enemyQueue.shift();
        session.enemies[i] = nextEnemy;
        session.logs.push({
          tick: session.currentTick,
          actor: 'System',
          action: 'summon',
          message: `⚔️ [Bala Bantuan] ${nextEnemy.name} melangkah maju ke medan tempur menggantikan rekannya yang tumbang!`
        });
      }
    }

    // Jika jumlah musuh kurang dari maxActive dan queue masih ada
    while (session.enemies.filter(e => !e.isDead).length < maxActive && session.enemyQueue.length > 0) {
      const nextEnemy = session.enemyQueue.shift();
      session.enemies.push(nextEnemy);
      session.logs.push({
        tick: session.currentTick,
        actor: 'System',
        action: 'summon',
        message: `⚔️ [Bala Bantuan] ${nextEnemy.name} memasuki medan tempur!`
      });
    }
  }

  /**
   * Cek Apakah Semua Musuh Sudah Tumbang
   */
  static checkAllEnemiesDefeated(session) {
    const allActiveDead = session.enemies.every(e => e.isDead);
    const queueEmpty = !session.enemyQueue || session.enemyQueue.length === 0;
    return allActiveDead && queueEmpty;
  }

  /**
   * Proses Status Effects (Poison DoT & Durasi)
   */
  static processStatusEffects(session) {
    // Tick debuff player
    if (Array.isArray(session.player.debuffs)) {
      session.player.debuffs = session.player.debuffs.filter(d => {
        if (d.type === 'poison' && d.duration > 0) {
          const dmg = d.value || 5;
          session.player.hp = Math.max(0, session.player.hp - dmg);
          session.logs.push({
            tick: session.currentTick,
            actor: 'System',
            action: 'effect',
            message: `☠️ Racun menggerogoti tubuh ${session.player.name}, kehilangan ${dmg} HP!`
          });
        }
        d.duration -= 1;
        return d.duration > 0;
      });
    }

    // Tick buff player (misal Kuda-kuda bertahan)
    if (Array.isArray(session.player.buffs)) {
      session.player.buffs = session.player.buffs.filter(b => {
        b.duration -= 1;
        return b.duration > 0;
      });
    }

    // Tick debuff musuh aktif
    session.enemies.forEach(e => {
      if (e.isDead) return;
      if (Array.isArray(e.debuffs)) {
        e.debuffs = e.debuffs.filter(d => {
          if (d.type === 'poison' && d.duration > 0) {
            const dmg = d.value || 5;
            e.hp = Math.max(0, e.hp - dmg);
            if (e.hp <= 0) e.isDead = true;
            session.logs.push({
              tick: session.currentTick,
              actor: 'System',
              action: 'effect',
              message: `☠️ Racun merenggut ${dmg} HP dari ${e.name}!${e.isDead ? ` (${e.name} tewas oleh racun!)` : ''}`
            });
          }
          d.duration -= 1;
          return d.duration > 0;
        });
      }
    });
  }

  /**
   * Selesaikan Kemenangan & Hitung Hadiah Lengkap (EXP, Perak, KungFu XP, Loot)
   */
  static resolveVictory(session) {
    session.status = 'won';

    // 1. Hitung Total EXP & Perak dari Semua Musuh
    let totalExp = 0;
    let totalSilver = 0;
    session.enemies.forEach(e => {
      const lvl = e.level || 1;
      totalExp += lvl * 25;
      totalSilver += lvl * 15;
    });

    // 2. Tentukan KungFu EXP berdasarkan senjata yang dipakai di basic attack
    const basicAttackSkill = session.player.skills.find(s => s.isBasicAttack) || session.player.skills[0];
    const weaponDiscipline = basicAttackSkill?.kungfuDiscipline || 'fist';
    const kungfuAmount = Math.max(10, Math.floor(totalExp * 0.25));

    const kungfuRewards = [{
      discipline: weaponDiscipline,
      amount: kungfuAmount,
      weaponName: basicAttackSkill?.name || 'Tinju Tangan Kosong',
      newLevel: 1,
      levelUp: false
    }];

    // 3. Loot Items Generator (Batu Roh, Bulu Monster, Herba)
    const itemsLoot = [];
    const firstEnemy = session.enemies[0];
    const isBoss = session.battleConfig?.isBossMode || (firstEnemy && firstEnemy.tierSize === 'boss');

    // Hadiah material dasar
    itemsLoot.push({
      itemId: 'wolf_fur',
      name: 'Bulu Roh Darah',
      quantity: 1 + Math.floor(Math.random() * 2),
      rarity: 'common',
      qualityMultiplier: 1.0
    });

    // Peluang batu roh / kristal
    if (Math.random() < 0.65 || isBoss) {
      itemsLoot.push({
        itemId: 'spirit_stone_low',
        name: 'Batu Roh Rendah',
        quantity: isBoss ? 3 : 1,
        rarity: 'uncommon',
        qualityMultiplier: 1.2
      });
    }

    session.rewards = {
      exp: totalExp,
      silver: totalSilver,
      kungfuExp: kungfuRewards,
      items: itemsLoot
    };

    session.logs.push({
      tick: session.currentTick,
      actor: 'System',
      action: 'end',
      message: `🏆 Kemenangan gemilang! Berhasil menumpas seluruh musuh dan memperoleh +${totalExp} EXP, +${totalSilver} Keping Perak, serta +${kungfuAmount} KungFu XP (${basicAttackSkill?.name})!`
    });
  }

  /**
   * Fallback Process Tick
   */
  static async processTick(battleId) {
    const session = await BattleSession.findOne({ battleId, status: 'ongoing' });
    if (!session) return null;

    if (!session.player.isDead && session.turnQueue.length === 0) {
      session.player.atb = 1000;
      session.turnQueue = [session.player.entityId];
      await session.save();
    }
    return session;
  }
}

module.exports = InteractiveBattleService;
