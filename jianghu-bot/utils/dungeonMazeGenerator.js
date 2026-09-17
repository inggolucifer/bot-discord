/**
 * dungeonMazeGenerator.js
 * Generator Labirin Gua Kuno Prosedural (DFS Recursive Backtracker)
 * Mendukung Skala 8x8 (Mortal), 20x20 (Spiritual), 40x40 (Immortal)
 */

const DUNGEON_CONFIGS = {
  Rank_1_8x8: {
    name: 'Gua Fana Purba (Mortal Cave)',
    width: 8,
    height: 8,
    trapCount: 2,
    chestCount: 1,
    monsterCount: 2,
    hasBoss: false,
    monsterPool: [
      { key: 'cave_bat', name: 'Kelelawar Gua Beracun', hp: 80, atk: 14, def: 6, spd: 8 },
      { key: 'cave_spider', name: 'Laba-Laba Gua Raksasa', hp: 110, atk: 18, def: 8, spd: 6 }
    ],
    silverRewardMin: 15,
    silverRewardMax: 35,
    spiritStoneChance: 0.1
  },
  Rank_2_20x20: {
    name: 'Gua Spiritual Berliku (Spiritual Realm)',
    width: 20,
    height: 20,
    trapCount: 6,
    chestCount: 3,
    monsterCount: 5,
    hasBoss: false,
    monsterPool: [
      { key: 'shadow_wolf', name: 'Serigala Bayangan Gua', hp: 280, atk: 38, def: 20, spd: 14 },
      { key: 'miasma_viper', name: 'Ular Beludru Miasma', hp: 320, atk: 44, def: 22, spd: 12 },
      { key: 'rock_golem_scout', name: 'Pengintai Golem Batu', hp: 450, atk: 35, def: 40, spd: 5 }
    ],
    silverRewardMin: 60,
    silverRewardMax: 150,
    spiritStoneChance: 0.5
  },
  Rank_3_40x40: {
    name: 'Labirin Makam Pedang Abadi (Immortal Ruin)',
    width: 40,
    height: 40,
    trapCount: 14,
    chestCount: 6,
    monsterCount: 10,
    hasBoss: true,
    monsterPool: [
      { key: 'ancient_sword_wraith', name: 'Hantu Pendekar Pedang Kuno', hp: 750, atk: 85, def: 45, spd: 22 },
      { key: 'fire_drake', name: 'Naga Api Bawah Tanah', hp: 950, atk: 105, def: 60, spd: 18 }
    ],
    boss: {
      key: 'ancient_demon_lord',
      name: 'Raja Iblis Gua Purba (Boss)',
      hp: 2200,
      atk: 140,
      def: 90,
      spd: 25,
      isBoss: true
    },
    silverRewardMin: 200,
    silverRewardMax: 600,
    spiritStoneChance: 1.0
  }
};

