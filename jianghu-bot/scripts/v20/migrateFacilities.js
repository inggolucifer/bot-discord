const fs = require('fs');
const path = require('path');

const BOT_ROOT = path.resolve(__dirname, '../..');
const BLUEPRINTS_DIR = path.join(BOT_ROOT, 'world-data/settlements');
const OUT_PATH = path.join(BOT_ROOT, 'world-data/settlement-facilities-v20.json');

console.log('[MIGRATE-FACILITIES] Membangun settlement-facilities-v20.json...');

function loadBlueprint(name) {
  const p = path.join(BLUEPRINTS_DIR, name);
  if (fs.existsSync(p)) {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  return {};
}

const bpVillage = loadBlueprint('village_blueprint.json');
const bpCity = loadBlueprint('city_blueprint.json');
const bpPort = loadBlueprint('port_blueprint.json');
const bpOutpost = loadBlueprint('outpost_blueprint.json');
const bpSect = loadBlueprint('sect_blueprint.json');

function extractPanorama(bp) {
  return {
    backdropId: bp.backdropId || 'backdrop_misty_bamboo_village',
    palette: bp.palette || 'ink_cyan',
    skyColor: bp.skyColor || '#0a131c',
    groundColor: bp.groundColor || '#141c22',
    description: bp.description || '',
    layers: bp.layers || []
  };
}

const facilityDefs = {
  rest_stop: {
    id: 'rest_stop',
    name: 'Pondok Istirahat',
    chineseName: '歇脚亭',
    icon: 'BedDouble',
    service: 'free_rest',
    status: 'open',
    desc: 'Pondok bambu terbuka tempat para musafir menghela napas tanpa biaya.'
  },
  inn: {
    id: 'inn',
    name: 'Penginapan',
    chineseName: '客栈',
    icon: 'BedDouble',
    service: 'rest',
    status: 'open',
    desc: 'Pondok penginapan kayu nyaman untuk memulihkan stamina dan luka dalam.'
  },
  tavern: {
    id: 'tavern',
    name: 'Kedai Teh & Arak',
    chineseName: '酒肆',
    icon: 'Wine',
    service: 'drink',
    status: 'open',
    desc: 'Meneguk teh pegunungan hangat atau arak wangi sembari mendengarkan kabar angin Jianghu.'
  },
  market: {
    id: 'market',
    name: 'Pasar',
    chineseName: '市集',
    icon: 'ShoppingBag',
    service: 'trade',
    status: 'open',
    desc: 'Pusat perniagaan barter herba, bijih mineral, dan perkakas kultivasi.'
  },
  bounty_board: {
    id: 'bounty_board',
    name: 'Papan Hadiah',
    chineseName: '悬赏榜',
    icon: 'FileText',
    service: 'bounty',
    status: 'open',
    desc: 'Papan pengumuman tugas penumpasan monster dan misi hadiah resmi.'
  },
  workshop: {
    id: 'workshop',
    name: 'Bengkel Tempa & Alkimia',
    chineseName: '百工坊',
    icon: 'Hammer',
    service: 'craft',
    status: 'open',
    desc: 'Tungku perapian dan kuali alkimia untuk meracik pil serta menempa senjata.'
  },
  manual_pavilion: {
    id: 'manual_pavilion',
    name: 'Paviliun Kitab',
    chineseName: '藏经阁',
    icon: 'BookOpen',
    service: 'manuals',
    status: 'open',
    desc: 'Perpustakaan naskah kuno berisikan manual jurus dan teknik beladiri esoteris.'
  },
  courier_stables: {
    id: 'courier_stables',
    name: 'Kandang Kuda & Pos',
    chineseName: '驿站',
    icon: 'Compass',
    service: 'travel',
    status: 'open',
    desc: 'Layanan kafilah dan kereta pos untuk menjelajahi wilayah jauh dengan aman.'
  },
  storage: {
    id: 'storage',
    name: 'Gudang Penyimpanan',
    chineseName: '建木仓库',
    icon: 'Archive',
    service: 'storage_stub',
    status: 'coming_soon',
    desc: 'Gudang kayu spiritual untuk menyimpan pusaka dan perbekalan kultivator.'
  },
  auction: {
    id: 'auction',
    name: 'Balai Lelang',
    chineseName: '拍卖行',
    icon: 'Coins',
    service: 'auction_stub',
    status: 'coming_soon',
    desc: 'Pelelangan barang pusaka langka, pil abadi, dan artefak bermutu tinggi.'
  },
  teleport_array: {
    id: 'teleport_array',
    name: 'Formasi Teleportasi',
    chineseName: '传送阵',
    icon: 'Sparkles',
    service: 'teleport_stub',
    status: 'coming_soon',
    desc: 'Susunan formasi batu roh kuno untuk melintasi benua dalam sekejap mata.'
  },
  sect_hall: {
    id: 'sect_hall',
    name: 'Balai Utama Sekte',
    chineseName: '宗门大殿',
    icon: 'Swords',
    service: 'sect_manage',
    status: 'open',
    desc: 'Pusat kepengurusan murid dan balai pertemuan para tetua perguruan.'
  },
  dock: {
    id: 'dock',
    name: 'Dermaga Feri',
    chineseName: '渡口码头',
    icon: 'Ship',
    service: 'ferry_crossing',
    status: 'open',
    desc: 'Dermaga penyeberangan feri dan rakit bambu resmi antar kepulauan dan delta.'
  },
  residences: {
    id: 'residences',
    name: 'Rumah Penduduk',
    chineseName: '民居',
    icon: 'Users',
    service: 'npc_list',
    status: 'open',
    desc: 'Kompleks pemukiman warga dan tempat tinggal para tokoh penting kota.'
  }
};

const profiles = {
  hamlet: {
    tier: 1,
    label: 'Dusun Kecil',
    facilities: ['rest_stop', 'residences'],
    panorama: extractPanorama(bpVillage)
  },
  village: {
    tier: 1,
    label: 'Desa Pedesaan',
    facilities: ['inn', 'tavern', 'market', 'bounty_board', 'workshop', 'residences'],
    panorama: extractPanorama(bpVillage)
  },
  town: {
    tier: 2,
    label: 'Kota Praja',
    facilities: ['inn', 'tavern', 'market', 'bounty_board', 'workshop', 'courier_stables', 'storage', 'residences'],
    panorama: extractPanorama(bpCity)
  },
  major_city: {
    tier: 3,
    label: 'Kota Besar',
    facilities: ['inn', 'tavern', 'market', 'bounty_board', 'workshop', 'manual_pavilion', 'courier_stables', 'storage', 'auction', 'teleport_array', 'residences'],
    panorama: extractPanorama(bpCity)
  },
  capital: {
    tier: 4,
    label: 'Ibu Kota Kekaisaran',
    facilities: ['inn', 'tavern', 'market', 'bounty_board', 'workshop', 'manual_pavilion', 'courier_stables', 'storage', 'auction', 'teleport_array', 'residences'],
    panorama: extractPanorama(bpCity)
  },
  sect: {
    tier: 3,
    label: 'Gerbang Gunung Sekte',
    facilities: ['sect_hall', 'manual_pavilion', 'workshop', 'market', 'residences'],
    panorama: extractPanorama(bpSect)
  },
  outpost: {
    tier: 2,
    label: 'Pos Garnisun Perbatasan',
    facilities: ['inn', 'bounty_board', 'workshop', 'courier_stables', 'residences'],
    panorama: extractPanorama(bpOutpost)
  },
  port: {
    tier: 2,
    label: 'Dermaga Pelabuhan Laut',
    facilities: ['dock', 'tavern', 'market', 'inn', 'workshop', 'storage', 'residences'],
    panorama: extractPanorama(bpPort)
  }
};

const data = {
  version: 1,
  profiles,
  facilityDefs
};

fs.writeFileSync(OUT_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`[MIGRATE-FACILITIES] Selesai menulis ${OUT_PATH}!`);
