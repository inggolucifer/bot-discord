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
