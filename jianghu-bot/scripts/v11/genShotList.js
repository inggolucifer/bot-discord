const fs = require('fs');
const path = require('path');

const points = [
  // Kelompok 1: Desa T1 (4 titik)
  { id: '01_desa_xingcun', name: 'Desa Xingcun (Central Plains)', group: 'desa_t1', x: 2050, y: 2650 },
  { id: '02_dusun_kebun_persik', name: 'Dusun Kebun Persik', group: 'desa_t1', x: 2150, y: 2700 },
  { id: '03_desa_bambu', name: 'Desa Rimbun Bambu', group: 'desa_t1', x: 1850, y: 2800 },
  { id: '04_kota_jinling', name: 'Kota Jinling', group: 'desa_t1', x: 2750, y: 2350 },

  // Kelompok 2: Wilderness T1-T2 (4 titik)
  { id: '05_wild_dataran_tengah', name: 'Wilderness Dataran Tengah', group: 'wilderness_t1_t2', x: 2450, y: 2450 },
  { id: '06_wild_nine_springs', name: 'Wilderness Nine Springs Delta', group: 'wilderness_t1_t2', x: 2800, y: 2200 },
  { id: '07_wild_beast_prairies', name: 'Padang Rumput Liar Beast Prairies', group: 'wilderness_t1_t2', x: 2300, y: 3000 },
  { id: '08_wild_persimpangan_jalan', name: 'Persimpangan Jalan Utama', group: 'wilderness_t1_t2', x: 2250, y: 2600 },

  // Kelompok 3: Gurun Barat (4 titik)
  { id: '09_gurun_pasir_sutra', name: 'Gurun Pasir Sutra', group: 'gurun_barat', x: 1200, y: 2500 },
  { id: '10_gurun_oase_shadi', name: 'Oase Shadi Gurun Barat', group: 'gurun_barat', x: 820, y: 2220 },
  { id: '11_gurun_kota_hanhai', name: 'Kota Kecil Hanhai Gurun', group: 'gurun_barat', x: 1100, y: 2400 },
  { id: '12_gurun_tandus_barat', name: 'Gurun Tandus Barat Bebatuan', group: 'gurun_barat', x: 900, y: 2600 },

  // Kelompok 4: Pegunungan Azure (4 titik)
  { id: '13_azure_pass_karst', name: 'Puncak Karst Azure Pass', group: 'pegunungan_azure', x: 2605, y: 3336 },
  { id: '14_kaki_gunung_azure', name: 'Kaki Gunung Azure', group: 'pegunungan_azure', x: 2200, y: 3340 },
  { id: '15_sword_gorge_pass', name: 'Celah Jurang Sword Gorge', group: 'pegunungan_azure', x: 3250, y: 3000 },
  { id: '16_makam_pedang_purba', name: 'Makam Kaisar Pedang Purba', group: 'pegunungan_azure', x: 2200, y: 3360 },

  // Kelompok 5: Utara Beku T4 (4 titik)
  { id: '17_desa_xueshan', name: 'Desa Xueshan Salju Utara', group: 'utara_beku_t4', x: 2350, y: 4300 },
  { id: '18_dusun_pondok_es', name: 'Dusun Pondok Es Tundra', group: 'utara_beku_t4', x: 2000, y: 4250 },
  { id: '19_pos_tundra_salju', name: 'Pos Tundra Salju Perbatasan', group: 'utara_beku_t4', x: 2120, y: 4180 },
  { id: '20_istana_es_abadi', name: 'Lembah Istana Es Abadi', group: 'utara_beku_t4', x: 1950, y: 4700 },

  // Kelompok 6: Rawa/Volkanik/Laut/Batas (4 titik)
  { id: '21_dermaga_donghai', name: 'Dermaga Donghai Pesisir Timur', group: 'rawa_volkanik_laut', x: 3920, y: 2700 },
  { id: '22_danau_cermin', name: 'Perairan Danau Cermin Mistis', group: 'rawa_volkanik_laut', x: 3688, y: 3688 },
  { id: '23_volkanik_gerbang_iblis', name: 'Kawasan Api Gerbang Iblis', group: 'rawa_volkanik_laut', x: 2500, y: 800 },
  { id: '24_batas_perbatasan_qinghe', name: 'Pos Batas Wilayah Qinghe', group: 'rawa_volkanik_laut', x: 2300, y: 1950 }
];

const shotList = [];

for (const pt of points) {
  // Zoom 1.0
  shotList.push({
    name: `shot_${pt.id}_z10`,
    pointId: pt.id,
    title: `${pt.name} (Zoom 1.0x)`,
    group: pt.group,
    x: pt.x,
    y: pt.y,
    zoom: 1.0
  });
  // Zoom 1.4
  shotList.push({
    name: `shot_${pt.id}_z14`,
    pointId: pt.id,
    title: `${pt.name} (Zoom 1.4x)`,
    group: pt.group,
    x: pt.x,
    y: pt.y,
    zoom: 1.4
  });
}

const outPath = path.resolve(__dirname, 'shotList.json');
fs.writeFileSync(outPath, JSON.stringify(shotList, null, 2), 'utf8');
console.log(`Generated ${shotList.length} shots across ${points.length} points to ${outPath}`);
