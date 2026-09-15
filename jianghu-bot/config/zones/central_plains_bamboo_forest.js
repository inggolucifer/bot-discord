module.exports = {
  zoneId: 'central_plains_bamboo_forest',
  regionSlug: 'central_plains', // relasi ke RegionMap yang sudah ada
  displayName: 'Hutan Bambu Xingcun',
  gridWidth: 30,
  gridHeight: 20, // ukuran grid zona ini
  defaultTerrain: 'bamboo_forest', // terrain default kalau tile tidak punya override
  backgroundImageUrl: null, // AI-generated, style tile-art
  cultivationEfficiency: 1.0, // multiplier qi regen
  ambientDangerTier: 2, // dipakai FASE G4
  exitPoints: [
    { edge: 'north', leadsToZoneId: 'central_plains_tianjing_outskirts' }
  ], // sambungan antar-zona LOKAL (jalan kaki singkat)
  travelGateTiles: [
    { tileX: 15, tileY: 10, leadsToSettlement: 'Tianjing' }
  ], // tile khusus yang memicu Travel JARAK JAUH
  buildableAllowed: true, // area tertentu yang diijinkan
};
