/**
 * Wuxia Calendar & Shichen Engine for Jianghu Bot V27
 * 60 Jiazi Cycles, 4 Seasons, and 12 Dual-Hour Shichen (时辰)
 */

const HEAVENLY_STEMS = [
  'Jia (Kayu Yang)', 'Yi (Kayu Yin)',
  'Bing (Api Yang)', 'Ding (Api Yin)',
  'Wu (Tanah Yang)', 'Ji (Tanah Yin)',
  'Geng (Logam Yang)', 'Xin (Logam Yin)',
  'Ren (Air Yang)', 'Gui (Air Yin)'
];

const EARTHLY_BRANCHES = [
  { name: 'Zi (Tikus)', element: 'Water', hourStart: 23, hourEnd: 1 },
  { name: 'Chou (Kerbau)', element: 'Earth', hourStart: 1, hourEnd: 3 },
  { name: 'Yin (Harimau)', element: 'Wood', hourStart: 3, hourEnd: 5 },
  { name: 'Mao (Kelinci)', element: 'Wood', hourStart: 5, hourEnd: 7 },
  { name: 'Chen (Naga)', element: 'Earth', hourStart: 7, hourEnd: 9 },
  { name: 'Si (Ular)', element: 'Fire', hourStart: 9, hourEnd: 11 },
  { name: 'Wu (Kuda)', element: 'Fire', hourStart: 11, hourEnd: 13 },
  { name: 'Wei (Kambing)', element: 'Earth', hourStart: 13, hourEnd: 15 },
  { name: 'Shen (Kera)', element: 'Metal', hourStart: 15, hourEnd: 17 },
  { name: 'You (Ayam)', element: 'Metal', hourStart: 17, hourEnd: 19 },
  { name: 'Xu (Anjing)', element: 'Earth', hourStart: 19, hourEnd: 21 },
  { name: 'Hai (Babi)', element: 'Water', hourStart: 21, hourEnd: 23 }
];

const SHICHEN_LIST = [
  { id: 'zi', name: 'Jam Zi (Tengah Malam)', hours: [23, 0], description: 'Malam hening saat energi Yin mencapai puncak.' },
  { id: 'chou', name: 'Jam Chou (Kokok Ayam)', hours: [1, 2], description: 'Kegelapan larut menyongsong kabut dingin.' },
  { id: 'yin', name: 'Jam Yin (Fajar Menyingsing)', hours: [3, 4], description: 'Percikan Yang pertama mulai membelah ufuk timur.' },
  { id: 'mao', name: 'Jam Mao (Fajar Terbit)', hours: [5, 6], description: 'Cahaya pagi menembus dedaunan bambu, pasar mulai bersiap.' },
  { id: 'chen', name: 'Jam Chen (Pagi Cerah)', hours: [7, 8], description: 'Waktu kultivator berlatih fisik dan menyantap sarapan.' },
  { id: 'si', name: 'Jam Si (Menjelang Siang)', hours: [9, 10], description: 'Pedagang memenuhi pasar dan bengkel mulai bergemerincing.' },
  { id: 'wu', name: 'Jam Wu (Tengah Hari)', hours: [11, 12], description: 'Energi Yang mencapai puncaknya di langit semesta.' },
  { id: 'wei', name: 'Jam Wei (Siang Condong)', hours: [13, 14], description: 'Kedai arak ramai dan pengelana berteduh dari terik.' },
  { id: 'shen', name: 'Jam Shen (Sore Hari)', hours: [15, 16], description: 'Murid sekte melakukan sparring dan patroli gerbang.' },
  { id: 'you', name: 'Jam You (Senja Merah)', hours: [17, 18], description: 'Matahari tenggelam di balik pegunungan barat.' },
  { id: 'xu', name: 'Jam Xu (Awal Malam)', hours: [19, 20], description: 'Lentera kota dinyalakan, gerbang pemukiman ditutup.' },
  { id: 'hai', name: 'Jam Hai (Larut Malam)', hours: [21, 22], description: 'Waktu meditasi malam dan sirkulasi Qi dantian.' }
];

const SEASONS = [
  { id: 'spring', name: 'Musim Semi', description: 'Bunga persik bermekaran, energi kehidupan pulih.' },
  { id: 'summer', name: 'Musim Panas', description: 'Hawa panas Yang menggelegar, api membakar semangat.' },
  { id: 'autumn', name: 'Musim Gugur', description: 'Angin sejuk meniup dedaunan emas, waktu panen herba.' },
  { id: 'winter', name: 'Musim Dingin', description: 'Salju menutupi puncak tebing, es membekukan danau.' }
];

function getShichenFromHour(hour) {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  for (const s of SHICHEN_LIST) {
    if (s.hours.includes(h)) {
      return s;
    }
  }
  return SHICHEN_LIST[0];
}

function getJianghuTime(dateOrTimestamp = Date.now()) {
  const d = new Date(dateOrTimestamp);
  const hour = d.getHours();
  const minute = d.getMinutes();
  const month = d.getMonth() + 1; // 1 - 12
  const day = d.getDate();
  const realYear = d.getFullYear();

  // Wuxia Epoch: Cycle starts relative to year 2020 (Geng-Zi year)
  const epochYear = 2020;
  const cycleIndex = ((realYear - epochYear) % 60 + 60) % 60;
  const stem = HEAVENLY_STEMS[cycleIndex % 10];
  const branch = EARTHLY_BRANCHES[cycleIndex % 12];
  const yearName = `Tahun ${stem.split(' ')[0]}-${branch.name.split(' ')[0]}`;

  // Season from month
  let seasonIndex = 0;
  if (month >= 3 && month <= 5) seasonIndex = 0; // Spring
  else if (month >= 6 && month <= 8) seasonIndex = 1; // Summer
  else if (month >= 9 && month <= 11) seasonIndex = 2; // Autumn
  else seasonIndex = 3; // Winter

  const season = SEASONS[seasonIndex];
  const shichen = getShichenFromHour(hour);

  return {
    year: realYear,
    yearName,
    season: season.name,
    seasonId: season.id,
    month,
    day,
    hour,
    minute,
    shichenId: shichen.id,
    shichenName: shichen.name,
    shichenDescription: shichen.description,
    isNight: isNightTime(hour),
    isWorkHours: isWorkTime(hour)
  };
}

function isNightTime(hour) {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  // 19:00 - 04:59 is night
  return h >= 19 || h < 5;
}

function isWorkTime(hour) {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  // 07:00 - 17:59 is work hours
  return h >= 7 && h < 18;
}

function formatWuxiaDate(jTime) {
  return `${jTime.yearName}, ${jTime.season}, Hari ke-${jTime.day} (${jTime.shichenName})`;
}

module.exports = {
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  SHICHEN_LIST,
  SEASONS,
  getShichenFromHour,
  getJianghuTime,
  isNightTime,
  isWorkTime,
  formatWuxiaDate
};
