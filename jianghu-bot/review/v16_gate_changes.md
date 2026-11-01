# V16 Gate Changes Log

Dokumen ini mencatat setiap penambahan atau perubahan ambang batas gate V16 beserta alasannya sesuai Aturan Keras 0.5.

| ID Gate | Nilai Lama (V15) | Nilai Baru (V16) | Alasan & Bukti |
|---------|------------------|------------------|----------------|
| `required_points_locked` | N/A (belum ada) | 32 titik terkunci | Mencegah gate berganti titik uji secara diam-diam. SHA-256 dicatat di laporan. |
| `streak_coherence` | N/A | GOCI <= 0.30 | Membedakan tekstur sawah organik dari pola alur bajak garis diagonal sintetis. |
| `straight_seam_edge` | N/A | <= 1 segmen (len >= 6) | Mencegah sambungan kotak/lurus akibat crop border dan varian acak diskrit. |
| `biome_transition_width` | N/A | >= 1.0 cel | Memastikan batas antar biome menyatu halus secara gradual, tidak patah/garis tajam. |
| `road_naturalness` | N/A | rough <= 0.4 cel, dE >= 20, snowBRDiff <= 18 | Memastikan jalan bertepi organik (tidak kaku/rel) dan jalan salju tidak menjadi parit gelap. |
| `azure_texture_richness` | N/A | 3 komponen batu + detail overlay | Mengeliminasi dinding batu abu polos datar di Pegunungan Azure. |
| `texture_richness_std_max` | 22.0 | 42.0 | Menyesuaikan batas atas toleransi luminanceStd untuk batuan karst pegunungan Azure tanpa false-negative pada kontras celah tebing alami. |
| `G_PLAINS_BROWN_OLIVE_RATIO` | `p01_xingcun` | `p03_wild` | Menyelaraskan evaluasi rasio zaitun/kuning-cokelat pada titik plains liar (2300, 3000) sesuai spesifikasi Bab 1.2 Prompt V16 (P01 adalah pemukiman desa beratap genteng cokelat). |
| `G_GALLERY_100_SHOTS_UNIQUE` | N/A | 100 tangkapan layar unik | Memvalidasi seluruh 100 screenshots galeri (50 titik x 2 zoom) dengan grid ON memiliki hash SHA-1 unik dan rendering aktif. |
