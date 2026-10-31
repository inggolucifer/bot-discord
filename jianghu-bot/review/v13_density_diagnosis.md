# Laporan Diagnosis Penurunan Kepadatan Spasial (V13 P1 / Temuan F1)

> **Dokumen Diagnosis Resmi V13 P1**  
> **Basis Kode Awal**: Commit V12 `a34b58e` vs Commit V11 `8139c20`  
> **Status**: Ditemukan Akar Masalah Utama (*Root Cause Identified & Fixed*)

---

## 1. Ringkasan Temuan Audit Kepadatan

Pada evaluasi baseline V12 (`a34b58e`), audit kepadatan menemukan regresi parah di 8 dari 29 region dunia:
- **Central Plains**: 28 → **7** sprite/viewport (p10 = 3, emptyRatio = 0.96)
- **Nine Springs Delta**: 28 → **5** sprite/viewport
- **Northern Desolate**: 16 → **2** sprite/viewport
- **Thundersteppe**: 16 → **2** sprite/viewport
- **Beast Prairies**: 24.5 → **8** sprite/viewport
- **Spirit Wood Sea**: 24 → **6** sprite/viewport
- **Formation Barrens**: 25 → **6** sprite/viewport
- **Mist Insect Valley**: 16 → **7** sprite/viewport
- **Total Objek Audit**: Turun dari **75.145** menjadi **47.173** (−37%).

---

## 2. Investigasi Mendalam & Bukti Komparatif 12 Chunk

Pengujian terisolasi dilakukan pada 12 chunk acak di 4 region terdampak:

| Chunk | Region | Koordinat (cx, cy) | Kepadatan V11 (`8139c20`) | Kepadatan Baseline V12 (`a34b58e`) | Kepadatan Setelah Perbaikan V13 | Status Pemulihan |
|---|---|:---:|:---:|:---:|:---:|:---:|
| `plains_1` | `central_plains` | (70, 70) | **119** | 23 | **118** | ✅ Pulih Penuh (+413%) |
| `plains_2` | `central_plains` | (71, 70) | **119** | 28 | **119** | ✅ Pulih Penuh (+325%) |
| `plains_3` | `central_plains` | (70, 71) | **116** | 20 | **116** | ✅ Pulih Penuh (+480%) |
| `utara_1` | `northern_desolate` | (70, 20) | **66** | 65 | **66** | ✅ Terjaga |
| `utara_2` | `northern_desolate` | (71, 20) | **67** | 64 | **67** | ✅ Terjaga |
| `utara_3` | `northern_desolate` | (72, 20) | **68** | 65 | **68** | ✅ Terjaga |
| `thunder_1` | `thundersteppe` | (40, 40) | **53** | 50 | **54** | ✅ Terjaga |
| `thunder_2` | `thundersteppe` | (41, 40) | **56** | 56 | **56** | ✅ Terjaga |
| `thunder_3` | `thundersteppe` | (42, 40) | **59** | 59 | **59** | ✅ Terjaga |
| `nine_1` | `nine_springs_delta` | (100, 70) | **104** | 22 | **104** | ✅ Pulih Penuh (+372%) |
| `nine_2` | `nine_springs_delta` | (101, 70) | **104** | 31 | **104** | ✅ Pulih Penuh (+235%) |
| `nine_3` | `nine_springs_delta` | (102, 70) | **104** | 29 | **104** | ✅ Pulih Penuh (+258%) |

---

## 3. Analisis Akar Masalah (Root Cause Breakdown)

