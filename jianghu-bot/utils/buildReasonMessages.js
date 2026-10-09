/**
 * JIANGHU WORLD / IMMORTAL-X: BUILD REASON MESSAGES (utils/buildReasonMessages.js)
 * Pemetaan kode penolakan kelayakan bangun (BZ_*) ke pesan bergaya lore Jianghu/Xianxia (§2.6)
 */

const BUILD_REASON_MESSAGES = {
  BZ_OUT_OF_WORLD: 'Koordinat berada di luar perbatasan benua atau tertutup kabut hampa abadi.',
  BZ_TERRAIN: 'Kontur tanah tidak stabil atau tidak cocok untuk fondasi bangunan.',
  BZ_SOLID: 'Tanah terhalang oleh tebing batu solid yang mustahil ditembus.',
  BZ_OBJECT: 'Tanah tertimpa oleh pohon kuno atau formasi batu alam yang tidak dapat dipindahkan.',
  BZ_ROAD_WATER: 'Dilarang mendirikan bangunan di atas aliran air atau jalan umum Jianghu.',
  BZ_TIER: 'Wilayah ini terlalu ganas (Tier 3+) dan dipenuhi energi iblis untuk pemukiman manusia.',
  BZ_HAZARD: 'Tanah terkontaminasi oleh hawa beracun atau suhu ekstrem yang mematikan.',
  BZ_REGION: 'Hukum wilayah melarang kepemilikan tanah pribadi di kawasan ini.',
  BZ_SETTLEMENT_BUFFER: 'Tanah ini terlalu dekat dengan batas pemukiman. Jauhkan setidaknya {required} langkah dari pagar desa.',
  BZ_SECT_BUFFER: 'Lereng suci sekte dilindungi formasi pelindung; dilarang mengkavling tanah di sini.',
  BZ_PASS_BUFFER: 'Jalur celah strategis pegunungan harus tetap terbuka untuk kafilah pedagang.',
  BZ_REALM_BUFFER: 'Gerbang alam rahasia memancarkan pusaran Qi yang merusak struktur bangunan.',
  BZ_DENSITY: 'Kepadatan bangunan di kawasan perbatasan ini telah mencapai batas maksimal.',
  BZ_PATH_BLOCK: 'Pembangunan di petak ini akan memutus jalur transportasi utama antar-kota.',
  BZ_NOT_OWNER: 'Petak tanah ini bukan milik sah karaktermu.',
  BZ_EVENT_LOCK: 'Wilayah ini sedang disegel oleh bencana alam atau perang faksi.',
  BZ_OK: 'Tanah subur dan kokoh, siap untuk dibangun.'
};

/**
 * Format pesan dengan interpolasi variabel
 * @param {string} code 
 * @param {Object} details 
 * @returns {string}
 */
function getBuildReasonMessage(code, details = {}) {
  let template = BUILD_REASON_MESSAGES[code] || 'Tanah tidak memenuhi syarat untuk pembangunan.';
  for (const [key, val] of Object.entries(details)) {
    template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
  }
  return template;
}

module.exports = {
  BUILD_REASON_MESSAGES,
  getBuildReasonMessage
};
