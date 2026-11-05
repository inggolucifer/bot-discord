/**
 * utils/blockerDescriber.js
 * Deskriptor Rintangan Kontekstual & Pesan Blokir Jujur (V24 H2)
 *
 * Mendiagnosis penyebab persis petak tidak dapat dilalui (solid) dan mengembalikan
 * deskripsi objektif serta petunjuk navigasi yang akurat.
 */

const objectScatter = require('./objectScatter');

const MOUNTAIN_TERRAINS = new Set([
  'cliff',
  'azure_mountain',
  'mountain_peak',
  'mountain_rock',
  'mountain',
  'abyss_edge',
  'lava_flow',
  'volcanic'
]);

const WATER_TERRAINS = new Set([
  'ocean',
  'sea',
  'lake_deep'
]);

/**
 * Humanize defId menjadi nama Bahasa Indonesia yang wajar
 */
function humanizeDefId(defId) {
  if (!defId) return 'Rintangan Alami';
  const d = String(defId).toLowerCase();

  if (d.includes('herb_garden') || d.includes('ancient_herb')) return 'Taman Herba Kuno';
  if (d.includes('spirit_jade') || d.includes('jade_mine')) return 'Tambang Giok Spiritual';
  if (d.includes('pine_ancient') || d.includes('ancient_pine')) return 'Pohon Pinus Kuno';
  if (d.includes('scholar_red_maple') || d.includes('red_maple')) return 'Pohon Maple Merah Pertapa';
  if (d.includes('spirit_tree')) return 'Pohon Spiritual Raksasa';
  if (d.includes('tree') || d.includes('willow') || d.includes('cypress')) return 'Pohon Rindang';
  if (d.includes('rock') || d.includes('boulder') || d.includes('stone')) return 'Bongkahan Batu Raksasa';
  if (d.includes('fence') || d.includes('wall')) return 'Pagar Pembatas Wilayah';
  if (d.includes('ruin')) return 'Reruntuhan Kuno';
  if (d.includes('shelter') || d.includes('home') || d.includes('house')) return 'Pondok Mandiri';
  if (d.includes('statue') || d.includes('monument')) return 'Monumen Kuno';
  if (d.includes('shrub') || d.includes('bush')) return 'Semak Belukar Tebal';

  // Fallback: hapus awalan kategori
  const clean = d.replace(/^(nature_|prop_|building_|settlement_|resource_|landmark_)/, '')
                 .replace(/_/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Menganalisis penyebab terhalang di koordinat (x, y)
 * @param {object} tileInfo Informasi petak dari proceduralWorldEngine atau getEffectiveTile
 * @param {number} x Koordinat X
 * @param {number} y Koordinat Y
 * @returns {{ cause: string, label: string, hint: string, message: string }}
 */
function describeBlocker(tileInfo = {}, x = 0, y = 0) {
  const terrainType = tileInfo.terrainType || '';
  const tileType = tileInfo.tileType || '';

  // 1. Batas Dunia / Ujung Peta / Hazard Mutlak
  if (x < 0 || x >= 5000 || y < 0 || y >= 5000 || terrainType === 'boundary' || tileType === 'hazard') {
    const label = tileInfo.label || 'Batas Benua / Jurang Tak Berdasar';
    const hint = 'Anda telah mencapai batas ujung dunia.';
    return {
      cause: 'world_edge',
      label,
      hint,
      message: `Jalur terhalang oleh ${label}! ${hint}`
    };
  }

  // 2. Perairan Dalam (Ocean / Sea / Deep Lake)
  if (WATER_TERRAINS.has(terrainType)) {
    let defaultLabel = 'Perairan Laut Dalam';
    if (terrainType === 'ocean') defaultLabel = 'Lautan Luas';
    else if (terrainType === 'lake_deep') defaultLabel = 'Danau Dalam';
    else if (terrainType === 'sea') defaultLabel = 'Perairan Laut';

    const label = tileInfo.label || defaultLabel;
    const hint = 'Membutuhkan perahu, kapal, atau pedang terbang untuk menyeberang.';
    return {
      cause: 'water',
      label,
      hint,
      message: `Jalur terhalang oleh ${label}! ${hint}`
    };
  }

  // 3. Pegunungan / Tebing / Puncak Batu
  if (MOUNTAIN_TERRAINS.has(terrainType)) {
    let defaultLabel = 'Pegunungan Batu Terjal';
    if (terrainType === 'cliff') defaultLabel = 'Tebing Batu Curam';
    else if (terrainType === 'mountain_peak') defaultLabel = 'Puncak Gunung Berbatu';
    else if (terrainType === 'azure_mountain') defaultLabel = 'Pegunungan Azure';
    else if (terrainType === 'abyss_edge') defaultLabel = 'Jurang Abadi';
    else if (terrainType === 'volcanic' || terrainType === 'lava_flow') defaultLabel = 'Kawah Gunung Berapi';

    const label = tileInfo.label || defaultLabel;
    const hint = 'Membutuhkan artefak pedang terbang untuk melintasi.';
    return {
      cause: 'terrain',
      label,
      hint,
      message: `Jalur terhalang oleh ${label}! ${hint}`
    };
  }

  // 4. Objek Scatter / Landmark / Bangunan / Pohon / Batu yang Menghalangi Sel
  try {
    const covering = objectScatter.getObjectCoveringCell ? objectScatter.getObjectCoveringCell(x, y) : null;
    if (covering && covering.o) {
      const obj = covering.o;
      let label = obj.customLabel;
      if (!label && obj.occupantName) label = `Kediaman ${obj.occupantName}`;
      if (!label) label = humanizeDefId(obj.defId);

      const hint = 'Cari jalan lain di sekeliling rintangan.';
      return {
        cause: 'object',
        label,
        hint,
        message: `Jalur terhalang oleh ${label}! ${hint}`
      };
    }
  } catch (err) {
    // Abaikan jika error deteksi scatter
  }

  // 5. Tembok Pembatas / Formasi Penghalang
  if (terrainType.includes('barrier') || tileInfo.isBarrier) {
    const label = tileInfo.label || 'Tembok Formasi Penghalang';
    const hint = 'Cari celah formasi atau gerbang penghalang.';
    return {
      cause: 'barrier',
      label,
      hint,
      message: `Jalur terhalang oleh ${label}! ${hint}`
    };
  }

  // 6. Properti Kustom / Pemukiman Khusus
  if (tileInfo.propertyId || tileInfo.ownerId) {
    const label = tileInfo.buildingName || tileInfo.label || 'Properti Bangunan Pribadi';
    const hint = 'Area ini dilindungi oleh pemilik properti.';
    return {
      cause: 'wall',
      label,
      hint,
      message: `Jalur terhalang oleh ${label}! ${hint}`
    };
  }

  // 7. Fallback Umum (Custom)
  const label = tileInfo.label || tileInfo.terrainLabel || 'Rintangan Tidak Dikenal';
  const hint = 'Jalur tidak dapat dilalui, cari jalur alternatif.';
  return {
    cause: 'custom',
    label,
    hint,
    message: `Jalur terhalang oleh ${label}! ${hint}`
  };
}

module.exports = {
  describeBlocker,
  MOUNTAIN_TERRAINS,
  WATER_TERRAINS
};
