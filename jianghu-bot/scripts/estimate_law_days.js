/**
 * ESTIMASI WAKTU PROGRESI 15 HUKUM SEMESTA (IMMORTAL-X)
 * 
 * Target Produk:
 * - Pemain rajin butuh ~24–36 bulan kalender nyata (700–1100 hari channeling murni)
 *   untuk mencapai Rank 8 / Ranah Puncak.
 * - Asumsi: 60 menit channel harian, stok esensi terpenuhi, pathMod 1.0.
 * 
 * Menjalankan skrip:
 * node jianghu-bot/scripts/estimate_law_days.js
 */

const {
  getQiRequired,
  getChannelQiRate,
  LAW_PROGRESSION
} = require('../utils/lawCultivationEngine');

function runProgressionEstimation() {
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('    IMMORTAL-X: ESTIMASI PROGRESI 15 HUKUM SEMESTA (TARGET 24–36 BULAN)       ');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  console.log('Parameter Engine:');
  console.log(`- BASE_QI_RANK0:          ${LAW_PROGRESSION.BASE_QI_RANK0}`);
  console.log(`- QI_RANK_GROWTH:         ${LAW_PROGRESSION.QI_RANK_GROWTH}`);
  console.log(`- CHANNEL_BASE_RATE:      ${LAW_PROGRESSION.CHANNEL_BASE_RATE} Qi/menit`);
  console.log(`- CHANNEL_RATE_GROWTH:    ${LAW_PROGRESSION.CHANNEL_RATE_GROWTH}`);
  console.log(`- BASE_CHANNEL_CAP_MINS:  ${LAW_PROGRESSION.BASE_CHANNEL_CAP_MINUTES} menit/hari\n`);

  console.log('┌──────┬─────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ Rank │ Total Qi (0..9) │ Rate (Qi/mnt)│ Days (60m/d) │ Bulan Kumul. │ Hari Kumul.  │');
  console.log('├──────┼─────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤');

  let cumulativeDays = 0;
  const rankStats = [];

  for (let r = 0; r <= 8; r++) {
    let rankQiTotal = 0;
    for (let s = 0; s <= 9; s++) {
      rankQiTotal += getQiRequired(r, s);
    }

    const rate = getChannelQiRate(r, 1.0);
    const minutesPerDay = LAW_PROGRESSION.BASE_CHANNEL_CAP_MINUTES || 60;
    const daysForRank = rankQiTotal / (rate * minutesPerDay);
    cumulativeDays += daysForRank;
    const cumulativeMonths = cumulativeDays / 30.417; // rata-rata hari per bulan

    rankStats.push({
      rank: r,
      rankQiTotal,
      rate,
      daysForRank,
      cumulativeDays,
      cumulativeMonths
    });

    const rankStr = `Rank ${r}`.padEnd(4);
    const qiStr = rankQiTotal.toLocaleString('id-ID').padStart(15);
    const rateStr = `${rate} Qi/m`.padStart(12);
    const daysStr = `${daysForRank.toFixed(1)} h`.padStart(12);
    const kumulBulanStr = `${cumulativeMonths.toFixed(1)} bln`.padStart(12);
    const kumulHariStr = `${cumulativeDays.toFixed(1)} h`.padStart(12);

    console.log(`│ ${rankStr} │ ${qiStr} │ ${rateStr} │ ${daysStr} │ ${kumulBulanStr} │ ${kumulHariStr} │`);
  }

  console.log('└──────┴─────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘\n');

  console.log('Ringkasan Akhir:');
  console.log(`- Total Hari Channel Murni (Rank 0..8): ${cumulativeDays.toFixed(1)} hari`);
  console.log(`- Total Bulan Kalender (Rank 0..8):     ${(cumulativeDays / 30.417).toFixed(1)} bulan (~${(cumulativeDays / 365.25).toFixed(2)} tahun)`);
  console.log(`- Target Rentang Hari [700, 1100]:      ${cumulativeDays >= 700 && cumulativeDays <= 1100 ? '✅ LULUS TARGET' : '❌ DI LUAR TARGET'}`);

  if (cumulativeDays < 700) {
    console.error('\n⚠️ PERINGATAN: Terlalu cepat (< 700 hari)! Tingkatkan QI_RANK_GROWTH atau turunkan CHANNEL_BASE_RATE.');
    process.exit(1);
  } else if (cumulativeDays > 1100) {
    console.error('\n⚠️ PERINGATAN: Terlalu lama (> 1100 hari)! Longgarkan QI_RANK_GROWTH atau naikkan CHANNEL_RATE_GROWTH.');
    process.exit(1);
  } else {
    console.log('\n🎉 VALIDASI BERHASIL: Formula progresi selaras sempurna dengan target 24–36 bulan kalender!');
  }
}

if (require.main === module) {
  runProgressionEstimation();
}

module.exports = { runProgressionEstimation };
