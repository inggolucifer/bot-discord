module.exports = {
  LI_PER_HOUR: 100,
  AMBUSH_LOSS_PERCENT: 0.05,
  AMBUSH_LOSS_CAP_SILVER_EQ: 500,
  settlements: [
    { regionSlug: 'central_plains', name: 'Desa Xingcun', minRealmIndex: 0 },
    { regionSlug: 'central_plains', name: 'Tianjing', minRealmIndex: 0 },
    { regionSlug: 'central_plains', name: 'Luoyang Kecil', minRealmIndex: 0 },
    { regionSlug: 'central_plains', name: 'Fengyang', minRealmIndex: 0 },
    { regionSlug: 'central_plains', name: 'Desa Tiedao', minRealmIndex: 0 },
    { regionSlug: 'central_plains', name: 'Ibukota Central', minRealmIndex: 0 },
    { regionSlug: 'azure_mountain_range', name: 'Tri-Sect Mountain Outpost', minRealmIndex: 1 },
    { regionSlug: 'azure_mountain_range', name: 'Azure Sect Approach', minRealmIndex: 1 },
    { regionSlug: 'eastern_sea_region', name: 'Pelabuhan Timur', minRealmIndex: 2 },
    { regionSlug: 'eastern_sea_region', name: 'Eastern Market Port', minRealmIndex: 2 },
    { regionSlug: 'southern_demon_domain', name: 'Scar of Heaven Camp', minRealmIndex: 3 },
    { regionSlug: 'southern_demon_domain', name: 'Southern Watch', minRealmIndex: 3 },
    { regionSlug: 'western_sacred_deserts', name: 'Oasis Barat', minRealmIndex: 4 },
    { regionSlug: 'western_sacred_deserts', name: 'Desert Relay', minRealmIndex: 4 },
    { regionSlug: 'northern_desolate_territory', name: 'Pos Tundra Utara', minRealmIndex: 5 },
    { regionSlug: 'northern_desolate_territory', name: 'Northern Caravan Post', minRealmIndex: 5 }
  ],
    distancesLi: {
    'Desa Xingcun': { 'Tianjing': 50 },
    'Tianjing': {
      'Desa Xingcun': 50,
      'Luoyang Kecil': 100,
      'Fengyang': 80,
      'Desa Tiedao': 120,
      'Ibukota Central': 50,
      'Tri-Sect Mountain Outpost': 300,
      'Pelabuhan Timur': 400
    },
    'Luoyang Kecil': { 'Tianjing': 100, 'Fengyang': 120 },
    'Fengyang': { 'Tianjing': 80, 'Luoyang Kecil': 120 },
    'Desa Tiedao': { 'Tianjing': 120 },
    'Ibukota Central': { 'Tianjing': 50 },

    'Tri-Sect Mountain Outpost': { 'Tianjing': 300, 'Azure Sect Approach': 100 },
    'Azure Sect Approach': { 'Tri-Sect Mountain Outpost': 100 },

    'Pelabuhan Timur': { 'Tianjing': 400, 'Eastern Market Port': 50, 'Scar of Heaven Camp': 600 },
    'Eastern Market Port': { 'Pelabuhan Timur': 50 },

    'Scar of Heaven Camp': { 'Pelabuhan Timur': 600, 'Southern Watch': 150, 'Oasis Barat': 800 },
    'Southern Watch': { 'Scar of Heaven Camp': 150 },

    'Oasis Barat': { 'Scar of Heaven Camp': 800, 'Desert Relay': 200, 'Pos Tundra Utara': 1000 },
    'Desert Relay': { 'Oasis Barat': 200 },

    'Pos Tundra Utara': { 'Oasis Barat': 1000, 'Northern Caravan Post': 150 },
    'Northern Caravan Post': { 'Pos Tundra Utara': 150 }
  }
};
