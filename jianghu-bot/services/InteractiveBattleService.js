const BattleSession = require('../models/BattleSession');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

class InteractiveBattleService {
  /**
   * Mulai pertempuran baru
   */
  static async startBattle(player, enemiesInput, type = 'pve', zoneId = 'unknown') {
    // Hapus sesi pertempuran gantung/lama agar pertempuran baru selalu segar, bersih, dan menggunakan engine terbaru
    await BattleSession.deleteMany({
      'player.entityId': player.discordId,
      status: 'ongoing'
    });

    // Parse Player to Entity
    const { getComputedStats } = require('../utils/statCalculator');
    const computedStats = getComputedStats(player, player.laws || [], player.manuals || []);
    const maxHp = computedStats.maxHp || player.stats?.maxHp || player.stats?.baseHp || 100;
    const currentHp = (player.currentHp !== null && player.currentHp !== undefined && !isNaN(player.currentHp))
      ? player.currentHp
      : maxHp;
    const maxQi = player.maxQi || 100;
    const currentQi = (player.currentQi !== null && player.currentQi !== undefined && player.currentQi > 0)
      ? player.currentQi
      : 40; // Default Qi awal pertarungan agar kultivator bisa langsung memakai jurus

    const playerEntity = {
      entityId: player.discordId,
      entityType: 'player',
      name: player.characterName || 'Pendekar',
      level: player.level || 1,
      imageUrl: player.characterImage || player.imageUrl,
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

    // Parse Enemies
    const enemies = enemiesInput.map((e, index) => ({
      entityId: e.id || `enemy_${index}_${uuidv4().slice(0, 6)}`,
      entityType: type === 'pvp' ? 'player' : 'monster',
      name: e.name || 'Musuh Misterius',
      level: e.level || 1,
      imageUrl: e.imageUrl || null,
      hp: e.hp || e.maxHp || 50,
      maxHp: e.maxHp || 50,
      qi: e.qi || 0,
      maxQi: e.maxQi || 100,
      stamina: 100,
      maxStamina: 100,
      attack: e.attack || 12,
      defense: e.defense || 6,
      speed: e.speed || 8,
      atb: 0,
      maxAtb: 1000,
      stance: e.stance || 100,
      maxStance: e.stance || 100,
      buffs: [],
      debuffs: [],
      skills: e.skills || [{
        skillId: 'basic_attack',
        name: 'Serangan Liar',
        description: 'Serangan fisik standar',
        type: 'attack',
        power: 12,
        qiCost: 0,
        cooldown: 0,
        currentCooldown: 0
      }]
    }));

    const battleId = `BTL-${uuidv4().slice(0, 8).toUpperCase()}`;
    const session = new BattleSession({
      battleId,
      type,
      zoneId,
      player: playerEntity,
      enemies,
      turnQueue: [playerEntity.entityId], // Inisiatif giliran pertama langsung ke pemain!
      currentTick: 1,
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

  /**
   * Format & generate skills pool for player
   */
  static formatPlayerSkills(player) {
    const skills = [
      {
        skillId: 'basic_attack',
        name: 'Pukulan Dasar',
        description: 'Serangan fisik dasar tanpa Qi. Memulihkan +5 Qi saat berhasil mendarat.',
        type: 'attack',
        power: 12,
        qiCost: 0,
        cooldown: 0,
        currentCooldown: 0
      },
      {
        skillId: 'qi_strike',
        name: 'Pukulan Hawa Murni',
        description: 'Memadatkan Qi murni ke kepalan tangan untuk merusak pertahanan lawan.',
        type: 'attack',
        power: 25,
        qiCost: 15,
        cooldown: 1,
        currentCooldown: 0
      },
      {
        skillId: 'iron_wall',
        name: 'Kuda-Kuda Besi (Tangkis)',
        description: 'Menstabilkan pernapasan: memulihkan +35 Stance & +20 Qi serta menahan 50% damage serangan lawan ronde ini.',
        type: 'defend',
        power: 0,
        qiCost: 0,
        cooldown: 2,
        currentCooldown: 0
      },
      {
        skillId: 'qi_overload',
        name: 'Ledakan Intisari Qi (Ultimate)',
        description: 'Mengorbankan intisari Qi dantian untuk ledakan fatal yang mengabaikan 50% pertahanan musuh!',
        type: 'ultimate',
        power: 50,
        qiCost: 35,
        cooldown: 3,
        currentCooldown: 0
      }
    ];

    // Tambahkan manual kitab teknik yang telah dipahami pemain
    if (Array.isArray(player.manuals)) {
      player.manuals.forEach(m => {
        if (m && m.manualId) {
          const manualObj = m.manualId;
          const isPopulated = typeof manualObj === 'object' && manualObj.name;
          const sId = isPopulated ? (manualObj._id ? manualObj._id.toString() : String(manualObj.key || manualObj.name)) : String(m.manualId);
          const sName = isPopulated ? manualObj.name : 'Jurus Esoteris';
          const sDesc = isPopulated ? (manualObj.description || 'Jurus teknik bela diri tingkat tinggi.') : 'Jurus teknik bela diri tingkat tinggi.';
          const sType = isPopulated && manualObj.type === 'healing' ? 'heal' : 'attack';
          const sPower = (isPopulated && manualObj.basePower) ? manualObj.basePower : (30 + (m.level || 0) * 5);
          const sCost = (isPopulated && manualObj.qiCost) ? manualObj.qiCost : 20;
          const sCd = (isPopulated && manualObj.cooldown) ? manualObj.cooldown : 2;

          // Hindari duplikasi skillId
          if (!skills.some(s => s.skillId === sId)) {
            skills.push({
              skillId: sId,
              name: sName,
              description: sDesc,
              type: sType,
              power: sPower,
              qiCost: sCost,
              cooldown: sCd,
              currentCooldown: 0
            });
          }
        }
      });
    }

    return skills;
  }

  /**
   * Eksekusi aksi turn-based round-trip (Instant Turn Resolution)
   * Aksi pemain diselesaikan, serangan balik AI musuh diselesaikan dalam 1 panggilan HTTP,
   * cooldown di-tick, dan giliran dikembalikan ke pemain secara instan.
   */
  static async executeAction(battleId, actorId, actionType, skillId, targetId) {
    const session = await BattleSession.findOne({ battleId, status: 'ongoing' });
    if (!session) throw new Error('Pertempuran tidak ditemukan atau sudah selesai.');

    if (session.player.entityId !== actorId) {
      throw new Error('Kamu bukan pemilik sesi pertempuran ini!');
    }

    if (session.player.isDead) {
      throw new Error('Karaktermu sudah tumbang dan tidak bisa beraksi.');
    }

    // Pastikan giliran aktif untuk pemain (auto-sync jika terjadi desinkronisasi kecil)
    if (!session.turnQueue || session.turnQueue.length === 0 || session.turnQueue[0] !== actorId) {
      session.turnQueue = [actorId];
    }

    // 1. Tangani Aksi Kabur (Flee)
    if (actionType === 'flee') {
      const playerSpeed = session.player.speed || 10;
      const aliveEnemies = session.enemies.filter(e => !e.isDead);
      const maxEnemySpeed = aliveEnemies.length > 0 ? Math.max(...aliveEnemies.map(e => e.speed || 5)) : 5;
      const fleeChance = Math.min(0.85, Math.max(0.25, (playerSpeed / (maxEnemySpeed + 1)) * 0.6));

      if (Math.random() < fleeChance) {
        session.status = 'fled';
        session.logs.push({
          tick: session.currentTick,
          actor: session.player.name,
          action: 'flee',
          message: `${session.player.name} menggunakan teknik pergerakan lincah dan berhasil melarikan diri dari medan tempur!`
        });
        session.turnQueue = [];
        await session.save();
        return session;
      } else {
        session.logs.push({
          tick: session.currentTick,
          actor: session.player.name,
          action: 'flee',
          message: `${session.player.name} mencoba melarikan diri, tetapi musuh sigap menghadang jalur keluar!`
        });
        // Kabur gagal: musuh mendapat kesempatan serangan balik gratis di bawah
      }
    } else {
      // 2. Tangani Aksi Serangan / Skill Pemain
      const skill = session.player.skills.find(s => s.skillId === (skillId || 'basic_attack'))
        || session.player.skills[0];

      if (!skill) throw new Error('Jurus tidak ditemukan.');
      if ((skill.currentCooldown || 0) > 0) {
        throw new Error(`Jurus "${skill.name}" masih dalam masa jeda (${skill.currentCooldown} ronde lagi)!`);
      }
      if (session.player.qi < (skill.qiCost || 0)) {
        throw new Error(`Qi tidak mencukupi untuk jurus "${skill.name}" (Butuh ${skill.qiCost} Qi, kamu punya ${session.player.qi} Qi)!`);
      }

      // Konsumsi Qi & Pasang Cooldown
      session.player.qi -= (skill.qiCost || 0);
      skill.currentCooldown = skill.cooldown || 0;

      if (skill.type === 'defend') {
        // Tangkis / Kuda-kuda
        session.player.stance = Math.min(session.player.maxStance, session.player.stance + 35);
        session.player.qi = Math.min(session.player.maxQi, session.player.qi + 20);
        session.player.buffs = (session.player.buffs || []).filter(b => b.name !== 'Kuda-Kuda Besi');
        session.player.buffs.push({
          name: 'Kuda-Kuda Besi',
          type: 'defense_up',
          value: 0.5,
          duration: 1
        });

        session.logs.push({
          tick: session.currentTick,
          actor: session.player.name,
          action: 'skill',
          skillName: skill.name,
          message: `🛡️ ${session.player.name} memasang ${skill.name}! Memulihkan 35 Stance, +20 Qi, dan menahan 50% damage serangan lawan ronde ini.`
        });
      } else if (skill.type === 'heal') {
        // Pemulihan HP
        const healAmt = Math.min(
          session.player.maxHp - session.player.hp,
          Math.floor(session.player.maxHp * 0.3) + 25
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
        // Serangan fisik / spiritual ke target
        const aliveEnemies = session.enemies.filter(e => !e.isDead);
        if (aliveEnemies.length === 0) {
          this.checkWinCondition(session);
          session.turnQueue = [];
          await session.save();
          return session;
        }

        let target = aliveEnemies.find(e => e.entityId === targetId) || aliveEnemies[0];

        // Rumus Kalkulasi Damage Authoritative
        const isStanceBroken = target.stance <= 0;
        const defenseToUse = skill.type === 'ultimate' ? target.defense * 0.5 : target.defense;
        let damage = Math.max(1, Math.floor((session.player.attack * (skill.power / 10)) / (defenseToUse / 10 + 1)));

        if (isStanceBroken) damage = Math.floor(damage * 1.5);
        const isCrit = Math.random() < 0.15;
        if (isCrit) damage = Math.floor(damage * 1.5);
        damage = Math.max(1, Math.floor(damage * (0.9 + Math.random() * 0.2)));

        // Kurangi Stance dan HP musuh
        const stanceDamage = Math.max(5, Math.floor(damage * 0.25));
        target.stance = Math.max(0, target.stance - stanceDamage);
        target.hp = Math.max(0, target.hp - damage);

        if (target.hp <= 0) {
          target.hp = 0;
          target.isDead = true;
        }

        // Pukulan biasa meregenerasi +5 Qi
        if (skill.skillId === 'basic_attack') {
          session.player.qi = Math.min(session.player.maxQi, session.player.qi + 5);
        }

        let logMsg = `⚔️ ${session.player.name} melancarkan ${skill.name} ke ${target.name} memberikan ${damage} DMG!`;
        if (isCrit) logMsg += ' 💥 (Kritikal!)';
        if (target.stance <= 0 && target.stance + stanceDamage > 0) logMsg += ' ⚡ (Stance Hancur!)';
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
    }

    // 3. Cek Kemenangan Langsung setelah Serangan Pemain
    const allEnemiesDead = session.enemies.every(e => e.isDead);
    if (allEnemiesDead) {
      this.checkWinCondition(session);
      session.turnQueue = [];
      await session.save();
      return session;
    }

    // 4. Balasan Serangan Lawan (Immediate AI Counter-Attack)
    const aliveEnemies = session.enemies.filter(e => !e.isDead);
    const hasIronWall = Array.isArray(session.player.buffs) && session.player.buffs.some(b => b.name === 'Kuda-Kuda Besi');

    for (const enemy of aliveEnemies) {
      if (session.player.isDead) break;

      // Pilih jurus musuh yang siap
      const availableSkills = (enemy.skills || []).filter(s => (s.currentCooldown || 0) <= 0);
      let eSkill = availableSkills.find(s => s.skillId !== 'basic_attack');
      if (!eSkill || Math.random() < 0.6) {
        eSkill = availableSkills.find(s => s.skillId === 'basic_attack') || availableSkills[0] || {
          skillId: 'basic_attack',
          name: 'Serangan Cakar',
          power: 12,
          type: 'attack'
        };
      }

      // Hitung damage musuh ke pemain
      let eDamage = Math.max(1, Math.floor((enemy.attack * (eSkill.power / 10)) / (session.player.defense / 10 + 1)));
      if (hasIronWall) {
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
      if (hasIronWall) eLogMsg += ' 🛡️ (Tertangkis Kuda-Kuda Besi -50%!)';
      if (session.player.isDead) eLogMsg += ` 💀 (${session.player.name} gugur!)`;

      session.logs.push({
        tick: session.currentTick,
        actor: enemy.name,
        target: session.player.name,
        action: 'skill',
        skillName: eSkill.name,
        damage: eDamage,
        critical: false,
        message: eLogMsg
      });

      if (eSkill.cooldown) eSkill.currentCooldown = eSkill.cooldown;
    }

    // 5. Cek Kekalahan Pemain
    if (session.player.isDead) {
      this.checkWinCondition(session);
      session.turnQueue = [];
      await session.save();
      return session;
    }

    // 6. Akhir Ronde: Kurangi Cooldown, Bersihkan Buff Sementara & Beri Giliran Kembali ke Pemain
    if (session.player.buffs) {
      session.player.buffs = session.player.buffs.filter(b => b.name !== 'Kuda-Kuda Besi');
    }

    // Turunkan cooldown skill pemain & musuh
    session.player.skills.forEach(s => {
      if ((s.currentCooldown || 0) > 0) s.currentCooldown--;
    });
    session.enemies.forEach(e => {
      (e.skills || []).forEach(s => {
        if ((s.currentCooldown || 0) > 0) s.currentCooldown--;
      });
    });

    // Regenerasi alami Qi (+10) dan Stance (+10) per ronde
    session.player.qi = Math.min(session.player.maxQi, session.player.qi + 10);
    session.player.stance = Math.min(session.player.maxStance, session.player.stance + 10);

    session.currentTick += 1;
    session.player.atb = 1000;
    session.turnQueue = [session.player.entityId]; // Pemain siap untuk ronde selanjutnya secara instan!

    await session.save();
    return session;
  }

  /**
   * Fallback Process Tick (kompatibilitas route lama)
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

  /**
   * Evaluasi Kondisi Menang / Kalah & Kalkulasi Hadiah
   */
  static checkWinCondition(session) {
    if (session.player.isDead) {
      session.status = 'lost';
      session.logs.push({
        tick: session.currentTick,
        actor: 'System',
        action: 'end',
        message: `${session.player.name} telah kehabisan darah dan pingsan... Pertempuran berakhir.`
      });
      return;
    }

    const allEnemiesDead = session.enemies.every(e => e.isDead);
    if (allEnemiesDead) {
      session.status = 'won';

      let totalExp = 0;
      let totalSilver = 0;
      session.enemies.forEach(e => {
        const lvl = e.level || 1;
        totalExp += lvl * 20;
        totalSilver += lvl * 10;
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
        message: `🏆 Kemenangan gemilang! Berhasil mengalahkan lawan dan memperoleh +${totalExp} EXP serta +${totalSilver} Keping Perak.`
      });
    }
  }
}

module.exports = InteractiveBattleService;
