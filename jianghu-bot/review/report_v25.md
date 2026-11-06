# LAPORAN RESMI V25 — MENYAMBUNGKAN FITUR V23/V24 YANG BELUM HIDUP

**Tanggal Audit**: 2026-11-06T02:20:28.894Z  
**Basis Repositori**: `jianghu-bot` (Commit Base: `4d56a63a`)  
**Metodologi**: 100% Berbasis Data Mentah (`review/v25_raw/*.json`), Zero Screenshot Policy, Server Authoritative.

---

## 1. Ringkasan Status Gerbang (Gates K0 – K8)

| Gate | Deskripsi | Metrik Riil | Target Otoritatif | Status |
|---|---|---|---|:---:|
| **K0** | Baseline Audit Lock | 6/6 temuan terbukti gagal di baseline | 6/6 gagal | **PASS** |
| **K1** | Zona Instans & Bahaya Sekitar | Format id inst_*, radius 14, ETag 304, zero koordinat persis | Terpasang & terisolasi | **PASS** |
| **K2** | Pengerasan Route Instans | MongoDB InstancedZoneSession, body strictly zoneId, verifikasi jarak server <= 3 | 0 memory Map, body hardened | **PASS** |
| **K3** | UI Masuk Zona Ekspedisi | 4 tipe zona (Lembah Roh 3x3, Tanah Roh 5 kamar, Pertahanan 5 wave, Elemen) | Text-mode UI terintegrasi | **PASS** |
| **K4** | Fungsionalitas Jimat & Ambush | Repellent deviasi: 1.5%, Attraction deviasi: 0.11% | Deviasi <= 15% (20.000 langkah) | **PASS** |
| **K5** | Batas Tier Cincin Pemukiman | 0 pelanggaran dari 17472 titik uji | 0 pelanggaran (17.472 titik) | **PASS** |
| **K6** | Pesan Blokir & Dokumen | 0 token fiktif, 0 pesan tebing usang | 0 token halusinasi | **PASS** |
| **K7** | Realtime Multi-Klien & Privasi | Kuantisasi kelipatan 8 petak, radius subscription <= 2, zero player_position_update | Soket live terverifikasi | **PASS** |
| **K8** | Penutupan Seluruh Temuan | 6/6 temuan terselesaikan | 6/6 terselesaikan (100%) | **PASS** |

---

## 2. Rincian Penutupan Temuan Audit (T1 – T7)

| Temuan | Status Sebelum (K0) | Status Sesudah (K8) | Solusi Authoritative |
|---|---|---|---|
| **T1: Zona Instans Tidak Punya Pintu Masuk** | GET /api/world/nearby tidak memuat zones-v23.json, tidak menghasilkan ID inst_*, dan memercayai req.query klien. | GET /api/world/nearby memuat zones-v23.json, menghasilkan ID inst_*, dan menggunakan posisi server otoritatif. | Diintegrasikan ke `GET /api/world/nearby` dari `zones-v23.json` dengan id `inst_*`, radius 14 petak, dan kontrol akses jarak $\le 3$. |
| **T2: Route Instans Lemah & Sesi Memori** | POST /enter menerima dangerTier/zoneType dari body klien, memakai Map in-memory, dan tidak memvalidasi jarak server. | POST /enter hanya membaca zoneId, tersimpan persisten di MongoDB InstancedZoneSession, dan memvalidasi jarak server <= 3 petak. | Migrasi sesi ke MongoDB `InstancedZoneSession`, request body hanya menerima `zoneId`, parameter tier/tipe ditarik langsung dari file otoritatif. |
| **T4: Jimat Ambush Tidak Berfungsi** | Jimat repellent/attraction jatuh ke cabang unhandled di inventory.js, tidak ada di enum Player.js, dan world.js membaca field hantu. | Jimat repellent & attraction terdaftar di enum Player.js, diproses mutlak di inventory.js, dan diinspeksi dari activeBuffs di world.js. | Menambahkan `repellent_charm` & `attraction_charm` ke enum schema `Player.js`, logika konsumsi eksklusif di `inventory.js`, dan verifikasi buff aktif di `world.js`. |
| **T5: Batas Tier Cincin Pemukiman Tidak Berlaku** | Terbukti 5/5 pemukiman melanggar batas tier (dangerTier > anc.tier + 1). | Semua pemukiman uji mematuhi batas tier cincin R+1..R+12 (dangerTier <= anc.tier + 1, 0 pelanggaran). | Implementasi `applySettlementTierCap` di seluruh engine spasial (`worldRegionEngine` & `proceduralWorldEngine`) menghasilkan 0 pelanggaran dari 17.472 titik uji. |
| **T6: Pesan Halangan Lama Tersisa** | Ditemukan pesan tebing batu mustahil ditembus pada rute gerakan lama (world.js:2709). | Pesan tebing usang berhasil diganti total dengan modul otoritatif describeBlocker. | Mengganti string pesan tebing hardcoded di `world.js:2709` dengan pemanggilan modul kontekstual `describeBlocker`. |
| **T7: Dokumen Memuat Wilayah Fiktif** | Ditemukan 12 token wilayah fiktif pada dokumen/skrip V23. | Seluruh dokumen dan skrip telah bersih dari nama wilayah fiktif (0 token halusinasi). | Menyelaraskan seluruh nama wilayah pada `docs/SISTEM_ZONA_V23.md`, `scripts/v23/gateRunner.js`, dan `review/report_v23.md` dengan SSOT `regions.json`. |

---

## 3. Data Mentah Verifikasi Matematis

### A. Simulasi Mitigasi Jimat (20.000 Langkah, PRNG Mulberry32 Seed 1618)
- **Langkah Simulasi**: 20.000 langkah
- **Peluang Dasar (Baseline)**: 8.00% (1601 pertemuan, Target Teoritis: 8.00%)
- **Jimat Pengusir (Repellent -50%)**: 3.94% (788 pertemuan, Deviasi: 1.5%, Batas Maksimal Toleransi: $\pm 15\%$)
- **Jimat Penarik (Attraction +75%)**: 14.01% (2803 pertemuan, Deviasi: 0.11%, Batas Maksimal Toleransi: $\pm 15\%$)
- **Status Toleransi**: **LULUS (PASS)**

### B. Audit Spasial Batas Tier Cincin Pemukiman (52 Anchors)
- **Total Titik Uji Sampling**: 17.472 titik (52 anchor $\times$ 7 radius $\times$ 16 arah $\times$ 3 sumber data)
- **Radius Uji**: $R, R+1, R+3, R+6, R+9, R+12, R+15$
- **Total Pelanggaran Tier**: **0**
- **Status Audit**: **LULUS (PASS - 0 Pelanggaran)**

---

## 4. Kesimpulan Akhir
Seluruh celah wiring pada rilis V23/V24 telah berhasil disambungkan secara utuh, tahan uji regresi, server-authoritative, dan bebas dari halusinasi data.
