/**
 * seedLawHardeningItems.js
 * SEEDER HARDENING MASTER UNTUK SISTEM 15 HUKUM SEMESTA (IMMORTAL-X)
 * 
 * Memastikan ketersediaan seluruh item penting untuk sistem 15 Law:
 * 1. 15 Kitab Manual Hukum Semesta (Category: 'law', tags: ['law_manual', 'law'])
 * 2. 6 Item Catalyst Elemen (fire_catalyst, water_catalyst, earth_catalyst, wood_catalyst, wind_catalyst, thunder_catalyst)
 * 3. Item Bibit Gu (gu_larva)
 * 4. Item Telur & Satwa Common (beast_egg, common_beast)
 * 5. Item Wadah Artefak Common (common_artifact)
 * 6. Item Pil Penenang Gu (sedative_pill, gu_sedative)
 * 7. Item Inti Monster Kotor Berjenjang (beast_core, Tier 1–5)
 * 8. Item Botol Darah (blood_vial)
 * 9. Item Kantung Racun & Racun Minum Berjenjang (venom_sac, venom_item, Tier 1–5)
 * 10. Item Upeti Altar Kurban Abyss (abyssal_scroll, obsidian, tribute_item)
 * 11. Item Batu Yin Nether (yin_stone)
 * 12. 8 Pil Penerobosan Resmi Data-Driven (BREAKTHROUGH_PILL_CATALOG Tier 1–8)
 * 13. Makhluk Gu yang Dapat Dipasang (gu creature Tier 1–5)
 * 14. Material Pakan Satwa / Infuse Artefak (feed_material Tier 1–5)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Item = require('../models/Item');

const DEFAULT_GUILD_ID = process.env.DEFAULT_GUILD_ID || 'default_guild';

const HARDENING_ITEMS = [
  // ═══════════════════════════════════════════════════════════════════════
  // 1. 15 KITAB MANUAL HUKUM SEMESTA (SLOT 1)
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: 'Kitab Api Nirwana Phoenix',
    lawType: 'element_phoenix_fire',
    category: 'law',
    rank: 'Common',
    tier: 1,
    tags: ['law_manual', 'law', 'fire'],
    isLawManual: true,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab pusaka pengendali Api Samadhi dan intisari Burung Phoenix purba. Membakar kotoran fana untuk terlahir kembali.'
  },
  {
    name: 'Kitab Samudra Naga Azure',
    lawType: 'element_azure_water',
    category: 'law',
    rank: 'Common',
    tier: 1,
    tags: ['law_manual', 'law', 'water'],
    isLawManual: true,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab esensi air samudra tak berdasar dan garis keturunan Naga Azure. Lembut mengalir namun mematikan.'
  },
  {
    name: 'Kitab Inti Bumi Xuanwu',
    lawType: 'element_xuanwu_earth',
    category: 'law',
    rank: 'Common',
    tier: 1,
    tags: ['law_manual', 'law', 'earth'],
    isLawManual: true,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab fondasi raga tanah sekuat cangkang kura-kura purba Xuanwu yang menopang benua semesta.'
  },
  {
    name: 'Kitab Pohon Hayat Kaisar Hijau',
    lawType: 'element_qingdi_wood',
    category: 'law',
    rank: 'Common',
    tier: 1,
    tags: ['law_manual', 'law', 'wood'],
    isLawManual: true,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab kehidupan abadi Pohon Hayat Semesta Kaisar Hijau (Qingdi). Menyembuhkan segala luka batin fana.'
  },
  {
    name: 'Kitab Badai Sayap Roc Sembilan Langit',
    lawType: 'element_roc_wind',
    category: 'law',
    rank: 'Common',
    tier: 1,
    tags: ['law_manual', 'law', 'wind'],
    isLawManual: true,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab penguasa angin badai dan kecepatan kilat Burung Raksasa Roc yang membubung 90.000 li.'
  },
  {
    name: 'Kitab Guntur Halilintar Dewa Petir',
    lawType: 'element_godthunder_light',
    category: 'law',
    rank: 'Common',
    tier: 1,
    tags: ['law_manual', 'law', 'thunder'],
    isLawManual: true,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab penunduk petir murka para dewa penegak hukum langit yang meremukkan segala kejahatan.'
  },
  {
    name: 'Kitab Penempaan Raga Suci',
    lawType: 'body_tempering',
    category: 'law',
    rank: 'Common',
    tier: 1,
    tags: ['law_manual', 'law', 'body'],
    isLawManual: true,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab penempaan daging, tulang, dan meridian fana menjadi Tubuh Raga Dewa Iblis Suci berenergi True Qi.'
  },
  {
    name: 'Kitab Rongga Sepuluh Ribu Gu',
    lawType: 'gu_master',
    category: 'law',
    rank: 'Common',
    tier: 1,
    tags: ['law_manual', 'law', 'gu'],
    isLawManual: true,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab pembuka Aperture spiritual untuk membudidayakan, memberi pakan, dan memfusikan aneka serangga Gu.'
  },
  {
    name: 'Kitab Ikatan Pusaka Jiwa Kelahiran',
    lawType: 'natal_artifact',
    category: 'law',
    rank: 'Common',
    tier: 1,
    tags: ['law_manual', 'law', 'artifact'],
    isLawManual: true,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab pengikatan abadi benda fana common apa saja menjadi Pusaka Jiwa Primordial seumur hidup yang bernyawa.'
  },
  {
    name: 'Kitab Sumpah Darah Satwa Roh Purba',
    lawType: 'natal_beast',
    category: 'law',
    rank: 'Common',
    tier: 1,
    tags: ['law_manual', 'law', 'beast'],
    isLawManual: true,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab sumpah darah dengan satwa fana common apa saja untuk bermutasi dan berevolusi menjadi Satwa Dewa Purba.'
  },
  {
    name: 'Kitab Pelebur Inti Siluman Kotor',
    lawType: 'demonic_turbid_core',
    category: 'law',
    rank: 'Common',
    tier: 1,
    tags: ['law_manual', 'law', 'demonic'],
    isLawManual: true,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab jalur iblis pemurni dan pelahap Qi kotor serta inti monster buas tanpa batas.'
  },
  {
    name: 'Kitab Penghisap Darah & Pemanen Ruh',
    lawType: 'demonic_blood_soul',
    category: 'law',
    rank: 'Common',
    tier: 1,
    tags: ['law_manual', 'law', 'demonic'],
    isLawManual: true,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab pembantaian jalur iblis penghisap esensi darah fana dan penempa Panji Sembilan Ruh arwah korban.'
  },
  {
    name: 'Kitab Seribu Racun Pemusnah',
    lawType: 'demonic_myriad_venom',
    category: 'law',
    rank: 'Common',
    tier: 1,
    tags: ['law_manual', 'law', 'demonic'],
    isLawManual: true,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab penempa Tubuh Racun Maut melalui konsumsi aneka racun berbisa ekstrem Jianghu.'
  },
  {
    name: 'Kitab Kontrak Iblis Jurang Abyss',
    lawType: 'demonic_abyssal_pact',
    category: 'law',
    rank: 'Common',
    tier: 1,
    tags: ['law_manual', 'law', 'demonic'],
    isLawManual: true,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab perjanjian darah dengan para iblis abyssal purba penuntut upeti tumbal berkala.'
  },
  {
    name: 'Kitab Bayangan Sembilan Yin Netherworld',
    lawType: 'demonic_nether_darkness',
    category: 'law',
    rank: 'Common',
    tier: 1,
    tags: ['law_manual', 'law', 'demonic'],
    isLawManual: true,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Kitab kultivasi Qi gelap Netherworld di liang kubur kuno dan jurang tanpa sinar matahari.'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 2. CATALYST ELEMEN (SLOT 2 IKATAN ELEMEN)
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: 'Intisari Api Merah',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['fire_catalyst', 'catalyst', 'essence'],
    basePrice: 20,
    priceCurrency: 'copper',
    description: 'Bongkahan belerang membara berkilau merah jingga, katalis inti pembuka Aperture Api Phoenix.'
  },
  {
    name: 'Embun Es Abadi',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['water_catalyst', 'catalyst', 'essence'],
    basePrice: 20,
    priceCurrency: 'copper',
    description: 'Tetesan embun beku dari daun teratai danau salju abadi, katalis air pembuka Aperture Samudra Azure.'
  },
  {
    name: 'Batu Inti Purba',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['earth_catalyst', 'catalyst', 'essence'],
    basePrice: 20,
    priceCurrency: 'copper',
    description: 'Batu pualam kuning padat dari dasar tambang kuno, katalis bumi pematri fondasi Xuanwu.'
  },
  {
    name: 'Getah Pohon Roh',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['wood_catalyst', 'catalyst', 'essence'],
    basePrice: 20,
    priceCurrency: 'copper',
    description: 'Getah hijau wangi yang menetes dari kulit pohon beringin roh purba, katalis kayu Kaisar Qingdi.'
  },
  {
    name: 'Bulu Burung Roc',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['wind_catalyst', 'catalyst', 'essence'],
    basePrice: 20,
    priceCurrency: 'copper',
    description: 'Sehelai bulu sayap burung rajawali badai yang dapat mengapung melawan gravitasi, katalis angin Roc.'
  },
  {
    name: 'Pasir Petir Langit',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['thunder_catalyst', 'catalyst', 'essence'],
    basePrice: 20,
    priceCurrency: 'copper',
    description: 'Pasir hitam kristal yang memercikkan bunga api statis saat disentuh, katalis petir dewa.'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 3. GU LARVA (SLOT 2 GU MASTER)
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: 'Bibit Ulat Gu Fana',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['gu_larva', 'gu'],
    basePrice: 25,
    priceCurrency: 'copper',
    description: 'Kepompong ulat sutra hutan belantara berkepala giok kecil, bibit pertama calon serangga Gu batin.'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 4. TELUR & SATWA COMMON (SLOT 2 NATAL BEAST)
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: 'Telur Satwa Roh Purba',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['beast_egg', 'common_beast'],
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Sebuah cangkang telur berbintik hangat peninggalan sarang hewan buas di gua tersembunyi.'
  },
  {
    name: 'Anak Anjing Kampung',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['common_beast'],
    basePrice: 35,
    priceCurrency: 'copper',
    beastTokenType: 'dog',
    description: 'Anak anjing setia berbulu cokelat yang siap mengikat sumpah darah dengan tuannya.'
  },
  {
    name: 'Ular Rumput Hijau',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['common_beast'],
    basePrice: 30,
    priceCurrency: 'copper',
    beastTokenType: 'snake',
    description: 'Ular rumput kecil tidak berbisa yang melingkar tenang di telapak tangan.'
  },
  {
    name: 'Gagak Hitam Liar',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['common_beast'],
    basePrice: 25,
    priceCurrency: 'copper',
    beastTokenType: 'crow',
    description: 'Burung gagak hitam bersuara serak yang gemar bertengger di dahan kering makam kuno.'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 5. WADAH ARTEFAK COMMON (SLOT 2 NATAL ARTIFACT)
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: 'Pedang Besi Patah',
    category: 'weapon',
    weaponType: 'sword',
    rank: 'Common',
    tier: 1,
    tags: ['common_artifact'],
    canBecomeArtifact: true,
    baseAtk: 5,
    weight: 2,
    basePrice: 30,
    priceCurrency: 'copper',
    description: 'Pedang besi usang peninggalan masa lalu yang patah ujungnya namun memiliki mata batin tajam.'
  },
  {
    name: 'Mangkuk Keramik Retak',
    category: 'artifact',
    rank: 'Common',
    tier: 1,
    tags: ['common_artifact'],
    canBecomeArtifact: true,
    baseDef: 5,
    weight: 1,
    basePrice: 10,
    priceCurrency: 'copper',
    description: 'Mangkuk tanah liat retak sederhana yang sering dipakai mengemis atau minum air kali.'
  },
  {
    name: 'Cermin Kuningan Usang',
    category: 'artifact',
    rank: 'Common',
    tier: 1,
    tags: ['common_artifact'],
    canBecomeArtifact: true,
    baseDef: 4,
    weight: 1,
    basePrice: 15,
    priceCurrency: 'copper',
    description: 'Cermin kuningan buram warisan leluhur fana yang mampu memantulkan pendar samar perlindungan batin.'
  },
  {
    name: 'Cincin Tembaga Berkarat',
    category: 'accessories',
    rank: 'Common',
    tier: 1,
    tags: ['common_artifact'],
    canBecomeArtifact: true,
    weight: 1,
    basePrice: 20,
    priceCurrency: 'copper',
    description: 'Cincin tembaga kusam berukir garis sederhana yang menunggu diresapi intisari True Qi.'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 6. PIL PENENANG GU (SEDATIVE)
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: 'Pil Penenang Gu',
    category: 'pill',
    rank: 'Uncommon',
    tier: 1,
    tags: ['sedative_pill', 'gu_sedative', 'pill'],
    usableInBattle: false,
    basePrice: 60,
    priceCurrency: 'copper',
    description: 'Pil herbal wangi beraroma dupa yang menidurkan serangga Gu batin sehingga dapat dilepas dari rongga tubuh tanpa serangan balik (backlash).'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 7. INTI SILUMAN KOTOR (TURBID CORES TIER 1–5)
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: 'Inti Siluman Kotor Tingkat 1',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['beast_core', 'core', 'monster_core'],
    basePrice: 15,
    priceCurrency: 'copper',
    description: 'Inti kristal keruh berbau bangkai dari binatang buas fana, bahan santapan dasar jalur pelebur inti siluman kotor.'
  },
  {
    name: 'Inti Siluman Kotor Tingkat 2',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['beast_core', 'core', 'monster_core'],
    basePrice: 40,
    priceCurrency: 'copper',
    description: 'Inti siluman keruh dari monster tingkat Qi Refining, mengandung hawa turbid padat beracun.'
  },
  {
    name: 'Inti Siluman Kotor Tingkat 3',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['beast_core', 'core', 'monster_core'],
    basePrice: 100,
    priceCurrency: 'copper',
    description: 'Inti monster siluman Foundation yang memancarkan aura kegelapan menyengat, sumber energi kultivator iblis.'
  },
  {
    name: 'Inti Siluman Kotor Tingkat 4',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['beast_core', 'core', 'monster_core'],
    basePrice: 300,
    priceCurrency: 'copper',
    description: 'Inti raja monster purba berkabut hitam tebal, hanya dapat dimurnikan oleh dantian berkapasitas Golden Core.'
  },
  {
    name: 'Inti Siluman Kotor Tingkat 5',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['beast_core', 'core', 'monster_core'],
    basePrice: 1000,
    priceCurrency: 'copper',
    description: 'Inti iblis kuno bermata merah membara, intisari kekotoran duniawi yang mendongkrak True Qi dan indeks korupsi secara dahsyat.'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 8. BOTOL DARAH (BLOOD VIAL & SOUL HARVEST)
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: 'Botol Darah Monster Segar',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['blood_vial', 'blood', 'tribute_item'],
    basePrice: 20,
    priceCurrency: 'copper',
    description: 'Guci porselen kecil berisi darah segar binatang buruan, katalis pengikat sumpah darah dan persembahan altar.'
  },
  {
    name: 'Botol Darah Iblis Murni',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['blood_vial', 'blood', 'tribute_item'],
    basePrice: 120,
    priceCurrency: 'copper',
    description: 'Darah merah kehitaman kental dari keturunan iblis liang neraka, bahan penempa Panji Ruh Sembilan Alam.'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 9. KANTUNG RACUN & RACUN MINUM (MYRIAD VENOM TIER 1–5)
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: 'Kantung Racun Ular Rawa',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['venom_sac', 'poison', 'venom_item'],
    basePrice: 20,
    priceCurrency: 'copper',
    description: 'Kantung lendir kehijauan berbau busuk dari taring ular rawa, katalis pembuka jalur Seribu Racun Pemusnah.'
  },
  {
    name: 'Bisa Kalajengking Merah',
    category: 'consume',
    rank: 'Common',
    tier: 1,
    tags: ['venom_item', 'venom_sac', 'poison'],
    basePrice: 30,
    priceCurrency: 'copper',
    description: 'Cairan bisa pedas membakar tenggorokan untuk ditempa menjadi daya tahan racun internal pertama.'
  },
  {
    name: 'Bisa Ular Sanca Hitam',
    category: 'consume',
    rank: 'Uncommon',
    tier: 2,
    tags: ['venom_item', 'venom_sac', 'poison'],
    basePrice: 75,
    priceCurrency: 'copper',
    description: 'Cairan racun pekat pelumpuh saraf pernapasan, diserap untuk membentuk meridian racun tingkat dua.'
  },
  {
    name: 'Empedu Kodok Beracun Sembilan Warna',
    category: 'consume',
    rank: 'Rare',
    tier: 3,
    tags: ['venom_item', 'venom_sac', 'poison'],
    basePrice: 200,
    priceCurrency: 'copper',
    description: 'Empedu bercahaya aneka warna dari rawa racun purba, melatih daya tahan batin terhadap racun mematikan.'
  },
  {
    name: 'Ekstrak Racun Kelabang Seribu Kaki',
    category: 'consume',
    rank: 'Epic',
    tier: 4,
    tags: ['venom_item', 'venom_sac', 'poison'],
    basePrice: 500,
    priceCurrency: 'copper',
    description: 'Intisari racun pembusuk daging yang membuat tulang berderak, memperkuat resistensi racun hingga puncak tertinggi.'
  },
  {
    name: 'Tetesan Racun Kematian Dewa',
    category: 'consume',
    rank: 'Legendary',
    tier: 5,
    tags: ['venom_item', 'venom_sac', 'poison'],
    basePrice: 1500,
    priceCurrency: 'copper',
    description: 'Satu tetes racun legendaris yang konon sanggup meleburkan jiwa immortal dewa langit menjadi buih air rawa.'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 10. ITEM UPETI ALTAR ABYSS
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: 'Perkamen Darah Gelap',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['abyssal_scroll', 'tribute_item'],
    basePrice: 35,
    priceCurrency: 'copper',
    description: 'Lembaran kulit domba kering berlumur mantra darah purba, segel perjanjian iblis abyssal kurban darah.'
  },
  {
    name: 'Obsidian Jiwa Gelap',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['obsidian', 'tribute_item'],
    basePrice: 40,
    priceCurrency: 'copper',
    description: 'Batu kaca vulkanik hitam pekat pemikat arwah penasaran, persembahan favorit penguasa jurang abyss.'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 11. BATU YIN NETHER
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: 'Batu Yin Kuburan Tua',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['yin_stone', 'yin'],
    basePrice: 30,
    priceCurrency: 'copper',
    description: 'Bongkahan batu nisan lumutan dari kuburan kuno tak bernama yang merembeskan hawa dingin sedingin es kubur.'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 12. 8 PIL PENEROBOSAN DATA-DRIVEN (BREAKTHROUGH_PILL_CATALOG TIER 1–8)
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: 'Pil Pembersih Sumsum Fana',
    category: 'pill',
    rank: 'Common',
    tier: 1,
    tags: ['breakthrough_pill', 'pill'],
    usableInBattle: false,
    basePrice: 50,
    priceCurrency: 'copper',
    description: 'Pil pemurni sumsum dan meridian fana. Menjamin tingkat keberhasilan 95% untuk Major Breakthrough Rank 1 dan mencegah kehilangan Qi.'
  },
  {
    name: 'Pil Pembentukan Fondasi Sembilan Awan',
    category: 'pill',
    rank: 'Uncommon',
    tier: 2,
    tags: ['breakthrough_pill', 'pill'],
    usableInBattle: false,
    basePrice: 150,
    priceCurrency: 'copper',
    description: 'Pil berintikan hawa sembilan lapis awan murni. Menjamin tingkat keberhasilan 92% untuk Major Breakthrough Rank 2 dan mencegah kehilangan Qi.'
  },
  {
    name: 'Pil Inti Emas Sembilan Revolusi',
    category: 'pill',
    rank: 'Rare',
    tier: 3,
    tags: ['breakthrough_pill', 'pill'],
    usableInBattle: false,
    basePrice: 400,
    priceCurrency: 'copper',
    description: 'Pil pusaka emas berkilau sembilan pusaran. Menjamin tingkat keberhasilan 90% untuk Major Breakthrough Rank 3 dan mencegah kehilangan Qi.'
  },
  {
    name: 'Pil Kelahiran Roh Bayi Primordial',
    category: 'pill',
    rank: 'Epic',
    tier: 4,
    tags: ['breakthrough_pill', 'pill'],
    usableInBattle: false,
    basePrice: 1200,
    priceCurrency: 'copper',
    description: 'Pil intisari jiwa pembentuk Roh Primordial (Nascent Soul). Menjamin tingkat keberhasilan 88% untuk Major Breakthrough Rank 4 dan mencegah deviasi batin.'
  },
  {
    name: 'Pil Transformasi Jiwa Ilahi',
    category: 'pill',
    rank: 'Legendary',
    tier: 5,
    tags: ['breakthrough_pill', 'pill'],
    usableInBattle: false,
    basePrice: 3500,
    priceCurrency: 'copper',
    description: 'Pil surgawi pemurni kesadaran kosmis. Menjamin tingkat keberhasilan 86% untuk Major Breakthrough Rank 5 dan mencegah kehilangan Qi.'
  },
  {
    name: 'Pil Pembelah Kekosongan Void',
    category: 'pill',
    rank: 'Mythical',
    tier: 6,
    tags: ['breakthrough_pill', 'pill'],
    usableInBattle: false,
    basePrice: 10000,
    priceCurrency: 'copper',
    description: 'Pil bermaterikan serpihan ruang hampa semesta. Menjamin tingkat keberhasilan 85% untuk Major Breakthrough Rank 6 dan meredam amarah kehampaan.'
  },
  {
    name: 'Pil Penyeberang Petir Sembilan Kesengsaraan',
    category: 'pill',
    rank: 'Mythical',
    tier: 7,
    tags: ['breakthrough_pill', 'pill'],
    usableInBattle: false,
    basePrice: 30000,
    priceCurrency: 'copper',
    description: 'Pil penolak petir murka langit. Menjamin tingkat keberhasilan 85% untuk Major Breakthrough Rank 7 dan menyerap deviasi tribulasi langit.'
  },
  {
    name: 'Pil Kenaikan Abadi Nirwana',
    category: 'pill',
    rank: 'Mythical',
    tier: 8,
    tags: ['breakthrough_pill', 'pill'],
    usableInBattle: false,
    basePrice: 100000,
    priceCurrency: 'copper',
    description: 'Pil mahakarya langit tertinggi untuk melangkah menuju ranah keabadian sempurna. Menjamin tingkat keberhasilan 85% untuk Major Breakthrough Rank 8.'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 13. MAKHLUK SERANGGA GU DAPAT DIPASANG (GU CREATURES TIER 1–5)
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: 'Ulat Gu Sutra Emas',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['gu'],
    baseAtk: 5,
    baseDef: 3,
    basePrice: 80,
    priceCurrency: 'copper',
    description: 'Ulat Gu berkulit sutra emas yang bersarang di meridian lengan, memberikan bonus ATK +5 dan DEF +3.'
  },
  {
    name: 'Kumbang Gu Zirah Baja',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['gu'],
    baseAtk: 10,
    baseDef: 8,
    basePrice: 200,
    priceCurrency: 'copper',
    description: 'Kumbang bertanduk dengan cangkang baja sekeras perisai, memberikan bonus ATK +10 dan DEF +8.'
  },
  {
    name: 'Kala Gu Bayangan Hitam',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['gu'],
    baseAtk: 18,
    baseDef: 12,
    basePrice: 500,
    priceCurrency: 'copper',
    description: 'Kalajengking Gu bayangan yang bersembunyi di dantian bawah, memberikan bonus ATK +18 dan DEF +12.'
  },
  {
    name: 'Nyamuk Gu Penghisap Darah',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['gu'],
    baseAtk: 28,
    baseDef: 18,
    basePrice: 1500,
    priceCurrency: 'copper',
    description: 'Serangga Gu peminum intisari darah lawan, memberikan bonus ATK +28 dan DEF +18.'
  },
  {
    name: 'Ular Gu Kristal Sembilan Sayap',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['gu'],
    baseAtk: 45,
    baseDef: 30,
    basePrice: 4000,
    priceCurrency: 'copper',
    description: 'Makhluk Gu legendaris bertubuh kristal transparan bersayap sembilan, memberikan bonus ATK +45 dan DEF +30.'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 14. MATERIAL PAKAN SATWA / INFUSE ARTEFAK (FEED MATERIAL TIER 1–5)
  // ═══════════════════════════════════════════════════════════════════════
  {
    name: 'Biji Rumput Roh Rendah',
    category: 'material',
    rank: 'Common',
    tier: 1,
    tags: ['feed_material', 'material'],
    basePrice: 10,
    priceCurrency: 'copper',
    description: 'Biji-bijian tanaman obat fana beraroma harum, santapan bernutrisi untuk satwa roh dan pembersih artefak fana.'
  },
  {
    name: 'Kristal Embun Spiritual',
    category: 'material',
    rank: 'Uncommon',
    tier: 2,
    tags: ['feed_material', 'material'],
    basePrice: 30,
    priceCurrency: 'copper',
    description: 'Kristal air beku sarat intisari Qi bening, mempercepat pengisian esensi satwa roh dan artefak Tier 2.'
  },
  {
    name: 'Batu Giok Esensi Bintang',
    category: 'material',
    rank: 'Rare',
    tier: 3,
    tags: ['feed_material', 'material'],
    basePrice: 90,
    priceCurrency: 'copper',
    description: 'Batu giok berkilau pendar bintang malam hari, bahan infuse bermutu tinggi untuk artefak jiwa Tier 3.'
  },
  {
    name: 'Intisari Api Purba Langit',
    category: 'material',
    rank: 'Epic',
    tier: 4,
    tags: ['feed_material', 'material'],
    basePrice: 300,
    priceCurrency: 'copper',
    description: 'Gumpalan api roh yang tidak pernah padam di dalam guci porselen, pakan sakti satwa roh Tier 4.'
  },
  {
    name: 'Kristal Void Kekacauan Chaos',
    category: 'material',
    rank: 'Legendary',
    tier: 5,
    tags: ['feed_material', 'material'],
    basePrice: 1000,
    priceCurrency: 'copper',
    description: 'Batu kristal dari pusaran kehampaan ruang semesta, infuse sempurna bagi artefak dan satwa tingkat tinggi.'
  }
];

async function seedHardeningItems(guildId = DEFAULT_GUILD_ID) {
  let createdCount = 0;
  let updatedCount = 0;

  for (const itemData of HARDENING_ITEMS) {
    const docData = {
      ...itemData,
      guildId
    };

    const res = await Item.findOneAndUpdate(
      { guildId, name: itemData.name },
      { $set: docData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (res) {
      updatedCount++;
    } else {
      createdCount++;
    }
  }

  return { createdCount, updatedCount, totalItems: HARDENING_ITEMS.length };
}

// Eksekusi langsung jika dipanggil via CLI
if (require.main === module) {
  (async () => {
    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jianghu';
      console.log('[SEED-HARDENING] Menghubungkan ke MongoDB:', uri);
      await mongoose.connect(uri);

      const result = await seedHardeningItems();
      console.log(`[SEED-HARDENING] Sukses! Diproses ${result.totalItems} item penting sistem 15 Law.`);
      console.log(`[SEED-HARDENING] Database siap untuk seluruh alur pengujian & gameplay!`);

      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('[SEED-HARDENING] Gagal seeding item:', err);
      process.exit(1);
    }
  })();
}

module.exports = {
  HARDENING_ITEMS,
  seedHardeningItems
};
