/**
 * NPC Travel Simulation Engine (V30 + V31 Maximized)
 * Simulates 48 game hours (10-minute steps) across all 764 NPCs entirely in-memory,
 * interleaving daily schedules (with visiting exclusion) and real snapWalkable checks.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const snapshotPath = path.join(rootDir, 'world-data/npc-ecosystem-snapshot-v27.json');
const anchorsPath = path.join(rootDir, 'world-data/anchors.json');

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const anchors = JSON.parse(fs.readFileSync(anchorsPath, 'utf8'));

const anchorMap = {};
for (const a of anchors) {
  anchorMap[a.id] = a;
}

const { travelGraph } = require(path.join(rootDir, 'utils/travelGraph'));
const { buildJourney, positionAt } = require(path.join(rootDir, 'utils/npcJourney'));
const { defaultRouteFn } = require(path.join(rootDir, 'utils/npcRoute'));
const { chooseDestination, planReturnHome } = require(path.join(rootDir, 'services/npcWanderPlanner'));
const { snapWalkable } = require(path.join(rootDir, 'services/npcJourneyTick'));
const { evaluateNpcSchedule } = require(path.join(rootDir, 'services/npcScheduler'));
const { isTileWalkable } = require(path.join(rootDir, 'scripts/v28/lib/invariants'));

const DAILY_HOME_STATES = new Set(['idle', 'socializing', 'working', 'sleeping', 'training', 'meditating']);

async function simulate() {
  console.log(`[SimulateNpcTravel] Initializing 48-hour simulation for ${snapshot.npcs.length} NPCs...`);

  const simNpcs = snapshot.npcs.map(n => ({
    _id: n._id || n.id,
    name: n.name,
    vitalStatus: { ...n.vitalStatus },
    cultivation: { ...n.cultivation },
    tileX: n.tileX,
    tileY: n.tileY,
    schedule: {
      ...n.schedule,
      currentAnchorId: n.schedule?.currentAnchorId || n.schedule?.homeAnchorId || 'desa_xingcun',
      homeAnchorId: n.schedule?.homeAnchorId || n.schedule?.currentAnchorId || 'desa_xingcun',
      wanderLevel: n.schedule?.wanderLevel || 0,
      activityState: 'idle',
      lastJourneyDay: -1
    },
    attributes: { ...n.attributes },
    activeJourney: null,
    stayUntil: null
  }));

  const recordedJourneys = [];
  const visitedAnchors = new Set();
  let outwardCount = 0;
  let returnCount = 0;
  let teleportReturnCount = 0;
  let islandDestinationsCount = 0;
  let nonIntegerPosCount = 0;
  let essentialJourneysCount = 0;
  let over900TilesCount = 0;
  let totalMoveTicks = 0;
  let rawNonWalkableTicks = 0;
  let okFalsePreservedTicks = 0;
  let nonWalkableWrittenCount = 0;

  const TOTAL_HOURS = 48;
  const STEP_MINUTES = 10;
  const TOTAL_STEPS = (TOTAL_HOURS * 60) / STEP_MINUTES;

  for (let step = 0; step < TOTAL_STEPS; step++) {
    const now = step * STEP_MINUTES * 60000;
    const gameDay = Math.floor(now / 3600000);
    const gameHour = Math.floor(now / (3600 * 1000 / 24)) % 24;

    for (const npc of simNpcs) {
      // Simulate schedule batch tick exclusion (B1: skip traveling, hunting, visiting)
      if (
        !npc.activeJourney &&
        !['traveling', 'hunting', 'visiting'].includes(npc.schedule.activityState)
      ) {
        const sched = evaluateNpcSchedule(npc, gameHour, { isWalkableFn: isTileWalkable });
        if (sched.changed) {
          npc.schedule.activityState = sched.activityState;
          npc.schedule.currentFacility = sched.currentFacility;
        }
      }

      if (npc.activeJourney) {
        const pos = positionAt(npc.activeJourney, now);
        if (pos) {
          if (!Number.isInteger(pos.x) || !Number.isInteger(pos.y)) {
            nonIntegerPosCount++;
          }

          totalMoveTicks++;
          if (!isTileWalkable(pos.x, pos.y)) rawNonWalkableTicks++;
          const snapped = snapWalkable(pos.x, pos.y, isTileWalkable);

          if (pos.arrived) {
            let landing = snapped;
            const destAnchor = anchorMap[npc.activeJourney.toId];
            if (destAnchor) {
              const ax = destAnchor.tileX ?? destAnchor.x;
              const ay = destAnchor.tileY ?? destAnchor.y;
              if (Number.isFinite(ax) && Number.isFinite(ay)) {
                const anchorSnap = snapWalkable(ax, ay, isTileWalkable);
                if (anchorSnap.ok !== false || landing.ok === false) {
                  landing = anchorSnap;
                }
              }
            }

            if (landing.ok !== false) {
              npc.tileX = landing.x;
              npc.tileY = landing.y;
              npc.schedule.tileX = landing.x;
              npc.schedule.tileY = landing.y;
            } else {
              okFalsePreservedTicks++;
            }

            if (!isTileWalkable(npc.tileX, npc.tileY)) {
              nonWalkableWrittenCount++;
            }

            visitedAnchors.add(npc.activeJourney.toId);
            const isHome = npc.activeJourney.purpose === 'pulang';
            npc.schedule.currentAnchorId = npc.activeJourney.toId;
            npc.schedule.activityState = isHome ? 'idle' : 'visiting';
            npc.stayUntil = isHome ? null : now + (npc.activeJourney.stayMs || 1800000);
            npc.activeJourney = null;
          } else {
            if (snapped.ok !== false) {
              npc.tileX = snapped.x;
              npc.tileY = snapped.y;
              npc.schedule.tileX = snapped.x;
              npc.schedule.tileY = snapped.y;
            } else {
              okFalsePreservedTicks++;
            }

            if (!isTileWalkable(npc.tileX, npc.tileY)) {
              nonWalkableWrittenCount++;
            }
          }
        }
      } else {
        const away = npc.schedule.homeAnchorId && npc.schedule.currentAnchorId !== npc.schedule.homeAnchorId;
        if (away && npc.stayUntil && now >= npc.stayUntil) {
          const returnPlan = planReturnHome(npc, { anchorMap, graph: travelGraph, now, routeFn: defaultRouteFn });
          if (returnPlan && !returnPlan.teleport) {
            const speed = Math.max(6, Math.min(30, npc.attributes?.travelSpeed ?? 10));
            const journey = returnPlan.journey || buildJourney({
              pathAnchors: returnPlan.pathAnchors,
              anchorMap,
              now,
              tilesPerMinute: speed,
              purpose: 'pulang',
              maxTiles: 10000,
              routeFn: defaultRouteFn
            });
            if (journey) {
              returnCount++;
              npc.activeJourney = journey;
              npc.schedule.activityState = 'traveling';
              recordedJourneys.push({
                name: npc.name,
                from: journey.fromId,
                to: journey.toId,
                purpose: journey.purpose,
                totalTiles: journey.totalTiles,
                durationMinutes: Math.round((journey.etaAt - journey.startedAt) / 60000)
              });
            }
          } else {
            const homeAnchor = anchorMap[npc.schedule.homeAnchorId];
            if (homeAnchor) {
              const hx = homeAnchor.tileX ?? homeAnchor.x;
              const hy = homeAnchor.tileY ?? homeAnchor.y;
              const homeSnap = snapWalkable(hx, hy, isTileWalkable);
              if (homeSnap.ok) {
                npc.tileX = homeSnap.x;
                npc.tileY = homeSnap.y;
                npc.schedule.tileX = homeSnap.x;
                npc.schedule.tileY = homeSnap.y;
                npc.schedule.currentAnchorId = npc.schedule.homeAnchorId;
                npc.schedule.activityState = 'idle';
                npc.stayUntil = null;
                teleportReturnCount++;
              }
            }
          }
        } else if (!away && DAILY_HOME_STATES.has(npc.schedule.activityState)) {
          const plan = chooseDestination(npc, {
            anchors,
            anchorMap,
            graph: travelGraph,
            gameDay,
            now,
            routeFn: defaultRouteFn
          });

          if (plan) {
            if (npc.vitalStatus?.isEssential) {
              essentialJourneysCount++;
            }
            if (anchorMap[plan.toAnchorId]?.type === 'island') {
              islandDestinationsCount++;
            }

            const speed = Math.max(6, Math.min(30, npc.attributes?.travelSpeed ?? 10));
            const journey = plan.journey || buildJourney({
              pathAnchors: plan.pathAnchors,
              anchorMap,
              now,
              tilesPerMinute: speed,
              purpose: plan.purpose,
              routeFn: defaultRouteFn
            });

            if (journey) {
              if (journey.totalTiles > 900) {
                over900TilesCount++;
              }

              outwardCount++;
              journey.stayMs = plan.stayMs;
              npc.activeJourney = journey;
              npc.schedule.activityState = 'traveling';
              npc.schedule.lastJourneyDay = gameDay;

              recordedJourneys.push({
                name: npc.name,
                from: journey.fromId,
                to: journey.toId,
                purpose: journey.purpose,
                totalTiles: journey.totalTiles,
                durationMinutes: Math.round((journey.etaAt - journey.startedAt) / 60000)
              });
            }
          }
        }
      }
    }
  }

  // Count how many NPCs remain away vs at home after 48h (some still mid-trip at step 287)
  const stillMidTrip = simNpcs.filter(n => !!n.activeJourney).length;
  const stillVisiting = simNpcs.filter(n => !n.activeJourney && n.schedule.currentAnchorId !== n.schedule.homeAnchorId).length;
  const stuckNoStayUntil = simNpcs.filter(n => !n.activeJourney && n.schedule.currentAnchorId !== n.schedule.homeAnchorId && !n.stayUntil).length;

  const totalLength = recordedJourneys.reduce((sum, j) => sum + j.totalTiles, 0);
  const avgLength = recordedJourneys.length > 0 ? (totalLength / recordedJourneys.length).toFixed(1) : 0;

  const passed = (
    recordedJourneys.length > 0 &&
    essentialJourneysCount === 0 &&
    islandDestinationsCount === 0 &&
    over900TilesCount === 0 &&
    nonIntegerPosCount === 0 &&
    nonWalkableWrittenCount === 0 &&
    stuckNoStayUntil === 0 &&
    returnCount > 0
  );

  const v31Journeys = 3382;
  const deltaJourneys = recordedJourneys.length - v31Journeys;

  const output = [
    `=== LAPORAN SIMULASI PERJALANAN NPC (48 JAM GAME — V32 PASS-ROUTED) ===`,
    `Waktu Simulasi: 48 Jam Game (Langkah: 10 Menit, Total: ${TOTAL_STEPS} Steps)`,
    `Jumlah Populasi NPC: ${simNpcs.length} Karakter`,
    `Jumlah Perjalanan Terjadi: ${recordedJourneys.length} (Berangkat: ${outwardCount}, Pulang: ${returnCount}, Teleport Pulang: ${teleportReturnCount})`,
    `Perbandingan vs V31 (${v31Journeys} perjalanan): ${deltaJourneys >= 0 ? '+' : ''}${deltaJourneys}`,
    `Panjang Rata-rata Perjalanan: ${avgLength} Petak (Tile)`,
    `Jumlah Anchor Berbeda Dikunjungi: ${visitedAnchors.size} Anchor`,
    `Total Tick Pergerakan Dievaluasi SnapWalkable: ${totalMoveTicks}`,
    `Titik Mentah Non-Walkable Dicegat: ${rawNonWalkableTicks}`,
    `Titik ok:false Dipertahankan di Daratan Lama: ${okFalsePreservedTicks}`,
    `Pelanggaran Posisi Non-Walkable Tertulis: ${nonWalkableWrittenCount}`,
    `Pelanggaran Tujuan Pulau (island): ${islandDestinationsCount}`,
    `NPC Sedang Jalan / Bertamu di Akhir Simulasi: ${stillMidTrip} / ${stillVisiting}`,
    `NPC Macet Away Tanpa stayUntil: ${stuckNoStayUntil}`,
    `Pelanggaran NPC Esensial Berjalan: ${essentialJourneysCount}`,
    `Pelanggaran Jarak > 900 Tile (Berangkat): ${over900TilesCount}`,
    `Pelanggaran Koordinat Non-Integer: ${nonIntegerPosCount}`,
    ``,
    `5 Contoh Perjalanan Nyata:`,
    ...recordedJourneys.slice(0, 5).map((j, idx) =>
      `  ${idx + 1}. [${j.name}] ${anchorMap[j.from]?.name || j.from} -> ${anchorMap[j.to]?.name || j.to} | Tujuan: ${j.purpose} | Jarak: ${j.totalTiles} tile | Durasi: ${j.durationMinutes} menit`
    ),
    ``,
    `Status Validasi: ${passed ? 'PASSED (100% VALID)' : 'FAILED'}`
  ].join('\n');

  console.log(output);

  const v32Dir = path.join(rootDir, 'review/v32_raw');
  if (!fs.existsSync(v32Dir)) fs.mkdirSync(v32Dir, { recursive: true });
  fs.writeFileSync(path.join(v32Dir, 'f4_sim_48h.txt'), output + '\n', 'utf8');

  if (!passed) {
    process.exit(1);
  }
}

simulate().catch(err => {
  console.error('[SimulateNpcTravel Error]', err);
  process.exit(1);
});
