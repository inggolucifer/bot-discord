# Arsip File Data Usang (Deprecated World Data V9)

Direktori ini menyimpan file-file konfigurasi dan data dunia legacy yang telah dipensiunkan pada migrasi **V9 Master Architecture**:

1. `road-network.json`
   - **Alasan Pengarsipan**: Telah digantikan oleh jalur jalan berbasis raster, procedural overrides (`road-overrides-v9.json`), dan road network spline di desa v9 (`village-archetypes-v9.json`).
   - Tidak lagi digunakan oleh runtime procedural engine atau streaming engine.

2. `layout-recipes.json`
   - **Alasan Pengarsipan**: Digantikan oleh sistem 8 Village Archetypes (`world-data/village-archetypes-v9.json`) dan algoritma penempatan objek procedural yang lebih kaya dan deterministik.

3. `organic-region-map.json`
   - **Alasan Pengarsipan**: Batas wilayah sekarang sepenuhnya menggunakan **Raster SSOT** (`world-data/raster.bin` yang diakses melalui `utils/worldData.js`). File JSON poligon / mesh lama ini tidak lagi menjadi sumber kebenaran (Single Source of Truth) untuk pembagian region.
