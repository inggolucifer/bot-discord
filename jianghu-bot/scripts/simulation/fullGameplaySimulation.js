/**
 * scripts/simulation/fullGameplaySimulation.js
 * 
 * Skrip Simulasi Menyeluruh Bermain Web Jianghu Bot (Immortal-X)
 * - Menjelajahi peta makro & mikro-grid
 * - Masuk pemukiman, gedung, panorama interior, & fasilitas (Toko, Penginapan, Dermaga, Sekte, Gua)
 * - Berbelanja, menggunakan jimat/item, menguji profesi & minigame
 * - Melakukan pertarungan Battle Arena V2 turn-based
 * - Menjelajahi zona instans (Lembah Roh, Lingkaran Segel)
 * - Mengecek kesehatan halaman SSR Next.js (port 3000)
 * - Mencatat bug, celah, inkonsistensi, dan hal yang masih kurang
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../web-api/utils/jwtSecret');
const { connectDB } = require('../../config/database');
const Player = require('../../models/Player');
const Item = require('../../models/Item');
const InstancedZoneSession = require('../../models/InstancedZoneSession');
const BattleSession = require('../../models/BattleSession');
const Manual = require('../../models/Manual');

const API_BASE = 'http://localhost:3001/api';
const FRONTEND_BASE = 'http://localhost:3000';

const findings = {
  bugs: [],
  shortcomings: [],
  passedScenarios: []
};

function recordBug(scenario, description, details = null) {
  console.error(`❌ [BUG TERDETEKSI] [${scenario}]: ${description}`);
  findings.bugs.push({ scenario, description, details });
}

function recordShortcoming(scenario, description, details = null) {
  console.warn(`⚠️ [HAL MASIH KURANG] [${scenario}]: ${description}`);
  findings.shortcomings.push({ scenario, description, details });
}

function recordPass(scenario, description) {
  console.log(`✅ [PASS] [${scenario}]: ${description}`);
  findings.passedScenarios.push({ scenario, description });
}

async function requestApi(endpoint, options = {}, token = null) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = text;
    }
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
}

async function requestFrontend(pathUrl) {
  const url = `${FRONTEND_BASE}${pathUrl.startsWith('/') ? '' : '/'}${pathUrl}`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    return { status: res.status, ok: res.ok, length: text.length, textSnippet: text.slice(0, 300) };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
}

function createTokenForPlayer(player) {
  return jwt.sign(
    {
      id: player._id.toString(),
      userId: player.discordId,
      discordId: player.discordId,
      username: player.characterName,
      guildId: player.guildId || 'global'
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

async function runSimulation() {
  console.log('======================================================================');
  console.log('🎮 MEMULAI SIMULASI PENELUSURAN DUNIA & PERMAINAN JIANGHU (IMMORTAL-X)');
  console.log('======================================================================\n');

  await connectDB();

  // 1. Ambil Pemain Nyata dari Database
  console.log('--- 1. INVENTARISASI & PROFIL KARAKTER ---');
  const inggo = await Player.findOne({ characterName: 'Inggo' });
  const longzhi = await Player.findOne({ characterName: 'Longzhi' });

  if (!inggo || !longzhi) {
    throw new Error('Karakter uji tidak ditemukan di database.');
  }

  const tokenInggo = createTokenForPlayer(inggo);
  const tokenLongzhi = createTokenForPlayer(longzhi);

  // Tes Profil Inggo
  const profRes = await requestApi('/player/profile', { method: 'GET' }, tokenInggo);
  if (profRes.ok && profRes.data?.data) {
    const p = profRes.data.data;
    recordPass('Profil Karakter', `Profil '${p.characterName}' berhasil dimuat (Level ${p.level}, Stamina ${p.stamina || p.currentStamina})`);
    
    // Cek integer sanitization
    const currencies = p.currency || {};
    const hasFloat = Object.values(currencies).some(v => typeof v === 'number' && !Number.isInteger(v));
    if (hasFloat) {
      recordBug('Zero Decimal Policy', 'Ditemukan nilai mata uang yang bukan integer (pecahan/desimal)', currencies);
    } else {
      recordPass('Zero Decimal Policy', 'Semua saldo mata uang bulat utuh tanpa desimal');
    }
  } else {
    recordBug('Profil Karakter', `Gagal memuat profil Inggo: HTTP ${profRes.status}`, profRes.data);
  }

  // Tes Stats Karakter
  const statRes = await requestApi('/player/stats', { method: 'GET' }, tokenInggo);
  if (statRes.ok) {
    recordPass('Statistik Karakter (Lima Pilar)', 'Endpoint /player/stats berhasil memuat atribut tempur & kultivasi.');
  } else {
    recordShortcoming('Statistik Karakter', `Endpoint /player/stats merespons HTTP ${statRes.status}`, statRes.data);
  }

  // 2. Eksplorasi Spasial & Peta Dunia (Dusun Mata Air Jernih)
  console.log('\n--- 2. PENELUSURAN PETA & LANGKAH MIKRO-GRID ---');
  const nearbyRes = await requestApi(`/world/nearby?x=2401&y=2450`, { method: 'GET' }, tokenInggo);
  if (nearbyRes.ok) {
    recordPass('Sistem Sensor Spasial (/world/nearby)', `Sensor sekitar berhasil memuat entri (zones: ${nearbyRes.data?.zones?.length || 0})`);
  } else {
    recordBug('Sistem Sensor Spasial (/world/nearby)', `Endpoint /world/nearby merespons HTTP ${nearbyRes.status}`, nearbyRes.data);
  }

  // Pastikan posisi Inggo di (2401, 2450)
  inggo.gridPosition.tileX = 2401;
  inggo.gridPosition.tileY = 2450;
  await inggo.save();

  // Uji Step Move Inggo dari (2401, 2450) ke (2400, 2450) [Footprint Dusun Mata Air Jernih]
  const moveFootprintRes = await requestApi('/world/zone/step-move', {
    method: 'POST',
    body: JSON.stringify({
      waypoints: [{ x: 2400, y: 2450 }],
      zoneId: 'tianyuan_world_map'
    })
  }, tokenInggo);

  if (moveFootprintRes.ok) {
    const dt = moveFootprintRes.data;
    recordPass('Pergerakan Footprint Pemukiman', `Melangkah ke (2400, 2450) berhasil tanpa tertabrak tebing. Sisa stamina: ${dt.currentStamina}`);
    if (dt.settlementPrompt) {
      recordPass('Pemicu Dialog Masuk Pemukiman', `Pemicu dialog muncul: ${dt.settlementPrompt.name} (Tier ${dt.settlementPrompt.tier})`);
    } else {
      recordShortcoming('Pemicu Dialog Masuk Pemukiman', 'Melangkah di petak footprint pemukiman tidak menghasilkan settlementPrompt pada respons.');
    }
  } else {
    recordBug('Pergerakan Footprint Pemukiman', `Melangkah ke petak footprint pemukiman gagal/terblokir: ${moveFootprintRes.data?.error || moveFootprintRes.status}`, moveFootprintRes.data);
  }

  // Uji Pencegahan Desync: Lompat 2 petak langsung (ilegal)
  const illegalHopRes = await requestApi('/world/zone/step-move', {
    method: 'POST',
    body: JSON.stringify({
      waypoints: [{ x: 2400, y: 2452 }], // Lompat 2 tile
      zoneId: 'tianyuan_world_map'
    })
  }, tokenInggo);

  if (illegalHopRes.status === 409 || !illegalHopRes.ok) {
    recordPass('Anti-Cheat Pergerakan Spasial', 'Lompatan petak non-Chebyshev 1 ditolak secara tegas oleh server (409/400).');
  } else {
    recordBug('Anti-Cheat Pergerakan Spasial', 'Lompatan petak ilegal tidak ditolak oleh server!', illegalHopRes.data);
  }

  // 3. Masuk Bangunan & Panorama Interior Pemukiman
  console.log('\n--- 3. INTERIOR BANGUNAN & PANORAMA PEMUKIMAN ---');
  const panoRes = await requestApi('/world/settlement/Dusun%20Mata%20Air%20Jernih', { method: 'GET' }, tokenInggo);
  if (panoRes.ok && panoRes.data?.buildings) {
    const bldgs = panoRes.data.buildings;
    recordPass('Panorama Interior Pemukiman', `Panorama Dusun Mata Air Jernih berhasil dimuat (${bldgs.length} bangunan, ${panoRes.data.npcs?.length || 0} NPC)`);
    console.log(`   Bangunan tersedia: ${bldgs.map(b => b.name).join(', ')}`);
  } else {
    recordBug('Panorama Interior Pemukiman', `Gagal memuat panorama Dusun Mata Air Jernih: HTTP ${panoRes.status}`, panoRes.data);
  }

  // Uji Panorama Kota Besar (Desa Xingcun)
  const xingcunRes = await requestApi('/world/settlement/Desa%20Xingcun', { method: 'GET' }, tokenInggo);
  if (xingcunRes.ok) {
    recordPass('Panorama Kota/Desa Utama', `Desa Xingcun berhasil dimuat (${xingcunRes.data.buildings?.length || 0} fasilitas)`);
  }

  // 4. Aktivitas Toko & Belanja
  console.log('\n--- 4. AKTIVITAS TOKO, BELI BARANG, & INVENTARIS ---');
  const shopRes = await requestApi('/market/shop', { method: 'GET' }, tokenInggo);
  if (shopRes.ok && Array.isArray(shopRes.data?.data)) {
    const items = shopRes.data.data;
    recordPass('Katalog Toko Sistem', `Toko spiritual berhasil dimuat (${items.length} item aktif)`);
    
    // Beri Inggo ruang berat inventaris dan saldo perak/emas yang cukup
    await Player.updateOne(
      { _id: inggo._id },
      {
        $set: {
          currency: { copper: 1000, silver: 500, gold: 50, jade: 10, spirit: 100 },
          inventory: (inggo.inventory || []).slice(0, 2)
        }
      }
    );

    // Cari Jimat Pengusir Monster
    const charmItem = items.find(i => i.id === 'item_monster_repellent_charm' || i.name?.includes('Pengusir'));
    if (charmItem) {
      const buyRes = await requestApi('/market/shop/buy', {
        method: 'POST',
        body: JSON.stringify({ shopId: charmItem.id, quantity: 1 })
      }, tokenInggo);

      if (buyRes.ok) {
        recordPass('Transaksi Pembelian Toko', `Berhasil membeli 1x ${charmItem.name} seharga ${charmItem.price} ${charmItem.currency}!`);
      } else {
        recordBug('Transaksi Pembelian Toko', `Gagal membeli Jimat: ${buyRes.data?.error || buyRes.status}`, buyRes.data);
      }
    } else {
      recordShortcoming('Katalog Toko', 'Item Jimat Pengusir Monster tidak terdaftar di toko.');
    }
  } else {
    recordBug('Katalog Toko Sistem', `Gagal memuat katalog toko: HTTP ${shopRes.status}`, shopRes.data);
  }

  // 5. Uji Penginapan (Resting)
  console.log('\n--- 5. FASILITAS PENGINAPAN & PEMULIHAN STAMINA ---');
  await requestApi('/world/rest/cancel', { method: 'POST' }, tokenInggo);
  const restRes = await requestApi('/world/rest/start', {
    method: 'POST',
    body: JSON.stringify({ mode: 'open', hours: 1 })
  }, tokenInggo);

  if (restRes.ok) {
    recordPass('Penginapan / Istirahat', `Mulai istirahat di penginapan berhasil.`);
    await requestApi('/world/rest/cancel', { method: 'POST' }, tokenInggo);
  } else {
    recordShortcoming('Penginapan / Istirahat', `Endpoint /world/rest/start merespons HTTP ${restRes.status}: ${restRes.data?.error || JSON.stringify(restRes.data)}`);
  }

  // 6. Uji Dermaga & Penyeberangan Air
  console.log('\n--- 6. FASILITAS DERMAGA & PENYEBERANGAN AIR ---');
  const ferryRoutesRes = await requestApi('/ferry/routes', { method: 'GET' }, tokenInggo);
  if (ferryRoutesRes.ok && Array.isArray(ferryRoutesRes.data?.routes)) {
    const routes = ferryRoutesRes.data.routes;
    recordPass('Dermaga - Daftar Rute', `Berhasil memuat ${routes.length} rute penyeberangan air.`);
    if (routes.length > 0) {
      console.log(`   Rute sampel: ${routes[0].name} (${routes[0].from?.dockName} -> ${routes[0].to?.dockName})`);
    }
  } else {
    recordShortcoming('Dermaga - Daftar Rute', `Gagal memuat rute dermaga: HTTP ${ferryRoutesRes.status}`);
  }

  // 7. Uji Gua Purba / Labirin Dungeon
  console.log('\n--- 7. LABIRIN GUA PURBA (DUNGEON MAZE) ---');
  const dungEnterRes = await requestApi('/dungeon/enter', {
    method: 'POST',
    body: JSON.stringify({ rank: 'Rank_1_8x8', dungeonKey: 'ancient_mortal_cave' })
  }, tokenInggo);

  if (dungEnterRes.ok && dungEnterRes.data?.dungeon) {
    const dData = dungEnterRes.data.dungeon;
    recordPass('Masuk Gua Purba', `Berhasil memasuki labirin gua purba (Ukuran: ${dData.gridWidth}x${dData.gridHeight})`);
    
    // Cari tile lantai terbuka di sekitar pemain untuk melangkah
    const px = dData.playerPos?.x || 0;
    const py = dData.playerPos?.y || 0;
    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 }
    ];

    let moveSuccess = false;
    for (const dir of directions) {
      const nx = px + dir.dx;
      const ny = py + dir.dy;
      const targetTile = dData.tiles?.find(t => t.x === nx && t.y === ny);
      if (targetTile && targetTile.type !== 'wall') {
        const dungMoveRes = await requestApi('/dungeon/move', {
          method: 'POST',
          body: JSON.stringify(dir)
        }, tokenInggo);
        if (dungMoveRes.ok) {
          recordPass('Langkah di Gua Purba', `Berhasil melangkah ke (${nx}, ${ny}) di labirin gua!`);
          moveSuccess = true;
          break;
        }
      }
    }

    if (!moveSuccess) {
      recordShortcoming('Langkah di Gua Purba', 'Tidak menemukan petak lorong terbuka di sekitar posisi awal labirin.');
    }

    // Keluar gua
    await requestApi('/dungeon/exit', { method: 'POST' }, tokenInggo);
  } else {
    recordShortcoming('Masuk Gua Purba', `Gagal memasuki gua purba: HTTP ${dungEnterRes.status}`);
  }

  // 8. Uji Ujian Masuk Sekte
  console.log('\n--- 8. FASILITAS BALAI SEKTE & SELEKSI UJIAN ---');
  const sectListRes = await requestApi('/sect', { method: 'GET' }, tokenInggo);
  if (sectListRes.ok) {
    recordPass('Daftar Sekte Jianghu', 'Endpoint /sect berhasil dimuat.');
  } else {
    recordShortcoming('Daftar Sekte Jianghu', `Endpoint /sect merespons HTTP ${sectListRes.status}`);
  }

  // 9. Uji Pertarungan Spasial (Battle Arena V2)
  console.log('\n--- 9. PERTARUNGAN MEDAN TEMPUR SPASIAL (BATTLE ARENA V2) ---');
  // Pindahkan Longzhi tepat ke petak monster (2452, 2481)
  await Player.updateOne(
    { _id: longzhi._id },
    {
      $set: {
        gridPosition: {
          zoneId: 'tianyuan_world_map',
          tileX: 2452,
          tileY: 2481,
          interiorInstanceId: null
        },
        currentHp: 1000,
        maxHp: 1000,
        deathRecoveryUntil: null
      }
    }
  );

  const battleStartRes = await requestApi('/battle/start', {
    method: 'POST',
    body: JSON.stringify({
      targetType: 'monster',
      targetId: 'wolf_azure',
      zoneId: 'tianyuan_world_map',
      tileKey: '2452_2481'
    })
  }, tokenLongzhi);

  if (battleStartRes.ok && battleStartRes.data?.battleId) {
    const bId = battleStartRes.data.battleId;
    const session = battleStartRes.data.session || {};
    recordPass('Inisiasi Pertarungan (POST /battle/start)', `Pertarungan dimulai melawan ${session.enemies?.[0]?.name || 'Monster'} (Battle ID: ${bId})`);
    
    // Periksa jurus yang tersedia (Basic Attack Adaptif)
    const playerEntity = session.player || session.entities?.find(e => e.entityId === session.playerId || e.isPlayer);
    const skills = playerEntity?.skills || [];
    console.log(`   Jurus pemain tersedia: ${skills.map(s => s.name).join(', ') || 'Hanya basic attack'}`);

    if (skills.length > 0 && (skills[0].id === 'basic_attack' || skills[0].skillId === 'basic_attack')) {
      recordPass('Basic Attack Adaptif (Slot 1)', `Slot 1 adalah basic attack teradaptasi: '${skills[0].name}' (${skills[0].kungfuDiscipline || 'fist'})`);
    } else {
      recordShortcoming('Basic Attack Adaptif', 'Slot 1 tidak memuat basic attack beradaptasi.');
    }

    // Jalankan satu ronde serangan
    const targetEnemyId = session.enemies?.[0]?.entityId;
    const actionRes = await requestApi(`/battle/action/${bId}`, {
      method: 'POST',
      body: JSON.stringify({
        actionType: 'skill',
        skillId: 'basic_attack',
        targetEntityId: targetEnemyId
      })
    }, tokenLongzhi);

    if (actionRes.ok) {
      recordPass('Siklus Ronde Tempur (Immediate Round-Trip)', `Aksi ronde tempur berhasil dieksekusi secara instan! Sisa HP musuh: ${actionRes.data?.session?.enemies?.[0]?.currentHp}`);
    } else {
      recordBug('Siklus Ronde Tempur', `Aksi tempur gagal dieksekusi: ${actionRes.data?.error || actionRes.status}`, actionRes.data);
    }

    // Aksi kabur untuk menyelesaikan simulasi
    const runRes = await requestApi(`/battle/action/${bId}`, {
      method: 'POST',
      body: JSON.stringify({ actionType: 'run' })
    }, tokenLongzhi);

    if (runRes.ok) {
      recordPass('Aksi Kabur (RUN)', 'Berhasil melarikan diri dari pertarungan.');
    } else {
      recordShortcoming('Aksi Kabur', `Gagal melarikan diri: ${runRes.data?.error || runRes.status}`);
    }

    // Bersihkan sesi tempur aktif
    await BattleSession.deleteMany({ playerId: longzhi._id });
  } else {
    recordShortcoming('Inisiasi Pertarungan Spasial', `Gagal memulai pertarungan di (2452, 2481): HTTP ${battleStartRes.status}: ${battleStartRes.data?.error || JSON.stringify(battleStartRes.data)}`);
  }

  // 10. Uji Zona Instans (Lembah Roh)
  console.log('\n--- 10. EKSPEDISI ZONA INSTANS (V26) ---');
  // Pindahkan Inggo (Level 50, ranah mencukupi) ke lokasi Lembah Roh (3423, 4949)
  const origInggoPos = { ...inggo.gridPosition };
  const keyDoc = await Item.findOne({ itemKey: 'item_spirit_key' });
  const keySlot = keyDoc ? [{ itemId: keyDoc._id, quantity: 5 }] : [];
  
  await Player.updateOne(
    { _id: inggo._id },
    {
      $set: {
        gridPosition: { zoneId: 'tianyuan_world_map', tileX: 3423, tileY: 4949, interiorInstanceId: null },
        stamina: 100,
        currentStamina: 100,
        realm: 'Pembentukan Inti (Core Formation)',
        'systemCultivation.realm': 'Pembentukan Inti (Core Formation)'
      },
      $push: { inventory: { $each: keySlot } }
    }
  );

  // Pastikan tidak ada sesi lama menggantung
  await InstancedZoneSession.deleteMany({ playerId: inggo._id });

  const enterInstRes = await requestApi('/instanced-zones/enter', {
    method: 'POST',
    body: JSON.stringify({ zoneId: 'spirit_valley_godthunder_peaks_1' })
  }, tokenInggo);

  if (enterInstRes.ok && enterInstRes.data?.session) {
    recordPass('Masuk Zona Instans (POST /enter)', `Berhasil memasuki Lembah Roh! Tipe: ${enterInstRes.data.session.zoneType}, Ruangan: ${enterInstRes.data.session.rooms?.length}`);
    
    // Uji Step di zona instans
    const stepInstRes = await requestApi('/instanced-zones/step', {
      method: 'POST',
      body: JSON.stringify({ action: 'disarm_trap' })
    }, tokenInggo);

    if (stepInstRes.ok) {
      recordPass('Aksi Langkah Instans (POST /step)', 'Aksi disarm_trap berhasil dieksekusi di zona instans.');
    } else {
      recordBug('Aksi Langkah Instans', `Gagal langkah instans: ${stepInstRes.data?.error || stepInstRes.status}`);
    }

    // Bersihkan sesi aktif
    await InstancedZoneSession.deleteMany({ playerId: inggo._id });
  } else {
    recordBug('Masuk Zona Instans', `Gagal memasuki zona instans: ${enterInstRes.data?.error || enterInstRes.status}`, enterInstRes.data);
  }

  // Pulihkan posisi Inggo
  await Player.updateOne(
    { _id: inggo._id },
    { $set: { gridPosition: origInggoPos } }
  );

  // 11. Uji Halaman Frontend Next.js (SSR / HTTP Port 3000)
  console.log('\n--- 11. PEMERIKSAAN KESEHATAN HALAMAN FRONTEND (PORT 3000) ---');
  const pagesToTest = [
    '/',
    '/character',
    '/profile',
    '/world',
    '/inventory',
    '/skills',
    '/cultivation',
    '/market',
    '/barter',
    '/sect',
    '/sect-arena',
    '/daily-hub',
    '/almanack',
    '/pet',
    '/marriage',
    '/professions'
  ];

  for (const page of pagesToTest) {
    const pageRes = await requestFrontend(page);
    if (pageRes.ok) {
      recordPass(`Frontend Page (${page})`, `Status 200 OK (${pageRes.length} bytes)`);
    } else {
      recordBug(`Frontend Page (${page})`, `Gagal merender halaman: HTTP ${pageRes.status} / ${pageRes.error || ''}`);
    }
  }

  // 12. Pengujian Interaktif Fasilitas Pemukiman & Rest (Settlement Facilities V26)
  console.log('\n--- 12. PENGUJIAN FASILITAS PEMUKIMAN & SINKRONISASI GAMEPLAY ---');

  // Pastikan pemain punya cukup koin perak untuk berbelanja fasilitas
  await Player.updateOne(
    { _id: inggo._id },
    { $set: { 'currency.silver': 1000, 'extendedStats.vitality': 50, 'extendedStats.mood': 50 } }
  );

  // 12.1 Kandang Kuda (Courier Stables)
  const stablesBuyHorse = await requestApi('/world/facility/stables/buy', {
    method: 'POST',
    body: JSON.stringify({ itemKey: 'item_horse_jianghu', quantity: 1 })
  }, tokenInggo);

  if (stablesBuyHorse.data?.ok) {
    recordPass('Kandang Kuda: Beli Kuda Jinak', stablesBuyHorse.data.message);
  } else {
    recordBug('Kandang Kuda: Beli Kuda Jinak', `Gagal membeli kuda: ${stablesBuyHorse.data?.error}`);
  }

  const stablesBuyFodder = await requestApi('/world/facility/stables/buy', {
    method: 'POST',
    body: JSON.stringify({ itemKey: 'item_horse_fodder', quantity: 5 })
  }, tokenInggo);

  if (stablesBuyFodder.data?.ok) {
    recordPass('Kandang Kuda: Beli Pakan Kuda (5x)', stablesBuyFodder.data.message);
  } else {
    recordBug('Kandang Kuda: Beli Pakan Kuda', `Gagal membeli pakan: ${stablesBuyFodder.data?.error}`);
  }

  // 12.2 Paviliun Kitab (Manual Pavilion)
  const manualListRes = await requestApi('/world/facility/manual-pavilion/list', {
    method: 'GET'
  }, tokenInggo);

  if (manualListRes.data?.ok && Array.isArray(manualListRes.data?.manuals) && manualListRes.data.manuals.length >= 4) {
    recordPass('Paviliun Kitab: Ambil Katalog', `Ditemukan ${manualListRes.data.manuals.length} manual.`);
  } else {
    recordBug('Paviliun Kitab: Ambil Katalog', `Gagal memuat katalog: ${manualListRes.data?.error}`);
  }

  const anginDoc = await Manual.findOne({ name: 'Kitab Langkah Angin' });
  if (anginDoc) {
    await Player.updateOne(
      { _id: inggo._id },
      { $pull: { manuals: { manualId: anginDoc._id } } }
    );
  }

  const learnManualRes = await requestApi('/world/facility/manual-pavilion/learn', {
    method: 'POST',
    body: JSON.stringify({ manualName: 'Kitab Langkah Angin' })
  }, tokenInggo);

  if (learnManualRes.data?.ok) {
    recordPass('Paviliun Kitab: Pelajari Manual', learnManualRes.data.message);
  } else {
    recordBug('Paviliun Kitab: Pelajari Manual', `Gagal mempelajari manual: ${learnManualRes.data?.error}`);
  }

  // 12.3 Bengkel (Workshop Repair)
  const workshopRepairRes = await requestApi('/world/facility/workshop/repair', {
    method: 'POST'
  }, tokenInggo);

  if (workshopRepairRes.data?.ok) {
    recordPass('Bengkel: Reparasi Perlengkapan', workshopRepairRes.data.message);
  } else {
    recordBug('Bengkel: Reparasi Perlengkapan', `Gagal reparasi: ${workshopRepairRes.data?.error}`);
  }

  // 12.4 Kedai (Tavern Dine & Rumors)
  const tavernDineRes = await requestApi('/world/facility/tavern/dine', {
    method: 'POST'
  }, tokenInggo);

  if (tavernDineRes.data?.ok) {
    recordPass('Kedai: Santap Makanan & Arak', tavernDineRes.data.message);
  } else {
    recordBug('Kedai: Santap Makanan & Arak', `Gagal santap hidangan: ${tavernDineRes.data?.error}`);
  }

  const tavernRumorsRes = await requestApi('/world/facility/tavern/rumors', {
    method: 'GET'
  }, tokenInggo);

  if (tavernRumorsRes.data?.ok && tavernRumorsRes.data?.rumor) {
    recordPass('Kedai: Dengar Gosip & Rumor', `Rumor: "${tavernRumorsRes.data.rumor}"`);
  } else {
    recordBug('Kedai: Dengar Gosip & Rumor', `Gagal mendengar rumor: ${tavernRumorsRes.data?.error}`);
  }

  // 12.5 Siklus Istirahat Penginapan (Inn Rest Lifecycle)
  const restStartRes = await requestApi('/world/rest/start', {
    method: 'POST',
    body: JSON.stringify({ mode: 'open', hours: 1 })
  }, tokenInggo);

  if (restStartRes.data?.rest) {
    recordPass('Penginapan: Mulai Istirahat (1 Jam)', `Status: ${restStartRes.data.rest.status}`);
  } else {
    recordBug('Penginapan: Mulai Istirahat', `Gagal istirahat: ${restStartRes.data?.error}`);
  }

  const restStatusRes = await requestApi('/world/rest/status', {
    method: 'GET'
  }, tokenInggo);

  if (restStatusRes.data?.rest && restStatusRes.data.rest.status === 'resting') {
    recordPass('Penginapan: Periksa Status Istirahat', `Mode: ${restStatusRes.data.rest.mode}, EndsAt: ${restStatusRes.data.rest.endsAt}`);
  } else {
    recordBug('Penginapan: Periksa Status Istirahat', 'Karakter tidak terdeteksi sedang beristirahat.');
  }

  const restCancelRes = await requestApi('/world/rest/cancel', {
    method: 'POST'
  }, tokenInggo);

  if (restCancelRes.status === 200) {
    recordPass('Penginapan: Bangun dari Tidur / Batalkan Istirahat', 'Berhasil bangun dan siap berpetualang kembali.');
  } else {
    recordBug('Penginapan: Bangun dari Tidur', `Gagal bangun: ${restCancelRes.data?.error}`);
  }

  // 12.6 Verifikasi Dual ID & Adaptif Weapon Skill Battle Arena
  const InteractiveBattleService = require('../../services/InteractiveBattleService');
  const freshPlayerDoc = await Player.findById(inggo._id).populate('manuals.manualId');
  const skillsPool = InteractiveBattleService.formatPlayerSkills(freshPlayerDoc);

  if (skillsPool.length >= 1 && skillsPool[0].id === 'basic_attack' && skillsPool[0].skillId === 'basic_attack') {
    recordPass('Battle Arena: Format Basic Attack Adaptif', `Slot 1: ${skillsPool[0].name} (id='${skillsPool[0].id}', skillId='${skillsPool[0].skillId}'). Total Jurus Aktif: ${skillsPool.length}.`);
  } else {
    recordBug('Battle Arena: Format Basic Attack Adaptif', `Format skill tidak valid: ${JSON.stringify(skillsPool[0])}`);
  }

  // LAPORAN AKHIR
  console.log('\n======================================================================');
  console.log('📊 RINGKASAN HASIL SIMULASI & AUDIT PERMAINAN');
  console.log('======================================================================');
  console.log(`✅ Skenario Lulus: ${findings.passedScenarios.length}`);
  console.log(`❌ Bug Terdeteksi: ${findings.bugs.length}`);
  console.log(`⚠️  Hal Masih Kurang: ${findings.shortcomings.length}`);
  console.log('======================================================================');

  if (findings.bugs.length > 0) {
    console.log('\nDAFTAR BUG:');
    findings.bugs.forEach((b, i) => {
      console.log(`${i + 1}. [${b.scenario}] ${b.description}`);
    });
  }

  if (findings.shortcomings.length > 0) {
    console.log('\nDAFTAR KEKURANGAN / HAL YANG MASIH KURANG:');
    findings.shortcomings.forEach((s, i) => {
      console.log(`${i + 1}. [${s.scenario}] ${s.description}`);
    });
  }

  process.exit(findings.bugs.length > 0 ? 1 : 0);
}

runSimulation().catch(err => {
  console.error('Fatal Simulation Crash:', err);
  process.exit(1);
});
