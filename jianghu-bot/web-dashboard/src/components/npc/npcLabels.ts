/**
 * Master Indonesian Wuxia Dictionary for Living NPCs (V28)
 * 100% Consistent Indonesian terminology. Zero Raw English Keys.
 */

export interface LabelEntry {
  label: string;
  effect: string;
}

export const PERSONALITY: Record<string, LabelEntry> = {
  righteous: {
    label: 'Budiman',
    effect: 'Menjunjung tinggi keadilan, membenci suap dan pencurian, menyukai pil dan kitab kebajikan.'
  },
  honest: {
    label: 'Jujur',
    effect: 'Lugas tanpa tipu daya, memegang janji, menghargai hadiah makanan dan bijih tempa.'
  },
  free_spirited: {
    label: 'Bebas Pengelana',
    effect: 'Cinta kebebasan dan arak, mudah diajak bicara dan berpetualang, benci surat resmi.'
  },
  pragmatic: {
    label: 'Pragmatis',
    effect: 'Berhitung untung-rugi, menghargai batu roh dan koin tembaga, mudah menerima kesepakatan dagang.'
  },
  aloof: {
    label: 'Dingin Menyendiri',
    effect: 'Menjaga jarak dengan dunia fana, hanya merespons ajakan latihan pedang dan tanaman es.'
  },
  ambitious: {
    label: 'Ambisius',
    effect: 'Mengejar posisi tinggi dan pil terobosan ranah, menghargai plakat sekte dan kehormatan.'
  },
  ruthless: {
    label: 'Kejam',
    effect: 'Menghormati kekuatan senjata tajam, tidak gentar ancaman, dan menyimpan dendam mematikan.'
  },
  eccentric: {
    label: 'Eksentrik',
    effect: 'Tingkah laku tak terduga, gemar benda aneh dan bagian tubuh siluman langka.'
  }
};

export const DAO: Record<string, LabelEntry> = {
  sword_heart: {
    label: 'Hati Pedang Murni',
    effect: 'Jiwa menyatu dengan bilah pedang; menambah kekuatan serangan dan peluang serangan fatal.'
  },
  frost_essence: {
    label: 'Intisari Dingin Salju',
    effect: 'Meridian sedingin es abadi; meningkatkan pertahanan spiritual elemen air.'
  },
  phoenix_blood: {
    label: 'Titisan Darah Phoenix',
    effect: 'Vitalitas berlipat ganda dan regenerasi luka tubuh berlangsung sangat cepat.'
  },
  vajra_body: {
    label: 'Tubuh Baja Vajra',
    effect: 'Pertahanan fisik sekeras logam surgawi; kebal terhadap hantaman senjata fana.'
  },
  killing_intent: {
    label: 'Aura Pembunuh Pekat',
    effect: 'Niat membunuh yang mengintimidasi lawan dan meningkatkan serangan critical.'
  },
  herb_sage: {
    label: 'Bakat Tabib Suci',
    effect: 'Memahami detak kehidupan herba; meningkatkan pemahaman dan kemahiran alkimia.'
  },
  alchemy_prodigy: {
    label: 'Kecerdasan Tungku Alkimia',
    effect: 'Sensitivitas api spiritual tinggi; mempercepat pembuatan pil berkualitas murni.'
  },
  thunder_soul: {
    label: 'Jiwa Petir Menggelegar',
    effect: 'Resonansi halilintar langit mempercepat kelincahan dan daya hancur serangan.'
  },
  wind_whisperer: {
    label: 'Penunggang Angin Puyuh',
    effect: 'Langkah seringan angin senja; meningkatkan kecepatan jelajah dan kelincahan menghindar.'
  },
  earth_steadfast: {
    label: 'Keteguhan Tebing Bumi',
    effect: 'Berpijak sekokoh Gunung Tai; mempertebal pertahanan dan batas nyawa.'
  },
  water_flowing: {
    label: 'Keluwesan Air Lembah',
    effect: 'Gerakan lembut membelokkan jurus keras lawan; meningkatkan ketahanan beladiri.'
  },
  flame_spirit: {
    label: 'Intisari Api Berkobar',
    effect: 'Qi menyala berkobar meningkatkan kerusakan serangan fatal secara drastis.'
  },
  demonic_vein: {
    label: 'Meridian Iblis Kuno',
    effect: 'Penyerapan Qi sangat pesat namun fokus batin rentan mengalami gejolak.'
  },
  buddhist_compassion: {
    label: 'Belas Kasih Buddha',
    effect: 'Batin damai menolak gangguan racun dan kebal terhadap ilusi batin jahat.'
  },
  yin_yang_balance: {
    label: 'Keseimbangan Yin-Yang',
    effect: 'Keseimbangan dua kutub energi; meningkatkan resistensi fisik dan spiritual secara merata.'
  },
  celestial_insight: {
    label: 'Mata Batin Surgawi',
    effect: 'Mampu membedah pola rahasia langit; mempercepat pemahaman kitab esoteris.'
  }
};

