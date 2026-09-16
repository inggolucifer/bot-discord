/**
 * tianyuan_world_map.js
 * Konfigurasi Zona Master Peta Raksasa Jianghu (5000x5000 Tile)
 * Menggunakan Procedural World Engine untuk streaming data spasial efisien
 */

module.exports = {
  zoneId: 'tianyuan_world_map',
  regionSlug: 'central_plains',
  displayName: 'Benua Jianghu Raya (5000x5000)',
  chineseName: '天元大陆',
  gridWidth: 5000,
  gridHeight: 5000,
  defaultTerrain: 'plains',
  ambientDangerTier: 1.5,
  isMacroGrid: true,
  // Titik awal pemain baru: dekat Kota XiTong & Desa Xingcun
  spawnPoint: { tileX: 2455, tileY: 2485 },
  buildableAllowed: true
};
