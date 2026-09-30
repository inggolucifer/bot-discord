/**
 * ESTIMASI WAKTU PROGRESI 15 HUKUM SEMESTA (IMMORTAL-X)
 * 
 * Target Produk:
 * 1. Rank 0: WAJIB ~7 hari channeling rajin (onboarding cepat, mini-breakthrough harian).
 * 2. Total Rank 0..8: ~24–36 bulan (935 hari channeling efektif = ~2.56 tahun).
 * 
 * Menjalankan skrip:
 * node jianghu-bot/scripts/estimate_law_days.js
 */

const assert = require('assert');
const {
  getQiRequired,
  getChannelQiRate,
  getTotalQiForRank,
  LAW_PROGRESSION
} = require('../utils/lawCultivationEngine');

function runProgressionEstimation() {
  console.log('═════════════════════════════════════════════════════════════════════════════════════════════');
  console.log('    IMMORTAL-X: ESTIMASI PROGRESI 15 HUKUM SEMESTA (7 HARI RANK 0 + 2.5 TAHUN TOTAL)         ');
  console.log('═════════════════════════════════════════════════════════════════════════════════════════════\n');

  console.log('Parameter Engine:');
  console.log(`- BASE_CHANNEL_CAP_MINS:  ${LAW_PROGRESSION.BASE_CHANNEL_CAP_MINUTES} menit/hari`);
  console.log(`- CHANNEL_BASE_RATE_R0:   ${LAW_PROGRESSION.CHANNEL_BASE_RATE_RANK0} Qi/menit`);
  console.log(`- CHANNEL_RATE_GROWTH:    ${LAW_PROGRESSION.CHANNEL_RATE_GROWTH}x per rank`);
  console.log(`- RANK_TARGET_DAYS:       [${LAW_PROGRESSION.RANK_TARGET_DAYS.join(', ')}]\n`);

  console.log('┌──────┬─────────────┬──────────────┬─────────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ Rank │ Target Days │ Rate (Qi/m)  │ Total Qi (0..9) │ DaysRecomp.  │ Bulan Kumul. │ Hari Kumul.  │');
  console.log('├──────┼─────────────┼──────────────┼─────────────────┼──────────────┼──────────────┼──────────────┤');

  let cumulativeDays = 0;
  let rank0DaysRecomputed = 0;
  const cap = LAW_PROGRESSION.BASE_CHANNEL_CAP_MINUTES;

  for (let r = 0; r <= 8; r++) {
    let rankQiTotal = 0;
    for (let s = 0; s <= 9; s++) {
      rankQiTotal += getQiRequired(r, s);
    }

    const rate = getChannelQiRate(r, 1.0);
    const targetDays = LAW_PROGRESSION.RANK_TARGET_DAYS[r] || 280;
    const daysRecomputed = rankQiTotal / (rate * cap);

    if (r === 0) rank0DaysRecomputed = daysRecomputed;
    cumulativeDays += daysRecomputed;
    const cumulativeMonths = cumulativeDays / 30.417; // rata-rata hari per bulan

    const rankStr = `Rank ${r}`.padEnd(4);
    const targetStr = `${targetDays} h`.padStart(11);
    const rateStr = `${rate} Qi/m`.padStart(12);
    const qiStr = rankQiTotal.toLocaleString('id-ID').padStart(15);
    const daysRecompStr = `${daysRecomputed.toFixed(2)} h`.padStart(12);
    const kumulBulanStr = `${cumulativeMonths.toFixed(1)} bln`.padStart(12);
    const kumulHariStr = `${cumulativeDays.toFixed(1)} h`.padStart(12);

    console.log(`│ ${rankStr} │ ${targetStr} │ ${rateStr} │ ${qiStr} │ ${daysRecompStr} │ ${kumulBulanStr} │ ${kumulHariStr} │`);
  }

  console.log('└──────┴─────────────┴──────────────┴─────────────────┴──────────────┴──────────────┴──────────────┘\n');

  console.log('Ringkasan Akhir:');
  console.log(`- Rank 0 Recomputed Days:               ${rank0DaysRecomputed.toFixed(2)} hari (Target: 6 - 8 hari)`);
  console.log(`- Total Hari Channeling (Rank 0..8):    ${cumulativeDays.toFixed(2)} hari (Target: 850 - 1100 hari)`);
  console.log(`- Total Bulan Kalender (Rank 0..8):     ${(cumulativeDays / 30.417).toFixed(1)} bulan (~${(cumulativeDays / 365.25).toFixed(2)} tahun)\n`);

  // Assertions
  assert(
    rank0DaysRecomputed >= 6 && rank0DaysRecomputed <= 8,
    `ASSERTION FAILED: Rank 0 daysRecomputed (${rank0DaysRecomputed.toFixed(2)}) harus ∈ [6, 8]!`
  );
  console.log('✅ ASSERTION LULUS: Rank 0 daysRecomputed ∈ [6, 8] (Tepat ~7 hari onboarding).');

  assert(
    cumulativeDays >= 850 && cumulativeDays <= 1100,
    `ASSERTION FAILED: Sum days (${cumulativeDays.toFixed(2)}) harus ∈ [850, 1100]!`
  );
  console.log('✅ ASSERTION LULUS: Sum days ∈ [850, 1100] (Tepat ~2.5 tahun real-time target).');

  console.log('\n🎉 SEMUA ASSERTION LULUS DENGAN SEMPURNA!\n');
}

if (require.main === module) {
  runProgressionEstimation();
}

module.exports = { runProgressionEstimation };
