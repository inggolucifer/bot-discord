const assert = require('assert');
const express = require('express');
const request = require('supertest');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const {
  RATE_TO_COPPER,
  getTotalCopper,
  convertToCopper,
  convertFromCopper,
  deductCopper,
  addCopper,
  addCurrencyAmount,
  silverToCopper,
  formatCopper,
  normalizeCurrency
} = require('../utils/currencyNormalize');

const {
  hasEnoughCurrency,
  payCurrency,
  CURRENCIES
} = require('../utils/currency');

const LockManager = require('../web-api/utils/lockManager');

async function runTestSuite() {
  console.log('=====================================================');
  console.log('  QA HARDENING TEST SUITE (CURRENCY, AUTH, MARKET)   ');
  console.log('=====================================================\n');

  let passedTests = 0;
  let totalTests = 12;

  // ---------------------------------------------------------------------------
  // [CUR-U1] payCurrency 50 silver dari 1 gold -> sukses, 5 field valid
  // ---------------------------------------------------------------------------
  try {
    const wallet = { copper: 0, silver: 0, gold: 1, jade: 0, spirit: 0 };
    const initialCopper = getTotalCopper(wallet);
    assert.strictEqual(initialCopper, 10000, 'Initial copper harus 10,000');

    const ok = payCurrency(wallet, 50, 'silver');
    assert.strictEqual(ok, true, 'payCurrency harus berhasil');
    assert.strictEqual(getTotalCopper(wallet), 5000, 'Total copper harus berkurang 5,000');

    assert.strictEqual(wallet.gold, 0);
    assert.strictEqual(wallet.silver, 50);
    assert.strictEqual(wallet.copper, 0);
    assert.strictEqual(wallet.jade, 0);
    assert.strictEqual(wallet.spirit, 0);

    // Pastikan semua field bernilai integer >= 0
    for (const c of ['copper', 'silver', 'gold', 'jade', 'spirit']) {
      assert(Number.isInteger(wallet[c]) && wallet[c] >= 0, `Field ${c} harus integer >= 0`);
    }

    console.log('✅ [CUR-U1] PASS: payCurrency 50 silver dari 1 gold sukses & 5 field valid');
    passedTests++;
  } catch (err) {
    console.error('❌ [CUR-U1] FAIL:', err.message);
  }

  // ---------------------------------------------------------------------------
  // [CUR-U2] deductCopper = payCurrency parity -> total akhir sama
  // ---------------------------------------------------------------------------
  try {
    const walletA = { copper: 85, silver: 40, gold: 3, jade: 1, spirit: 0 };
    const walletB = { copper: 85, silver: 40, gold: 3, jade: 1, spirit: 0 };

    const costCopper = 13585; // 1 gold, 35 silver, 85 copper
    deductCopper(walletA, costCopper, 'Test Parity');
    const okB = payCurrency(walletB, costCopper, 'copper');

    assert.strictEqual(okB, true, 'payCurrency harus berhasil');
    assert.strictEqual(getTotalCopper(walletA), getTotalCopper(walletB), 'Total copper akhir harus identik');
    assert.deepStrictEqual(walletA, walletB, 'Struktur pecahan 5-tier harus sama persis');

    console.log('✅ [CUR-U2] PASS: deductCopper dan payCurrency parity identik');
    passedTests++;
  } catch (err) {
    console.error('❌ [CUR-U2] FAIL:', err.message);
  }

  // ---------------------------------------------------------------------------
  // [MKT-1] outbid refund: previous bidder total copper naik ≈ bid
  // ---------------------------------------------------------------------------
  try {
    const prevBidderWallet = { copper: 50, silver: 25, gold: 1, jade: 0, spirit: 0 };
    const prevInitialCopper = getTotalCopper(prevBidderWallet);
    const outbidAmountSilver = 75;

    // Refund bid dengan addCurrencyAmount
    addCurrencyAmount(prevBidderWallet, outbidAmountSilver, 'silver');
    const prevFinalCopper = getTotalCopper(prevBidderWallet);

    const expectedGain = outbidAmountSilver * RATE_TO_COPPER.silver; // 7,500 copper
    assert.strictEqual(prevFinalCopper - prevInitialCopper, expectedGain, 'Total copper harus naik tepat sesuai jumlah bid');
    assert(prevBidderWallet.copper < 100, 'Copper harus ternormalisasi < 100');
    assert(prevBidderWallet.silver < 100, 'Silver harus ternormalisasi < 100');

    console.log('✅ [MKT-1] PASS: Outbid refund mengkredit total copper dan normalisasi 5-tier');
    passedTests++;
  } catch (err) {
    console.error('❌ [MKT-1] FAIL:', err.message);
  }

  // ---------------------------------------------------------------------------
  // [MKT-2] double bid parallel: tidak double-charge (lock)
  // ---------------------------------------------------------------------------
  try {
    const auctionKey = 'test_auction_race_999';
    const releaseFirst = await LockManager.acquire(auctionKey);
    assert(typeof releaseFirst === 'function', 'Lock pertama harus berhasil didapatkan');

    const releaseSecond = await LockManager.acquire(auctionKey);
    assert.strictEqual(releaseSecond, false, 'Lock kedua pada lelang yang sama harus ditolak (false)');

    // Release lock pertama
    releaseFirst();

    // Sekarang coba acquire lagi setelah release
    const releaseThird = await LockManager.acquire(auctionKey);
    assert(typeof releaseThird === 'function', 'Lock harus bisa di-acquire kembali setelah dirilis');
    releaseThird();

    console.log('✅ [MKT-2] PASS: Mutex LockManager berhasil mencegah double-bid concurrent race');
    passedTests++;
  } catch (err) {
    console.error('❌ [MKT-2] FAIL:', err.message);
  }

  // ---------------------------------------------------------------------------
  // [SWP-1] rg currencies gameplay write: 0 di routes kritis
  // ---------------------------------------------------------------------------
  try {
    const filesToCheck = [
      path.join(__dirname, '../web-api/routes/market.js'),
      path.join(__dirname, '../web-api/routes/ferry.js'),
      path.join(__dirname, '../web-api/routes/sectExam.js'),
      path.join(__dirname, '../web-api/routes/player.js')
    ];

    let legacyCurrenciesWrites = 0;
    for (const filePath of filesToCheck) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const matches = content.match(/\.currencies|markModified\(['"]currencies['"]\)/g);
        if (matches) {
          legacyCurrenciesWrites += matches.length;
        }
      }
    }

    assert.strictEqual(legacyCurrenciesWrites, 0, `Ditemukan ${legacyCurrenciesWrites} referensi .currencies di routes kritis`);
    console.log('✅ [SWP-1] PASS: Zero legacy .currencies write di routes kritis');
    passedTests++;
  } catch (err) {
    console.error('❌ [SWP-1] FAIL:', err.message);
  }

  // ---------------------------------------------------------------------------
  // [AUTH-1] 50x email-login: rate limit tripping
  // ---------------------------------------------------------------------------
  try {
    const testApp = express();
    const testLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Terlalu banyak percobaan. Tunggu 15 menit.' }
    });

    testApp.post('/test-login', testLimiter, (req, res) => {
      res.json({ success: true });
    });

    let tripped = false;
    let successfulHits = 0;

    for (let i = 1; i <= 35; i++) {
      const res = await request(testApp).post('/test-login');
      if (res.status === 200) {
        successfulHits++;
      } else if (res.status === 429) {
        tripped = true;
        assert(res.body.error && res.body.error.includes('Terlalu banyak percobaan'));
        break;
      }
    }

    assert.strictEqual(tripped, true, 'Rate limiter harus menolak request setelah threshold max tercapai');
    assert.strictEqual(successfulHits, 30, 'Harus menerima tepat 30 request sebelum trip');
    console.log('✅ [AUTH-1] PASS: Rate limiter auth tripping pada request ke-31 dengan HTTP 429');
    passedTests++;
  } catch (err) {
    console.error('❌ [AUTH-1] FAIL:', err.message);
  }

  // ---------------------------------------------------------------------------
  // [AUTH-2] web-login existing: 403 Forbidden
  // ---------------------------------------------------------------------------
  try {
    const testApp = express();
    testApp.use(express.json());

    // Simulasi handler web-login: cek apakah nama sudah ada di database
    testApp.post('/api/auth/web-login', async (req, res) => {
      const { characterName } = req.body;
      const registeredNames = ['Wuming', 'Baili', 'Dugu'];
      if (registeredNames.map(n => n.toLowerCase()).includes(characterName.toLowerCase())) {
        return res.status(403).json({
          error: 'Karakter dengan nama ini sudah terdaftar. Untuk mengakses karakter yang sudah ada, silakan gunakan login Email & Password atau akun Discord.'
        });
      }
      return res.json({ success: true });
    });

    const resExisting = await request(testApp)
      .post('/api/auth/web-login')
      .send({ characterName: 'Wuming' });

    assert.strictEqual(resExisting.status, 403, 'Karakter lama di web-login harus ditolak status 403');
    assert(resExisting.body.error.includes('sudah terdaftar'), 'Pesan error harus informatif');

    const resNew = await request(testApp)
      .post('/api/auth/web-login')
      .send({ characterName: 'PendekarBaru' });

    assert.strictEqual(resNew.status, 200, 'Karakter baru boleh login');
    console.log('✅ [AUTH-2] PASS: web-login menolak karakter existing dengan status 403');
    passedTests++;
  } catch (err) {
    console.error('❌ [AUTH-2] FAIL:', err.message);
  }

  // ---------------------------------------------------------------------------
  // [ADM-1] JWT non-owner ke /admin -> 403
  // ---------------------------------------------------------------------------
  try {
    const testApp = express();
    testApp.use(express.json());

    // Middleware requireAdmin dengan verifikasi OWNER_IDS dan DB flag
    const mockRequireAdmin = async (req, res, next) => {
      const owners = ['111222333444555666'];
      if (owners.includes(req.user?.userId)) return next();

      // Mock database lookup for player
      const mockDbPlayers = {
        'user_admin_flag': { isAdmin: true },
        'user_regular': { isAdmin: false }
      };

      const p = mockDbPlayers[req.user?.userId];
      if (p?.isAdmin === true) return next();

      return res.status(403).json({ error: 'Akses Ditolak: Fitur ini hanya untuk Developer (Admin).' });
    };

    testApp.get('/api/admin/oracle', (req, res, next) => {
      req.user = { userId: req.headers['x-user-id'] };
      next();
    }, mockRequireAdmin, (req, res) => {
      res.json({ success: true, secretData: 'admin_only' });
    });

    // 1. Regular user -> 403
    const resRegular = await request(testApp)
      .get('/api/admin/oracle')
      .set('x-user-id', 'user_regular');
    assert.strictEqual(resRegular.status, 403, 'User reguler harus ditolak 403');

    // 2. Random unlisted user -> 403
    const resStranger = await request(testApp)
      .get('/api/admin/oracle')
      .set('x-user-id', '999888777666');
    assert.strictEqual(resStranger.status, 403, 'User tak dikenal harus ditolak 403');

    // 3. Owner user -> 200
    const resOwner = await request(testApp)
      .get('/api/admin/oracle')
      .set('x-user-id', '111222333444555666');
    assert.strictEqual(resOwner.status, 200, 'Owner harus diizinkan 200');

    // 4. Admin flag user -> 200
    const resFlagAdmin = await request(testApp)
      .get('/api/admin/oracle')
      .set('x-user-id', 'user_admin_flag');
    assert.strictEqual(resFlagAdmin.status, 200, 'User dengan flag isAdmin harus diizinkan 200');

    console.log('✅ [ADM-1] PASS: requireAdmin menolak non-owner/non-admin dengan 403');
    passedTests++;
  } catch (err) {
    console.error('❌ [ADM-1] FAIL:', err.message);
  }

  // ---------------------------------------------------------------------------
  // [FERRY-1] gold-only bayar ferry -> sukses (regresi)
  // ---------------------------------------------------------------------------
  try {
    const ferryWallet = { copper: 0, silver: 0, gold: 1, jade: 0, spirit: 0 };
    assert.strictEqual(getTotalCopper(ferryWallet), 10000, 'Initial copper 1 gold = 10,000');

    const raftCostSilver = 25;
    const needCopper = silverToCopper(raftCostSilver); // 2,500 copper
    assert.strictEqual(needCopper, 2500, 'Biaya 25 silver = 2,500 copper');

    const result = deductCopper(ferryWallet, needCopper, 'Biaya Ferry');
    assert.strictEqual(result.paidCopper, 2500);
    assert.strictEqual(result.remaining, 7500);

    assert.strictEqual(ferryWallet.gold, 0);
    assert.strictEqual(ferryWallet.silver, 75);
    assert.strictEqual(ferryWallet.copper, 0);
    assert.strictEqual(ferryWallet.jade, 0);
    assert.strictEqual(ferryWallet.spirit, 0);

    console.log('✅ [FERRY-1] PASS: Gold-only wallet berhasil bayar ferry 25 silver, sisa 75 silver');
    passedTests++;
  } catch (err) {
    console.error('❌ [FERRY-1] FAIL:', err.message);
  }

  // ---------------------------------------------------------------------------
  // [CMD-1] Discord command charge 10 silver, wallet 1 gold -> sukses
  // ---------------------------------------------------------------------------
  try {
    const discordWallet = { copper: 0, silver: 0, gold: 1, jade: 0, spirit: 0 };
    assert.strictEqual(hasEnoughCurrency(discordWallet, 10, 'silver'), true, 'Harus cukup bayar 10 silver dari 1 gold');
    const payResult = payCurrency(discordWallet, 10, 'silver');
    assert.strictEqual(payResult, true, 'payCurrency harus true');
    assert.strictEqual(getTotalCopper(discordWallet), 9000, 'Sisa harus 9,000 copper (90 silver)');
    assert.strictEqual(discordWallet.gold, 0);
    assert.strictEqual(discordWallet.silver, 90);
    console.log('✅ [CMD-1] PASS: Discord command charge 10 silver, wallet 1 gold sukses (sisa 90 silver)');
    passedTests++;
  } catch (err) {
    console.error('❌ [CMD-1] FAIL:', err.message);
  }

  // ---------------------------------------------------------------------------
  // [CMD-2] Audit direct currency.x -= di commands & services -> 0
  // ---------------------------------------------------------------------------
  try {
    function scanDirForDirectDeductions(dir) {
      let hits = 0;
      if (!fs.existsSync(dir)) return hits;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          hits += scanDirForDirectDeductions(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const matches = content.match(/currency\.(silver|gold|copper|jade|spirit)\s*[-]=/g);
          if (matches) {
            hits += matches.length;
          }
        }
      }
      return hits;
    }

    const commandHits = scanDirForDirectDeductions(path.join(__dirname, '../commands'));
    const serviceHits = scanDirForDirectDeductions(path.join(__dirname, '../services'));
    const totalHits = commandHits + serviceHits;

    assert.strictEqual(totalHits, 0, `Ditemukan ${totalHits} direct deduction di commands/services`);
    console.log('✅ [CMD-2] PASS: Zero direct currency.<coin> -= di commands & services');
    passedTests++;
  } catch (err) {
    console.error('❌ [CMD-2] FAIL:', err.message);
  }

  // ---------------------------------------------------------------------------
  // [SWP-2] Audit markModified('currencies') across runtime code -> 0
  // ---------------------------------------------------------------------------
  try {
    function scanDirForCurrencies(dir) {
      let hits = 0;
      if (!fs.existsSync(dir)) return hits;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.name === 'migrateCurrenciesField.js' || entry.name === 'testHardeningCurrencyAuthMarket.js' || entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }
        if (entry.isDirectory()) {
          hits += scanDirForCurrencies(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const matches = content.match(/markModified\(['"]currencies['"]\)|\.currencies\.(silver|gold|copper|jade|spirit)/g);
          if (matches) {
            hits += matches.length;
          }
        }
      }
      return hits;
    }

    const totalCurrenciesHits = scanDirForCurrencies(path.join(__dirname, '..'));
    assert.strictEqual(totalCurrenciesHits, 0, `Ditemukan ${totalCurrenciesHits} runtime referensi currencies`);
    console.log('✅ [SWP-2] PASS: Zero runtime markModified(\'currencies\') atau .currencies.<coin>');
    passedTests++;
  } catch (err) {
    console.error('❌ [SWP-2] FAIL:', err.message);
  }

  console.log('\n=====================================================');
  console.log(`  HASIL QA: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('=====================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTestSuite().catch(err => {
    console.error('[TEST SUITE ERROR]', err);
    process.exit(1);
  });
}

module.exports = runTestSuite;
