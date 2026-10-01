# COMBAT QA & DEPTH ENGINE CHECKLIST (IMMORTAL-X)

Dokumen ini adalah checklist pengujian kualitas operasional (*Quality Assurance*) untuk sistem kedalaman pertempuran (**Combat Depth Engine**): Kamus Status Terunifikasi, Kondisi Tubuh & 9 Bagian Body Tempering, Integrasi 5 Pilar Tempur, dan Sinergi Law Semesta.

---

## 1. MATRIKS PENGUJIAN UTAMA (CD-01 s/d CD-10)

| ID | Skenario Uji | Prosedur & Ekspektasi | Status |
|---|---|---|---|
| **CD-01** | **Poison Stacking & Single Tick per Round** | Berikan racun 2x (@ 20 stacks) ke target. Jalankan 1 putaran tick akhir ronde.<br>• *Hasil*: Stacks bertumpuk presisi menjadi 40 stacks. Tick hanya berjalan 1 kali per akhir ronde menghasilkan damage deterministik `floor(maxHp * 0.06)` dan tidak double-tick. | [x] PASS |
| **CD-02** | **Stun Turn Skip & Duration Decay** | Berikan status lumpuh/totokan (`stun`, durasi: 1). Periksa kemampuan bertindak dan peluruhan di akhir ronde.<br>• *Hasil*: `hasStatus(entity, 'stun') === true`, aksi dilewati ronde ini. Setelah 1 giliran, status stun luruh dan terhapus dari entitas. | [x] PASS |
| **CD-03** | **Heavy Hit Injury Threshold (15% Max HP)** | Target menerima serangan < 15% Max HP vs >= 15% Max HP.<br>• *Hasil*: Serangan di bawah 15% Max HP tidak memicu injury. Serangan >= 15% Max HP memicu kondisi `injury +1` (maksimal 10 tingkat keparahan), memberikan penalti -3% ATK/DEF dan -2% Max Qi per tingkat keparahan. | [x] PASS |
| **CD-04** | **Body Tempering 9 Parts Scaling (Arms Lv 0 vs 10)** | Praktisi Penempaan Tubuh dengan bagian lengan level 0 vs level 10.<br>• *Hasil*: Level 0 lengan menghasilkan pengali ATK aman 0.55x (mencegah soft-lock total), sedangkan level 10 menghasilkan pengali 0.85x. Peningkatan level menghasilkan kenaikan output damage yang nyata dan terukur. | [x] PASS |
| **CD-05** | **Five Pillars: Focus Accuracy & Resist Buff** | Evaluasi karakter dengan atribut Pilar Focus 20 vs 80.<br>• *Hasil*: Focus 20 memberikan penalti akurasi (-1.5%), sedangkan Focus 80 memberikan bonus akurasi (+1.5%) dan resistensi stun (+6%), terlindungi batas cap aman $\pm 8\%$. | [x] PASS |
| **CD-06** | **Demonic Myriad Venom Auto-Poison on Hit** | Praktisi Hukum Laksa Bisa melancarkan serangan basic attack atau jurus ke lawan.<br>• *Hasil*: Serangan otomatis menyuntikkan 25 stack racun (`poison`) ke darah dan meridian target, disertai catatan log tempur khusus. | [x] PASS |
| **CD-07** | **Pure Yang 30% Poison Resistance & Meridian Cleanse** | Karakter Kitab Yang Murni menerima racun dari lawan, dan memulai giliran dengan racun aktif.<br>• *Hasil*: Serangan racun yang masuk tereduksi 30% (stacks * 0.70). Pada awal giliran, terdapat peluang memurnikan 25 stack racun di dalam meridian. | [x] PASS |
| **CD-08** | **Karmic Mirror Reflect Capped at 25%** | Defender dengan pantulan karma (Cermin Karma) menerima serangan.<br>• *Hasil*: Memantulkan kerusakan sesuai `reflectPct`, namun dibatasi secara mutlak pada angka maksimum 25% dari incoming damage. Anti-loop `skipReflect` mencegah pantulan bolak-balik tanpa batas. | [x] PASS |
| **CD-09** | **Heavenly Merit Damage Multiplier vs Evil / Wanted** | Praktisi Hukum Jasa Langit (Rank 3) menyerang target buronan (`isWantedByOrthodox === true`) vs target biasa.<br>• *Hasil*: Menghasilkan bonus kerusakan +12% vs buronan/iblis (`damageMultiplier: 1.12`), sedangkan target biasa menerima damage dasar 1.0x tanpa bonus. | [x] PASS |
| **CD-10** | **UI Status Badges in Battle Action Response** | Karakter terkena berbagai kondisi (Poison, Injury, Burn, Stun, Defense Up). Periksa payload respons API.<br>• *Hasil*: Payload respons `session.player` dan `session.enemies` memuat array `statusBadges` lengkap dengan ikon emoji, label, durasi, keparahan, dan deskripsi efek untuk rendering HUD arena. | [x] PASS |

