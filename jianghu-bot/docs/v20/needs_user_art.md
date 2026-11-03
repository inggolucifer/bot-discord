# Daftar Prioritas Kebutuhan Aset Seni V20 (Needs User Art)

Dokumen ini memuat ringkasan audit seluruh marker pemukiman yang saat ini menggunakan sprite pinjaman (*placeholder*) beserta ukuran dimensi kanonis dan panduan pembuatannya.

> [!NOTE]
> Seluruh marker saat ini berjalan mulus di engine menggunakan sprite fallback resmi (`frameDefId`). Daftar di bawah adalah antrean bagi pemilik jika ingin menggambar atau menghasilkan ilustrasi orisinal baru.

---

## Ringkasan Audit
- **Total Marker Arketipe**: 33
- **Marker Berstatus Placeholder / Pinjaman**: 33
- **Format Kanonis**: PNG 32-bit (Alpha Channel transparan), proyeksi isometrik 2.5D, rasio piksel 100px per tile.
- **Katalog Prompt AI Lengkap**: Lihat `world-data/settlement-art-prompts-v20.csv`.

---

## Daftar Marker Menurut Tingkat Prioritas

### Prioritas 1 — Ibu Kota & Sekte Besar (Tier 1)
| ID Marker | Dimensi Visual (W×H) | Collision (W×H) | Frame Pinjaman Saat Ini |
|---|---|---|---|
| `settlement_capital_tianjing` | 11 × 8.5 | 5 × 4 | `landmark_border_march_iron_garrison_gatehouse` |

### Prioritas 2 — Kota Dagang, Benteng, & Gerbang Sekte (Tier 2)
| ID Marker | Dimensi Visual (W×H) | Collision (W×H) | Frame Pinjaman Saat Ini |
|---|---|---|---|
| `settlement_city_imperial` | 8 × 6.5 | 4 × 3 | `landmark_border_march_iron_garrison_gatehouse` |
| `settlement_city_trade` | 8 × 6.5 | 4 × 3 | `landmark_border_march_iron_garrison_gatehouse` |
| `settlement_sect_sword` | 8 × 7 | 4 × 3 | `building_spirit_pagoda` |
| `settlement_sect_bell` | 8 × 7 | 4 × 3 | `building_spirit_pagoda` |
| `settlement_sect_lotus` | 8 × 7 | 4 × 3 | `building_spirit_pagoda` |
| `settlement_sect_generic` | 8 × 7 | 4 × 3 | `building_spirit_pagoda` |

### Prioritas 3 — Desa Pedesaan, Dusun, Dermaga, & Pos Perbatasan (Tier 3)
| ID Marker | Dimensi Visual (W×H) | Collision (W×H) | Frame Pinjaman Saat Ini |
|---|---|---|---|
| `settlement_village_river` | 4.6 × 4 | 3 × 2 | `xitong_city_landmark` |
| `settlement_hamlet_river` | 3 × 2.6 | 2 × 1 | `xitong_city_landmark` |
| `settlement_outpost_gatehouse` | 5 × 3.6 | 3 × 2 | `landmark_border_march_iron_garrison_gatehouse` |
| `settlement_village_desert` | 4.6 × 4 | 3 × 2 | `xitong_city_landmark` |
| `settlement_port_donghai` | 6.5 × 5 | 4 × 2 | `xitong_city_landmark` |
| `settlement_village_default` | 4.6 × 4 | 3 × 2 | `xitong_city_landmark` |
| `settlement_hamlet_hill` | 3 × 2.6 | 2 × 1 | `xitong_city_landmark` |
| `settlement_outpost_watchtower` | 5 × 3.6 | 3 × 2 | `landmark_border_march_iron_garrison_gatehouse` |
| `settlement_island_turtle` | 6 × 5 | 4 × 3 | `building_spirit_pagoda` |
| `entrance_danger_gate` | 5 × 4 | 3 × 2 | `landmark_border_march_iron_garrison_gatehouse` |
| `entrance_danger_swamp` | 5 × 4 | 3 × 2 | `landmark_border_march_iron_garrison_gatehouse` |
| `entrance_secret_cave` | 3.5 × 3 | 2 × 1 | `building_spirit_pagoda` |
| `entrance_secret_tomb` | 3.5 × 3 | 3 × 2 | `building_spirit_pagoda` |
| `entrance_secret_ruin` | 3.5 × 3 | 3 × 2 | `building_spirit_pagoda` |
| `entrance_secret_portal` | 3.5 × 3 | 3 × 2 | `building_spirit_pagoda` |
| `settlement_town_plain` | 5.6 × 4.6 | 3 × 2 | `xitong_city_landmark` |
| `settlement_town_desert` | 5.6 × 4.6 | 3 × 2 | `xitong_city_landmark` |
| `settlement_town_coast` | 5.6 × 4.6 | 3 × 2 | `xitong_city_landmark` |
| `settlement_town_frost` | 5.6 × 4.6 | 3 × 2 | `xitong_city_landmark` |
| `settlement_village_bamboo` | 4.6 × 4 | 3 × 2 | `xitong_city_landmark` |
| `settlement_village_frost` | 4.6 × 4 | 3 × 2 | `xitong_city_landmark` |
| `settlement_village_hill` | 4.6 × 4 | 3 × 2 | `xitong_city_landmark` |
| `settlement_hamlet_desert` | 3 × 2.6 | 2 × 1 | `xitong_city_landmark` |
| `settlement_hamlet_steppe` | 3 × 2.6 | 2 × 1 | `xitong_city_landmark` |
| `settlement_hamlet_frost` | 3 × 2.6 | 2 × 1 | `xitong_city_landmark` |
| `settlement_port_bay` | 6.5 × 5 | 3 × 2 | `xitong_city_landmark` |

---

## Panduan Integrasi Aset Baru
1. Tempatkan berkas gambar hasil seni (format `.png` transparan) ke dalam folder aset atlas.
2. Daftarkan entri pada lembar atlas atau perbarui manifes sprite.
3. Hapus flag `placeholder: true` dan `frameDefId` pada `world-data/settlement-sprites-v20.json`.
4. Jalankan `node scripts/v20/registerSettlementScaleCanon.js` untuk memperbarui konfigurasi ukuran runtime.
