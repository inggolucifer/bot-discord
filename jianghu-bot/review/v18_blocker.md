# V18 BLOCKER REPORT (AUTHORITATIVE)

**Tanggal**: 2 November 2026  
**Status Proyek**: **SEBAGIAN (PARTIAL)** — Sesuai Aturan Keras V18 Bagian 0 & 1  
**Alat Ukur**: `scripts/v18/verify_v18.py` (LOCKED, SHA256: `fae34ad666104cecc7924995a11b1c8f6b3fbd96fb3df50151868d7ad60d0ed3`)

---

## 1. Ringkasan Blocker: Titik P16 (1800, 2400) Adalah Sungai / Delta, Bukan Sawah

Pada Prompt V18 Fase P2, penilai menetapkan gate:
$$\text{GATE P2}: \text{green} \ge 0.80,\; \text{brown} \le 0.08,\; \text{water} \le 0.10 \quad (\text{pada P04, P16, dan 5 titik acak seed 1618})$$

### Bukti Terukur Nyata (`verify_v18.py farm`):
| Titik Uji | Koordinat $(x, y)$ | Tipe Sel Database | green (Target $\ge 0.80$) | brown (Target $\le 0.08$) | water (Target $\le 0.10$) | Status Gate |
|---|---|---|---|---|---|---|
| **P04_farm** | $(2450, 2450)$ | `farmland` (292) + `pond_lotus` (83) | **0.928** | **0.004** | **0.061** | **PASS** |
| **farm_rand_1** | $(2477, 2505)$ | `farmland` | **0.996** | **0.004** | **0.000** | **PASS** |
| **farm_rand_2** | $(1779, 2321)$ | `farmland` | **0.996** | **0.004** | **0.000** | **PASS** |
| **farm_rand_3** | $(2341, 2445)$ | `farmland` | **0.996** | **0.004** | **0.000** | **PASS** |
| **farm_rand_4** | $(2215, 2444)$ | `farmland` | **0.996** | **0.004** | **0.000** | **PASS** |
| **farm_rand_5** | $(2223, 2509)$ | `farmland` | **0.863** | **0.004** | **0.006** | **PASS** |
| **P16_west_farm** | $(1800, 2400)$ | `river` (410) + `pond_lotus` (188) | **0.206** | **0.004** | **0.780** | **BLOCKER (GAGAL)** |

---

## 2. Analisis Akar Masalah (Mengapa P16 Gagal di V18)

1. **Kenapa P16 Lolos di V17**:
   Di V17, rumus pengukur `testFarmland.js` / `verify_v17.py` secara sengaja **mengecualikan air dari penyebut**:
   ```python
   land = ~water
   green = land & ... / land.sum()
   ```
   Karena air sungai dikecualikan, rasio hijau hanya dihitung dari bantaran rumput di sudut gambar (8% luas), sehingga V17 melaporkan "98% hijau".
2. **Perubahan Keras di V18**:
   Di V18, penilai mengunci alat ukur `verify_v18.py` dengan aturan: *"air TIDAK dikecualikan: semua piksel dihitung"*.
   Akibatnya, air sungai nyata yang menempati 78% viewport di (1800, 2400) kini dihitung sebagai `water = 0.780`.
3. **Konflik Aturan**:
   - Untuk meloloskan P16 ke `water <= 0.10`, air sungai Donghai harus diwarnai hijau seperti rumput.
   - Namun, mengubah sungai menjadi rumput melanggar Aturan 1.3 ("Dilarang menggambar sesuatu yang lolos ukuran tapi buruk di mata") dan Aturan 1.2 ("Jangan merusak jalur penyeberangan air dan kontrak grid").
   - Mengubah ambang atau mengecualikan P16 sepihak dilarang keras oleh Aturan 1.2 ("DILARANG mengubah ambang gate, titik uji, atau rumus ukur").

---

## 3. Usulan Solusi untuk Pemilik Proyek / Penilai

1. **Opsi 1 (Koreksi Koordinat Uji Sawah Barat)**:
   Perbarui koordinat P16 di `requiredPoints.json` dari $(1800, 2400)$ (air sungai) ke koordinat sawah barat sah di delta, misalnya $(2215, 2444)$ atau $(2223, 2509)$ yang terbukti 100% `farmland` dan menghasilkan `green = 0.996`, `water = 0.000`.
2. **Opsi 2 (Klasifikasi Titik)**:
   Kategorikan P16 sesuai fungsi riilnya sebagai titik delta/perairan, dan batasi evaluasi Gate P2 pada P04 dan 5 titik acak farmland sah (seluruh 6 titik ini terbukti PASS 100%).

Sesuai instruksi V18, file blocker ini mengaktifkan status **"SEBAGIAN"** dan memastikan `gateRunner` keluar dengan kode $\ne 0$ sampai pemilik proyek memberikan konfirmasi keputusan.
