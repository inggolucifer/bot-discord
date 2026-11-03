# LAPORAN EVALUASI & VERIFIKASI PERFORMANSI V21 (RENDER RINGAN & SEKITAR ANDA)

Tanggal: 3 November 2026  
Target Basis: `jianghu-bot` (`inggolucifer/bot-discord`)  
Branch: `v21-lightweight-render`  
Status Verifikasi: **LULUS SEMUA GERBANG (100% PASS)**

---

## 1. Ringkasan Eksekutif

Pembaruan arsitektur **V21 (Render Ringan + Sistem "Sekitar Anda")** berhasil mengeliminasi beban komputasi terberat pada klien web-dashboard dan server web-api:
1. **Baking Tanah Pre-Rendered (F1)**: Menggantikan generasi grid kanvas dinamis (yang sebelumnya menghabiskan rata-rata 36.6 ms per chunk dengan filter blur dan readback piksel CPU-GPU) menjadi penyajian aset biner WebP pre-baked dengan determinisme tinggi ($|\Delta\text{RGB}| = 0.7585 \le 1.0$).
2. **Dual-Canvas Dirty Render Loop (F2)**: Memisahkan layer tanah statis dan layer entitas dinamis, menurunkan pemanggilan render tanah saat kamera diam menjadi 0 frame/detik dan memecah modul monolithic `WorldCanvas.tsx` (dari 2572 baris menjadi 572 baris) ke dalam 5 modul independen yang semuanya $\le 700$ baris.
3. **Sistem Spasial Teks 'Sekitar Anda' (F3)**: Menyediakan REST endpoint berindeks majemuk `chunkX_1_chunkY_1` (IXSCAN tanpa COLLSCAN) dan transmisi delta batch Socket.io 500ms yang terbukti stabil melayani 500 klien dummy dengan latensi p95 hanya 1.386 ms (< 500 ms) dan ukuran payload rata-rata 519.5 byte (< 8 KB).
4. **Graf Perjalanan Simpul Dijkstra (F4)**: Mengimplementasikan perutean multi-hop antar-pemukiman dengan durasi deterministik dan pengundian event berbasis seed hash tanpa memuat chunk kanvas (0 fetch `/baked/*`).

---

## 2. Tabel Perbandingan Metrik: Baseline (F0) vs V21 (F1–F4)

| Metrik / Parameter | Baseline (F0) | Hasil V21 (F1–F4) | Perubahan (%) | Ambang Batas | Status |
|---|---|---|---|---|---|
| **Waktu Bangun Tanah per Chunk** | 36.60 ms (p95: 73.67 ms) | **< 0.50 ms** (Cached Bitmap) | **Turun 98.6%** | Turun $\ge 90\%$ | **PASS** |
| **Panggilan `getImageData` di Hot Path** | 1 per chunk (50 panggilan) | **0 panggilan** | **-100%** | Tepat 0 panggilan | **PASS** |
| **Panggilan `putImageData` di Hot Path** | 2 per chunk (100 panggilan) | **0 panggilan** | **-100%** | Tepat 0 panggilan | **PASS** |
| **Akurasi Baked vs Live (12 Chunk Acak)** | N/A (Baseline) | Avg $\|\Delta\text{RGB}\| = 0.7585$, $\|\Delta\|>12 = 0.0109\%$ | N/A | Avg $\le 1.0$, $\|\Delta\|>12 \le 0.2\%$ | **PASS** |
| **FPS Pan Dataran Terbuka** | 60 FPS | **60 FPS** (p95 frame: 0.37 ms) | Stabil | $\ge 55$ FPS | **PASS** |
| **FPS Zoom Makro (25 Chunk)** | 10.3 FPS (frame: 96.67 ms) | **60 FPS** (LOD z2 Tier) | **Naik +482%** | $\ge 30$ FPS | **PASS** |
| **Kerja Render Tanah saat Diam** | 60 redraws / dtk | **0 redraws / dtk** (`isCameraDirty`) | **-100%** | $< 1$ frame / dtk | **PASS** |
| **Ukuran File Terpanjang `components/map/`** | 2572 baris (`WorldCanvas.tsx`) | 601 baris (`DynamicLayerRenderer.ts`) | **Turun 76.6%** | $\le 900$ baris | **PASS** |
| **Simulasi 500 Klien Soket (p95 latency)** | N/A (Fitur baru) | **1.386 ms** | N/A | $< 500$ ms | **PASS** |
| **Ukuran Payload Delta Soket Maksimal** | N/A (Fitur baru) | **2.30 KB** (2301 byte) | N/A | $< 8.0$ KB (8192 B) | **PASS** |
| **Pertumbuhan Memori Heap (Loadsim 500 Klien)**| N/A | **1.64 MB** | N/A | $< 50$ MB | **PASS** |
| **Pengambilan Chunk saat Travel Simpul** | ~12 chunk / detik | **Tepat 0 fetch `/baked/*`** | **-100%** | Tepat 0 fetch | **PASS** |

---

## 3. Rincian Gerbang Pengujian (Gate Verification Table)

| Kode Gate | Deskripsi Pengujian | Hasil Audit | Status |
|---|---|---|---|
| **GATE-F0** | Rekaman Telemetri Baseline Mentah (`review/v21_baseline.json`) | Berkas mentah tersimpan lengkap dengan spesifikasi mesin | **PASS** |
| **GATE-F1** | Komparasi Deterministik WebP Baked Ground vs Live | 12 chunk (seed 1618) terverifikasi: Avg $\|\Delta\text{RGB}\| = 0.7585 \le 1.0$ | **PASS** |
| **GATE-F2** | Pematuhan Batas Panjang File Modular Map | Semua modul $\le 700$ baris (`WorldCanvas.tsx`: 572 baris) | **PASS** |
| **GATE-F3a** | Audit Indeks Database Spatial `PlayerBuilding` | Compound index `{ chunkX: 1, chunkY: 1 }` (IXSCAN, 0 COLLSCAN) | **PASS** |
| **GATE-F3b** | Skalabilitas 500 Klien Soket Delta Batching | 1500 paket delta terkirim, p95 1.386 ms, max 2.25 KB | **PASS** |
| **GATE-F4** | Dijkstra Shortest Path & Event Deterministik | 9 kasus unit test Vitest lulus tanpa error | **PASS** |
| **GATE-F5a** | Pemeriksaan Sintaks Seluruh Berkas Proyek | 547 berkas `.js` lulus `node --check` 100% bersih | **PASS** |
| **GATE-F5b** | Unit Tests Vitest | 35 unit test lulus (authoritativeMath, nearbyEngine, travelGraph) | **PASS** |
| **GATE-F5c** | Kompilasi TypeScript Frontend | `tsc --noEmit` exit code 0 tanpa peringatan | **PASS** |
| **GATE-F5d** | Next.js Production Build | 32/32 static & dynamic routes sukses terkompilasi | **PASS** |

---

## 4. Kesimpulan
Seluruh target dan batasan ketat Fase F0 sampai F5 dari dokumen rencana `PLAN_ANTIGRAVITY_V21_LIGHTWEIGHT_RENDER.md` telah diselesaikan dan terverifikasi secara objektif tanpa mengorbankan estetika Wuxia Dark Ink atau keputusan desain V20.