function generateDungeonMaze(rankKey = 'Rank_1_8x8') {
  const config = DUNGEON_CONFIGS[rankKey] || DUNGEON_CONFIGS.Rank_1_8x8;
  const { width, height } = config;

  // 1. Inisialisasi seluruh petak sebagai Dinding (isWall = true)
  const grid = [];
  for (let y = 0; y < height; y++) {
    grid[y] = [];
    for (let x = 0; x < width; x++) {
      grid[y][x] = {
        x,
        y,
        isWall: true,
        isEntrance: false,
        isExit: false,
        trapType: null,
        isTrapTriggered: false,
        chest: { isChest: false, opened: false, lootTier: 1, lootPreview: null },
        monster: { key: null, name: null, hp: 0, atk: 0, def: 0, spd: 0, defeated: false, isBoss: false }
      };
    }
  }

  // 2. DFS Recursive Backtracker Carving
  const visited = Array.from({ length: height }, () => Array(width).fill(false));
  const stack = [];

  const startX = 1;
  const startY = 1;
  grid[startY][startX].isWall = false;
  visited[startY][startX] = true;
  stack.push({ x: startX, y: startY });

  const directions = [
    { dx: 0, dy: -2 }, // Utara
    { dx: 2, dy: 0 },  // Timur
    { dx: 0, dy: 2 },  // Selatan
    { dx: -2, dy: 0 }  // Barat
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    // Acak urutan arah
    const shuffledDirs = [...directions].sort(() => Math.random() - 0.5);
    let carved = false;

    for (const dir of shuffledDirs) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && !visited[ny][nx]) {
        // Hancurkan dinding antara current dan next
        const wallX = current.x + dir.dx / 2;
        const wallY = current.y + dir.dy / 2;
        grid[wallY][wallX].isWall = false;
        grid[ny][nx].isWall = false;
        visited[ny][nx] = true;
        stack.push({ x: nx, y: ny });
        carved = true;
        break;
      }
    }

    if (!carved) {
      stack.pop();
    }
  }

  // 3. Pastikan Titik Keluar (Exit) Terukir & Dapat Dijangkau
  let exitX = width - 2;
  let exitY = height - 2;
  // Jika exitX/Y genap dan menabrak dinding batas, sesuaikan ke petak ganjil terdekat
  if (exitX % 2 === 0) exitX--;
  if (exitY % 2 === 0) exitY--;
  if (exitX < 1) exitX = 1;
  if (exitY < 1) exitY = 1;

  grid[startY][startX].isEntrance = true;
  grid[exitY][exitX].isWall = false;
  grid[exitY][exitX].isExit = true;

  // Buka sedikit koridor tambahan untuk variasi rute / ruangan
  if (width >= 20) {
    const roomCount = width === 20 ? 3 : 8;
    for (let r = 0; r < roomCount; r++) {
      const rx = Math.floor(Math.random() * (width - 6)) + 2;
      const ry = Math.floor(Math.random() * (height - 6)) + 2;
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          if (ry + dy < height - 1 && rx + dx < width - 1) {
            grid[ry + dy][rx + dx].isWall = false;
          }
        }
      }
    }
  }

  // 4. Identifikasi Seluruh Petak Terbuka (Walkable Path)
  const walkableTiles = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (!grid[y][x].isWall && !grid[y][x].isEntrance && !grid[y][x].isExit) {
        walkableTiles.push({ x, y });
      }
    }
  }

  // Acak walkable tiles untuk penyebaran jebakan, peti, monster
  walkableTiles.sort(() => Math.random() - 0.5);

  let poolIdx = 0;

  // 5. Tebar Jebakan (Trap)
  const trapTypes = ['spike', 'poison'];
  for (let t = 0; t < config.trapCount && poolIdx < walkableTiles.length; t++) {
    const pos = walkableTiles[poolIdx++];
    grid[pos.y][pos.x].trapType = trapTypes[t % 2];
  }

  // 6. Tebar Peti Harta Karun (Treasure Chests)
  for (let c = 0; c < config.chestCount && poolIdx < walkableTiles.length; c++) {
    const pos = walkableTiles[poolIdx++];
    grid[pos.y][pos.x].chest = {
      isChest: true,
      opened: false,
      lootTier: c + 1,
      lootPreview: `Peti Kuno Tingkat ${c + 1}`
    };
  }

  // 7. Tebar Monster Penjaga
  for (let m = 0; m < config.monsterCount && poolIdx < walkableTiles.length; m++) {
    const pos = walkableTiles[poolIdx++];
    const mTemplate = config.monsterPool[m % config.monsterPool.length];
    grid[pos.y][pos.x].monster = {
      ...mTemplate,
      defeated: false,
      isBoss: false
    };
  }

  // 8. Tebar Bos Kuno jika ada (Rank 3)
  if (config.hasBoss && config.boss && poolIdx < walkableTiles.length) {
    // Cari petak terdekat dengan exit untuk sarang bos
    const nearExitPos = walkableTiles.find(t => Math.abs(t.x - exitX) <= 3 && Math.abs(t.y - exitY) <= 3) || walkableTiles[poolIdx++];
    grid[nearExitPos.y][nearExitPos.x].monster = {
      ...config.boss,
      defeated: false
    };
  }

  // 9. Ratakan jadi 1D array untuk Mongoose Schema
  const flattenedTiles = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      flattenedTiles.push(grid[y][x]);
    }
  }

  return {
    rankKey,
    dungeonName: config.name,
    gridWidth: width,
    gridHeight: height,
    playerPos: { x: startX, y: startY },
    exitPos: { x: exitX, y: exitY },
    tiles: flattenedTiles,
    config
  };
}

module.exports = {
  DUNGEON_CONFIGS,
  generateDungeonMaze
};
