const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');

// 1. Update AGENTS.md
const agentsPath = path.join(ROOT, 'AGENTS.md');
let agentsContent = fs.readFileSync(agentsPath, 'utf8').replace(/\r\n/g, '\n');

const v20AgentsSection = `## 3. Aturan Inti & Formula Authoritative

### 3.0. Arsitektur Peta Dunia V20 ("Satu Pemukiman = SATU Bangunan Besar")
- **Prinsip Utama (Keputusan Otoritatif Pemilik)**:
  1. **Satu Pemukiman = SATU Bangunan Besar**: Setiap desa, dusun, kota, sekte, pos, dan dermaga (52 anchor) di peta dunia 5000x5000 HANYA dirender sebagai **satu sprite marker besar** (gerbang/kompleks megah). Dilarang keras memunculkan gugusan rumah kecil, sumur, tumpukan kayu, atau fasilitas terpisah di sekitarnya.
  2. **Zona Eksklusi Pemukiman (No Clutter Policy)**: Di dalam radius eksklusi pemukiman (Chebyshev $R_{\\text{exclusion}}$, misal dusun 6, desa 10, kota 14..36 tile), **DILARANG KERAS** memuat objek buatan manusia apa pun selain marker pemukiman itu sendiri. Objek alam (pohon, rumput, batu) diperbolehkan maksimal 4–12 objek.
  3. **Collision & Forecourt Gerbang**:
     - Area span anchor (\`spanWidth\` × \`spanHeight\`): baris atas (\`spanWidth\` × \`spanHeight - 1\`) adalah solid (\`isSolid: true\`).
     - Baris terbawah adalah halaman depan / forecourt (\`isSolid: false\`, walkable).
     - Tile pintu masuk (entrance) terletak di tengah baris forecourt: $(x + \\lfloor\\text{spanW}/2\\rfloor, y + \\text{spanH} - 1)$ dengan atribut \`isSettlementEntrance: true\`.
  4. **Pemicu Dialog & Masuk Interior**: Melangkah ke tile entrance memicu server mengembalikan \`settlementPrompt: { id, name, tier, regionSlug }\`. Klien menampilkan modal dialog *"Masuk ke {nama}? [Masuk] [Tetap di Luar]"*. Mengeklik marker pemukiman membuka dialog yang sama.
  5. **Interior Gaya Tale of Immortal (\`SettlementPanoramaView.tsx\`)**:
     - Seluruh fasilitas pemukiman (Penginapan, Kedai, Pasar, Bengkel, Papan Hadiah, Balai Sekte, Dermaga) berada di dalam interior, bersumber dari SSOT \`world-data/settlement-facilities-v20.json\`.
     - **Panel Rumah Penduduk**: Seluruh rumah warga/NPC yang dulunya tersebar di peta telah dimigrasikan ke dalam panel modal *"Rumah Penduduk"* (\`residences\`) di dalam pemukiman.
     - Fasilitas dalam persiapan (Balai Lelang, Gudang Jianmu, Array Teleportasi) menampilkan badge *"Segera Hadir"* tanpa error 404/500.
     - Tombol keluar kota (City Gate) mengembalikan pemain secara presisi ke tile entrance pemukiman.
  6. **Rumah Menyendiri & Reruntuhan 1 Grid**: Rumah kecil 1x1 HANYA diizinkan di alam liar untuk: (a) NPC pertapa/pemburu/penebang/nelayan menyendiri (\`world-data/standalone-homes-v20.json\`), dan (b) reruntuhan kuno (\`world-data/ruins-v20.json\`). Keduanya berjarak $\\ge 6$ tile di luar batas zona eksklusi pemukiman dan $\\ge 25-30$ tile satu sama lain.
  7. **Kebijakan Nol Tangkapan Layar (Zero Screenshot Policy)**: Dilarang keras membuat atau mengandalkan Playwright/Puppeteer/page.screenshot untuk pengujian/gate. Semua verifikasi wajib menggunakan audit data mentah, tes unit Vitest, kompilasi TypeScript/Next.js, dan visualisasi ASCII terminal (\`scripts/v20/asciiMap.js\`).

### 3.1. Sistem Mount & Efisiensi Stamina`;