export const DESTINY: Record<string, LabelEntry> = {
  mortal_dantian: {
    label: 'Dantian Fana Biasa',
    effect: 'Kapasitas dantian manusia fana tanpa berkah khusus bawaan.'
  },
  tough_skin: {
    label: 'Kulit Tebal Petani',
    effect: 'Fisik liat terbiasa kerja keras di bawah terik matahari.'
  },
  nimble_steps: {
    label: 'Langkah Rusa Hutan',
    effect: 'Kelincahan alami memudahkan bergerak lincah dan meloloskan diri.'
  },
  crane_longevity: {
    label: 'Umur Panjang Bangau Putih',
    effect: 'Meridian lentur memperpanjang batas usia harapan hidup.'
  },
  tiger_bone: {
    label: 'Kerangka Tulang Harimau',
    effect: 'Tulang padat memperkuat hantaman fisik secara alami.'
  },
  blessed_fortune: {
    label: 'Bintang Keberuntungan Menyinari',
    effect: 'Sering menemukan keberuntungan tak terduga di alam bebas.'
  },
  unyielding_spirit: {
    label: 'Tekad Baja Pantang Menyerah',
    effect: 'Pertahanan bangkit saat tubuh terdesak dalam bahaya maut.'
  },
  phoenix_grace: {
    label: 'Keanggunan Bulu Phoenix',
    effect: 'Pesona memikat membuat sesama kultivator menaruh rasa hormat.'
  },
  dragon_spine: {
    label: 'Tulang Punggung Naga Sejati',
    effect: 'Takdir purba melimpahkan kekuatan fisik dan ketahanan luar biasa.'
  },
  broken_meridian: {
    label: 'Meridian Terluka Parah',
    effect: 'Luka dalam masa lalu yang membatasi kapasitas aliran energi.'
  },
  hardened_veteran: {
    label: 'Pengelana Bertahan Hidup',
    effect: 'Insting bertahan hidup terasah tajam dari jelajah hutan belantara.'
  },
  sect_favored: {
    label: 'Anak Emas Sekte',
    effect: 'Mendapat bimbingan langsung dan pasokan pil berkualitas tinggi.'
  },
  lone_wolf: {
    label: 'Serigala Penyendiri',
    effect: 'Berjuang sendiri tanpa naungan perguruan; naluri serang mematikan.'
  },
  ancient_inheritance: {
    label: 'Warisan Gua Kuno',
    effect: 'Menemukan peninggalan rahasia pertapa abadi di celah tebing kuno.'
  },
  enlightened_one: {
    label: 'Pencerahan Dao Mendadak',
    effect: 'Menyaksikan kilatan petir surgawi dan memahami intisari Dao semesta.'
  },
  dual_talents: {
    label: 'Dua Bakat Kembar',
    effect: 'Memiliki bakat ganda dalam ilmu beladiri dan pengolahan elemen.'
  },
  aniseed_bean: {
    label: 'Kacang Aniseed Roh',
    effect: 'Memancarkan aroma herba yang menenangkan pikiran rekan di sekitarnya.'
  },
  intelligent: {
    label: 'Cerdas Bersahaja',
    effect: 'Kecepatan analisa tinggi mempercepat pemahaman kitab jurus.'
  },
  unobstructed: {
    label: 'Leluasa Tanpa Rintangan',
    effect: 'Langkah kaki tidak terhambat oleh rintangan medan fana.'
  }
};

export const HEART: Record<string, LabelEntry> = {
  serene: {
    label: 'Hening',
    effect: 'Pikiran tenang bagai air danau, tidak mudah goyah oleh godaan duniawi.'
  },
  turbulent: {
    label: 'Bergolak',
    effect: 'Emosi batin mudah terpicu dan rentan terhadap hasutan dendam.'
  },
  enlightened: {
    label: 'Tercerahkan',
    effect: 'Menembus batas kefanaan dan memandang persoalan dunia dengan bijak.'
  },
  corrupted: {
    label: 'Terkontaminasi',
    effect: 'Dantian terpengaruh energi miasma gelap; rentan lepas kendali.'
  },
  demonic_obsession: {
    label: 'Obsesi Iblis',
    effect: 'Tergila-gila pada kekuatan instan tanpa memedulikan batas moralitas.'
  }
};

export const ACTIVITY: Record<string, LabelEntry> = {
  idle: {
    label: 'Bersantai',
    effect: 'Sedang beristirahat menikmati suasana pemukiman.'
  },
  patrolling: {
    label: 'Ronda Pengawal',
    effect: 'Mengawasi keamanan wilayah dan gerbang dari ancaman penyusup.'
  },
  trading: {
    label: 'Berdagang',
    effect: 'Melayani pembeli dan mengelola stok perniagaan.'
  },
  gathering: {
    label: 'Memanen Herba',
    effect: 'Mencari tanaman obat dan herba spiritual di pinggiran alam.'
  },
  meditating: {
    label: 'Bermeditasi',
    effect: 'Menyerap energi Qi langit dan bumi untuk memperdalam pemahaman.'
  },
  traveling: {
    label: 'Bepergian',
    effect: 'Sedang melangkah menuju pemukiman atau tujuan lain.'
  },
  hunting: {
    label: 'Berburu Siluman',
    effect: 'Melacak jejak siluman buas untuk mendapatkan bahan berharga.'
  },
  resting: {
    label: 'Istirahat di Losmen',
    effect: 'Memulihkan stamina dan tenaga dalam di bilik penginapan.'
  },
  dead: {
    label: 'Gugur',
    effect: 'Telah menghembuskan nafas terakhir dan bersatu kembali dengan tanah.'
  },
  downed: {
    label: 'Luka Parah',
    effect: 'Dantian terluka parah dan tidak dapat bertarung sementara waktu.'
  }
};

