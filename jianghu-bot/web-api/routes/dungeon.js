const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const DungeonInstance = require('../../models/DungeonInstance');
const { generateDungeonMaze, DUNGEON_CONFIGS } = require('../../utils/dungeonMazeGenerator');

/**
 * Filter petak yang terlihat oleh pemain berdasarkan kabut kegelapan (Fog of War)
 */
function sanitizeDungeonState(dungeon) {
  const exploredSet = new Set(dungeon.exploredTiles || []);
  const px = dungeon.playerPos.x;
  const py = dungeon.playerPos.y;

  // Singkap petak dalam radius pandang 2 tile dari posisi pemain saat ini
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const rx = px + dx;
      const ry = py + dy;
      if (rx >= 0 && rx < dungeon.gridWidth && ry >= 0 && ry < dungeon.gridHeight) {
        exploredSet.add(`${rx},${ry}`);
      }
    }
  }

  // Update exploredTiles jika ada yang baru
  dungeon.exploredTiles = Array.from(exploredSet);

  const visibleTiles = dungeon.tiles.map(tile => {
    const isRevealed = exploredSet.has(`${tile.x},${tile.y}`);
    if (!isRevealed) {
      return {
        x: tile.x,
        y: tile.y,
        isRevealed: false
      };
    }

    return {
      x: tile.x,
      y: tile.y,
      isRevealed: true,
      isWall: tile.isWall,
      isEntrance: tile.isEntrance,
      isExit: tile.isExit,
      trapType: tile.isTrapTriggered ? tile.trapType : null, // Jebakan tersembunyi hingga terinjak
      isTrapTriggered: tile.isTrapTriggered,
      chest: tile.chest?.isChest ? {
        isChest: true,
        opened: tile.chest.opened,
        lootPreview: tile.chest.lootPreview
      } : null,
      monster: tile.monster?.name && !tile.monster.defeated ? {
        name: tile.monster.name,
        hp: tile.monster.hp,
        isBoss: tile.monster.isBoss
      } : null
    };
  });

  return {
    id: dungeon._id,
    dungeonKey: dungeon.dungeonKey,
    dungeonName: dungeon.dungeonName,
    rank: dungeon.rank,
    gridWidth: dungeon.gridWidth,
    gridHeight: dungeon.gridHeight,
    playerPos: dungeon.playerPos,
    exitPos: dungeon.exitPos,
    status: dungeon.status,
    accumulatedLoot: dungeon.accumulatedLoot,
    tiles: visibleTiles
  };
}

// GET /api/dungeon/active
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const dungeon = await DungeonInstance.findOne({
      discordId: req.user.userId,
      status: 'exploring'
    });

    if (!dungeon) {
      return res.json({ hasActiveDungeon: false });
    }

    const sanitized = sanitizeDungeonState(dungeon);
    await dungeon.save();

    res.json({ hasActiveDungeon: true, dungeon: sanitized });
  } catch (error) {
    console.error('[API-DUNGEON] Error fetching active dungeon:', error);
    res.status(500).json({ error: 'Gagal memuat sesi gua kuno.' });
  }
});

// POST /api/dungeon/enter
router.post('/enter', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { rank = 'Rank_1_8x8', dungeonKey = 'ancient_mortal_cave' } = req.body;

    const player = await Player.findOne({ discordId: userId });
    if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

    const { getComputedStats } = require('../../utils/statCalculator');
    const computed = getComputedStats(player, player.laws || [], player.manuals || []);
    const maxHp = computed.maxHp || player.stats?.baseHp || 100;

    if (player.currentHp === null || player.currentHp === undefined || isNaN(player.currentHp)) {
      player.currentHp = maxHp;
      await player.save();
    } else if (typeof player.currentHp === 'number' && player.currentHp <= 0) {
      return res.status(400).json({ error: 'Karaktermu terluka parah. Pulihkan HP terlebih dahulu.' });
    }

    // Cek apakah pemain sudah memiliki ekspedisi yang sedang berjalan
    let dungeon = await DungeonInstance.findOne({
      discordId: userId,
      status: 'exploring'
    });

    if (dungeon) {
      const sanitized = sanitizeDungeonState(dungeon);
      await dungeon.save();
      return res.json({
        message: 'Melanjutkan ekspedisi gua yang sedang berlangsung.',
        dungeon: sanitized
      });
    }

    // Generate maze prosedural baru
    const mazeData = generateDungeonMaze(rank);

    dungeon = new DungeonInstance({
      discordId: userId,
      guildId: player.guildId || 'default',
      dungeonKey,
      dungeonName: mazeData.dungeonName,
      rank,
      gridWidth: mazeData.gridWidth,
      gridHeight: mazeData.gridHeight,
      playerPos: mazeData.playerPos,
      exitPos: mazeData.exitPos,
      tiles: mazeData.tiles,
      exploredTiles: [`${mazeData.playerPos.x},${mazeData.playerPos.y}`],
      accumulatedLoot: { silver: 0, spiritStones: 0, items: [] },
      status: 'exploring'
    });

    const sanitized = sanitizeDungeonState(dungeon);
    await dungeon.save();

    res.json({
      message: `Berhasil memasuki ${mazeData.dungeonName}!`,
      dungeon: sanitized
    });
  } catch (error) {
    console.error('[API-DUNGEON] Enter error:', error);
    res.status(500).json({ error: 'Gagal memasuki labirin gua: ' + error.message });
  }
});

