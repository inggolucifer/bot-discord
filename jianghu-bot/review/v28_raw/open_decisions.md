# KEPUTUSAN TERBUKA ARSITEKTUR & EKOSISTEM NPC (V28 OPEN DECISIONS)

Dokumen ini mendokumentasikan keputusan desain yang disepakati untuk pengembangan masa depan Jianghu Bot:

1. **Daftar Tokoh Cerita Inti (`npc-essential-v27.json`)**:
   - Dibatasi secara ketat hanya pada **14 tokoh jalan cerita utama** (seperti Zhou Haotian, Murong Ba, Xi Hua, Shuang Ke, Wu Binglin, Yin Ci, Li Keke, dll.).
   - Peran fungsional perdagangan (pemilik penginapan, pandai besi, alkemis) berstatus **fana** (`isEssential: false`) sehingga dapat gugur dalam perang atau penuaan, dan posisinya akan secara otomatis digantikan oleh sistem regenerasi populasi (`npcPopulationManager`).

2. **Kuota Populasi Pemukiman (`npc-population-v28.json`)**:
   - Telah ditetapkan kuota proporsional per tipe pemukiman:
     - Dusun (`hamlet`): 4 NPC
     - Desa (`village`): 8 NPC
     - Kota Kecil (`town`): 16 NPC
     - Kota Besar (`major_city`): 40 NPC
     - Ibukota (`capital_city`): 80 NPC
     - Sekte (`sect`): 30 NPC
     - Pos Perbatasan (`outpost`): 6 NPC
     - Dermaga (`port`): 14 NPC
     - Pulau (`island`): 4 NPC
     - Wilayah Bahaya & Gua Rahasia: 0 NPC menetap (hanya dijelajahi sementara).
   - Total populasi aktif tersebar: **764 NPC hidup**.

3. **Batas Transaksi Gelap & Ganti Rugi Dendam**:
   - Pencurian harian dibatasi maksimal 3 kali per NPC dengan risiko buronan (`wantedLevel +1`).
   - Pemerasan dibatasi 1 kali per 24 jam dengan ambang afinitas minimum.
   - Ganti rugi damai penyergapan dendam darah dipatok proporsional (`500` koin tembaga per tingkat dendam).

4. **Pernikahan dengan NPC & Generasi Keturunan**:
   - Pasangan Dao (`partner`) dapat dicapai setelah tahap hubungan `soulmate` (afinitas 100) dan melewati ujian restu klan/keluarga NPC.
   - Generasi keturunan murid/anak akan memanfaatkan `npcGenerator` deterministik untuk mewarisi sifat batin kedua orang tua.

5. **Rekrutmen NPC ke Sekte Pemain**:
   - NPC pengelana independen (`cultivator`) dengan ranah fana atau Qi refining dapat direkrut sebagai murid luar sekte pemain bila reputasi sekte mencukupi.

6. **Aset Potret Berdiri Unik**:
   - Menggunakan slot terdaftar di `GLOBAL_ASSETS.npcs[name]` dengan berkas aset mandiri di `/assets/npc/` (misal `xihua_standing_perfect.png`). Tokoh tanpa aset unik menggunakan siluet jubah persilatan proporsional (`Silhouette`).

7. **Afiliasi Sekte untuk NPC**:
   - Tokoh yang tidak berada di jangkar sekte menampilkan status **"Tanpa Sekte"** (bukan mencantumkan nama kota secara keliru sebagai nama sekte).
