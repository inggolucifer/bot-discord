// Pusat semua logika "makin tinggi rank/ranah, makin dramatis tampilannya"
const { RANKS } = require('../models/Item');

// Warna embed Discord (hex) untuk tiap rank, dari yang paling biasa sampai paling megah
const RANK_STYLE = {
  Common:    { color: 0x9e9e9e, emoji: '⚪', stars: '☆', label: 'Common',    flourish: 'Sebuah benda biasa, mudah ditemukan di dunia persilatan.' },
  Uncommon:  { color: 0x2ecc71, emoji: '🟢', stars: '★☆', label: 'Uncommon', flourish: 'Cukup jarang, punya sedikit keistimewaan dibanding kebanyakan.' },
  Rare:      { color: 0x3498db, emoji: '🔵', stars: '★★☆', label: 'Rare', flourish: 'Langka! Hanya segelintir orang yang pernah memilikinya.' },
  Epic:      { color: 0x9b59b6, emoji: '🟣', stars: '★★★☆', label: 'Epic', flourish: '✨ Auranya terasa kuat — kehadirannya saja mengundang decak kagum para pendekar.' },
  Legendary: { color: 0xe67e22, emoji: '🟠', stars: '★★★★☆', label: 'Legendary', flourish: '🔥 LEGENDA HIDUP! Kisahnya diceritakan turun-temurun di seluruh penjuru Jianghu!' },
  Mythical:  { color: 0xe74c3c, emoji: '🔴', stars: '★★★★★', label: 'Mythical', flourish: '⚡🌌 KEKUATAN DI LUAR NALAR MANUSIA — konon berasal dari zaman para Dewa, mengguncang langit dan bumi!' },
};

function getRankStyle(rank) {
  return RANK_STYLE[rank] || RANK_STYLE.Common;
}

function rankIndex(rank) {
  const idx = RANKS.indexOf(rank);
  return idx === -1 ? 0 : idx;
}

/**
 * Bungkus teks dengan ANSI color block (```ansi ... ```) supaya tampil BERWARNA di Discord desktop/web
 * (Discord mendukung ANSI color di dalam code block sejak 2022). Makin tinggi rank, makin "berat" warnanya.
 */
const ANSI_BY_RANK = {
  Common: '\u001b[0;37m',      // putih/abu netral
  Uncommon: '\u001b[0;32m',    // hijau
  Rare: '\u001b[0;34m',        // biru
  Epic: '\u001b[1;35m',        // ungu bold
  Legendary: '\u001b[1;33m',   // kuning/oranye bold
  Mythical: '\u001b[1;31m',    // merah bold
};

function ansiColorize(text, rank) {
  const code = ANSI_BY_RANK[rank] || ANSI_BY_RANK.Common;
  const reset = '\u001b[0m';
  return `\`\`\`ansi\n${code}${text}${reset}\n\`\`\``;
}

/** Judul dramatis untuk embed item/pet/asset, makin tinggi rank makin banyak hiasan */
function dramaticTitle(name, rank) {
  const style = getRankStyle(rank);
  const idx = rankIndex(rank);
  if (idx >= 5) return `${style.emoji} 【${name}】 ${style.emoji}`;       // Mythical
  if (idx >= 4) return `${style.emoji} ${name} ${style.stars}`;          // Legendary
  if (idx >= 3) return `${style.emoji} ${name}`;                          // Epic
  return `${style.emoji} ${name}`;
}

module.exports = { RANK_STYLE, getRankStyle, rankIndex, ansiColorize, dramaticTitle };

