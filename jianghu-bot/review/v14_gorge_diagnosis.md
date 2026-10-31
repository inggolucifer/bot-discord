# Diagnosis Penurunan Kepadatan Ngarai & Lembah V14 (H4 Gorge Density Diagnosis)

Dokumen ini mendokumentasikan investigasi akar masalah spasial dan algoritma penurunan kepadatan objek di 3 bioma ngarai/pegunungan: `western_gorge_labyrinth`, `sword_gorge`, dan `azure_mountain_range` pada basis kode V13 (HEAD `1cffde7`).

---

## 1. Temuan Bukti Terukur Baseline V14
Pada evaluasi baseline `review/v14_baseline_density.json` (300 sampel viewport 20×12 sel per region):
- **Western Gorge Labyrinth**:
  - Median sprite per viewport: **9** (p10 = 5, target V14 $\ge 14$, p10 $\ge 8$)
  - Median objek per chunk: 28.5 (sangat sepi untuk grid 32×32 sel)
- **Sword Gorge**:
  - Median sprite per viewport: **10** (p10 = 5, target V14 $\ge 14$, p10 $\ge 8$)
  - Median objek per chunk: 34.5
- **Azure Mountain Range**:
  - Median sprite per viewport: **18.5** (p10 = 10, target V14 $\ge 18$, p10 $\ge 10$)
  - Mengalami drop lokal di beberapa koridor ngarai/kaki tebing.

---

## 2. Analisis Akar Masalah (Root Cause Analysis)

### 2.1 Pembatasan Ekstrem Batu Kecil (`smallRockCount < 3`)
- Pada `utils/objectScatter.js` baris 2145–2146 dan baris 1921–1922:
  ```javascript
  const smallRockCount = objects.filter(o => o.isSmallRock).length;
  const allowedRocks = smallRockCount < 3 ? gorgeRocks : [];
  ```
  Di V13 P6, pembatasan batu kecil diterapkan dengan ambang $< 3$ per chunk 32×32 (1024 sel).
  Begitu 3 batu kecil berhasil ditempatkan, `allowedRocks` langsung menjadi array kosong (`[]`).
  Akibatnya, seluruh batuan berukuran wajar ($2\times2$ atau $2\times1$ seperti `rock_crag_cluster`, `rock_cleft_stone`, `rock_boulder_moss`) langsung dilarang dari kandidat pool untuk 1000+ sel tersisa di chunk.

### 2.2 Gorge Candidate Pool Terlalu Sempit & Miskin Flora
- Pada cabang ngarai (baris 2133–2147):
  - Formasi tebing (`gorgeFormations`) hanya berisi 4 entri raksasa: `mountain_L` ($6\times4$), `mt_rock_4x3` ($5\times3$), `mt_rock_3x2` ($4\times2$), dan `nature_karst_twin_peaks` ($4\times2$).
  - Pada koridor sempit ngarai dan medan berliku, formasi raksasa memerlukan 15–24 sel tak terblokir sehingga hampir selalu gagal divalidasi oleh `canPlaceFootprint`.
  - Di sisi lain, pool ini **sama sekali tidak memuat semak, perdu, lumut tebing, atau herba ngarai** (`nature_wild_mountain_camellia_shrub`, `nature_wild_mountain_medicinal_wolfberry_bush`, dsb.).
  - Untuk `western_gorge_labyrinth`, pohon yang dicocokkan (`gorgeTrees`) hanya mencari tag `sword_gorge` atau `mountain`, sehingga flora asli gurun/sandstone seperti `twisted_locust_tree` atau `dead_wood` tidak diikutsertakan.

### 2.3 Refill Pass Terhambat Jumlah Percobaan Rendah
- Pada `Target Budget Refill Pass` (baris 2570):
  `for (let attempt = 0; attempt < 100 && objects.length < minBudgetTarget; attempt++)`
  Batas percobaan hanya 100 kali untuk seluruh chunk $32\times32$. Di area lembah dengan banyak sel occupied/cliff, 100 percobaan acak cepat habis sebelum mencapai target budget $\ge 85\%$ dari `maxObjectsBudget` ($\approx 80$ objek).
  Kandidat pool refill juga terbatas pada 5 entri tanpa variasi pilar karst dan semak obat.

---

## 3. Solusi Terpadu V14 P4

1. **Relaksasi Kuota Batuan Sedang & Kerikil ($< 10$ per chunk)**:
   - Naikkan kuota batu kecil/sedang dari 3 menjadi 10 per chunk pada bioma ngarai/pegunungan.
2. **Ekspansi Aktif DefId Pool Ngarai ($\ge 14$ variasi unik)**:
   - Tambahkan stalagmit karst (`nature_limestone_stalagmite_spire`, `mt_karst_pillar_v1`..`v6`).
   - Tambahkan flora tebing dan semak obat (`nature_wild_mountain_camellia_shrub`, `nature_wild_mountain_medicinal_wolfberry_bush`, `nature_ancient_scholar_red_maple_cliff`).
   - Tambahkan varian batuan terbelah (`rock_cleft_stone_v1`..`v4`, `rock_crag_cluster_v1`..`v4`, `rock_boulder_moss_v1`..`v2`).
   - Sertakan pohon kering/tua untuk western gorge (`nature_ancient_scholar_twisted_locust_tree`, `tree_dead_wood_v1`..`v4`).
3. **Optimasi Refill Pass**:
   - Tingkatkan batas percobaan refill dari 100 menjadi 400 iterasi.
   - Perkaya `candidatePool` refill dengan semak camellia, wolfberry bush, pilar karst, dan stalagmit yang terbukti lolos validasi canon dan tema region.
4. **Target Kepadatan**:
   - `western_gorge_labyrinth`: median sprite $\ge 14$ (p10 $\ge 8$).
   - `sword_gorge`: median sprite $\ge 14$ (p10 $\ge 8$).
   - `azure_mountain_range`: median sprite $\ge 18$ (p10 $\ge 10$).
