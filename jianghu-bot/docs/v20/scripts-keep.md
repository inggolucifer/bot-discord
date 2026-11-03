# Inventaris Skrip Utilitas yang Dipertahankan di V20 (scripts/v20/lib)

Sesuai rencana pembersihan P9, folder versi legacy `scripts/v11` sampai `scripts/v19` telah dipensiunkan dan dihapus. Skrip analitik utilitas penting yang masih relevan dipindahkan ke `scripts/v20/lib/`:

| Berkas Asal | Lokasi Baru di V20 | Fungsi / Deskripsi |
|---|---|---|
| `scripts/v12/checkReachability.js` | `scripts/v20/lib/checkReachability.js` | Validasi keterjangkauan jalur A* graf antar wilayah |
| `scripts/v13/checkBarrierClosure.js` | `scripts/v20/lib/checkBarrierClosure.js` | Audit integritas garis pembatas benua dan celah lintasan |
| `scripts/v11/testSpawnClearance.js` | `scripts/v20/lib/testSpawnClearance.js` | Verifikasi jarak aman dan kebebasan tile spawn pemain |

Seluruh skrip tangkapan layar, evaluasi visual, dan perbandingan pixel telah dihapus total sejalan dengan kebijakan Zero Screenshot Policy V20.