// POST /api/dungeon/move
router.post('/move', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { dx, dy } = req.body;

    if (Math.abs(dx) + Math.abs(dy) !== 1) {
      return res.status(400).json({ error: 'Pergerakan hanya boleh 1 langkah vertikal atau horizontal.' });
    }

    const dungeon = await DungeonInstance.findOne({
      discordId: userId,
      status: 'exploring'
    });
    if (!dungeon) return res.status(404).json({ error: 'Tidak ada ekspedisi gua yang aktif.' });

    const player = await Player.findOne({ discordId: userId });
    if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

    const targetX = dungeon.playerPos.x + dx;
    const targetY = dungeon.playerPos.y + dy;

    if (targetX < 0 || targetX >= dungeon.gridWidth || targetY < 0 || targetY >= dungeon.gridHeight) {
      return res.status(400).json({ error: 'Menabrak dinding pembatas gua purba!' });
    }

    // Temukan petak tujuan
    const targetTile = dungeon.tiles.find(t => t.x === targetX && t.y === targetY);
    if (!targetTile || targetTile.isWall) {
      return res.status(400).json({ error: 'Jalur terhalang oleh tebing batu kokoh!' });
    }

    // Konsumsi Stamina Melangkah di Gua (1 stamina, diskon jika ada mount)
    const stepCost = player.equippedMount ? 0.5 : 1;
    if (player.currentStamina !== null && player.currentStamina < stepCost) {
      return res.status(400).json({ error: 'Staminamu habis terkuras! Pulihkan tenaga terlebih dahulu.' });
    }
    if (player.currentStamina !== null) {
      player.currentStamina = Math.max(0, player.currentStamina - stepCost);
    }

    // Update posisi pemain
    dungeon.playerPos = { x: targetX, y: targetY };

    let eventLog = null;

    // Evaluasi Jebakan jika ada dan belum terpicu
    if (targetTile.trapType && !targetTile.isTrapTriggered) {
      targetTile.isTrapTriggered = true;
      if (targetTile.trapType === 'spike') {
        const dmg = dungeon.rank === 'Rank_3_40x40' ? 45 : dungeon.rank === 'Rank_2_20x20' ? 25 : 12;
        player.currentHp = Math.max(1, (player.currentHp || 100) - dmg);
        eventLog = `⚠️ Kamu menginjak Jebakan Duri Tersembunyi! Kehilangan ${dmg} HP!`;
      } else if (targetTile.trapType === 'poison') {
        const stamDmg = 5;
        const hpDmg = 10;
        player.currentHp = Math.max(1, (player.currentHp || 100) - hpDmg);
        player.currentStamina = Math.max(0, (player.currentStamina || 50) - stamDmg);
        eventLog = `☣️ Semburan Gas Miasma Beracun terpicu! Kehilangan ${hpDmg} HP dan ${stamDmg} Stamina!`;
      }
    }

    // Evaluasi Monster Ambush jika ada
    let encounter = null;
    if (targetTile.monster && targetTile.monster.name && !targetTile.monster.defeated) {
      encounter = {
        name: targetTile.monster.name,
        hp: targetTile.monster.hp,
        atk: targetTile.monster.atk,
        def: targetTile.monster.def,
        isBoss: targetTile.monster.isBoss
      };
      eventLog = `👹 Kamu berhadapan langsung dengan ${targetTile.monster.name}!`;
    }

    await player.save();
    const sanitized = sanitizeDungeonState(dungeon);
    await dungeon.save();

    res.json({
      success: true,
      playerPos: dungeon.playerPos,
      currentStamina: player.currentStamina,
      currentHp: player.currentHp,
      eventLog,
      encounter,
      dungeon: sanitized
    });
  } catch (error) {
    console.error('[API-DUNGEON] Move error:', error);
    res.status(500).json({ error: 'Gagal melangkah di labirin gua.' });
  }
});

