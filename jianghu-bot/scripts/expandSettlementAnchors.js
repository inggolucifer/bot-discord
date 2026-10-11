/**
 * expandSettlementAnchors.js
 * Memperbanyak titik pemukiman dari 6 pemukiman lama menjadi ~40+ titik pemukiman
 * (1 ibu kota, 4 kota besar, 8 kota kecil, 12 desa, 10 dusun/rumah petani, 6 pos penjaga, 3 pelabuhan, plus 8 sekte)
 * dengan validasi ketat Invariant 11 (jarak >= 180) dan Invariant 12 (walkable & non-solid).
 */

const fs = require('fs');
const path = require('path');
const proceduralWorldEngine = require('../utils/proceduralWorldEngine');

const anchorsPath = path.join(__dirname, '../world-data/anchors.json');
const currentAnchors = JSON.parse(fs.readFileSync(anchorsPath, 'utf8'));

// Pemukiman baru yang dirancang secara geografis
const newSettlements = [
  // 1 Kota Besar tambahan (total 4 kota besar)
  {
    id: 'kota_jinling',
    name: 'Kota Jinling',
    chineseName: '金陵城',
    type: 'major_city',
    region: 'nine_springs_delta',
    x: 2750,
    y: 2350,
    tier: 1,
    spanWidth: 5,
    spanHeight: 5,
    label: 'Kota Megah Tepi Sungai Jinling',
    description: 'Kota metropolis perniagaan kain sutra dan dermaga sungai yang ramai di Delta Sembilan Mata Air.',
    footprintWidth: 40,
    footprintHeight: 40,
    buildBuffer: 5
  },

  // 8 Kota Kecil (town)
  {
    id: 'kota_yunxi',
    name: 'Kota Kecil Yunxi',
    chineseName: '云溪镇',
    type: 'town',
    region: 'central_plains',
    x: 2200,
    y: 2500,
    tier: 1,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Kota Perlintasan Lembah Awan',
    description: 'Kota persinggahan pedagang dan kultivator muda di Dataran Tengah.',
    footprintWidth: 30,
    footprintHeight: 30,
    buildBuffer: 5
  },
  {
    id: 'kota_lingfeng',
    name: 'Kota Kecil Lingfeng',
    chineseName: '灵峰镇',
    type: 'town',
    region: 'azure_mountain_range',
    x: 2450,
    y: 3200,
    tier: 2,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Kota Pasar Kaki Gunung Roh',
    description: 'Pusat barter herba salju dan bulu binatang langka di kaki Pegunungan Azure.',
    footprintWidth: 30,
    footprintHeight: 30,
    buildBuffer: 5
  },
  {
    id: 'kota_hanhai',
    name: 'Kota Kecil Hanhai',
    chineseName: '瀚海镇',
    type: 'town',
    region: 'western_sacred_desert',
    x: 1100,
    y: 2400,
    tier: 2,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Kota Benteng Pasir Barat',
    description: 'Pos persinggahan karavan unta dan pedagang giok gurun.',
    footprintWidth: 30,
    footprintHeight: 30,
    buildBuffer: 5
  },
  {
    id: 'kota_leiyin',
    name: 'Kota Kecil Leiyin',
    chineseName: '雷音镇',
    type: 'town',
    region: 'thundersteppe',
    x: 2600,
    y: 3800,
    tier: 2,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Kota Pandai Besi Petir',
    description: 'Kota pengrajin logam yang memanfaatkan energi petir alami.',
    footprintWidth: 30,
    footprintHeight: 30,
    buildBuffer: 5
  },
  {
    id: 'kota_canghai',
    name: 'Kota Kecil Canghai',
    chineseName: '沧海镇',
    type: 'town',
    region: 'eastern_sea',
    x: 3700,
    y: 2550,
    tier: 1,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Kota Garam Pesisir Timur',
    description: 'Kota pengolahan garam laut dan mutiara spiritual.',
    footprintWidth: 30,
    footprintHeight: 30,
    buildBuffer: 5
  },
  {
    id: 'kota_binghu',
    name: 'Kota Kecil Binghu',
    chineseName: '冰湖镇',
    type: 'town',
    region: 'northern_desolate',
    x: 1800,
    y: 4350,
    tier: 3,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Kota Penebang Kayu Es',
    description: 'Permukiman pemburu bulu dan penebang pohon cemara es beku.',
    footprintWidth: 30,
    footprintHeight: 30,
    buildBuffer: 5
  },
  {
    id: 'kota_moyun',
    name: 'Kota Kecil Moyun',
    chineseName: '墨云镇',
    type: 'town',
    region: 'southern_demon_domain',
    x: 2150,
    y: 1250,
    tier: 3,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Kota Pasar Gelap Awan Tinta',
    description: 'Pasar netral bagi pedagang terlarang di perbatasan domain iblis.',
    footprintWidth: 30,
    footprintHeight: 30,
    buildBuffer: 5
  },
  {
    id: 'kota_shuijing',
    name: 'Kota Kecil Shuijing',
    chineseName: '水镜镇',
    type: 'town',
    region: 'mirror_lake',
    x: 3100,
    y: 3100,
    tier: 1,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Kota Paviliun Cermin Air',
    description: 'Pusat wisata dan meditasi di tepi Danau Cermin.',
    footprintWidth: 30,
    footprintHeight: 30,
    buildBuffer: 5
  },

  // 8 Desa tambahan (total 12 desa)
  {
    id: 'desa_bamboo_grove',
    name: 'Desa Rimbun Bambu',
    chineseName: '竹林村',
    type: 'village',
    region: 'central_plains',
    x: 1850,
    y: 2800,
    tier: 1,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Desa Pengrajin Bambu Hijau',
    description: 'Desa tenang penghasil kerajinan bambu dan rebung manis.',
    footprintWidth: 30,
    footprintHeight: 30,
    buildBuffer: 5
  },
  {
    id: 'desa_lingquan',
    name: 'Desa Lingquan',
    chineseName: '灵泉村',
    type: 'village',
    region: 'nine_springs_delta',
    x: 2550,
    y: 2550,
    tier: 1,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Desa Mata Air Rohani',
    description: 'Desa penghasil air mineral kaya Qi spiritual untuk pembuatan pil.',
    footprintWidth: 30,
    footprintHeight: 30,
    buildBuffer: 5
  },
  {
    id: 'desa_qingshan',
    name: 'Desa Qingshan',
    chineseName: '青山村',
    type: 'village',
    region: 'azure_mountain_range',
    x: 2000,
    y: 3500,
    tier: 2,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Desa Pemburu Tebing Hijau',
    description: 'Desa pemanah dan pengumpul sarang walet di tebing batu.',
    footprintWidth: 30,
    footprintHeight: 30,
    buildBuffer: 5
  },
  {
    id: 'desa_shaquan',
    name: 'Desa Shaquan',
    chineseName: '沙泉村',
    type: 'village',
    region: 'western_sacred_desert',
    x: 600,
    y: 2100,
    tier: 2,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Desa Sumur Pasir Barat',
    description: 'Permukiman oase kecil di pedalaman gurun suci barat.',
    footprintWidth: 30,
    footprintHeight: 30,
    buildBuffer: 5
  },
  {
    id: 'desa_tianhe',
    name: 'Desa Tianhe',
    chineseName: '天河村',
    type: 'village',
    region: 'thundersteppe',
    x: 2200,
    y: 3950,
    tier: 2,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Desa Padang Rumput Sungai Langit',
    description: 'Desa peternak kuda kilat di hamparan padang badai.',
    footprintWidth: 30,
    footprintHeight: 30,
    buildBuffer: 5
  },
  {
    id: 'desa_yufeng',
    name: 'Desa Yufeng',
    chineseName: '渔风村',
    type: 'village',
    region: 'eastern_sea',
    x: 4100,
    y: 2600,
    tier: 1,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Desa Nelayan Pesisir Angin',
    description: 'Desa pesisir pantai timur penghasil ikan laut spiritual.',
    footprintWidth: 30,
    footprintHeight: 30,
    buildBuffer: 5
  },
  {
    id: 'desa_xueshan',
    name: 'Desa Xueshan',
    chineseName: '雪山村',
    type: 'village',
    region: 'northern_desolate',
    x: 2350,
    y: 4300,
    tier: 3,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Desa Kaki Gunung Salju',
    description: 'Desa perapian hangat di tengah hamparan tundra dingin.',
    footprintWidth: 30,
    footprintHeight: 30,
    buildBuffer: 5
  },
  {
    id: 'desa_yougu',
    name: 'Desa Yougu',
    chineseName: '幽谷村',
    type: 'village',
    region: 'hermit_highlands',
    x: 1050,
    y: 4000,
    tier: 2,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Desa Lembah Sunyi Petapa',
    description: 'Desa kebun teh tenang di dataran tinggi petapa.',
    footprintWidth: 30,
    footprintHeight: 30,
    buildBuffer: 5
  },

  // 8 Dusun / Rumah Petani tambahan (total 10 dusun)
  {
    id: 'dusun_kebun_persik',
    name: 'Dusun Kebun Persik',
    chineseName: '桃园庄',
    type: 'hamlet',
    region: 'central_plains',
    x: 2150,
    y: 2700,
    tier: 1,
    spanWidth: 2,
    spanHeight: 2,
    label: 'Kebun Persik Abadi',
    description: 'Dusun petani buah persik manis dan nektar bunga.',
    footprintWidth: 20,
    footprintHeight: 20,
    buildBuffer: 5
  },
  {
    id: 'dusun_padi_emas',
    name: 'Dusun Padi Emas',
    chineseName: '金稻庄',
    type: 'hamlet',
    region: 'nine_springs_delta',
    x: 2300,
    y: 2350,
    tier: 1,
    spanWidth: 2,
    spanHeight: 2,
    label: 'Lumbung Padi Emas',
    description: 'Dusun lumbung pangan dan sawah bertingkat.',
    footprintWidth: 20,
    footprintHeight: 20,
    buildBuffer: 5
  },
  {
    id: 'dusun_herba_kabut',
    name: 'Dusun Herba Kabut',
    chineseName: '雾草庄',
    type: 'hamlet',
    region: 'azure_mountain_range',
    x: 2350,
    y: 3450,
    tier: 2,
    spanWidth: 2,
    spanHeight: 2,
    label: 'Kebun Herba Berkabut',
    description: 'Kebun budidaya ginseng dan lingzhi liar.',
    footprintWidth: 20,
    footprintHeight: 20,
    buildBuffer: 5
  },
  {
    id: 'dusun_oasis_tersembunyi',
    name: 'Dusun Oase Tersembunyi',
    chineseName: '秘泉庄',
    type: 'hamlet',
    region: 'western_sacred_desert',
    x: 750,
    y: 2300,
    tier: 2,
    spanWidth: 2,
    spanHeight: 2,
    label: 'Pondok Karavan Gurun',
    description: 'Tempat peristirahatan kecil bagi musafir padang pasir.',
    footprintWidth: 20,
    footprintHeight: 20,
    buildBuffer: 5
  },
  {
    id: 'dusun_gembala_petir',
    name: 'Dusun Gembala Petir',
    chineseName: '雷牧庄',
    type: 'hamlet',
    region: 'thundersteppe',
    x: 2500,
    y: 3900,
    tier: 2,
    spanWidth: 2,
    spanHeight: 2,
    label: 'Kandang Kuda Badai',
    description: 'Pondok penggembala kuda di tengah padang petir.',
    footprintWidth: 20,
    footprintHeight: 20,
    buildBuffer: 5
  },
  {
    id: 'dusun_pondok_karang',
    name: 'Dusun Pondok Karang',
    chineseName: '礁石庄',
    type: 'hamlet',
    region: 'eastern_sea',
    x: 3800,
    y: 2650,
    tier: 1,
    spanWidth: 2,
    spanHeight: 2,
    label: 'Pondok Pencari Kerang',
    description: 'Pondok nelayan pengumpul mutiara laut.',
    footprintWidth: 20,
    footprintHeight: 20,
    buildBuffer: 5
  },
  {
    id: 'dusun_pondok_es',
    name: 'Dusun Pondok Es',
    chineseName: '寒冰庄',
    type: 'hamlet',
    region: 'northern_desolate',
    x: 2000,
    y: 4250,
    tier: 3,
    spanWidth: 2,
    spanHeight: 2,
    label: 'Pondok Perangkap Beruang',
    description: 'Pondok kayu pemburu binatang bertaring es.',
    footprintWidth: 20,
    footprintHeight: 20,
    buildBuffer: 5
  },
  {
    id: 'dusun_pondok_teh_kuno',
    name: 'Dusun Pondok Teh Kuno',
    chineseName: '古茶庄',
    type: 'hamlet',
    region: 'hermit_highlands',
    x: 1300,
    y: 4100,
    tier: 2,
    spanWidth: 2,
    spanHeight: 2,
    label: 'Perkebunan Teh Hijau Kuno',
    description: 'Perkebunan daun teh pencerahan Qi.',
    footprintWidth: 20,
    footprintHeight: 20,
    buildBuffer: 5
  },

  // 3 Pos Penjaga tambahan (total 6 pos penjaga)
  {
    id: 'pos_lembah_pedang',
    name: 'Pos Celah Lembah Pedang',
    chineseName: '剑峡哨',
    type: 'outpost',
    region: 'sword_gorge',
    x: 2100,
    y: 3100,
    tier: 2,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Menara Pengawas Ngarai Pedang',
    description: 'Menara penjaga gerbang Ngarai Pedang.',
    footprintWidth: 25,
    footprintHeight: 25,
    buildBuffer: 5
  },
  {
    id: 'pos_benteng_selatan',
    name: 'Pos Benteng Penjaga Selatan',
    chineseName: '南隘关',
    type: 'outpost',
    region: 'border_march',
    x: 2450,
    y: 1850,
    tier: 2,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Benteng Pasukan Perbatasan Selatan',
    description: 'Kubu pertahanan kavaleri kekaisaran.',
    footprintWidth: 25,
    footprintHeight: 25,
    buildBuffer: 5
  },
  {
    id: 'pos_menara_pantau_danau',
    name: 'Pos Menara Pantau Danau',
    chineseName: '望湖哨',
    type: 'outpost',
    region: 'mirror_lake',
    x: 3250,
    y: 3000,
    tier: 1,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Menara Mercusuar Danau Cermin',
    description: 'Menara pemandu kapal di danau jernih.',
    footprintWidth: 25,
    footprintHeight: 25,
    buildBuffer: 5
  },

  // 2 Pelabuhan Dermaga tambahan (total 3 pelabuhan)
  {
    id: 'dermaga_teluk_sembilan',
    name: 'Dermaga Teluk Sembilan',
    chineseName: '九泉渡',
    type: 'port',
    region: 'nine_springs_delta',
    x: 2500,
    y: 2300,
    tier: 1,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Dermaga Rakit Bambu Delta',
    description: 'Dermaga penyeberangan rakit bambu antar sungai.',
    footprintWidth: 30,
    footprintHeight: 30,
    buildBuffer: 5
  },
  {
    id: 'pelabuhan_bulan_beku',
    name: 'Pelabuhan Bulan Beku',
    chineseName: '冻月港',
    type: 'port',
    region: 'frostmoon_sea',
    x: 3600,
    y: 4400,
    tier: 3,
    spanWidth: 3,
    spanHeight: 3,
    label: 'Pelabuhan Kapal Es Utara',
    description: 'Dermaga kapal pemecah es dan kapal pedagang kutub.',
    footprintWidth: 30,
    footprintHeight: 30,
    buildBuffer: 5
  }
];

