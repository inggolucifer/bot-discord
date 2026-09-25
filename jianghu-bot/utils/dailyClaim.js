/**
 * Calendar day helpers in Asia/Jakarta (WIB, UTC+7).
 * Daily reset at 00:00 WIB.
 */

function getWibParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA → YYYY-MM-DD
  const parts = fmt.formatToParts(date);
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  return { y, m, d, key: `${y}-${m}-${d}` };
}

function isClaimedToday(lastClaim) {
  if (!lastClaim) return false;
  return getWibParts(new Date(lastClaim)).key === getWibParts(new Date()).key;
}

function isClaimedYesterday(lastClaim) {
  if (!lastClaim) return false;
  const lastKey = getWibParts(new Date(lastClaim)).key;
  // Yesterday in WIB: take "now", subtract 24h, format in WIB
  const yDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yKey = getWibParts(yDate).key;
  return lastKey === yKey;
}

module.exports = { getWibParts, isClaimedToday, isClaimedYesterday };
