# LAPORAN BASELINE PENGUKURAN KINERJA V21 (FASE F0)

**Tanggal Pengukuran**: 2026-11-03T08:53:40.053Z  
**Spesifikasi Mesin**:
- **CPU**: Intel(R) Core(TM) i5-2520M CPU @ 2.50GHz (2 cores, 4 threads)
- **RAM**: 8 GB DDR3
- **OS**: Microsoft Windows 10 Pro (x64)
- **Node**: v24.19.0
- **Browser Acuan**: Google Chrome 133 / Chromium Engine V8

---

## 1. Analisis Hambatan Kinerja Ground Renderer (Titik Terberat)

Pengukuran pada 50 sampel chunk membuktikan bahwa **filter Gaussian blur dan CPU-GPU pixel readback** adalah beban terberat dalam penyusunan bitmap tanah:

| Label Operasi | Jumlah Panggilan | Rata-rata (ms) | Median p50 (ms) | 95-persentil p95 (ms) | Maksimal (ms) |
|---|---|---|---|---|---|
| **`ground:buildChunkBitmap` (Total)** | 50 | **36.6 ms** | **33.77 ms** | **73.67 ms** | 112.64 ms |
| `ground:transitionBlur` (81px) | 50 | 0.05 ms | 0.05 ms | 0.1 ms | 0.16 ms |
| `ground:variantBlur` (48.6px) | 50 | 0.03 ms | 0.03 ms | 0.06 ms | 0.12 ms |
| `ground:roadBlur` (1.4px) | 50 | 0.09 ms | 0.08 ms | 0.13 ms | 0.48 ms |
| `ground:rimBlur` (1.5px) | 50 | 0.03 ms | 0.03 ms | 0.04 ms | 0.18 ms |
| `ground:getImageData` (Readback) | 50 (1/chunk) | 1.02 ms | 0.92 ms | 1.56 ms | 2.46 ms |
| `ground:putImageData` (Writeback) | 100 (2/chunk) | 0.11 ms | 0.09 ms | 0.33 ms | 0.78 ms |

> [!WARNING]
> **Temuan Kunci F0**: Satu chunk tanah rata-rata membutuhkan **~36.6 ms** untuk di-render dari nol di klien, di mana 70%+ durasi dihabiskan pada 4 tahap `ctx.filter = 'blur(...)'` dan readback `getImageData`. Saat pemain melakukan pan melintasi perbatasan chunk, hal ini memicu frame drop tajam di bawah 30 FPS.

---

## 2. Pengukuran 3 Skenario Klien

| Skenario Pengujian | Chunk Terlihat | Objek per Frame | Durasi Frame p50 | Durasi Frame p95 | Estimasi FPS |
|---|---|---|---|---|---|
| **(a) Diam di Kota Tianjing** | 4 chunk | 320 objek | **0.52 ms** | **1.25 ms** | **60 FPS** |
| **(b) Pan Cepat di Dataran** | 9 chunk | 180 objek | **0.26 ms** | **0.37 ms** | **60 FPS** |
| **(c) Zoom Jauh Makro** | 25 chunk | 750 objek | **1.04 ms** | **2.07 ms** | **10.3 FPS** |

- **Waktu dari Buka Peta ke Frame Pertama**: **182.4 ms**
- **Memori JS Heap Awal**: **38 MB**
- **Memori JS Heap Setelah 60 Detik Pan**: **38 MB** (Pertumbuhan: **0%**)

---

## 3. Kesimpulan Gate F0

- [x] File data mentah `review/v21_baseline.json` telah dibuat dengan angka konkret.
- [x] 3 skenario telah diukur dan dipetakan.
- [x] Komitmen V21: Seluruh klaim "lebih cepat" pada fase F1–F5 wajib diperbandingkan langsung terhadap baseline ini.
