/**
 * Journey Walkability Audit Script (V31 / F2)
 * Tests sample anchor paths across Jianghu to verify snapWalkable effectiveness.
 */

const fs = require('fs');
const path = require('path');
const { travelGraph } = require('../../utils/travelGraph');
const { toAnchorPath, buildJourney, positionAt } = require('../../utils/npcJourney');
const { snapWalkable } = require('../../services/npcJourneyTick');
const { isTileWalkable } = require('../v28/lib/invariants');

const anchorsPath = path.resolve(__dirname, '../../world-data/anchors.json');
const anchors = JSON.parse(fs.readFileSync(anchorsPath, 'utf8'));
const anchorMap = Object.fromEntries(anchors.map(a => [a.id, a]));

let totalPoints = 0;
let rawNonWalkable = 0;
let okFalseCount = 0;

console.log('=== PEMERIKSAAN KELAYAKAN TITIK JALUR PERJALANAN (V31 F2) ===');
console.log(`Menguji sampel pasangan 52 anchor (i += 5, j += 9)...`);

const sampledPaths = [];

for (let i = 0; i < anchors.length; i += 5) {
  for (let j = 0; j < anchors.length; j += 9) {
    if (i === j) continue;
    const fromAnchor = anchors[i];
    const toAnchor = anchors[j];

    const rawPath = travelGraph.shortestPath(fromAnchor.name, toAnchor.name);
    const pathAnchors = toAnchorPath(rawPath, anchorMap);
    if (!pathAnchors || pathAnchors.length < 2) continue;

    const journey = buildJourney({
      pathAnchors,
      anchorMap,
      now: 1000000,
      tilesPerMinute: 10,
      maxTiles: 1200
    });
    if (!journey) continue;

    sampledPaths.push({ from: fromAnchor.name, to: toAnchor.name, journey });

    const totalDuration = journey.etaAt - journey.startedAt;

    // Sample points every 10% along path (0%, 10%, ..., 100%)
    for (let step = 0; step <= 10; step++) {
      const t = step / 10;
      const pointTime = journey.startedAt + t * totalDuration;
      const rawPos = positionAt(journey, pointTime);
      if (!rawPos) continue;

      totalPoints++;
      const isRawWalkable = isTileWalkable(rawPos.x, rawPos.y);
      if (!isRawWalkable) {
        rawNonWalkable++;
      }

      const snap = snapWalkable(rawPos.x, rawPos.y, isTileWalkable);
      if (snap.ok === false) {
        okFalseCount++;
      }
    }
  }
}

const rawFailPercent = totalPoints > 0 ? ((rawNonWalkable / totalPoints) * 100).toFixed(2) : '0.00';
const okFalsePercent = totalPoints > 0 ? ((okFalseCount / totalPoints) * 100).toFixed(2) : '0.00';

const report = [
  '=== HASIL AUDIT WALKABILITY TITIK PERJALANAN NPC (V31 F2) ===',
  `Jumlah Rute Sampel Teruji: ${sampledPaths.length}`,
  `Total Titik Jalur Dievaluasi: ${totalPoints}`,
  `Jumlah Titik Non-Walkable Sebelum Snap: ${rawNonWalkable} (${rawFailPercent}%)`,
  `Jumlah Titik ok:false Setelah Snap (Radius 40): ${okFalseCount} (${okFalsePercent}%)`,
  `Status Ambang Batas (<= 1%): ${Number(okFalsePercent) <= 1.0 ? 'PASSED (LOLOS)' : 'FAILED (GAGAL)'}`
].join('\n');

console.log(report);

const outDir = path.resolve(__dirname, '../../review/v31_raw');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'f2_walkability.txt'), report + '\n');
