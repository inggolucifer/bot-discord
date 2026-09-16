/**
 * ADMIN IMAGE CATALOG
 * Isi URL https di bawah. Biarkan '' atau null jika belum ada gambar
 * → UI akan pakai emoji fallback.
 * Jangan commit file binary. Hanya string URL.
 */
module.exports = {
  // Body player: key harus match Player.body.*
  body: {
    face: {
      default_face_01: '', // contoh: 'https://cdn.example.com/face1.png'
      default_face_02: ''
    },
    hair: {
      default_hair_01: '',
      default_hair_02: ''
    },
    cloth: {
      default_cloth_01: '',
      default_cloth_02: ''
    },
    mask: {},
    spellAvatar: {},
    title: {},
    avatarBorder: {},
    chatBorder: {}
  },

  // Key = nama item PERSIS di DB (Item.name) atau item.key jika ada
  items: {
    // 'Gerobak Kayu': 'https://...',
    // 'Kuda Jinak': '',
    // 'Cincin Penyimpanan': '',
    // 'Tenda Sederhana': '',
  },

  // Key = Monster.key atau Monster.name
  monsters: {
    // 'wolf_azure': 'https://...',
  },

  // Key = NPC.name
  npcs: {
    // 'Penjaga Gerbang': 'https://...',
  },

  // Key = settlementName atau regionSlug|settlementName
  locations: {
    // 'Tianjing': 'https://...',
  },

  manuals: {
    // 'Manual Name': 'https://...',
  },

  // UI & Environment Overlays
  environments: {
    // rain: 'https://...',
    // snow: 'https://...',
    // miasma: 'https://...',
    // night: 'https://...',
    // danger_zone_overlay: 'https://...',
  },

  // Terrains for World Map
  terrains: {
    // ocean: 'https://...',
    // western_desert: 'https://...',
    // demonic_swamp: 'https://...',
    // northern_glacial: 'https://...',
    // plains: 'https://...',
    // forest: 'https://...',
    // bamboo_forest: 'https://...',
    // mountain: 'https://...',
    // river: 'https://...',
  },

  // Life Simulator Assets (Crafting Stations, Gardens, Mines)
  assets: {
    // 'Ladang Padi Sederhana': 'https://...',
    // 'Tambang Batu Dangkal': 'https://...',
    // 'Paviliun Alkimia Langit': 'https://...',
    // 'Istana Lelang Langit (Heavenly Auction House)': 'https://...',
  },

  // Emoji fallback (bukan URL) — dipakai UI jika URL kosong
  emoji: {
    avatar: '👤',
    item: '🎒',
    monster: '👹',
    npc: '🧙',
    location: '🏞️',
    manual: '📜',
    face: '🙂',
    hair: '💇',
    cloth: '👘',
    default: '🖼️'
  }
};
