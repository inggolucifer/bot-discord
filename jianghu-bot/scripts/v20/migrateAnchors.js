const fs = require('fs');
const path = require('path');

const BOT_ROOT = path.resolve(__dirname, '../..');
const ANCHORS_PATH = path.join(BOT_ROOT, 'world-data/anchors.json');

console.log('[MIGRATE-ANCHORS] Memulai migrasi blok v20 pada anchors.json...');

const anchors = JSON.parse(fs.readFileSync(ANCHORS_PATH, 'utf8'));

const EXCLUSION_RADII = {
  hamlet: 6,
  village: 10,
  town: 14,
  major_city: 24,
  capital_city: 36,
  sect: 16,
  outpost: 8,
  port: 10,
  island: 10,
  secret_realm: 6,
  danger_zone: 8
};

const FACILITIES_PROFILES = {
  hamlet: 'hamlet',
  village: 'village',
  town: 'town',
  major_city: 'major_city',
  capital_city: 'capital',
  sect: 'sect',
  outpost: 'outpost',
  port: 'port',
  island: 'port',
  secret_realm: 'hamlet',
  danger_zone: 'outpost'
};

const MARKER_DEF_IDS = {
  // Capital
  tianjing: 'settlement_capital_tianjing',
  // Major cities
  xitong_city: 'settlement_city_imperial',
  kota_fengyang: 'settlement_city_trade',
  luoyang_kecil: 'settlement_city_trade',
  kota_jinling: 'settlement_city_imperial',
  // Sects
  sekte_awan_pedang: 'settlement_sect_sword',
  sekte_pedang_langit: 'settlement_sect_sword',
  kuil_lonceng_emas: 'settlement_sect_bell',
  lembah_racun_bayangan: 'settlement_sect_lotus',
  istana_giok_laut_timur: 'settlement_sect_generic',
  sekte_petir_ilahiah: 'settlement_sect_sword',
  sekte_pasir_suci: 'settlement_sect_generic',
  istana_es_abadi: 'settlement_sect_generic',
  // Ports & Island
  dermaga_donghai: 'settlement_port_donghai',
  dermaga_teluk_sembilan: 'settlement_port_bay',
  pulau_penyu_raksasa: 'settlement_island_turtle',
  // Outposts
  pos_perbatasan_qinghe: 'settlement_outpost_gatehouse',
  kaki_gunung_azure: 'settlement_outpost_watchtower',
  pos_tundra_utara: 'settlement_outpost_watchtower',
  pos_menara_pantau_danau: 'settlement_outpost_watchtower',
  // Danger zones
  benteng_gerbang_iblis: 'entrance_danger_gate',
  lembah_kabut_merah: 'entrance_danger_swamp',
  // Secret realms
  gua_purba_bunga_aprikot: 'entrance_secret_cave',
  makam_kaisar_pedang_purba: 'entrance_secret_tomb',
  reruntuhan_abadi_tianyuan: 'entrance_secret_ruin',
  sarang_naga_karang_timur: 'entrance_secret_portal',
  // Villages
  desa_xingcun: 'settlement_village_river',
  desa_bamboo_grove: 'settlement_village_bamboo',
  desa_lingquan: 'settlement_village_river',
  desa_shaquan: 'settlement_village_desert',
  oase_shadi: 'settlement_village_desert',
  desa_xueshan: 'settlement_village_frost',
  desa_yougu: 'settlement_village_hill',
  desa_tianhe: 'settlement_village_default',
  desa_heiyan: 'settlement_village_default',
  desa_tiedao: 'settlement_village_default',
  // Hamlets
  dusun_mata_air_jernih: 'settlement_hamlet_river',
  dusun_kebun_persik: 'settlement_hamlet_hill',
  dusun_pondok_teh_kuno: 'settlement_hamlet_hill',
  dusun_padi_emas: 'settlement_hamlet_river',
  dusun_oasis_tersembunyi: 'settlement_hamlet_desert',
  dusun_gembala_petir: 'settlement_hamlet_steppe',
  dusun_pondok_karang: 'settlement_hamlet_river',
  dusun_pondok_es: 'settlement_hamlet_frost',
  kemah_dataran_tinggi_petapa: 'settlement_hamlet_hill',
  // Towns
  kota_yunxi: 'settlement_town_plain',
  kota_hanhai: 'settlement_town_desert',
  kota_leiyin: 'settlement_town_plain',
  kota_canghai: 'settlement_town_coast',
  kota_binghu: 'settlement_town_frost',
  kota_moyun: 'settlement_town_plain',
  kota_shuijing: 'settlement_town_plain'
};

for (const a of anchors) {
  const spanW = a.spanWidth || 2;
  const spanH = a.spanHeight || 2;

  // Forecourt tile at bottom row
  const entrance = {
    x: a.x + Math.floor(spanW / 2),
    y: a.y + spanH - 1,
    facing: 'south'
  };

  const exclusionRadius = EXCLUSION_RADII[a.type] || 10;
  const facilitiesProfile = FACILITIES_PROFILES[a.type] || 'village';
  const markerDefId = MARKER_DEF_IDS[a.id] || `settlement_${a.type}_default`;

  // Preserve existing residences if any
  const existingResidences = a.v20?.residences || [];

  a.v20 = {
    tierClass: a.type,
    markerDefId,
    entrance,
    exclusionRadius,
    facilitiesProfile,
    residences: existingResidences
  };
}

fs.writeFileSync(ANCHORS_PATH, JSON.stringify(anchors, null, 2), 'utf8');
console.log(`[MIGRATE-ANCHORS] Selesai menambahkan blok v20 ke ${anchors.length} anchor.`);