export const ROLE: Record<string, LabelEntry> = {
  innkeeper: {
    label: 'Pemilik Penginapan',
    effect: 'Menyediakan tempat istirahat dan arak beras untuk para pengelana.'
  },
  blacksmith: {
    label: 'Pandai Besi',
    effect: 'Menempa dan memperbaiki senjata serta perkakas logam pendekar.'
  },
  alchemist: {
    label: 'Alkemis Tabib',
    effect: 'Meracik pil obat dan ramuan pemulih energi spiritual.'
  },
  guard: {
    label: 'Pengawal Gerbang',
    effect: 'Menjaga ketertiban kota dan menangkal pendekar buronan.'
  },
  cultivator: {
    label: 'Pendekar Kelana',
    effect: 'Menjelajah dunia persilatan untuk melatih ilmu dan mencari berkah takdir.'
  },
  sect_disciple: {
    label: 'Murid Sekte',
    effect: 'Berbakti pada perguruan dan menjalankan amanah dewan tetua.'
  },
  elder: {
    label: 'Tetua Sekte',
    effect: 'Membimbing generasi muda dan mengawasi hukum perguruan.'
  },
  leader: {
    label: 'Ketua / Patriark',
    effect: 'Pemimpin tertinggi penentu arah kebijakan dan kehormatan sekte.'
  },
  resident: {
    label: 'Warga Fana',
    effect: 'Penduduk biasa yang menjalani kehidupan sehari-hari di pemukiman.'
  }
};

export const STAGE: Record<string, LabelEntry> = {
  nemesis: {
    label: 'Musuh Bebuyutan',
    effect: 'Membenci Anda hingga ke sumsum tulang dan mencari kesempatan membalas dendam.'
  },
  hateful: {
    label: 'Bermusuhan',
    effect: 'Sangat membenci Anda dan menolak segala bentuk interaksi damai.'
  },
  wary: {
    label: 'Waspada',
    effect: 'Menjaga jarak dan curiga terhadap maksud kedatangan Anda.'
  },
  neutral: {
    label: 'Orang Asing',
    effect: 'Memandang Anda sebagai orang asing yang belum dikenal.'
  },
  friendly: {
    label: 'Kenalan',
    effect: 'Menaruh rasa hormat dan bersedia bertukar kabar ramah.'
  },
  close_friend: {
    label: 'Sahabat',
    effect: 'Mempercayai Anda dan siap bertukar petunjuk serta bantuan.'
  },
  soulmate: {
    label: 'Orang Kepercayaan',
    effect: 'Menganggap Anda sebagai belahan jiwa atau saudara sehidup semati.'
  }
};

export function label(map: Record<string, LabelEntry>, key: string | null | undefined): string {
  if (!key) return '(tak dikenal)';
  const normalized = String(key).trim().toLowerCase();
  if (map[normalized]) {
    return map[normalized].label;
  }
  return '(tak dikenal)';
}

export function getEffect(map: Record<string, LabelEntry>, key: string | null | undefined): string {
  if (!key) return '';
  const normalized = String(key).trim().toLowerCase();
  return map[normalized]?.effect || '';
}

export function repTier(n: number | null | undefined): string {
  const val = Number(n) || 0;
  if (val < 100) return 'Tak Dikenal';
  if (val < 1000) return 'Dikenal';
  if (val < 10000) return 'Terkenal';
  if (val < 100000) return 'Termasyhur';
  return 'Legenda';
}

export function reputationDisplay(n: number | null | undefined): string {
  const val = Math.floor(Number(n) || 0);
  return `${repTier(val)} (${val})`;
}

export function charismaTier(n: number | null | undefined): string {
  const val = Number(n) || 0;
  if (val < 25) return 'Biasa';
  if (val < 50) return 'Menarik';
  if (val < 75) return 'Memukau';
  return 'Ilahi';
}

export const UI_TABS = {
  stats: 'Status',
  skills: 'Jurus',
  artifact: 'Pusaka',
  backstory: 'Riwayat',
  family: 'Keluarga',
  social: 'Hubungan',
  taoistMind: 'Hati Dao'
} as const;

export const UI_ACTIONS = {
  chat: 'Bicara',
  bond: 'Ikatan',
  partner: 'Pasangan Dao',
  mentorship: 'Bimbingan',
  request: 'Minta Bantuan',
  gift: 'Beri Hadiah',
  spar: 'Adu Latih',
  dual_cultivation: 'Latihan Bersama',
  debate: 'Berdebat',
  invite: 'Ajak',
  recruitment: 'Rekrutmen',
  mark: 'Tandai',
  theft: 'Curi',
  attack: 'Serang'
} as const;
