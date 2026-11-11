/**
 * Full Anchor-Pair Route Walkability Census (V32 F4)
 * Evaluates ALL ordered anchor pairs using travelGraph (name keys), toAnchorPath,
 * island ban, and buildJourney(..., routeFn: defaultRouteFn).
 * Samples every leg at 0%, 10%, ..., 100% and runs snapWalkable(radius 40).
 * Exits with code 1 if ok:false exceeds 1.0%.
 */

const fs = require('fs');
const path = require('path');
const { travelGraph } = require('../../utils/travelGraph');
const { toAnchorPath, buildJourney } = require('../../utils/npcJourney');
const { defaultRouteFn, loadRouteData } = require('../../utils/npcRoute');
const { snapWalkable } = require('../../services/npcJourneyTick');
const { isTileWalkable, createCachedWalkableFn, validateJourneyV19 } = require('../v28/lib/invariants');

const anchorsPath = path.resolve(__dirname, '../../world-data/anchors.json');
const anchors = JSON.parse(fs.readFileSync(anchorsPath, 'utf8'));
const anchorMap = Object.fromEntries(anchors.map((a) => [a.id, a]));
const { barriers, passes } = loadRouteData();
const cachedIsTileWalkable = createCachedWalkableFn(isTileWalkable);

function pathBarriersInvolved(pathAnchors) {
  const involved = [];
  for (const aid of pathAnchors) {
    const a = anchorMap[aid];
    if (!a) continue;
    for (const b of barriers) {
      if (a.x > b.bounds.minX && a.x < b.bounds.maxX && a.y > b.bounds.minY && a.y < b.bounds.maxY) {
        involved.push({ aid, barrierId: b.id });
      }
    }
  }
  return involved;
}

