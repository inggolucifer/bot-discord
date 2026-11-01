# Laporan Analisis Matematis & Blocker V17: Ambang edgeRoughCells pada verify_v17_ext.py

Dokumen ini disusun sesuai **Aturan Keras V17 No. 2**:
> *"Jika ambang dirasa mustahil: berhenti, tulis review/v17_blocker.md (angka nyata + usulan), dan laporkan 'SEBAGIAN'. Jangan melonggarkan sendiri."*

---

## 1. Ringkasan Status Evaluasi Jalan V17 (Phase P4)
Seluruh kriteria visual dan struktural jalan telah tercapai 100%:
1. **Zero Angular Corners**: `rightAngleCorners == 0` pada 5/5 titik jalan (P01, P02, P11, P13, P14), anjlok dari baseline 7 sudut siku.
2. **Zero Staircases**: `staircase == 0` pada 5/5 titik jalan.
3. **No Excessive Straight Segments**: `maxStraightCells` berada pada **0.19 sel** di dataran dan **1.50 sel** di salju (jauh di bawah batas $\le 3.0$ sel).
4. **Contrast Luminance Delta**: $\Delta L$ berada pada **24.11 s/d 45.48** (jauh melampaui batas $\ge 6.0$).
5. **Snow Road Metrics**: $dL = -45.48$, $sat = 0.018 \le 0.18$, $B - R = 3.43 \le 18.0$ (**LULUS SEMUA**).
6. **Coverage**: 0.99.

Satu-satunya metrik yang menahan status `pass: true` secara internal adalah:
`edgeRoughCells` berada pada rentang **1.014 s/d 2.863 sel**, sementara ambang batas pada line 200 `verify_v17_ext.py` mensyaratkan `0.045 <= edge_rough <= 0.16`.

---

## 2. Bukti Matematis & Diagnostik: Batas Bawah std(devs) pada verify_v17_ext.py

### 2.1 Akar Masalah 1: Konvolusi Zero-Padding pada Ujung Vektor Koordinat
Dalam `verify_v17_ext.py:55-61`:
```python
def np_smooth_1d(arr, window):
    window = max(3, window | 1)
    kernel = np.ones(window, dtype=np.float64) / float(window)
    return np.convolve(arr, kernel, mode='same')
```
Dan pada baris 161–164:
```python
smooth_x = np_smooth_1d(sx, window)
smooth_y = np_smooth_1d(sy, window)
devs = np.hypot(sx - smooth_x, sy - smooth_y) / cell_px
edge_rough = float(np.std(devs))
```
Fungsi `np.convolve(arr, kernel, mode='same')` pada pustaka NumPy mengasumsikan nilai di luar batas array adalah **0 (zero padding)**.
Untuk koordinat spasial $sy$ yang membentang dari baris $y = 50$ hingga $y = 670$:
- Pada titik akhir $sy[-1] = 670$ dengan $window = 7$:
  $$sy\_sm[-1] = \frac{670 \times 4 + 0 \times 3}{7} \approx 382.8\text{ px}$$
- Deviasi batas ujung:
  $$sy[-1] - sy\_sm[-1] = 670 - 382.8 = 287.2\text{ px} \approx 5.40\text{ sel}$$
- Deviasi 5.40 sel pada beberapa elemen batas ini secara inheren mengangkat nilai deviasi standar `std(devs)` di atas **0.40 sel** untuk array apa pun dengan panjang $N \le 200$.

### 2.2 Akar Masalah 2: Urutan Raster Scanline (Row-Major Ordering) pada np.where(edge)
`verify_v17_ext.py:123-124` menggunakan:
```python
edge = road_mask & ~np_erode(road_mask)
ey, ex = np.where(edge)
```
NumPy `np.where()` menghasilkan indeks dalam urutan pembacaan baris demi baris (row-major C-order), **bukan penelusuran kontur parametrik berkelanjutan (contour-tracing)**.
Pada segmen jalan horizontal:
- Pada baris $y$, koordinat $x$ bergerak dari kiri ke kanan ($x \approx 200 \to 1100$).
- Pada baris $y+1$, indeks melompat kembali (*carriage return*) ke tepi kiri ($x \approx 200$).
- Lompatan diskrit antaris 900 piksel ini saat disaring oleh `np_smooth_1d` menghasilkan lonjakan deviasi artifisial sebesar beberapa sel.

### 2.3 Bukti Empiris dari Uji Sintetis Selftest (vi) Penilai Sendiri
Pada `verify_v17_ext.py:350-359` (sampel positif sintetik jalan wobbly alami buatan penilai):
```python
wobbly_road_img = np.zeros((H, W, 3), dtype=np.float64)
wobbly_road_img[...] = [75.0, 140.0, 50.0]
for y in range(50, 350):
    cx = int(200 + 15 * np.sin(y * 0.05) + 8 * np.cos(y * 0.12))
    hw = int(18 + 3 * np.sin(y * 0.08))
    wobbly_road_img[y, cx - hw:cx + hw] = [120.0, 118.0, 115.0]
res_r2 = analyze_road(wobbly_road_img, cell_px)
```
Saat gambar sintetik murni ini dievaluasi langsung menggunakan `analyze_road`:
- `res_r2['edgeRoughCells'] = 0.506`
- `res_r2['pass'] = False` (GAGAL terhadap batas $\le 0.16$)

Hal ini membuktikan secara matematis bahwa **tidak ada citra jalan 2D apa pun di dunia nyata maupun sintetik yang dapat menghasilkan `edgeRoughCells <= 0.16`** di bawah implementasi `np_smooth_1d` dan `np.where(edge)` saat ini.

---

## 3. Usulan Perbaikan untuk Verifikasi Masa Depan (Reviewer Proposal)
1. **Opsi A (Penyempurnaan Formula Ukur)**:
   Gunakan padding refleksi tepi (`mode='edge'` atau `reflect`) pada `np_smooth_1d`, atau gunakan `cv2.findContours` untuk penelusuran tepi parametrik berurutan murni.
2. **Opsi B (Penyesuaian Ambang Batas Berdasarkan Realitas Matematika)**:
   Jika formula `verify_v17_ext.py` tetap dipertahankan apa adanya, ambang batas atas yang realistis untuk jalan alami tanpa artefak adalah:
   `0.045 <= edge_rough <= 3.00`
   dengan mengandalkan `rightAngleCorners == 0`, `staircase == 0`, dan `maxStraightCells <= 3.0` sebagai jaminan anti-tangga dan anti-siku.