if (agentsContent.includes('## 3. Aturan Inti & Formula Authoritative\n\n### 3.1. Sistem Mount & Efisiensi Stamina')) {
  agentsContent = agentsContent.replace(
    '## 3. Aturan Inti & Formula Authoritative\n\n### 3.1. Sistem Mount & Efisiensi Stamina',
    v20AgentsSection
  );
  fs.writeFileSync(agentsPath, agentsContent, 'utf8');
  console.log('Updated AGENTS.md');
} else {
  console.log('AGENTS.md pattern not found or already updated.');
}

// 2. Update jianghu-bot/README.md
const readmePath = path.join(ROOT, 'jianghu-bot/README.md');
let readmeContent = fs.readFileSync(readmePath, 'utf8').replace(/\r\n/g, '\n');

const v20ReadmeNote = `## Versi 20.0 — Rombak Sistem Peta: "Satu Pemukiman = Satu Bangunan Besar"
- **52 Pemukiman Megah**: Setiap desa, dusun, kota, dan sekte di peta dunia 5000x5000 diwakili oleh tepat 1 bangunan/gerbang besar tanpa kekacauan rumah kecil di sekitarnya.
- **Interior Pemukiman Tale of Immortal**: Masuk ke gerbang kota membuka panorama dengan fasilitas lengkap (Penginapan, Kedai, Pasar, Bengkel, Balai Sekte) dan panel modal Rumah Penduduk.
- **Rumah Menyendiri & Reruntuhan Alam Liar**: 85 rumah pertapa/pemburu/nelayan dan 55 reruntuhan kuno tersebar di alam liar dengan jarak aman.
- **Pembersihan Repositori**: Pemangkasan aset usang dan berkas review, menurunkan file ter-track dari 3.585 menjadi < 1.450 file.
- **Zero Screenshot Policy**: Seluruh verifikasi dialihkan ke data deterministik, tes unit, dan peta terminal ASCII.

`;

if (!readmeContent.includes('Versi 20.0')) {
  readmeContent = readmeContent.replace('# Jianghu World RPG System\n', '# Jianghu World RPG System\n\n' + v20ReadmeNote);
  fs.writeFileSync(readmePath, readmeContent, 'utf8');
  console.log('Updated jianghu-bot/README.md');
}

// 3. Update jianghu-bot/docs/WORLD_MAP_MASTER_PLAN.md
const planPath = path.join(ROOT, 'jianghu-bot/docs/WORLD_MAP_MASTER_PLAN.md');
if (fs.existsSync(planPath)) {
  let planContent = fs.readFileSync(planPath, 'utf8').replace(/\r\n/g, '\n');
  const v20Addendum = `\n## ADDENDUM V20: REFORMA SISTEM PEMUKIMAN "SATU PEMUKIMAN = SATU BANGUNAN BESAR" (NOVEMBER 2026)
1. **Model Spasial**: Seluruh 52 pemukiman kanonikal Tianyuan hanya berdiri sebagai satu marker sprite besar di area span. Baris atas (\`spanWidth\` × \`spanHeight - 1\`) adalah solid, dan baris terbawah adalah forecourt dengan tile entrance di tengah.
2. **Zona Eksklusi Bersih**: Radius eksklusi sekeliling pemukiman bebas 100% dari objek buatan manusia liar (sumur, gubuk, kandang, tumpukan kayu).
3. **Interior ToI**: Fasilitas pemukiman dikelola melalui SSOT \`settlement-facilities-v20.json\` dan ditampilkan di \`SettlementPanoramaView.tsx\`.
4. **Rumah Menyendiri**: 85 rumah 1x1 tersebar di alam bebas (\`standalone-homes-v20.json\`) untuk profesi terpencil (pertapa, pemburu, dsb.).
5. **Reruntuhan Kuno**: 55 reruntuhan (\`ruins-v20.json\`) memperkaya eksplorasi alam liar.
`;
  if (!planContent.includes('ADDENDUM V20')) {
    planContent += v20Addendum;
    fs.writeFileSync(planPath, planContent, 'utf8');
    console.log('Updated WORLD_MAP_MASTER_PLAN.md');
  }
}

console.log('Documentation sync complete.');
