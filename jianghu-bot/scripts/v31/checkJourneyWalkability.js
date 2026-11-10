/**
 * Journey Walkability Audit Script (V31 / F2)
 * Evaluates both the standard sample (i += 5, j += 9) and the full 2-hop anchor census
 * to measure snapWalkable effectiveness honestly.
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

function evaluatePairs({ stepI = 1, stepJ = 1, maxHops = Infinity, maxTiles = 1200 }) {
  let routeCount = 0;
  let totalPoints = 0;
  let rawNonWalkable = 0;
  let okFalseCount = 0;
  const routeFails = {};

  for (let i = 0; i < anchors.length; i += stepI) {
    for (let j = 0; j < anchors.length; j += stepJ) {
      if (i === j) continue;
      const fromAnchor = anchors[i];
      const toAnchor = anchors[j];

      const rawPath = travelGraph.shortestPath(fromAnchor.name, toAnchor.name);
      const pathAnchors = toAnchorPath(rawPath, anchorMap);
      if (!pathAnchors || pathAnchors.length < 2) continue;
      if (pathAnchors.length - 1 > maxHops) continue;

      const journey = buildJourney({
        pathAnchors,
        anchorMap,
        now: 1000000,
        tilesPerMinute: 10,
        maxTiles
      });
      if (!journey) continue;

      routeCount++;
      const totalDuration = journey.etaAt - journey.startedAt;

      for (let step = 0; step <= 10; step++) {
        const pointTime = journey.startedAt + (step / 10) * totalDuration;
        const rawPos = positionAt(journey, pointTime);
        if (!rawPos) continue;

        totalPoints++;
        if (!isTileWalkable(rawPos.x, rawPos.y)) {
          rawNonWalkable++;
          const snap = snapWalkable(rawPos.x, rawPos.y, isTileWalkable);
          if (snap.ok === false) {
            okFalseCount++;
            const key = `${fromAnchor.name} -> ${toAnchor.name}`;
            routeFails[key] = (routeFails[key] || 0) + 1;
          }
        }
      }
    }
  }

  const rawPct = totalPoints > 0 ? ((rawNonWalkable / totalPoints) * 100).toFixed(2) : '0.00';
  const okFalsePct = totalPoints > 0 ? ((okFalseCount / totalPoints) * 100).toFixed(2) : '0.00';
  const topFails = Object.entries(routeFails)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([r, c]) => `  - ${r}: ${c} titik ok:false`);

  return { routeCount, totalPoints, rawNonWalkable, rawPct, okFalseCount, okFalsePct, topFails };
}

const sample = evaluatePairs({ stepI: 5, stepJ: 9, maxHops: Infinity, maxTiles: 1200 });
const census = evaluatePairs({ stepI: 1, stepJ: 1, maxHops: 2, maxTiles: 900 });

const report = [
  '=== HASIL AUDIT WALKABILITY TITIK PERJALANAN NPC (V31 F2) ===',
  '',
  '[1] Sampel Standar Audit (i += 5, j += 9):',
  `Jumlah Rute Sampel Teruji: ${sample.routeCount}`,
  `Total Titik Jalur Dievaluasi: ${sample.totalPoints}`,
  `Jumlah Titik Non-Walkable Sebelum Snap: ${sample.rawNonWalkable} (${sample.rawPct}%)`,
  `Jumlah Titik ok:false Setelah Snap (Radius 40): ${sample.okFalseCount} (${sample.okFalsePct}%)`,
  `Status Ambang Batas (<= 1%): ${Number(sample.okFalsePct) <= 1.0 ? 'PASSED (LOLOS)' : 'FAILED (GAGAL)'}`,
  '',
  '[2] Sensus Lengkap Seluruh Rute Aktif <= 2 Hop & <= 900 Tile:',
  `Jumlah Rute 2-Hop Valid: ${census.routeCount}`,
  `Total Titik Jalur Dievaluasi: ${census.totalPoints}`,
  `Jumlah Titik Non-Walkable Sebelum Snap: ${census.rawNonWalkable} (${census.rawPct}%)`,
  `Jumlah Titik ok:false Setelah Snap (Radius 40): ${census.okFalseCount} (${census.okFalsePct}%)`,
  'Rute Teratas Penyumbang ok:false (Diblokir oleh guard runJourneyTick):',
  ...census.topFails
].join('\n');

console.log(report);

const outDir = path.resolve(__dirname, '../../review/v31_raw');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'f2_walkability.txt'), report + '\n');