// POST /api/dungeon/interact
router.post('/interact', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { action } = req.body; // 'open_chest' | 'exit'

    const dungeon = await DungeonInstance.findOne({
      discordId: userId,
      status: 'exploring'
    });
    if (!dungeon) return res.status(404).json({ error: 'Tidak ada ekspedisi gua yang aktif.' });

    const player = await Player.findOne({ discordId: userId });
    if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan' });

    const currentTile = dungeon.tiles.find(t => t.x === dungeon.playerPos.x && t.y === dungeon.playerPos.y);

    if (action === 'open_chest') {
      if (!currentTile || !currentTile.chest || !currentTile.chest.isChest) {
        return res.status(400).json({ error: 'Tidak ada peti harta karun di petak ini.' });
      }
      if (currentTile.chest.opened) {
        return res.status(400).json({ error: 'Peti ini sudah dijarah.' });
      }

      currentTile.chest.opened = true;

      // Hitung reward peti seimbang
      const config = DUNGEON_CONFIGS[dungeon.rank] || DUNGEON_CONFIGS.Rank_1_8x8;
      const silverReward = Math.floor(Math.random() * (config.silverRewardMax - config.silverRewardMin + 1)) + config.silverRewardMin;
      const gotSpiritStone = Math.random() < config.spiritStoneChance;

      dungeon.accumulatedLoot.silver += silverReward;
      if (gotSpiritStone) {
        dungeon.accumulatedLoot.spiritStones += 1;
      }

      dungeon.accumulatedLoot.items.push({
        name: 'Bijih Besi Kuno',
        quantity: 2,
        rank: dungeon.rank === 'Rank_3_40x40' ? 'Rare' : 'Common'
      });

      const sanitized = sanitizeDungeonState(dungeon);
      await dungeon.save();

      return res.json({
        success: true,
        message: `Berhasil membuka Peti Harta Karun! Mendapatkan ${silverReward} Perak ${gotSpiritStone ? '+ 1 Batu Roh Rendah' : ''}!`,
        accumulatedLoot: dungeon.accumulatedLoot,
        dungeon: sanitized
      });
    }

    if (action === 'exit') {
      const isAtExit = (dungeon.playerPos.x === dungeon.exitPos.x && dungeon.playerPos.y === dungeon.exitPos.y);
      const isAtEntrance = (dungeon.playerPos.x === 1 && dungeon.playerPos.y === 1);

      if (!isAtExit && !isAtEntrance) {
        return res.status(400).json({ error: 'Kamu harus berada di Pintu Keluar Portal atau Pintu Masuk Gua untuk keluar.' });
      }

      // Transfer harta karun ke akun pemain
      const lootMultiplier = isAtExit ? 1.0 : 0.6; // Penalti 40% jika kabur lewat pintu masuk
      const finalSilver = Math.floor(dungeon.accumulatedLoot.silver * lootMultiplier);
      const finalSpirit = Math.floor(dungeon.accumulatedLoot.spiritStones * lootMultiplier);

      if (!player.currencies) player.currencies = {};
      player.currencies.silver = (player.currencies.silver || 0) + finalSilver;
      player.currencies.spirit = (player.currencies.spirit || 0) + finalSpirit;

      // Pindahkan items ke inventori
      for (const it of dungeon.accumulatedLoot.items) {
        const itemDoc = await Item.findOne({ name: it.name });
        if (itemDoc && Array.isArray(player.inventory)) {
          const existing = player.inventory.find(i => i.itemId && i.itemId.toString() === itemDoc._id.toString());
          if (existing) {
            existing.quantity = (existing.quantity || 1) + it.quantity;
          } else {
            player.inventory.push({ itemId: itemDoc._id, quantity: it.quantity });
          }
        }
      }

      dungeon.status = isAtExit ? 'completed' : 'escaped';
      await dungeon.save();
      await player.save();

      return res.json({
        success: true,
        completed: isAtExit,
        message: isAtExit
          ? `Selamat! Kamu berhasil menaklukkan labirin gua dan membawa pulang ${finalSilver} Perak & ${finalSpirit} Batu Roh!`
          : `Kamu berhasil meloloskan diri dari gua purba! Membawa pulang ${finalSilver} Perak hasil jarahan.`,
        broughtLoot: {
          silver: finalSilver,
          spiritStones: finalSpirit
        }
      });
    }

    return res.status(400).json({ error: 'Aksi tidak dikenal.' });
  } catch (error) {
    console.error('[API-DUNGEON] Interact error:', error);
    res.status(500).json({ error: 'Gagal berinteraksi di dalam gua.' });
  }
});

module.exports = router;
