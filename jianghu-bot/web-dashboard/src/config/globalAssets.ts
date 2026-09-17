/**
 * WUXIAN WORLD - GLOBAL ASSET REGISTRY
 * PUSAT PENGATURAN VISUAL LORE TERPADU (SATU-SATUNYA SUMBER ASSET GAMBAR)
 * 
 * Cara Penggunaan:
 * 1. Tempel URL gambar (https://...) langsung pada entri yang diinginkan.
 * 2. Biarkan kosong ("") jika belum ada gambar → Sistem otomatis memakai procedural canvas / emoji fallback.
 * 3. Perhatikan panduan Rasio & Ukuran Pas pada masing-masing kategori agar tampilan presisi dan tidak pecah.
 */

export const GLOBAL_ASSETS = {
  
  // =========================================================================
  // 1. KONDISI ALAM & CUACA (ENVIRONMENTAL CONDITIONS)
  // Deskripsi: Filter visual & efek cuaca global yang melayang di atas peta.
  // Format: PNG Transparan / GIF Looping
  // =========================================================================
  conditions: {
    weather_rain: "",         // Overlay hujan
    weather_snow: "",         // Overlay salju (Northern Desolate)
    weather_miasma: "",       // Kabut racun ungu (Southern Demon Domain)
    time_night: "",           // Filter gelap malam hari
    danger_zone_overlay: "",  // Partikel merah peringatan zona bahaya
    monster_threat_icon: "",  // Ikon penanda ancaman monster / zona bahaya di sudut tile (misal: lambang tengkorak / iblis)
  },

  // =========================================================================
  // 2. BIOMA TERRAIN BERDASARKAN 6 WILAYAH LORE (1x1 GRID MAP)
  // Rasio Wajib: 1:1. Ukuran Pas: 128x128 px (Format: PNG)
  // =========================================================================
  terrain: {
    // Wilayah Umum
    plains: "",              // Dataran Central Plains (Padang rumput)
    forest: "",              // Rimba hijau biasa
    bamboo_forest: "",       // Hutan Bambu khusus
    river: "",               // Aliran sungai / air tawar
    settlement_floor: "",    // Lantai paving batu kota/desa
    
    // Wilayah Khusus (Core Lore)
    azure_mountain: "",      // Tebing batu terjal (Azure Mountain Range)
    demonic_swamp: "",       // Rawa racun tanah ungu (Southern Demon Domain)
    eastern_sea: "",         // Lautan dalam tanpa batas (Eastern Sea Region)
    northern_glacial: "",    // Dataran es dan gletser (Northern Desolate Territory)
    western_desert: "",      // Padang pasir terik (Western Sacred Deserts)
  },

  // =========================================================================
  // 3. LANDMARKS: 24 SEKTE, DOJO & ORGANISASI (MULTI-GRID 2x2 ATAU 3x3)
  // Deskripsi: Markas sekte raksasa di atas grid map.
  // Ukuran Pas: 256x256 px (2x2 tile) atau 384x384 px (3x3 tile)
  // Format: PNG Transparan (Wajib)
  // =========================================================================
  sects: {
    // Central Plains (中原)
    "Heavenly Sword Pavilion": "",
    "Profound Heaven Sect": "",
    "Silver Rain Sword School": "",
    "Dojo Bunga Aprikot": "",
    "Dojo Godam Besi": "",

    // Azure Mountain Range (碧山)
    "Golden Bell Monastery": "",
    "Dojo Pahat Naga": "",

    // Southern Demon Domain (南魔域)
    "Demonic Flame Palace": "",
    "Nine Serpent Den": "",
    "Seven Sins Cult": "",
    "Blood Shadow Alliance": "",
    "Dojo Bayangan Kelam": "",

    // Eastern Sea Region (东海)
    "Jade Purity Palace": "",
    "Dojo Ombak Tenang": "",

    // Northern Desolate Territory (北荒)
    "Whitecloud Medicine Hall": "",
    "Ghost Valley Sect": "",
    "Dojo Cakar Serigala": "",

    // Western Sacred Deserts (西圣漠)
    "Azure Cloud Temple": "",
    "Dojo Mata Elang Pasir": "",
    
    // Faksi Lintas Wilayah
    "Perkumpulan Pisau Sunyi": "",
    "Serambi Seribu Bisik": "",
    "Rumah Gadai Giok Sejuk": "",
    "default_sect_gate_4x4": "", // Template Gerbang Sekte Megah 4x4
  },

  // =========================================================================
  // 4. LANDMARKS: KOTA & PEMUKIMAN
  // Deskripsi: Gerbang kota atau arsitektur pemukiman besar di peta.
  // Ukuran: 256x256 px s/d 512x512 px (Format: PNG Transparan)
  // =========================================================================
  cities: {
    "Tianjing Capital": "",  // Ibu kota dunia (Ukuran terbesar: 512x512 px)
    "XiTong City": "",       // Kota faksi utama (384x384 px)
    "default_city": "",      // Fallback untuk kota standar (256x256 px)
    "default_village": "",   // Fallback untuk desa kecil (192x192 px)
  },

  // =========================================================================
  // 4B. FASILITAS PEMUKIMAN & KOTA (PANORAMA INTERIOR)
  // Ukuran: 128x128 px s/d 256x256 px (Format: PNG Transparan)
  // =========================================================================
  settlement_facilities: {
    inn: "",             // Penginapan (Inn)
    tavern: "",          // Kedai Minuman (Tavern)
    market: "",          // Pasar Spiritual (NPC Shop)
    workshop: "",        // Bengkel Tempa & Alkimia Kota
    manual_pavilion: "", // Paviliun Kitab Kota
    bounty_board: "",    // Papan Sayembara
    courier_stables: "", // Pos Kereta & Tunggangan
    vault: "",           // Gudang Harta Kota
    auction_house: "",   // Balai Lelang Langit
  },

  // =========================================================================
  // 5. ECONOMY & RESOURCES (OBJEK DI TANAH / ITEM GATHERING)
  // Rasio Wajib: 1:1. Ukuran Pas: 64x64 px (Format: PNG Transparan)
  // =========================================================================
  resources: {
    spirit_stone: "",        // Batu roh / Lingshi bersinar
    herb_mortal: "",         // Herba tier fana
    herb_spirit: "",         // Herba tier tinggi / spiritual
    ore_iron: "",            // Bongkahan bijih besi
    ore_meteor: "",          // Baja meteor langka
    wood_bamboo: "",         // Rebung / Bambu roh
  },

  // =========================================================================
  // 6. LIFE SIMULATOR ASSETS (PROPERTI & BANGUNAN KERJA)
  // Deskripsi: Fasilitas yang dapat dibangun dan dikelola pemain.
  // Rasio Wajib: 1:1. Ukuran Pas: 256x256 px (Format: PNG Transparan)
  // =========================================================================
  assets: {
    "Pusat Pemotongan Kayu Liar": "",
    "Kotak Amal Tua": "",
    "Lahan Padi Sederhana": "",
    "Tambang Batu Dangkal": "",
    "Paviliun Alkimia Langit": "",
    "Bengkel Tempa Senjata": "",
    "Dapur Masak Kedai": "",
    "Kolam Ikan Koi Spiritual": "",
    "Tambak Ikan Air Tawar": "",
    "Petak Herbal Rohani": "",
    "Kediaman Kultivator": "",
    "Istana Lelang Langit (Heavenly Auction House)": "",
    // Status visual
    "scaffolding_under_construction": "", // Visual aset dalam tahap pengerjaan konstruksi
    "damaged_building_overlay": "",       // Visual aset dalam kondisi rusak
  },

  // =========================================================================
  // 6B. LANDMARK EKSPEDISI / DUNGEON LUAR (256x256 px)
  // =========================================================================
  expeditions: {
    "Gua Rahasia Kuno": "",         // Pintu masuk dungeon gua
    "Makam Kaisar Pedang": "",       // Pintu masuk makam purba
    "Sarang Naga Rawa": "",          // Pintu masuk sarang siluman
    "Lembah Miasma Abadi": "",       // Titik ekspedisi racun
    "default_dungeon_portal": "",    // Fallback portal ekspedisi
  },

  // =========================================================================
  // 6C. TUNGGANGAN & MOUNTS (128x128 px)
  // =========================================================================
  mounts: {
    "Gerobak Kayu": "",
    "Kuda Jinak": "",
    "Kuda Perang Baja": "",
    "Kapal Kayu Ek": "",
    "Pedang Terbang Bambu": "",
    "Pedang Terbang Giok": "",
  },

  // =========================================================================
  // 7. BODY & KOSMETIK PENDEKAR (PLAYER CUSTOMIZATION)
  // Rasio Wajib: 1:1. Ukuran Pas: 128x128 px (Format: PNG Transparan)
  // =========================================================================
  body: {
    face: {
      default_face_01: "",   // Wajah pendekar pemuda
      default_face_02: "",   // Wajah pendekar pemudi
    },
    hair: {
      default_hair_01: "",   // Gaya rambut kuncir kuda pendekar
      default_hair_02: "",   // Gaya rambut panjang terurai
    },
    cloth: {
      default_cloth_01: "",  // Jubah hanfu biru pemula
      default_cloth_02: "",  // Jubah hanfu putih sulam perak
    },
    mask: {},                // Topeng misterius (128x128 px)
    spellAvatar: {},         // Efek aura avatar khusus (128x128 px)
    title: {},               // Badge visual gelar
    avatarBorder: {          // Bingkai lingkaran avatar (Ukuran Pas: 144x144 px)
      // default_gold_border: "",
    },
    chatBorder: {}           // Dekorasi balon obrolan
  },

  // =========================================================================
  // 8. ITEMS & EQUIPMENT (INVENTORY & SHOP)
  // Rasio Wajib: 1:1. Ukuran Pas: 64x64 px atau 128x128 px (Format: PNG Transparan)
  // Key = Nama Item persis di Database (Item.name) atau Item.key
  // =========================================================================
  items: {
    // Kendaraan & Alat Transportasi
    "Gerobak Kayu": "",
    "Kuda Jinak": "",
    "Kapal Kayu Ek": "",         // Dibutuhkan untuk melintasi Eastern Sea
    "Pedang Terbang Bambu": "",  // Dibutuhkan untuk melintasi Azure Mountain Range
    "Cincin Penyimpanan": "",
    "Tenda Sederhana": "",

    // Tiket & Kualifikasi Ujian Sekte
    "Plakat Ujian Sekte": "",
    "Surat Rekomendasi Tetua": "",

    // Mata Uang Spiritual & Harta Gua
    "Batu Roh Rendah": "",
    "Batu Roh Menengah": "",
  },

  // =========================================================================
  // 9. BESTIARY & MONSTERS (AMBUSH & COMBAT)
  // Rasio Wajib: 1:1. Ukuran Pas: 128x128 px atau 256x256 px (Format: PNG Transparan)
  // Key = Monster.key atau Monster.name
  // =========================================================================
  monsters: {
    // Central Plains
    "wolf_azure": "",             // Serigala Azure
    "golden_eagle": "",           // Elang Emas
    "bandit_leader": "",          // Pemimpin Bandit

    // Azure Mountain Range
    "white_tiger": "",            // Harimau Putih Pegunungan
    "ghost_sparrow": "",          // Burung Pipit Hantu
    "rock_golem": "",             // Golem Batu Kuno

    // Southern Demon Domain
    "swamp_python": "",           // Ular Piton Rawa Iblis
    "miasma_fiend": "",           // Iblis Kabut Beracun

    // Eastern Sea Region
    "abyssal_serpent": "",        // Ular Naga Laut Dalam

    // Northern Desolate Territory
    "frost_demon": "",            // Iblis Es Abadi

    // Western Sacred Deserts
    "sand_scorpion": "",          // Kalajengking Raksasa Pasir
  },

  // =========================================================================
  // 10. NPC & TOKOH DUNIA (PORTRAITS)
  // Ukuran Pas: 128x128 px atau 80x120 px (Format: PNG Transparan)
  // Key = NPC.name
  // =========================================================================
  npcs: {
    // Tokoh & Tetua Desa Xingcun (Central Plains)
    "Penatua Zhou": "",
    "Ahli Tani Lian": "",
    "Pelatih Dojo Han": "",
    "Kurir Biro Shen": "",

    // Azure Mountain Range
    "Pendekar Pedang Li": "",
    "Tabib Misterius": "",

    // Eastern Sea Region
    "Penjaga Laut Wu": "",
    "Pedagang Eksotis": "",

    // Southern Demon Domain
    "Tetua Iblis Merah": "",
    "Pemburu Iblis": "",

    // Western Sacred Deserts
    "Penjelajah Gurun": "",
    "Pertapa Pasir": "",

    // Northern Desolate Territory
    "Pejuang Utara": "",
    "Pandai Besi Salju": "",

    // Tokoh Umum & Sekte
    "Penjaga Gerbang": "",
    "Ketua Sekte Pedang Langit": "",
    "Tetua Alkimia Bai": "",
    "Pedagang Keliling": "",
  },

  // =========================================================================
  // 11. MANUALS & KITAB KULTIVASI
  // Rasio Wajib: 1:1. Ukuran Pas: 64x64 px (Format: PNG Transparan)
  // Key = Manual.name
  // =========================================================================
  manuals: {
    // "Kitab Pedang Sembilan Bayangan": "",
    // "Manual Hati Murni": "",
  },

  // =========================================================================
  // 12. SPRITES & VISUAL ACTION
  // Ukuran: 80x120 px (Karakter) | 128x128 px (Spirit Beast/Aura)
  // =========================================================================
  sprites: {
    player_default: "",      // Sprite karakter saat berdiri/berjalan di peta
    monster_beast: "",       // Sprite monster saat ambush muncul di grid
    flying_sword_aura: "",   // Visual pedang terbang di bawah kaki karakter
  },

  // =========================================================================
  // 13. UI ELEMENTS & BACKGROUNDS (ANTARMUKA LENGKAP)
  // Ukuran Pas: 1920x1080 px (Format: JPG / PNG / WebP)
  // =========================================================================
  ui: {
    parchment_bg: "",        // Kanvas gulungan kertas tua (Latar belakang peta)
    macro_map_bg: "",        // Gambar peta benua utuh (World Scroll 5000x5000)
    login_screen_bg: "",     // Latar belakang menu utama
    player_radar_marker: "", // Ikon pin radar kuning lokasi pemain
  },

  // =========================================================================
  // 13B. DUNGEON & LABIRIN GOA KUNO (MINI-GRID 8x8, 20x20, 40x40)
  // Ukuran: 128x128 px (Format: PNG Transparan)
  // =========================================================================
  dungeon: {
    floor_stone: "",          // Ubin lorong batu gua remang
    wall_stone: "",           // Dinding tebing batu gua (rintangan solid)
    fog_darkness: "",         // Kabut kegelapan penutup labirin (Fog of War)
    trap_spike: "",           // Jebakan duri lantai tersembunyi
    trap_poison: "",          // Jebakan semburan gas racun
    treasure_chest: "",       // Peti harta karun kuno tertutup
    treasure_chest_open: "",  // Peti harta karun terbuka setelah dijarah
    exit_portal: "",          // Formasi susunan batu jalan keluar gua
    boss_lair: "",            // Penanda sarang bos di ruang terdalam
  },

  // =========================================================================
  // 13C. DERMAGA & PENYEBERANGAN AIR (FERRY & WATER CROSSING)
  // Ukuran: 128x128 px s/d 256x256 px (Format: PNG Transparan)
  // =========================================================================
  ferry: {
    dock_pier: "",            // Dermaga kayu tepian air
    raft_wood: "",            // Rakit dayung kayu bambu (ekonomis, berwaktu)
    ship_luxury: "",          // Kapal layar cepat mewah / perahu spiritual (instan)
  },

  // =========================================================================
  // 13D. INTERIOR BANGUNAN & OBJEK MINIGAME INTERAKTIF
  // Ukuran: 128x128 px (Format: PNG Transparan)
  // =========================================================================
  interior_interactives: {
    alchemy_furnace: "",      // Kuali tungku alkimia (Minigame aduk suhu api)
    forge_anvil: "",          // Landasan tempa palu (Minigame ritme pukulan)
    fish_pond: "",            // Kolam ikan tambak (Minigame tarikan joran)
    farm_plot: "",            // Petak tanah ladang (Minigame siram & pupuk)
    meditation_mat: "",       // Bantal semadi sutra (Minigame titik akupuntur Qi)
    kitchen_stove: "",        // Kompor kuali masak (Minigame kombinasi bumbu)
  },

  // =========================================================================
  // 14. EMOJI FALLBACK
  // Tampilan cadangan otomatis jika URL di atas belum diisi
  // =========================================================================
  emoji: {
    avatar: "👤",
    item: "🎒",
    monster: "👹",
    npc: "🧙",
    location: "🏞️",
    manual: "📜",
    face: "🙂",
    hair: "💇",
    cloth: "👘",
    trap: "⚠️",
    chest: "📦",
    portal: "🌀",
    ferry: "⛵",
    anvil: "⚒️",
    crucible: "⚗️",
    default: "🖼️"
  }
};

export type GlobalAssetKey = keyof typeof GLOBAL_ASSETS;
