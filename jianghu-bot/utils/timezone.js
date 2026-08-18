// Semua fungsi terkait waktu WIB (Asia/Jakarta) dipusatkan di sini
const moment = require('moment-timezone');

const TZ = process.env.TZ_NAME || 'Asia/Jakarta';

/** Mengembalikan waktu sekarang dalam moment object di timezone WIB */
function nowWIB() {
  return moment().tz(TZ);
}

/** Cek apakah 2 Date sama-sama jatuh di HARI KALENDER WIB yang sama */
function isSameWIBDay(dateA, dateB) {
  if (!dateA || !dateB) return false;
  const a = moment(dateA).tz(TZ).format('YYYY-MM-DD');
  const b = moment(dateB).tz(TZ).format('YYYY-MM-DD');
  return a === b;
}

/** Cek apakah suatu tanggal (lastClaim) sudah "hari ini" di WIB (jadi TIDAK boleh claim lagi) */
function isClaimedToday(lastClaimDate) {
  if (!lastClaimDate) return false;
  return isSameWIBDay(lastClaimDate, new Date());
}

/** Format Date ke string yang enak dibaca, contoh: 14 Agustus 2026, 08:00 WIB */
function formatWIB(date) {
  if (!date) return '-';
  return moment(date).tz(TZ).format('DD MMMM YYYY, HH:mm') + ' WIB';
}

/** Hitung berapa lama lagi (ms) sampai jam 00:00 WIB besok, untuk info "reset dalam X jam" */
function msUntilNextResetWIB() {
  const now = nowWIB();
  const nextMidnight = now.clone().add(1, 'day').startOf('day');
  return nextMidnight.diff(now);
}

function formatDuration(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} jam ${minutes} menit`;
}

module.exports = { TZ, nowWIB, isSameWIBDay, isClaimedToday, formatWIB, msUntilNextResetWIB, formatDuration };
