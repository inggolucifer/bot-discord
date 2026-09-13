module.exports = {
  LI_PER_HOUR: 100,
  AMBUSH_LOSS_PERCENT: 0.05,
  AMBUSH_LOSS_CAP_SILVER_EQ: 500,
  settlements: [
    { regionSlug: 'central_plains', name: 'Desa Xingcun' },
    { regionSlug: 'central_plains', name: 'Tianjing' },
    { regionSlug: 'central_plains', name: 'Luoyang Kecil' },
    { regionSlug: 'central_plains', name: 'Fengyang' },
    { regionSlug: 'central_plains', name: 'Desa Tiedao' },
    { regionSlug: 'azure_mountain_range', name: 'Tri-Sect Mountain Outpost' },
    { regionSlug: 'southern_demon_domain', name: 'Scar of Heaven Camp' },
    { regionSlug: 'eastern_sea_region', name: 'Pelabuhan Timur' },
    { regionSlug: 'northern_desolate_territory', name: 'Pos Tundra Utara' },
    { regionSlug: 'western_sacred_deserts', name: 'Oasis Barat' }
  ],
  distancesLi: {
    // Minimal graph: Xingcun↔Tianjing, Tianjing↔Luoyang, Tianjing↔tiap region hub
    'Desa Xingcun': { 'Tianjing': 50 },
    'Tianjing': {
      'Desa Xingcun': 50,
      'Luoyang Kecil': 100,
      'Fengyang': 80,
      'Desa Tiedao': 120,
      'Tri-Sect Mountain Outpost': 300,
      'Scar of Heaven Camp': 500,
      'Pelabuhan Timur': 400,
      'Pos Tundra Utara': 600,
      'Oasis Barat': 700
    },
    'Luoyang Kecil': { 'Tianjing': 100 },
    'Fengyang': { 'Tianjing': 80 },
    'Desa Tiedao': { 'Tianjing': 120 },
    'Tri-Sect Mountain Outpost': { 'Tianjing': 300 },
    'Scar of Heaven Camp': { 'Tianjing': 500 },
    'Pelabuhan Timur': { 'Tianjing': 400 },
    'Pos Tundra Utara': { 'Tianjing': 600 },
    'Oasis Barat': { 'Tianjing': 700 }
  }
};
