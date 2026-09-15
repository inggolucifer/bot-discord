# Grid World Overhaul Audit (FASE G0)

## 1. Analisis `RegionMapView.tsx`
- **Yang bisa di-reuse:** Fungsi konfirmasi Travel, state loading/error, dan data fetch locations (`settlements`) sebagai titik poin gerbang (`travelGateTiles`).
- **Yang harus dibuang/diganti total (FASE G7):** Komponen utama SVG rendering, logic pin map (koordinat %), penggunaan image statis utuh, dan pergerakan animasi pin. Perlu diganti dengan viewport-only rendering (CSS grid / canvas).

## 2. Struktur `Location.js`
- Field `mapX` dan `mapY` sebelumnya dirancang untuk persentase posisi di gambar.
- **Interpretasi baru:** `Location` murni sebagai point-of-interest level makro ('Kota'/'Desa') yang akan ditautkan via `travelGateTiles` di `ZoneTile`. Field koordinat mapX/mapY tetap dipakai untuk Region map level makro (WorldMapView), sementara di dalam zone menggunakan `tileX` dan `tileY`.

## 3. Struktur `Asset.js`
- Saat ini tidak memiliki informasi posisi spasial.
- **Perluasan di FASE G5:** Perlu penambahan struktur `placement` (`zoneId`, `tileX`, `tileY`, `ownerType`, `ownerId`) serta kontrol visibilitas (`isPubliclyVisible`).