### 3.1. [KRITIKAL] Kesalahan Sintaksis Kurung Kurawal (`}`) di L1855 Menelan 8 Bioma
Pada commit V12, baris penutup `}` sebelum blok `// --- CANYON, CLIFF & GORGE ---` terhapus secara tidak sengaja:
```javascript
// KODE RUSAK V12:
// --- BATTLEFIELD ASH, MIASMA WASTE & ABYSS EDGE ---
else if (terrain === 'battlefield_ash' || ... || region.id === 'crimson_battlefield' || region.id === 'abyssal_scar') {
  if (roll < 0.45) {
     ...
  }
      // --- CANYON, CLIFF & GORGE ---  <--- BERSARANG DI DALAM BATTLEFIELD ASH!
else if (terrain === 'cliff' || ...) { ... }
else if (terrain === 'bamboo' || ...) { ... }
else if (terrain === 'plains' || region.id === 'central_plains' ...) { ... }
```
**Dampak**:
Karena kurung penutup hilang, seluruh rantai `else if` untuk **Canyon, Snow, Island, Bamboo, Forest, Plains, Meadow, dan Prairie (baris 1856 s/d 2185)** bersarang di dalam blok `battlefield_ash`!
Jika sebuah region bukan `crimson_battlefield`, `abyssal_scar`, `void_rift`, `southern_demon_domain`, `border_march`, atau `lava_spine`, **seluruh 1024 iterasi sel mikro dilewati tanpa pernah mengeksekusi penempatan bioma tanaman/bambu/pohon sama sekali**!
Satu-satunya objek yang selamat di Central Plains dan Nine Springs adalah set-piece anchor (desa) dan 2-3 cluster kecil awal.

### 3.2. Filter Anti-Lattice Destruktif (L2229)
Pada V12 P4, diperkenalkan logika anti-lattice:
- Objek yang memiliki `xCount >= 2` atau `yCount >= 2` se-family langsung di-`unmarkFootprint`.
- Dicoba pergeseran 8 arah.
- **Kelemahan Fatal**: Jika seluruh 8 arah pergeseran terhalang (misal karena padat atau terbentur jalan), objek **TIDAK DIKEMBALIKAN**, melainkan **DIBUANG PERMANEN**.
- Batas `xCount < 2` dihitung pada level seluruh `family` (misal seluruh `tree`), sehingga dua pohon di koordinat x yang sama pada ujung utara dan ujung selatan chunk (jarak 30 sel) dianggap melanggar kisi dan salah satunya dibuang.

### 3.3. Spiral Penyusutan Batas Dominasi (*Dominance Spiral*)
- Batas `curCnt >= Math.floor(objects.length * 0.28)` dihitung menggunakan `objects.length` sisa pasca-proses.
- Saat objek awal sedikit (misal 15 objek), batasnya menjadi `floor(15 * 0.28) = 4` per defId.
- Objek yang sah langsung dibuang, menyebabkan `objects.length` semakin kecil, memicu pembuangan lebih lanjut secara berantai.

### 3.4. Rejection Awal `roll >= 0.55` di Seluruh Sel
- Pada iterasi 1024 sel, baris `if (roll >= 0.55) continue;` langsung membuang 45% sel sebelum memeriksa tipe medan atau ketersediaan ruang, membatasi kapasitas maksimal penempatan.

---

## 4. Solusi & Perbaikan yang Diterapkan di V13 P1

1. **Pemulihan Struktur Blok Bioma**:
   - Menambahkan penutup `}` yang sah pada baris 1855 untuk menutup blok `battlefield_ash`.
   - Mengembalikan bioma Canyon, Snow, Bamboo, Forest, dan Plains ke tingkat percabangan utama (`top-level chain`).
2. **Anti-Lattice Non-Destruktif**:
   - Jika pergeseran 8 arah gagal, objek **tetap dipertahankan** (`filteredObjects.push(obj)`), karena kolinearitas non-seragam $\le 3$ adalah pola alami hutan dan bukan cacat grid.
3. **Batas Dominasi Berbasis Target Budget**:
   - Mengubah komputasi batas dominasi dari sisa dinamis menjadi target awal:
     $$\text{maxPerDef} = \max(5, \lfloor\text{maxObjectsBudget} \times 0.28\rfloor)$$
4. **Pass Refill Kepadatan Target**:
   - Jika jumlah objek akhir kurang dari 85% budget, dijalankan pass pengisian ulang deterministik dengan kandidat alamiah wilayah hingga ambang 85% terpenuhi.