// Validasi setiap titik baru
console.log('Memvalidasi koordinat pemukiman baru...');
const validNew = [];

for (const s of newSettlements) {
  // Cek apakah ID sudah ada
  if (currentAnchors.some(a => a.id === s.id)) {
    console.log(`[SKIP] Anchor ${s.id} sudah ada.`);
    continue;
  }

  // Cek walkable dan non-solid
  const tile = proceduralWorldEngine.getTileAt(s.x, s.y);
  if (tile.isSolid) {
    console.error(`[ERROR] Titik ${s.id} pada (${s.x}, ${s.y}) solid!`);
    continue;
  }

  validNew.push(s);
}

const combinedAnchors = [...currentAnchors, ...validNew];

// Validasi Invariant 11: Jarak >= 180 antar major settlements (village, major_city, capital_city)
const majorAnchors = combinedAnchors.filter(a => ['village', 'major_city', 'capital_city'].includes(a.type));
for (let i = 0; i < majorAnchors.length; i++) {
  for (let j = i + 1; j < majorAnchors.length; j++) {
    const d = Math.hypot(majorAnchors[i].x - majorAnchors[j].x, majorAnchors[i].y - majorAnchors[j].y);
    if (d < 180) {
      console.error(`[FAIL DISTANCE] ${majorAnchors[i].id} dan ${majorAnchors[j].id} jarak ${d.toFixed(1)} < 180!`);
      process.exit(1);
    }
  }
}

fs.writeFileSync(anchorsPath, JSON.stringify(combinedAnchors, null, 2), 'utf8');
console.log(`[OK] Berhasil memperluas anchors.json dari ${currentAnchors.length} menjadi ${combinedAnchors.length} titik!`);
