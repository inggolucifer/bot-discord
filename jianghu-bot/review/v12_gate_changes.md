# V12 GATE CHANGES & BASELINE RECONCILIATION SPECIFICATION (v12_gate_changes.md)
**Jianghu Bot (Immortal-X) — Koreksi Jujur Hasil V11 & Master Grid Architecture**
*Dokumentasi Resmi Perubahan Gerbang Pengujian V12*

---

## 1. Latar Belakang & Filosofi Zero-Lie (Aturan 0)

Dalam Prompt Antigravity V11, terjadi inkonsistensi pelabelan aset di mana 96 varian makro tanah dilabeli sebagai *"Real AI"* tanpa adanya berkas mentah ber-SHA-256 yang dapat diverifikasi di direktori `art_input/ground/`. Sesuai instruksi mutlak **Aturan Keras 0 V12**:
1. **Kejujuran Mutlak**: Dilarang melabeli apa pun sebagai *"AI"* jika tidak ada sumber asli di `art_input/ground/<family>_m<N>.png` dengan hash SHA-256 yang terverifikasi dalam manifest.
2. **Kategori yang Sah**: Seluruh aset hasil regenerasi prosedural wajib secara tegas dan jujur dilabeli sebagai `procedural` atau `upgraded procedural`.
3. **Pemisahan Parameter `?grid=0`**: Karena garis grid Tale of Immortal (P9) kini aktif secara *default*, pengukuran kualitas piksel latar (whiteSquare, roadLadder, autokorelasi, kolom lurus) wajib menggunakan parameter URL `?grid=0` agar garis grid kanonikal tidak mencemari ukuran metrik visual.

---

## 2. Matriks Transformasi Gerbang V11 ke V12

| Kode Gerbang | Nama Gerbang V11 | Modifikasi & Perubahan Gerbang V12 | Alasan / Rationale |
|---|---|---|---|
| **P0 (Truth)** | Klaim 96 Real AI | Validasi `truthCheck.py`: 144 procedural, 0 AI palsu. Manifest `v12_ground_truth.json`. | Menghilangkan halusinasi label AI tanpa berkas mentah asli. |
| **P9 (Grid)** | Tanpa Grid Overlay | Tale of Immortal visible grid line overlay (offscreen chunk cache, toggle tombol `G`, override `?grid=0\|1`). | Permintaan user agar visual identik dengan *Tale of Immortal* (GUI grid eksplorasi). |
| **P1 (Floor)** | Settlement Floor Tajam | Edge noise berbasis simplex + biome tinting. Gerbang `whiteSquare`: batas keras 0 piksel murni. | Lantai pemukiman berbaur organik tanpa tepi kotak tajam. |
| **P2 (Road)** | 16-Tile Road Autotile | 47-blob Wang-tile autotile dengan transisi lembut, menghapus garis hitam pinggiran. Gerbang `roadLadder = 0`. | Mencegah efek tangga (ladder) dan tepian gelap kaku pada jalan setapak. |
| **P3 (Ground)** | Macro Contrast Tolerant | Standar kualitas diperketat: Luminance Std $\ge 10.0$, Sobel Mean $\ge 6.0$, Autokorelasi lag 256/512 $\le 0.65$, 0 flat tiles. | Menjamin tanah prosedural bertekstur kaya dan kontras tajam. |
| **P4 (Scatter)** | Section Scatter Kaku | Kluster Poisson-Disk (2–3 kluster, $r=6$), Anti-lattice collinearity $\le 2$ objek per baris/kolom, Dominansi jenis $\le 28\%$. | Mencegah pola kisi buatan (*linear lattice*) dan repetisi berlebih. |
| **P5 (Canon)** | Dua Skala Terpisah | Penyatuan Single Source of Truth (`scale-canon.json` diturunkan deterministik dari `grid-canon-v10.json`). Skala pemain 1.0 sel. | Mencegah drift skala sprite antara data runtime dan rendering. |
| **P6 (Atlas)** | Frame Unloaded Error | Gerbang kesiapan atlas: `window.atlasReady === true` menjamin 0 frame tertunda saat screenshot. | Mengeliminasi peringatan frame atlas yang belum siap saat rendering. |
| **P10 (Massif)** | Gunung Barrier Renggang | Barrier Generator massif kolosal (Azure Wall $y=3100..3600$), 4 celah resmi 3-petak terbuka, 31/31 pemukiman reachable. | Menjadikan pegunungan rintangan fisik nyata bergaya wuxia tanpa mengunci akses dunia. |
| **P7 (UI/Perf)** | Label Out-of-Bounds | Label herba di-clamp rapi dalam viewport kanvas, audit tema 100% PASS (0 silang), latensi scatter p50 < 20ms. | Kenyamanan antarmuka dan integritas rendering responsif. |
| **P8 (Verify)** | 48 Shots Standar | 60 tangkapan layar kanonikal (48 lokasi + 12 audit shots) dengan verifikasi SHA-1 unik. | Validasi menyeluruh 100% dari seluruh 29 region dunia Tianyuan. |

---

## 3. Ambang Batas Evaluasi Kualitas (Threshold Canon V12)

```
+-----------------------------------------------------------------------------------+
| METRIK KUALITAS TANAH PROSEDURAL (P3)                                             |
+-----------------------------------------------------------------------------------+
| • Resolusi Tekstur       : 1024 x 1024 px WebP                                     |
| • Luminance StdDev       : >= 10.0 (seluruh 144 varian)                            |
| • Sobel Edge Gradient    : >= 6.0 (seluruh 144 varian)                             |
| • Autokorelasi Lag 256   : <= 0.65 (tidak ada perulangan kaku)                     |
| • Autokorelasi Lag 512   : <= 0.65                                                 |
| • Zero-Tile Flat         : 0 varian bernilai stdDev < 10.0                         |
+-----------------------------------------------------------------------------------+
| METRIK GRID CONTRACT & INTEGRITAS SPASIAL (V10 / V12)                             |
+-----------------------------------------------------------------------------------+
| • V1-V9 Kontrak Grid     : 100% PASS pada 833 chunk dunia                          |
| • G1-G8 Runtime Contract : 100% PASS (52/52 desa walkable, non-NaN integer)       |
| • Keterjangkauan Celah   : 4 / 4 celah resmi Azure Wall 100% walkable              |
| • Keterjangkauan Desa    : 31 / 31 pemukiman terhubung ke Desa Xingcun             |
| • Single Source Canon    : 100% (450/450 frame cocok sempurna)                     |
| • Audit Tema Region      : 0 pelanggaran tema silang, 0 cherry/bamboo di Xueshan   |
+-----------------------------------------------------------------------------------+
```
