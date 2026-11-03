#!/usr/bin/env node
/**
 * scripts/v20/reportArt.js
 * Audit aset seni placeholder dan generator daftar prioritas aset seni baru untuk pemilik.
 */

const fs = require('fs');
const path = require('path');
const settlementSprites = require('../../world-data/settlement-sprites-v20.json');

const placeholderList = [];

for (const [id, s] of Object.entries(settlementSprites)) {
  if (s.placeholder || s.frameDefId) {
    placeholderList.push({
      id,
      frameDefId: s.frameDefId,
      visualW: s.visualW,
      visualH: s.visualH,
      collision: s.collision,
      tier: id.includes('capital') ? 1 : (id.includes('city') || id.includes('sect') ? 2 : 3)
    });
  }
}

// Sort by tier (1: Capital/City/Sect first, then Villages/Ports, then Outposts)
placeholderList.sort((a, b) => a.tier - b.tier);

let reportMd = `# Daftar Prioritas Kebutuhan Aset Seni V20 (Needs User Art)

Dokumen ini memuat ringkasan audit seluruh marker pemukiman yang saat ini menggunakan sprite pinjaman (*placeholder*) beserta ukuran dimensi kanonis dan panduan pembuatannya.

> [!NOTE]
> Seluruh marker saat ini berjalan mulus di engine menggunakan sprite fallback resmi (\`frameDefId\`). Daftar di bawah adalah antrean bagi pemilik jika ingin menggambar atau menghasilkan ilustrasi orisinal baru.

---

## Ringkasan Audit
- **Total Marker Arketipe**: ${Object.keys(settlementSprites).length}
- **Marker Berstatus Placeholder / Pinjaman**: ${placeholderList.length}
- **Format Kanonis**: PNG 32-bit (Alpha Channel transparan), proyeksi isometrik 2.5D, rasio piksel 100px per tile.
- **Katalog Prompt AI Lengkap**: Lihat \`world-data/settlement-art-prompts-v20.csv\`.

---

## Daftar Marker Menurut Tingkat Prioritas

### Prioritas 1 — Ibu Kota & Sekte Besar (Tier 1)
| ID Marker | Dimensi Visual (W×H) | Collision (W×H) | Frame Pinjaman Saat Ini |
|---|---|---|---|
`;

for (const p of placeholderList.filter(x => x.tier === 1)) {
  reportMd += `| \`${p.id}\` | ${p.visualW} × ${p.visualH} | ${p.collision.w} × ${p.collision.h} | \`${p.frameDefId}\` |\n`;
}

reportMd += `
### Prioritas 2 — Kota Dagang, Benteng, & Gerbang Sekte (Tier 2)
| ID Marker | Dimensi Visual (W×H) | Collision (W×H) | Frame Pinjaman Saat Ini |
|---|---|---|---|
`;

for (const p of placeholderList.filter(x => x.tier === 2)) {
  reportMd += `| \`${p.id}\` | ${p.visualW} × ${p.visualH} | ${p.collision.w} × ${p.collision.h} | \`${p.frameDefId}\` |\n`;
}

reportMd += `
### Prioritas 3 — Desa Pedesaan, Dusun, Dermaga, & Pos Perbatasan (Tier 3)
| ID Marker | Dimensi Visual (W×H) | Collision (W×H) | Frame Pinjaman Saat Ini |
|---|---|---|---|
`;

for (const p of placeholderList.filter(x => x.tier === 3)) {
  reportMd += `| \`${p.id}\` | ${p.visualW} × ${p.visualH} | ${p.collision.w} × ${p.collision.h} | \`${p.frameDefId}\` |\n`;
}

reportMd += `
---

## Panduan Integrasi Aset Baru
1. Tempatkan berkas gambar hasil seni (format \`.png\` transparan) ke dalam folder aset atlas.
2. Daftarkan entri pada lembar atlas atau perbarui manifes sprite.
3. Hapus flag \`placeholder: true\` dan \`frameDefId\` pada \`world-data/settlement-sprites-v20.json\`.
4. Jalankan \`node scripts/v20/registerSettlementScaleCanon.js\` untuk memperbarui konfigurasi ukuran runtime.
`;

const outPath = path.resolve(__dirname, '../../docs/v20/needs_user_art.md');
fs.writeFileSync(outPath, reportMd, 'utf8');
console.log(`Generated docs/v20/needs_user_art.md (${placeholderList.length} placeholder entries).`);