function runCensus() {
  let attemptedRoutes = 0;
  let acceptedRoutes = 0;
  let rejectedNoPath = 0;
  let rejectedIsland = 0;
  let rejectedBlocked = 0;
  let rejectedOver900 = 0;

  let totalPoints = 0;
  let rawNonWalkable = 0;
  let okFalseCount = 0;
  let okFalseByBarrierInterior = 0;
  let okFalseByTerrain = 0;
  let v19Violations = 0;
  const routeFails = {};

  for (let i = 0; i < anchors.length; i++) {
    for (let j = 0; j < anchors.length; j++) {
      if (i === j) continue;
      attemptedRoutes++;

      const fromAnchor = anchors[i];
      const toAnchor = anchors[j];

      const rawPath = travelGraph.shortestPath(fromAnchor.name, toAnchor.name);
      const pathAnchors = toAnchorPath(rawPath, anchorMap);
      if (!pathAnchors || pathAnchors.length < 2) {
        rejectedNoPath++;
        continue;
      }

      if (pathAnchors.some((aid) => anchorMap[aid]?.type === 'island')) {
        rejectedIsland++;
        continue;
      }

      const unbounded = buildJourney({
        pathAnchors,
        anchorMap,
        now: 1000000,
        tilesPerMinute: 10,
        maxTiles: Infinity,
        routeFn: defaultRouteFn
      });

      if (!unbounded) {
        rejectedBlocked++;
        continue;
      }

      if (unbounded.totalTiles > 900) {
        rejectedOver900++;
        continue;
      }

      acceptedRoutes++;
      v19Violations += validateJourneyV19(`${fromAnchor.id}->${toAnchor.id}`, unbounded, barriers).length;
      for (const leg of unbounded.legs) {
        for (let step = 0; step <= 10; step++) {
          const t = step / 10;
          const x = Math.round(leg.ax + (leg.bx - leg.ax) * t);
          const y = Math.round(leg.ay + (leg.by - leg.ay) * t);

          totalPoints++;
          if (!cachedIsTileWalkable(x, y)) {
            rawNonWalkable++;
            const snap = snapWalkable(x, y, cachedIsTileWalkable);
            if (!snap.ok) {
              okFalseCount++;
              const routeKey = `${fromAnchor.id} -> ${toAnchor.id}`;
              if (!routeFails[routeKey]) {
                const involved = pathBarriersInvolved(pathAnchors);
                const hasInterior = involved.length > 0;
                const endpointMatch = involved.some((e) => e.aid === fromAnchor.id || e.aid === toAnchor.id);
                const barrierList = [...new Set(involved.map((e) => e.barrierId))].join(',');
                const roleLabel = endpointMatch ? 'endpoint' : 'transit';
                const cause = hasInterior
                  ? `${roleLabel} di dalam barrier (${barrierList})`
                  : 'medan padat di luar radius snap 40';
                routeFails[routeKey] = { count: 0, cause, hasInterior };
              }
              routeFails[routeKey].count++;
              if (routeFails[routeKey].hasInterior) {
                okFalseByBarrierInterior++;
              } else {
                okFalseByTerrain++;
              }
            }
          }
        }
      }
    }
  }

  const totalRejected = rejectedNoPath + rejectedIsland + rejectedBlocked + rejectedOver900;
  const rawPct = totalPoints > 0 ? ((rawNonWalkable / totalPoints) * 100).toFixed(2) : '0.00';
  const okFalsePctNum = totalPoints > 0 ? (okFalseCount / totalPoints) * 100 : 0;
  const okFalsePct = okFalsePctNum.toFixed(2);

  const topFails = Object.entries(routeFails)
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([route, info], idx) => `  ${idx + 1}. ${route}: ${info.count} titik ok:false (${info.cause})`);

  const passCheck = passes.map((p) => {
    const ok = cachedIsTileWalkable(p.x, p.y);
    return { id: p.id, barrierId: p.barrierId, x: p.x, y: p.y, walkable: ok };
  });
  const blockedPasses = passCheck.filter((p) => !p.walkable);

  const report = [
    '=== SENSUS PENUH WALKABILITY RUTE ANTAR-ANCHOR (V32 F4) ===',
    `Jumlah Pasangan Anchor Dicoba (All-Pairs): ${attemptedRoutes}`,
    `Jumlah Rute Diterima (Valid & <= 900 tile): ${acceptedRoutes}`,
    `Jumlah Rute Ditolak Total: ${totalRejected}`,
    `  - Tidak ada jalur / < 2 anchor: ${rejectedNoPath}`,
    `  - Larangan pulau (island tujuan/transit): ${rejectedIsland}`,
    `  - Diblokir barrier tanpa celah / kedalaman > 3: ${rejectedBlocked}`,
    `  - Jarak setelah detour > 900 tile: ${rejectedOver900}`,
    `Total Titik Leg Dievaluasi (tiap 10% per leg): ${totalPoints}`,
    `Titik Non-Walkable Sebelum Snap: ${rawNonWalkable} (${rawPct}%)`,
    `Titik ok:false Setelah Snap (Radius 40): ${okFalseCount} (${okFalsePct}%)`,
    `  - Dari anchor endpoint/transit di dalam bounds barrier: ${okFalseByBarrierInterior}`,
    `  - Dari medan padat murni di luar bounds barrier: ${okFalseByTerrain}`,
    `Pelanggaran Invariant V19 pada ${acceptedRoutes} Rute Valid: ${v19Violations}`,
    `Status Walkability Celah Resmi (${passes.length - blockedPasses.length}/${passes.length} walkable): ${blockedPasses.length === 0 ? 'SEMUA WALKABLE' : blockedPasses.map((p) => `${p.id}(${p.x},${p.y})`).join(', ')}`,
    `Status Ambang Exit Skrip (<= 1.00%): ${okFalsePctNum <= 1.0 ? 'PASSED' : 'FAILED'} (Target Ideal <= 0.50%: ${okFalsePctNum <= 0.5 ? 'TERCAPAI' : 'BELUM TERCAPAI'})`,
    '',
    'Top 10 Rute Penyumbang ok:false Terbanyak:',
    ...(topFails.length > 0 ? topFails : ['  (tidak ada titik ok:false)'])
  ].join('\n');

  console.log(report);
  if (okFalsePctNum > 1.0) {
    process.exit(1);
  }
}

runCensus();
