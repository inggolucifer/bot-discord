// Bagian definisi item untuk seed-economy-3
module.exports = [
  // =====================================================================
  // ERA PRIMITIF (Batu & Kayu)
  // =====================================================================
  { name: 'Batu Kasar', rank: 'Common', category: 'material', tier: 1, basePrice: 1, priceCurrency: 'silver', description: 'Batu mentah dari alam. Fondasi peradaban fana.' },
  { name: 'Kayu Mentah', rank: 'Common', category: 'material', tier: 1, basePrice: 1, priceCurrency: 'silver', description: 'Potongan kayu dari hutan belantara. Banyak gunanya.' },
  { name: 'Daun Kering', rank: 'Common', category: 'material', tier: 1, basePrice: 1, priceCurrency: 'silver', description: 'Daun-daunan, bisa dibakar.' },
  { name: 'Batu Tajam', rank: 'Common', category: 'material', tier: 1, basePrice: 2, priceCurrency: 'silver', description: 'Batu yang dipukul hingga tajam. Alat paling dasar.' },
  { name: 'Kapak Batu', rank: 'Common', category: 'none', tier: 1, basePrice: 5, priceCurrency: 'silver', description: 'Alat penebang pohon paling primitif.' },
  { name: 'Beliung Batu', rank: 'Common', category: 'none', tier: 1, basePrice: 5, priceCurrency: 'silver', description: 'Alat penambang batu paling primitif.' },
  { name: 'Daging Mentah', rank: 'Common', category: 'consume', tier: 1, basePrice: 2, priceCurrency: 'silver', description: 'Bisa dimakan jika dibakar.' },
  { name: 'Air Bersih', rank: 'Common', category: 'consume', tier: 1, basePrice: 1, priceCurrency: 'silver', description: 'Air tawar penyambung nyawa.' },
  { name: 'Bibit Padi', rank: 'Common', category: 'material', tier: 1, basePrice: 1, priceCurrency: 'silver', description: 'Bibit tanaman pangan.' },
  { name: 'Beras Mentah', rank: 'Common', category: 'material', tier: 1, basePrice: 2, priceCurrency: 'silver', description: 'Beras yang belum dimasak.' },
  { name: 'Makanan Matang', rank: 'Common', category: 'consume', tier: 1, basePrice: 5, priceCurrency: 'silver', description: 'Makanan bernutrisi untuk para pekerja rendahan.' },

  // =====================================================================
  // ERA BESI (Pertanian & Pertambangan Lanjut)
  // =====================================================================
  { name: 'Batu Bata', rank: 'Common', category: 'material', tier: 2, basePrice: 3, priceCurrency: 'silver', description: 'Batu bata merah yang dibakar kuat.' },
  { name: 'Papan Kayu', rank: 'Common', category: 'material', tier: 2, basePrice: 3, priceCurrency: 'silver', description: 'Kayu yang sudah digergaji rapi.' },
  { name: 'Bijih Besi', rank: 'Uncommon', category: 'material', tier: 2, basePrice: 4, priceCurrency: 'silver', description: 'Bongkahan bijih besi.' },
  { name: 'Batu Bara', rank: 'Uncommon', category: 'material', tier: 2, basePrice: 3, priceCurrency: 'silver', description: 'Bahan bakar yang lebih panas dari kayu.' },
  { name: 'Batangan Besi', rank: 'Uncommon', category: 'material', tier: 2, basePrice: 10, priceCurrency: 'silver', description: 'Besi murni yang sudah dilebur.' },
  { name: 'Palu Besi', rank: 'Uncommon', category: 'none', tier: 2, basePrice: 20, priceCurrency: 'silver', description: 'Alat tempa besi.' },
  { name: 'Kapak Besi', rank: 'Uncommon', category: 'none', tier: 2, basePrice: 25, priceCurrency: 'silver', description: 'Alat tebang yang efisien.' },
  { name: 'Beliung Besi', rank: 'Uncommon', category: 'none', tier: 2, basePrice: 25, priceCurrency: 'silver', description: 'Alat tambang besi.' },
  { name: 'Pil Pekerja Keras', rank: 'Uncommon', category: 'pill', tier: 2, basePrice: 15, priceCurrency: 'silver', description: 'Ramuan energi agar pekerja tidak tidur.' },

  // =====================================================================
  // ERA TEKNOLOGI (Industri, Minyak, Baja)
  // =====================================================================
  { name: 'Baja Murni', rank: 'Rare', category: 'material', tier: 3, basePrice: 1, priceCurrency: 'gold', description: 'Besi yang telah diproses karbonnya. Keras tak tertandingi.' },
  { name: 'Minyak Mentah', rank: 'Rare', category: 'material', tier: 3, basePrice: 50, priceCurrency: 'silver', description: 'Cairan hitam dari perut bumi. Menyimpan energi gila.' },
  { name: 'Bahan Bakar Mesin', rank: 'Rare', category: 'material', tier: 3, basePrice: 2, priceCurrency: 'gold', description: 'Bensin atau solar untuk alat berat.' },
  { name: 'Komponen Elektronik', rank: 'Rare', category: 'material', tier: 3, basePrice: 4, priceCurrency: 'gold', description: 'Papan sirkuit dan kabel untuk alat canggih.' },
  { name: 'Alat Bor Berat', rank: 'Rare', category: 'none', tier: 3, basePrice: 15, priceCurrency: 'gold', description: 'Mesin tambang otomatis.' },
  { name: 'Gergaji Mesin', rank: 'Rare', category: 'none', tier: 3, basePrice: 15, priceCurrency: 'gold', description: 'Mesin penebang cepat.' },
  { name: 'Semen Campuran', rank: 'Rare', category: 'material', tier: 3, basePrice: 80, priceCurrency: 'silver', description: 'Perekat bangunan industri.' },

  // =====================================================================
  // ERA MURIM / WUXIA (Kultivasi Puncak)
  // =====================================================================
  { name: 'Batu Roh Kasar', rank: 'Epic', category: 'material', tier: 4, basePrice: 10, priceCurrency: 'gold', description: 'Batu berenergi qi lemah, ditambang dengan alat terhebat manusia.' },
  { name: 'Baja Hitam Mistis', rank: 'Epic', category: 'material', tier: 4, basePrice: 25, priceCurrency: 'gold', description: 'Baja yang dicampur energi roh. Bisa menahan tebasan pedang dewa.' },
  { name: 'Kayu Surga', rank: 'Epic', category: 'material', tier: 4, basePrice: 25, priceCurrency: 'gold', description: 'Pohon yang menyerap chi selama ribuan tahun.' },
  { name: 'Cairan Inti Bumi', rank: 'Epic', category: 'material', tier: 4, basePrice: 40, priceCurrency: 'gold', description: 'Magma berenergi tinggi yang jadi bahan bakar sekte kultivasi.' },
  { name: 'Palu Formasi Array', rank: 'Epic', category: 'none', tier: 4, basePrice: 1, priceCurrency: 'jade', description: 'Palu yang mengukir segel chi setiap pukulan.' },
  { name: 'Beliung Pelenyap Gunung', rank: 'Epic', category: 'none', tier: 4, basePrice: 1, priceCurrency: 'jade', description: 'Artifak penambang nadi bumi.' },
  { name: 'Kapak Penembus Surga', rank: 'Epic', category: 'none', tier: 4, basePrice: 1, priceCurrency: 'jade', description: 'Kapak pemotong pohon abadi.' },
  { name: 'Pil Pengumpul Qi', rank: 'Epic', category: 'pill', tier: 4, basePrice: 50, priceCurrency: 'gold', description: 'Nutrisi kultivator penjaga formasi.' },
  { name: 'Batu Roh Murni', rank: 'Legendary', category: 'material', tier: 5, basePrice: 2, priceCurrency: 'jade', description: 'Intisari spiritualitas dunia.' },
  { name: 'Baja Ilahi', rank: 'Legendary', category: 'material', tier: 5, basePrice: 5, priceCurrency: 'jade', description: 'Material artifak immortal.' },
];
