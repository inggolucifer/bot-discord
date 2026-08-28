module.exports = [
  // =====================================================================
  // ERA PRIMITIF (Batu & Kayu) - Harga dalam COPPER
  // =====================================================================
  { name: 'Batu Kasar', rank: 'Common', category: 'material', tier: 1, basePrice: 5, priceCurrency: 'copper', description: 'Batu mentah dari alam. Fondasi peradaban fana.' },
  { name: 'Kayu Mentah', rank: 'Common', category: 'material', tier: 1, basePrice: 5, priceCurrency: 'copper', description: 'Potongan kayu liar. Bisa dibakar atau dibangun.' },
  { name: 'Daun Kering', rank: 'Common', category: 'material', tier: 1, basePrice: 2, priceCurrency: 'copper', description: 'Daun-daunan, bahan bakar paling murah.' },
  { name: 'Batu Tajam', rank: 'Common', category: 'material', tier: 1, basePrice: 10, priceCurrency: 'copper', description: 'Batu yang dipukul hingga tajam. (Durabilitas alat: 12 jam)' },
  { name: 'Kapak Batu', rank: 'Common', category: 'none', tier: 1, basePrice: 25, priceCurrency: 'copper', description: 'Alat tebang primitif. (Durabilitas alat: 24 jam)' },
  { name: 'Beliung Batu', rank: 'Common', category: 'none', tier: 1, basePrice: 25, priceCurrency: 'copper', description: 'Alat tambang primitif. (Durabilitas alat: 24 jam)' },
  { name: 'Pedang Kayu', rank: 'Common', category: 'weapon', tier: 1, basePrice: 50, priceCurrency: 'copper', description: 'Senjata latihan dari kayu keras. (Durabilitas senjata: 48 pertempuran)' },
  { name: 'Daging Mentah', rank: 'Common', category: 'consume', tier: 1, basePrice: 15, priceCurrency: 'copper', description: 'Daging mentah hasil buruan.' },
  { name: 'Air Bersih', rank: 'Common', category: 'consume', tier: 1, basePrice: 5, priceCurrency: 'copper', description: 'Air minum esensial pekerja.' },
  { name: 'Bibit Padi', rank: 'Common', category: 'material', tier: 1, basePrice: 5, priceCurrency: 'copper', description: 'Benih padi fana.' },
  { name: 'Beras Mentah', rank: 'Common', category: 'material', tier: 1, basePrice: 10, priceCurrency: 'copper', description: 'Beras belum dimasak.' },
  { name: 'Makanan Matang', rank: 'Common', category: 'consume', tier: 1, basePrice: 25, priceCurrency: 'copper', description: 'Memberi energi pekerja harian.' },

  // =====================================================================
  // ERA BESI (Pertanian & Pertambangan Lanjut) - Harga dalam COPPER / SILVER
  // =====================================================================
  { name: 'Batu Bata', rank: 'Common', category: 'material', tier: 2, basePrice: 20, priceCurrency: 'copper', description: 'Batu bata merah bakar.' },
  { name: 'Papan Kayu', rank: 'Common', category: 'material', tier: 2, basePrice: 20, priceCurrency: 'copper', description: 'Kayu potongan rapi.' },
  { name: 'Bijih Besi', rank: 'Uncommon', category: 'material', tier: 2, basePrice: 30, priceCurrency: 'copper', description: 'Batuan merah mengandung logam.' },
  { name: 'Batu Bara', rank: 'Uncommon', category: 'material', tier: 2, basePrice: 20, priceCurrency: 'copper', description: 'Bahan bakar padat bersuhu tinggi.' },
  { name: 'Batangan Besi', rank: 'Uncommon', category: 'material', tier: 2, basePrice: 80, priceCurrency: 'copper', description: 'Besi murni hasil peleburan.' },
  { name: 'Palu Besi', rank: 'Uncommon', category: 'none', tier: 2, basePrice: 1, priceCurrency: 'silver', description: 'Alat tempa besi andalan. (Durabilitas alat: 48 jam)' },
  { name: 'Kapak Besi', rank: 'Uncommon', category: 'none', tier: 2, basePrice: 2, priceCurrency: 'silver', description: 'Penebang kayu kuat. (Durabilitas alat: 48 jam)' },
  { name: 'Beliung Besi', rank: 'Uncommon', category: 'none', tier: 2, basePrice: 2, priceCurrency: 'silver', description: 'Penghancur batu andalan. (Durabilitas alat: 48 jam)' },
  { name: 'Pedang Besi Biasa', rank: 'Uncommon', category: 'weapon', tier: 2, basePrice: 4, priceCurrency: 'silver', description: 'Pedang fana tajam standar prajurit kerajaan. (Durabilitas senjata: 150 pertempuran)' },
  { name: 'Pil Pekerja Keras', rank: 'Uncommon', category: 'pill', tier: 2, basePrice: 2, priceCurrency: 'silver', description: 'Suplemen pekerja paksa.' },

  // =====================================================================
  // ERA TEKNOLOGI (Industri, Minyak, Baja) - Harga dalam SILVER / GOLD
  // =====================================================================
  { name: 'Baja Murni', rank: 'Rare', category: 'material', tier: 3, basePrice: 20, priceCurrency: 'silver', description: 'Logam fleksibel dan mematikan.' },
  { name: 'Minyak Mentah', rank: 'Rare', category: 'material', tier: 3, basePrice: 15, priceCurrency: 'silver', description: 'Emas hitam pendorong mesin raksasa.' },
  { name: 'Bahan Bakar Mesin', rank: 'Rare', category: 'material', tier: 3, basePrice: 25, priceCurrency: 'silver', description: 'Hasil sulingan minyak.' },
  { name: 'Komponen Elektronik', rank: 'Rare', category: 'material', tier: 3, basePrice: 30, priceCurrency: 'silver', description: 'Papan sirkuit peradaban fana puncak.' },
  { name: 'Alat Bor Berat', rank: 'Rare', category: 'none', tier: 3, basePrice: 1, priceCurrency: 'gold', description: 'Pengebor batu bara dan minyak. (Durabilitas alat: 96 jam)' },
  { name: 'Gergaji Mesin', rank: 'Rare', category: 'none', tier: 3, basePrice: 1, priceCurrency: 'gold', description: 'Penebang pohon kilat. (Durabilitas alat: 72 jam)' },
  { name: 'Pedang Baja', rank: 'Rare', category: 'weapon', tier: 3, basePrice: 5, priceCurrency: 'gold', description: 'Bilah baja yang bisa menebas besi layaknya lumpur. (Durabilitas senjata: 300 pertempuran)' },
  { name: 'Semen Campuran', rank: 'Rare', category: 'material', tier: 3, basePrice: 15, priceCurrency: 'silver', description: 'Material cor fondasi raksasa.' },

  // =====================================================================
  // ERA MURIM / WUXIA (Kultivasi Puncak) - Harga dalam GOLD / JADE
  // =====================================================================
  { name: 'Batu Roh Kasar', rank: 'Epic', category: 'material', tier: 4, basePrice: 20, priceCurrency: 'gold', description: 'Kepingan energi aura langit.' },
  { name: 'Baja Hitam Mistis', rank: 'Epic', category: 'material', tier: 4, basePrice: 50, priceCurrency: 'gold', description: 'Baja anti pecah menyerap esensi roh.' },
  { name: 'Kayu Surga', rank: 'Epic', category: 'material', tier: 4, basePrice: 50, priceCurrency: 'gold', description: 'Potongan ranting dari dunia fana surga.' },
  { name: 'Cairan Inti Bumi', rank: 'Epic', category: 'material', tier: 4, basePrice: 80, priceCurrency: 'gold', description: 'Magma chi penyubur roh.' },
  { name: 'Palu Formasi Array', rank: 'Epic', category: 'none', tier: 4, basePrice: 2, priceCurrency: 'jade', description: 'Penempa hukum alam. (Durabilitas alat: 168 jam)' },
  { name: 'Beliung Pelenyap Gunung', rank: 'Epic', category: 'none', tier: 4, basePrice: 2, priceCurrency: 'jade', description: 'Menghancurkan nadi bumi sekali ayun. (Durabilitas alat: 168 jam)' },
  { name: 'Kapak Penembus Surga', rank: 'Epic', category: 'none', tier: 4, basePrice: 2, priceCurrency: 'jade', description: 'Penebang pohon kosmik. (Durabilitas alat: 168 jam)' },
  { name: 'Pedang Hitam Mistis', rank: 'Epic', category: 'weapon', tier: 4, basePrice: 5, priceCurrency: 'jade', description: 'Pusaka para ketua sekte. (Durabilitas senjata: Tak terbatas / 1000 pertempuran)' },
  { name: 'Pil Pengumpul Qi', rank: 'Epic', category: 'pill', tier: 4, basePrice: 25, priceCurrency: 'gold', description: 'Pendongkrak jiwa kultivator formasi.' },
  { name: 'Batu Roh Murni', rank: 'Legendary', category: 'material', tier: 5, basePrice: 5, priceCurrency: 'jade', description: 'Kekayaan ilahi murni.' },
  { name: 'Pedang Petir Ilahi', rank: 'Legendary', category: 'weapon', tier: 5, basePrice: 20, priceCurrency: 'jade', description: 'Senjata para dewa (Immortal). Memicu badai saat dihunus. (Durabilitas senjata: Abadi)' },
];