---

## 1.1. MATRIKS COMBAT POLISH & RUNTIME SAFETY (CD-11 s/d CD-13)

| ID | Skenario Uji | Prosedur & Ekspektasi | Status |
|---|---|---|---|
| **CD-11** | **Single DoT Tick per Round (Anti-Double-Tick)** | Target dengan 40 stack racun menerima serangan dari penyerang dengan Hukum Laksa Bisa (menambah +25 stack = 65 stack). Periksa apakah damage racun hanya terjadi satu kali.<br>• *Hasil*: `onSkillHitLawExtras` tidak menduplikasi damage DoT di tengah aksi. DoT racun hanya dieksekusi tepat satu kali pada fase akhir ronde via `tickStatuses` (`hp: 100 -> 91`, tepat -9 HP). | [x] PASS (unit script) |
| **CD-12** | **Stamina Mid-Battle Soft Penalties** | Karakter mengeksekusi aksi dalam kondisi stamina optimal (100), rendah (< 20%), dan habis (0).<br>• *Hasil*: Stamina 100 menghasilkan pengali normal (1.0x damage, 1.0x hit). Stamina < 20% menghasilkan penalti lunak (0.90x damage, 0.95x hit). Stamina 0 menghasilkan penalti 0.85x damage dan 0.90x hit tanpa memblokir basic attack total (mencegah soft-lock). | [x] PASS (unit script) |
| **CD-13** | **statusBadges Always Array & Standardized Contract** | Panggil `getStatusBadges` pada entitas null, undefined, bersih tanpa efek, dan entitas debuffed.<br>• *Hasil*: Selalu mengembalikan `Array` (tidak pernah `undefined` atau `null`). Setiap badge mematuhi bentuk kontrak baku: `{ id, badge, label, severity, stacks, duration, description, desc, kind }`. | [x] PASS (unit script) |

---

## 2. PANDUAN PENGUJIAN SMOKE TEST CEPAT

Jalankan perintah pengujian konsistensi dan sintaks di terminal:

```bash
# 1. Verifikasi sintaks require dan modul tempur
node --check jianghu-bot/utils/combatStatus.js
node --check jianghu-bot/utils/combatBody.js
node --check jianghu-bot/services/InteractiveBattleService.js
node --check jianghu-bot/utils/simulateBattle.js
node --check jianghu-bot/utils/statCalculator.js
node --check jianghu-bot/models/BattleSession.js

# 2. Jalankan test suite combat depth terpadu (CD-01 s/d CD-10)
node jianghu-bot/scripts/testCombatDepthComprehensive.js

# 3. Jalankan test suite Law combat wire (BW-01 s/d BW-06)
node jianghu-bot/scripts/testLawCombatBattleWire.js

# 4. Jalankan test suite komprehensif 18 check 5 Law Righteous
node jianghu-bot/scripts/testRighteousLawsComprehensive.js
```
