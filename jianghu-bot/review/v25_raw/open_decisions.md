# Catatan Keputusan Terbuka (Open Decisions)

Dokumen ini mencatat keputusan desain dan penyesuaian yang perlu ditinjau ulang pada versi rilis berikutnya:

1. **Harga Toko Sistem (Katalog Shop)**:
   - Harga toko saat ini (misal: Jimat 100 Perak, Kunci Roh 3 Emas, Buah Roh Murni 50 Perak, Batu Roh Rendah 20 Perak) adalah nilai usulan default awal sistem.
   - Jika perlu penyeimbangan ekonomi (game balancing), nilai tersebut dapat diubah langsung pada berkas konfigurasi `services/coreItems.js` (`buyPrice`, `sellPrice`, `priceCurrency`).

2. **Skema Hadiah Zona Instans (Reward Table)**:
   - Hadiah penyelesaian zona instans saat ini masih dipetakan secara terpusat di route `web-api/routes/instancedZones.js` dan modul `utils/instancedZoneCosts.js`.
   - Pada versi berikutnya, skema ini direkomendasikan dipindahkan secara deklaratif ke field `rewardTable` di dalam berkas konfigurasi spasial `world-data/zones-v23.json` agar mudah dikustomisasi per-zona secara independen.
