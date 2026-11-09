/**
 * NPC Travel Simulation Engine (V30)
 * Simulates 48 game hours (10-minute steps) across all 764 NPCs entirely in-memory.
 * Validates travel volume, distances, essential immunity, and integer coordinates.
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
const { chooseDestination, planReturnHome } = require(path.join(rootDir, 'services/npcWanderPlanner'));

async function simulate() {
  console.log(`[SimulateNpcTravel] Initializing 48-hour simulation for ${snapshot.npcs.length} NPCs...`);

  // Clone NPC state into simulation memory
  const simNpcs = snapshot.npcs.map(n => ({
    _id: n._id || n.id,
    name: n.name,
    vitalStatus: { ...n.vitalStatus },
    cultivation: { ...n.cultivation },
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
  let nonIntegerPosCount = 0;
  let essentialJourneysCount = 0;
  let over900TilesCount = 0;

  const TOTAL_HOURS = 48;
  const STEP_MINUTES = 10;
  const TOTAL_STEPS = (TOTAL_HOURS * 60) / STEP_MINUTES;

  for (let step = 0; step < TOTAL_STEPS; step++) {
    const now = step * STEP_MINUTES * 60000;
    const gameDay = Math.floor(now / 3600000);

    for (const npc of simNpcs) {
      if (npc.activeJourney) {
        const pos = positionAt(npc.activeJourney, now);
        if (pos) {
          if (!Number.isInteger(pos.x) || !Number.isInteger(pos.y)) {
            nonIntegerPosCount++;
          }

          if (pos.arrived) {
            visitedAnchors.add(npc.activeJourney.toId);
            const isHome = npc.activeJourney.purpose === 'pulang';
            npc.schedule.currentAnchorId = npc.activeJourney.toId;
            npc.schedule.activityState = isHome ? 'idle' : 'visiting';
            npc.stayUntil = isHome ? null : now + (npc.activeJourney.stayMs || 1800000);
            npc.activeJourney = null;
          }
        }
      } else {
        if (npc.schedule.activityState === 'visiting' && npc.stayUntil && now >= npc.stayUntil) {
          const returnPlan = planReturnHome(npc, { anchorMap, graph: travelGraph, now });
          if (returnPlan) {
            const speed = Math.max(6, Math.min(30, npc.attributes?.travelSpeed ?? 10));
            const journey = buildJourney({
              pathAnchors: returnPlan.pathAnchors,
              anchorMap,
              now,
              tilesPerMinute: speed,
              purpose: 'pulang'
            });
            if (journey) {
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
          }
        } else if (npc.schedule.activityState === 'idle') {
          if (npc.schedule.currentAnchorId === npc.schedule.homeAnchorId) {
            const plan = chooseDestination(npc, {
              anchors,
              anchorMap,
              graph: travelGraph,
              gameDay,
              now
            });

            if (plan) {
              if (npc.vitalStatus?.isEssential) {
                essentialJourneysCount++;
              }

              const speed = Math.max(6, Math.min(30, npc.attributes?.travelSpeed ?? 10));
              const journey = buildJourney({
                pathAnchors: plan.pathAnchors,
                anchorMap,
                now,
                tilesPerMinute: speed,
                purpose: plan.purpose
              });

              if (journey) {
                if (journey.totalTiles > 900) {
                  over900TilesCount++;
                }

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
  }

  const totalLength = recordedJourneys.reduce((sum, j) => sum + j.totalTiles, 0);
  const avgLength = recordedJourneys.length > 0 ? (totalLength / recordedJourneys.length).toFixed(1) : 0;

  const output = [
    `=== LAPORAN SIMULASI PERJALANAN NPC (48 JAM GAME) ===`,
    `Waktu Simulasi: 48 Jam Game (Langkah: 10 Menit, Total: ${TOTAL_STEPS} Steps)`,
    `Jumlah Populasi NPC: ${simNpcs.length} Karakter`,
    `Jumlah Perjalanan Terjadi: ${recordedJourneys.length}`,
    `Panjang Rata-rata Perjalanan: ${avgLength} Petak (Tile)`,
    `Jumlah Anchor Berbeda Dikunjungi: ${visitedAnchors.size} Anchor`,
    `Pelanggaran NPC Esensial Berjalan: ${essentialJourneysCount}`,
    `Pelanggaran Jarak > 900 Tile: ${over900TilesCount}`,
    `Pelanggaran Koordinat Non-Integer: ${nonIntegerPosCount}`,
    ``,
    `5 Contoh Perjalanan Nyata:`,
    ...recordedJourneys.slice(0, 5).map((j, idx) =>
      `  ${idx + 1}. [${j.name}] ${anchorMap[j.from]?.name || j.from} -> ${anchorMap[j.to]?.name || j.to} | Tujuan: ${j.purpose} | Jarak: ${j.totalTiles} tile | Durasi: ${j.durationMinutes} menit`
    ),
    ``,
    `Status Validasi: ${recordedJourneys.length > 0 && essentialJourneysCount === 0 && over900TilesCount === 0 && nonIntegerPosCount === 0 ? 'PASSED (100% VALID)' : 'FAILED'}`
  ].join('\n');

  console.log(output);

  const outPath = path.join(rootDir, 'review/v30_raw/m5_travel_sim.txt');
  fs.writeFileSync(outPath, output, 'utf8');
  console.log(`[SimulateNpcTravel] Output successfully written to ${outPath}`);

  if (recordedJourneys.length === 0 || essentialJourneysCount > 0 || over900TilesCount > 0 || nonIntegerPosCount > 0) {
    process.exit(1);
  }
}

simulate().catch(err => {
  console.error('[SimulateNpcTravel Error]', err);
  process.exit(1);
});
