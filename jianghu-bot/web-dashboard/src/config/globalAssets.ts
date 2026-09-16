/**
 * WUXIAN WORLD - GLOBAL ASSET REGISTRY
 * PUSAT PENGATURAN VISUAL LORE (TERSINKRONISASI DENGAN CORE REPO)
 * 
 * Cara Penggunaan:
 * 1. Tempel URL gambar (PNG transparan disarankan) pada masing-masing entri.
 * 2. Jika URL dikosongkan (""), sistem akan otomatis merender lukisan kuas/tinta prosedural (Fallback).
 */

export const GLOBAL_ASSETS = {
  
    // =========================================================================
    // 1. KONDISI ALAM & CUACA (ENVIRONMENTAL CONDITIONS)
    // Deskripsi: Filter/efek cuaca global yang melayang di atas peta.
    // =========================================================================
    conditions: {
      weather_rain: "",         // Overlay hujan (Pattern/GIF)
      weather_snow: "",         // Overlay salju (untuk Northern Desolate)
      weather_miasma: "",       // Kabut beracun (untuk Southern Demon Domain)
      time_night: "",           // Filter malam hari
    },
  
    // =========================================================================
    // 2. BIOMA TERRAIN BERDASARKAN 7 WILAYAH (1x1 GRID MAP)
    // Rasio Wajib: 1:1. Ukuran Pas: 128x128 px (Format: PNG)
    // =========================================================================
    terrain: {
      // Wilayah Umum
      plains: "",              // Dataran Central Plains
      forest: "",              // Rimba biasa
      bamboo_forest: "",       // Hutan Bambu khusus
      river: "",               // Aliran sungai / laut
      settlement_floor: "",    // Lantai paving kota/desa
      
      // Wilayah Khusus
      azure_mountain: "",      // Pegunungan batu (Azure Mountain Range)
      demonic_swamp: "",       // Rawa / Tanah Ungu (Southern Demon Domain)
      eastern_sea: "",         // Lautan dalam (Eastern Sea Region)
      northern_glacial: "",    // Dataran es (Northern Desolate Territory)
      western_desert: "",      // Padang pasir (Western Sacred Deserts)
    },
  
    // =========================================================================
    // 3. LANDMARKS: 24 SEKTE, DOJO & ORGANISASI (MULTI-GRID)
    // Deskripsi: Markas sekte raksasa. Ukuran: 256x256 px (2x2) atau 384x384 px (3x3)
    // Format: PNG Transparan (Harus)
    // =========================================================================
    sects: {
      // Central Plains
      "Heavenly Sword Pavilion": "",
      "Profound Heaven Sect": "",
      "Silver Rain Sword School": "",
      "Dojo Bunga Aprikot": "",
      "Dojo Godam Besi": "",
  
      // Azure Mountain Range
      "Golden Bell Monastery": "",
      "Dojo Pahat Naga": "",
  
      // Southern Demon Domain
      "Demonic Flame Palace": "",
      "Nine Serpent Den": "",
      "Seven Sins Cult": "",
      "Blood Shadow Alliance": "",
      "Dojo Bayangan Kelam": "",
  
      // Eastern Sea Region
      "Jade Purity Palace": "",
      "Dojo Ombak Tenang": "",
  
      // Northern Desolate Territory
      "Whitecloud Medicine Hall": "",
      "Ghost Valley Sect": "",
      "Dojo Cakar Serigala": "",
  
      // Western Sacred Deserts
      "Azure Cloud Temple": "",
      "Dojo Mata Elang Pasir": "",
      
      // Faksi Lintas Wilayah
      "Perkumpulan Pisau Sunyi": "",
      "Serambi Seribu Bisik": "",
      "Rumah Gadai Giok Sejuk": "",
    },
  
    // =========================================================================
    // 4. LANDMARKS: KOTA & FASILITAS KHUSUS
    // =========================================================================
    cities: {
      "Tianjing Capital": "",  // Ibu kota dunia (Paling Besar, misal 512x512 px)
      "XiTong City": "",       // Kota faksi utama
      "default_city": "",      // Fallback untuk kota biasa
      "default_village": "",   // Fallback untuk desa kecil
    },
  
    // =========================================================================
    // 5. ECONOMY & RESOURCES (OBJEK DI TANAH / ITEM)
    // Referensi: 10_ECONOMY_SYSTEM.md
    // Rasio Wajib: 1:1. Ukuran Pas: 64x64 px (Format: PNG Transparan)
    // =========================================================================
    resources: {
      spirit_stone: "",        // Batu roh / Lingshi
      herb_mortal: "",         // Herba tier rendah
      herb_spirit: "",         // Herba tier tinggi bersinar
      ore_iron: "",            // Bijih besi
      ore_meteor: "",          // Baja meteor (Langka)
      wood_bamboo: "",         // Rebung / Bambu roh
    },
  
    // =========================================================================
    // 6. BESTIARY & CHARACTERS (SPRITES)
    // Referensi: 13_BESTIARY.md
    // Ukuran: 80x120 px (Karakter) | 128x128 px (Spirit Beast/Monster)
    // =========================================================================
    sprites: {
      player_default: "",      // Avatar pendekar bawaan
      monster_beast: "",       // Monster generic (Bisa diperbanyak ke depannya)
      flying_sword_aura: "",   // Efek saat bergerak terbang
    },
  
    // =========================================================================
    // 7. UI ELEMENTS & BACKGROUNDS (ANTARMUKA)
    // Ukuran Pas: 1920x1080 px (Format: JPG/PNG/WebP)
    // =========================================================================
    ui: {
      parchment_bg: "",       // Latar kanvas gulungan kertas tua
      macro_map_bg: "",       // Latar peta dunia 5000x5000
    }
  };
  
  export type GlobalAssetKey = keyof typeof GLOBAL_ASSETS;
