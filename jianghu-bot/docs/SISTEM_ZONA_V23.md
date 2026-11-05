# SISTEM WILAYAH, ZONA MONSTER & ZONA BAHAYA (V23)
**Jianghu Bot & Immortal-X: Arsitektur Spasial ala Tale of Immortal**

Dokumen ini adalah referensi arsitektur resmi mengenai zonasi wilayah, tangga progres kultivasi, sistem sergapan monster, dan area tantangan berinstans.

---

## 1. Filosofi Desain: Tangga Wilayah & Zona Berbahaya

Dunia Tianyuan (peta makro 5000×5000 tile, 29 wilayah) disusun menurut prinsip tangga progres (*region progression ladder*) terinspirasi *Tale of Immortal*:
1. **Pemisahan Hub vs Wilayah Liar**: Wilayah pusat peradaban (*Hub*) memuat fasilitas lengkap dan sekte. Wilayah transisi (*Transition*) dan terobosan (*Danger*) **TIDAK memiliki pemukiman maupun sekte**, melainkan dihuni oleh monster liar agresif, elite, dan bos dunia.
2. **Keterikatan Ranah Kultivasi**: Setiap wilayah memiliki syarat rekomendasi ranah minimal (\`requiredRealmIndex\`). Kultivator yang melangkah ke wilayah di atas ranahnya akan menerima peringatan aura pembunuh (*Realm Boundary Warning Dialog*).
3. **Deterministik & Server Authoritative**: Seluruh perhitungan sergapan monster (*ambush risk*), gradasi bahaya, dan drop barang dikalkulasi di backend Node.js tanpa mengandalkan status sisi klien.

---

## 2. Klasifikasi Peran Wilayah (*Region Roles*)

Dua puluh sembilan wilayah diklasifikasikan ke dalam 5 peran fungsional (\`world-data/region-roles-v23.json\`):

| Peran Wilayah | Jumlah | Karakteristik Utama | Contoh Wilayah |
|---|---|---|---|
| **Hub** | 8 | Pusat kota, sekte utama, fasilitas pasar, bank, kedai, dan balai misi. | \`central_plains\`, \`nine_springs_delta\`, \`azure_mountain_range\` |
| **Frontier** | 5 | Pos perbatasan terluar dan benteng garnisun. Menjaga batas antara peradaban dan alam liar. | \`border_march\`, \`kunlun_foothills\` |
| **Transition** | 8 | Lembah dan gurun berbahaya penghubung dua hub. Bebas pemukiman; banyak ambush dan monster elite. | \`hundred_thousand_hills\`, \`lei_ze_wasteland\` |
| **Danger** | 5 | Alam ekstrem tempat berburu bahan terobosan ranah tinggi. Hawa dingin/racun mematikan. | `western_gorge_labyrinth`, `mist_insect_valley` |
| **Sealed** | 3 | Wilayah patahan anomali purba dengan monster tier 6 level 105–120. | `void_rift`, `frostmoon_sea`, `floating_wind_isles` |

---

## 3. Zona Penyangga Pemukiman & Gradasi Bahaya

### 3.1. Cincin Penyangga Pemukiman (*Settlement Buffer Ring*)
Pada seluruh 52 anchor pemukiman:
- **Radius Eksklusi ($r \le R$)**: Ambush = 0 (100% aman). Tidak ada objek buatan manusia tambahan selain gerbang pemukiman.
- **Cincin Penyangga ($R < r \le R + 12$)**: Risiko ambush bertambah secara linear dari 0 hingga risiko penuh alam bebas. Tier bahaya dibatasi maksimal $\le \text{tier}_{\text{pemukiman}} + 1$.

### 3.2. Interpolasi Bahaya Antarwilayah (*Border Smoothstep*)
Untuk mencegah lonjakan tingkat bahaya yang tidak wajar di perbatasan:
- Menggunakan fungsi interpolasi kubik *smoothstep*:
  $$S(t) = 3t^2 - 2t^3 \quad (t \in [0, 1])$$
- Lebar pita transisi perbatasan: $W = \max(24, \lceil 18 \times \Delta T \rceil)$ petak.
- Menjamin perubahan tier efektif per petak tidak pernah melebihi $1/12 \approx 0.083$ tier per petak ($\le 1.0$ per 12 petak).

---

## 4. Mekanika Sergapan Monster & Sistem Jimat

### 4.1. Tabel Risiko Dinamis Alam Bebas
Petak terbuka non-jalan memiliki risiko dasar:
- Tier 1: **0.0%** (Zona Aman)
- Tier 2: **4.0%**
- Tier 3: **8.0%**
- Tier 4: **15.0%**
- Tier 5: **25.0%**
- Tier 6: **35.0%**

Medan lebat (rawa, hutan lebat, reruntuhan) menerapkan koefisien pengali hingga maksimum $50\%$. Petak jalan (\`road*\`) **selalu 0% ambush**.

### 4.2. Jimat Mitigasi & Pemikat Monster
- **Jimat Pengusir Monster** (\`item_monster_repellent_charm\`): Mengurangi risiko sergapan sebesar $-50\%$.
- **Jimat Pemikat Monster** (\`item_monster_attraction_charm\`): Meningkatkan frekuensi pertemuan sebesar $+75\%$.

---

## 5. Tata Letak Zona Tetap & Area Berinstans

Sebanyak 169 zona eksplorasi tetap ditempatkan secara deterministik (Seed 1618) pada \`world-data/zones-v23.json\`:
1. **Perkemahan Elite (87)**: Sarang monster kuat pembawa material grade G2.
2. **Sarang Bos Dunia (27)**: Gerbang bos dengan syarat ranah. Mode Chaos opsional (+35% HP, +25% DMG) menjatuhkan material mitologi G1.
3. **Lembah Roh / *Spirit Valley* (26)**: Labirin instans $3 \times 3$ berpenjaga elite, jebakan persentase HP (8%–15% ignore DEF), risiko iblis batin 10%, dan cooldown 7 hari.
4. **Tanah Roh / *Land of Spirits* (3)**: Ujian 5 ruang sekuensial dengan biaya masuk 500 Batu Roh berhadiah pencapaian permanen.
5. **Lingkaran Pertahanan / *Defense Circle* (21)**: Arena bertahan hidup 5 gelombang melawan serbuan siluman dengan biaya 3 Buah Roh.
6. **Tanah Elemen / *Elemental Land* (5)**: Penghasil serpihan elemen spiritual murni (Api, Air, Kayu, Logam, Tanah).

---

## 6. Referensi Modul & Integrasi

| Modul / Berkas | Tanggung Jawab Utama |
|---|---|
| \`utils/worldRegionEngine.js\` | Resolusi teritori, buffer pemukiman, smoothstep perbatasan (\`getEffectiveDanger\`). |
| \`utils/monsterSpawnEngine.js\` | Peluang ambush dinamis, efek jimat, tiering drop G1-G3, gerbang bos, penjejak bahaya (\`getNearbyHazards\`). |
| \`services/instancedZoneEngine.js\` | Mesin berinstans deterministik (Lembah Roh, Tanah Roh, Defense Circle, Tanah Elemen). |
| \`config/travelDistances.js\` | Graf perjalanan kanonikal 52 anchor (1 MST komponen, 2.652 rute terverifikasi). |
| \`web-api/routes/nearby.js\` | Endpoint REST \`/api/world/nearby\` mengembalikan entitas pemain, bangunan, dan bahaya lingkungan. |
| \`web-dashboard/.../NearbyPanel.tsx\` | Komponen UI ringan penampil entitas dan bahaya sekitar tanpa beban canvas. |
| \`web-dashboard/.../WorldPageContent.tsx\` | HUD badge peran wilayah dan Dialog Peringatan Batas Ranah (*Realm Boundary Warning*). |
