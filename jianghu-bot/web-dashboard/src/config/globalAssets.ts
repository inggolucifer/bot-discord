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
  // Rasio Wajib: 1:1. Ukuran Pas: 128x128 px (Format: PNG Transparan)
  // Memberikan efisiensi stamina langkah (-0.5 s/d -2.5) dan kecepatan jelajah
  // =========================================================================
  mounts: {
    "Gerobak Kayu": "",
    "Kuda Jinak": "",
    "Kuda Perang Baja": "",
    "Kuda Ferghana": "",
    "Kuda Roh Bertanduk": "",
    "Harimau Bayangan": "",
    "Kura-kura Lapis Baja": "",
    "Kapal Kayu Ek": "",
    "Perahu Kayu Nelayan": "",
    "Pedang Terbang Bambu": "",
    "Pedang Terbang Giok": "",
    "Pedang Terbang Spiritual": "",
    "Bangau Putih Spiritual": "",
    horse_jinak: "",
    horse_ferghana: "",
    spirit_horned_horse: "",
    shadow_tiger: "",
    flying_sword: "",
    wooden_boat: "",
    feather_crane: "",
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
    // Senjata & Perlengkapan Tempur
    "Pedang Bambu": "",
    "Pedang Besi Tempa": "",
    "Golok Baja Naga": "",
    "Pedang Giok Langit": "",
    "Jubah Kain Kasar": "",
    "Baju Zirah Besi": "",
    "Jubah Sutra Surgawi": "",
    "Ikat Kepala Pendekar": "",
    "Celana Kain Praktis": "",
    "Sepatu Langkah Bayangan": "",

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
    "Tiket Rakit Penyeberangan": "",
    "Pakan Kuda Spiritual": "",

    // Mata Uang Spiritual & Harta Gua
    "Batu Roh Rendah": "",
    "Batu Roh Menengah": "",
    "Bijih Besi Kuno": "",
    "Herba Ginseng Seribu Tahun": "",

    // 15 Kitab Manual Hukum Semesta (Category: 'law')
    "Kitab Api Nirwana Phoenix": "",
    "Kitab Samudra Naga Azure": "",
    "Kitab Inti Bumi Xuanwu": "",
    "Kitab Pohon Hayat Kaisar Hijau": "",
    "Kitab Badai Sayap Roc Sembilan Langit": "",
    "Kitab Guntur Halilintar Dewa Petir": "",
    "Kitab Penempaan Raga Suci": "",
    "Kitab Rongga Sepuluh Ribu Gu": "",
    "Kitab Ikatan Pusaka Jiwa Kelahiran": "",
    "Kitab Ikatan Satwa Roh Kelahiran": "",
    "Kitab Pelebur Inti Siluman Kotor": "",
    "Kitab Penghisap Darah & Pemanen Ruh": "",
    "Kitab Konsumsi Racun Maut": "",
    "Kitab Perjanjian Iblis Purba": "",
    "Kitab Bayangan Sembilan Yin": "",

    // Benda & Satwa Common Pengikatan Fondasi Fana
    "Pedang Besi Patah": "",
    "Mangkuk Keramik Retak": "",
    "Cermin Kuningan Usang": "",
    "Kerikil Hitam Kali": "",
    "Anak Anjing Kampung": "",
    "Ular Rumput Hijau": "",
    "Gagak Hitam Liar": "",
    "Kucing Hutan Belang": "",
  },

  // =========================================================================
  // 9. BESTIARY & MONSTERS (AMBUSH & COMBAT)
  // Format: PNG Transparan
  // Kategori Ukuran & Dimensi Rekomendasi:
  // - SMALL  : 64x64 px s/d 128x128 px  (Monster kecil, kawanan hewan, kelelawar, serangga)
  // - MEDIUM : 128x128 px s/d 192x192 px (Predator buas, bandit, pendekar sesat)
  // - LARGE  : 256x256 px               (Siluman raksasa, golem batu, naga rawa)
  // - BOSS   : 384x384 px s/d 512x512 px (Raja siluman purba, penguasa gua, iblis legendaris)
  // Key = Monster.key atau Monster.name
  // =========================================================================
  monsters: {
    // --- TIER 1: SMALL MONSTERS (64x64 s/d 128x128 px) ---
    "cave_bat": "",               // Kelelawar Gua Beracun (Wood) - Small (96x96 px)
    "ghost_sparrow": "",          // Burung Pipit Hantu (Wind/Neutral) - Small (96x96 px)
    "toxic_frog": "",             // Katak Beracun Rawa (Water/Wood) - Small (96x96 px)
    "sand_beetle": "",            // Kumbang Pasir Berduri (Earth) - Small (96x96 px)
    "spirit_rabbit": "",          // Kelinci Roh Liar (Neutral) - Small (64x64 px)
    "bamboo_viper": "",           // Ular Bambu Hijau (Wood) - Small (96x96 px)
    "fire_wasp": "",              // Tawon Api Menyengat (Fire) - Small (80x80 px)
    "frost_rat": "",              // Tikus Salju Es (Water) - Small (64x64 px)
    "cave_spider": "",            // Laba-Laba Gua (Dark) - Small (112x112 px)
    "wild_monkey": "",            // Kera Gunung Nakal (Earth) - Small (96x96 px)

    // --- TIER 2: MEDIUM MONSTERS (128x128 s/d 192x192 px) ---
    "wolf_azure": "",             // Serigala Roh Darah (Neutral) - Medium (160x160 px)
    "Serigala Roh Darah": "",     // Alias Serigala Roh Darah
    "golden_eagle": "",           // Elang Emas Pemburu (Metal) - Medium (160x160 px)
    "bandit_scout": "",           // Pengintai Bandit (Neutral) - Medium (144x144 px)
    "bandit_leader": "",          // Pemimpin Bandit (Neutral) - Medium (176x176 px)
    "shadow_wolf": "",            // Serigala Bayangan Gua (Dark) - Medium (160x160 px)
    "miasma_viper": "",           // Ular Beludru Miasma (Dark/Wood) - Medium (160x160 px)
    "swamp_croc": "",             // Buaya Rawa Raksasa (Water) - Medium (192x192 px)
    "desert_hyena": "",           // Dubuk Gurun Tulang (Earth) - Medium (160x160 px)
    "mountain_boar": "",          // Celeng Bertaring Baja (Earth) - Medium (160x160 px)
    "corrupted_cultivator": "",   // Kultivator Sesat (Dark) - Medium (160x160 px)
    "lightning_leopard": "",      // Macan Tutul Petir (Lightning) - Medium (176x176 px)

    // --- TIER 3: LARGE MONSTERS (256x256 px) ---
    "white_tiger": "",            // Harimau Putih Pegunungan (Metal) - Large (256x256 px)
    "rock_golem": "",             // Golem Batu Kuno (Earth) - Large (256x256 px)
    "swamp_python": "",           // Ular Piton Rawa Iblis (Wood/Water) - Large (256x256 px)
    "miasma_fiend": "",           // Iblis Kabut Beracun (Dark) - Large (256x256 px)
    "abyssal_serpent": "",        // Ular Naga Laut Dalam (Water) - Large (256x256 px)
    "frost_demon": "",            // Iblis Es Abadi (Water/Dark) - Large (256x256 px)
    "sand_scorpion": "",          // Kalajengking Raksasa Pasir (Earth) - Large (256x256 px)
    "ancient_sword_wraith": "",   // Hantu Pendekar Pedang Kuno (Metal/Dark) - Large (256x256 px)
    "flame_ape": "",              // Kera Raksasa Lahar (Fire) - Large (256x256 px)
    "storm_roc": "",              // Burung Garuda Badai (Lightning) - Large (256x256 px)
    "iron_rhino": "",             // Badak Lapis Besi Kuno (Metal/Earth) - Large (256x256 px)

    // --- TIER 4: BOSS MONSTERS (384x384 s/d 512x512 px) ---
    "ancient_demon_lord": "",     // Raja Iblis Gua Purba - Boss (400x400 px)
    "azure_dragon": "",           // Naga Biru Langit Esoteris - Boss (512x512 px)
    "crimson_phoenix": "",        // Burung Feniks Api Surgawi - Boss (480x480 px)
    "black_tortoise": "",         // Kura-Kura Hitam Abadi Xuanwu - Boss (450x450 px)
    "sword_saint_wraith": "",     // Makam Roh Santo Pedang - Boss (400x400 px)
    "nine_tailed_fox": "",        // Siluman Rubah Ekor Sembilan - Boss (420x420 px)
    "underworld_behemoth": "",    // Raksasa Bawah Tanah Neraka - Boss (512x512 px)
    "heavenly_thunder_kirin": "", // Qilin Petir Kemuliaan - Boss (480x480 px)
  },

  // =========================================================================
  // 9B. BATTLE ARENA UI & STATUS ASSETS (32x32 px s/d 64x64 px)
  // Format: PNG Transparan
  // =========================================================================
  battle_ui: {
    // Ikon Elemen Spiritual (32x32 px)
    elem_fire: "",
    elem_water: "",
    elem_wood: "",
    elem_metal: "",
    elem_earth: "",
    elem_lightning: "",
    elem_dark: "",
    elem_light: "",
    elem_neutral: "",

    // Ikon Efek Status & Debuff (32x32 px)
    fx_poison: "",
    fx_burn: "",
    fx_stun: "",
    fx_stance_break: "",
    fx_regen: "",
    fx_attack_up: "",
    fx_defense_up: "",
    fx_silence: "",

    // Frame Loot Rarity (64x64 px)
    rarity_common: "",
    rarity_uncommon: "",
    rarity_rare: "",
    rarity_epic: "",
    rarity_legendary: "",

    // Ikon Disiplin Senjata BattleCard (32x32 px)
    disc_sword: "",
    disc_saber: "",
    disc_staff: "",
    disc_fist: "",
    disc_finger: "",
    disc_hiddenWeapon: "",
    disc_healing: "",
    disc_melody: "",
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

    // Tokoh Kota Pemukiman (Settlement NPCs)
    "Shuang Ke": "",               // Pendekar Pedang Bayangan (Pria)
    "Wu Binglin": "",              // Saudagar Herba Gunung (Pria)
    "Yin Ci": "",                  // Penjaga Paviliun Kitab (Pria)
    "Li Keke": "",                 // Murid Alkimia Bunga Persik (Wanita)
    "npc_shuang_ke": "",
    "npc_wu_binglin": "",
    "npc_yin_ci": "",
    "npc_li_keke": "",

    // Tokoh Umum & Sekte
    "Xi Hua": "",              // Tetua Sekte Roh Suci (Wanita, gaun hijau berdiri)
    "Tetua Sekte": "",         // Tetua Sekte umum
    "Penjaga Gerbang": "",
    "Ketua Sekte Pedang Langit": "",
    "Tetua Alkimia Bai": "",
    "Pedagang Keliling": "",
    "default_standing_female": "", // Full-body art default wanita
    "default_standing_male": "",   // Full-body art default pria
    "default_standing_elder": "",  // Full-body art default tetua
  },

  // =========================================================================
  // 10B. KARAKTER PEMAIN BERDIRI (FULL BODY STANDING ART & WARDROBE)
  // Rasio Wajib: 9:16 atau 2:3. Format: PNG Transparan
  // =========================================================================
  character_standing: {
    default_male: "",          // Karakter pria berdiri penuh
    default_female: "",        // Karakter wanita berdiri penuh
    outfit_mortal: "",         // Pakaian kain fana biasa
    outfit_daoist_blue: "",    // Jubah Daoist biru pemula
    outfit_daoist_green: "",   // Jubah sutra hijau bertingkat
    outfit_golden_core: "",    // Jubah Inti Emas kaisar dao
  },

  // =========================================================================
  // 10C. LENCANA GELAR PENCAPAIAN (ACHIEVEMENT TITLE BADGES)
  // Format: PNG Transparan (128x32 atau 256x64 px)
  // =========================================================================
  titles: {
    title_sword_saint: "",     // Gelar [Pendekar Pedang Surgawi]
    title_nine_continents: "", // Gelar [Penakluk Sembilan Benua]
    title_golden_core: "",     // Gelar [Pewaris Inti Emas]
    title_divine_alchemist: "",// Gelar [Pakar Alkimia Ilahi]
    title_thunder_wanderer: "",// Gelar [Pengembara Angin & Petir]
    title_grandmaster: "",     // Gelar [Pendekar Besar Jianghu]
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
  // 13E. UI PANELS & BACKGROUND ASSETS (LANDING, CHARACTER SHEET, NPC)
  // Ukuran: Variatif (Format: PNG / JPG Transparan)
  // =========================================================================
  ui_panels: {
    landing_bg: "",           // Watercolor wuxia landscape painting (1920x1080)
    landing_boat: "",         // Perahu kultivator Tale of Immortal
    scroll_parchment_bg: "",  // Tekstur gulungan perkamen karakter
    character_frame_gold: "", // Ornate golden frame untuk potret pendekar
    npc_default_male: "",     // Siluet tinta kultivator pria
    npc_default_female: "",   // Siluet tinta kultivator wanita
    npc_default_elder: "",    // Siluet tinta tetua sekte
    taoist_mind_ring: "",     // Cincin aura Taoist Mind
  },

  // =========================================================================
  // 13F. CULTIVATION LAWS (15 JALUR HUKUM ALAM SURGAWI & DEMONIC)
  // Ukuran: 128x128 px (Format: PNG Transparan)
  // =========================================================================
  cultivation_laws: {
    // 6 Divine Elemental Laws
    law_element_phoenix_fire: "",     // Segel Lambang Api Phoenix
    law_element_azure_water: "",      // Segel Lambang Samudra Naga Azure
    law_element_xuanwu_earth: "",     // Segel Lambang Inti Bumi Xuanwu
    law_element_qingdi_wood: "",      // Segel Lambang Pohon Hayat Qingdi
    law_element_roc_wind: "",         // Segel Lambang Badai Sayap Roc
    law_element_godthunder_light: "", // Segel Lambang Guntur Halilintar Dewa Petir

    // Jalur Raga, Gu, Artifact & Beast
    law_body: "",                     // Lambang Tinju Penempaan Raga Suci
    law_body_tempering: "",
    law_gu: "",                       // Lambang Rongga Serangga Gu
    law_gu_master: "",
    law_artifact: "",                 // Lambang Pusaka Jiwa Kelahiran
    law_natal_artifact: "",
    law_beast: "",                    // Lambang Sumpah Darah Satwa Roh
    law_natal_beast: "",

    // 5 Demonic Dao Laws
    law_demonic_turbid_core: "",      // Lambang Peleburan Inti Siluman Kotor
    law_demonic_blood_soul: "",       // Lambang Panji Darah & Ruh Sembilan Hantu
    law_demonic_myriad_poison: "",    // Lambang Kuali Kantung Bisa Racun
    law_demonic_myriad_venom: "",
    law_demonic_fiend_pact: "",       // Lambang Kontrak Kulit Iblis Abyss
    law_demonic_abyssal_pact: "",
    law_demonic_nether_darkness: "",  // Lambang Gerbang Yin Gelap Nether
  },

  // =========================================================================
  // 13G. WORLD BOSSES & EVENT MINGGUAN (384x384 s/d 512x512 px)
  // =========================================================================
  world_bosses: {
    boss_flame_kirin: "",             // Raja Qilin Api Purba (Sabtu World Boss)
    boss_ancient_dragon: "",          // Naga Azure Langit Kuno
    boss_abyssal_leviathan: "",       // Naga Raksasa Palung Samudra Utara
    boss_abyssal_behemoth: "",        // Raksasa Palung Nether
    boss_nether_dragon: "",           // Naga Iblis Sembilan Jurang Gelap
    boss_primordial_titan: "",        // Golem Titan Pengguncang Benua
    boss_thunder_roc: "",             // Burung Roc Petir Emas
    boss_nine_tailed_fox: "",         // Rubah Ekor Sembilan Surgawi
    default_boss: "",                 // Artwork bos default jika ID belum diisi spesifik
  },

  // =========================================================================
  // 13H. ARENA BELADIRI SEKTE (TOURNAMENT & SPARRING)
  // =========================================================================
  sect_arena: {
    arena_banner: "",                 // Panji Turnamen Beladiri Sekte
    sparring_ring_bg: "",             // Kanvas Gelanggang Sparring Batu Kuno
    trophy_champion: "",              // Piala Emas Mahkota Juara Sekte
    trophy_runner_up: "",             // Lencana Perak Peringkat Kedua
    rank_badge_grandmaster: "",       // Lencana Pangkat Pendekar Besar
  },

  // =========================================================================
  // 13I. DAILY LOOP & CELESTIAL CALENDAR (HUB & EVENT WIDGETS)
  // =========================================================================
  daily_events: {
    daily_epiphany_chest: "",         // Peti Emas Pencerahan Harian
    streak_flame_active: "",          // Kobaran Api Login Streak Membara
    streak_flame_inactive: "",        // Abu Login Streak Mati
    weekly_grand_chest: "",           // Peti Harta Karun Mingguan
    celestial_moon_alignment: "",     // Fenomena Gerhana Bulan Kembar Surgawi
    midnight_enlightenment_bell: "",  // Lonceng Emas Pencerahan Tengah Malam
  },

  // =========================================================================
  // 15. STUDIO PENAMPILAN KARAKTER (TALE OF IMMORTAL MODULAR PAPER-DOLL SYSTEM)
  // Rasio Wajib: 2:3 (Portrait Half-Body) atau 1:1 (Square Half-Body)
  // Ukuran Pas Standar: 512x768 px (Rekomendasi Utama) atau 512x512 px
  // Format Wajib: PNG Transparan (32-bit dengan Alpha Channel Penuh)
  // Panduan Koordinat Anchor:
  //   - Y 28%: Garis horizontal pupil mata
  //   - Y 38%: Titik ujung dagu
  //   - Y 42%: Titik lekuk leher / awal kerah jubah
  //   - Y 82%: Titik simpul ikat pinggang / sabuk
  // Urutan Penumpukan (Z-Index):
  //   1. back_hair  (Z-10): Rambut belakang, menjuntai di balik bahu
  //   2. face       (Z-20): Model tubuh & wajah dasar berkepala polos (bald base)
  //   3. outfit     (Z-30): Pakaian jubah starter (menutup torso & bahu)
  //   4. front_hair (Z-40): Rambut depan, poni dahi, dan mahkota kepala
  // =========================================================================
  character_layers: {
    face: {
      face_01: "", // 512x768 px PNG: Pemuda Alis Tegas (Mata Emas - Sesuai Referensi Gambar)
      face_02: "", // 512x768 px PNG: Kultivator Dingin Angkuh
      face_03: "", // 512x768 px PNG: Pemuda Heroik Bersemangat
      face_04: "", // 512x768 px PNG: Pendekar Anggun Menawan
    },
    front_hair: {
      front_hair_01: "", // 512x768 px PNG: Poni Belah Tengah Alami
      front_hair_02: "", // 512x768 px PNG: Ikat Kepala Pita Kain Hitam
      front_hair_03: "", // 512x768 px PNG: Mahkota Pita Giok Pemula
      front_hair_04: "", // 512x768 px PNG: Poni Acak Liar Pengembara
    },
    back_hair: {
      back_hair_01: "", // 512x768 px PNG: Kuncir Ekor Kuda Tinggi (High Ponytail)
      back_hair_02: "", // 512x768 px PNG: Sanggul Kuno Tradisional (Top Bun)
      back_hair_03: "", // 512x768 px PNG: Rambut Hitam Terurai Lepas
      back_hair_04: "", // 512x768 px PNG: Rambut Pendek Praktis Beladiri
    },
    starter_outfits: {
      outfit_vagrant_black: "",   // 512x768 px PNG: Jubah Hitam Koyak Pengelana (Sesuai Referensi Gambar)
      outfit_mortal_linen: "",    // 512x768 px PNG: Jubah Linen Fana Xingcun (Kain Rami Kelabu)
      outfit_outer_disciple: "",  // 512x768 px PNG: Jubah Murid Luar Perguruan (Biru Muda)
      outfit_wanderer_bamboo: "", // 512x768 px PNG: Jubah Pengelana Rimba Bambu (Hijau Lumut)
      outfit_novice_daoist: "",   // 512x768 px PNG: Jubah Daois Pemula (Putih-Hitam Simpel)
    }
  },


  // =========================================================================
  // 15. EMOJI FALLBACK
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
    mount: "🐎",
    anvil: "⚒️",
    crucible: "⚗️",
    law: "📜",
    world_boss: "🐲",
    arena: "⚔️",
    epiphany: "✨",
    streak: "🔥",
    beast_evolve: "🐾",
    soul_artifact: "🗡️",
    demonic_altar: "🩸",
    body_temper: "💪",
    default: "🖼️"
  }
};

export type GlobalAssetKey = keyof typeof GLOBAL_ASSETS;

