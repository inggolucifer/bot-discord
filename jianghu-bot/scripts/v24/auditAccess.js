#!/usr/bin/env node
/**
 * scripts/v24/auditAccess.js
 * Audit Aksesibilitas Pemukiman & Baseline Obstruksi Footprint (V24 H0 / H7)
 */

const fs = require('fs');
const path = require('path');
const anchors = require('../../world-data/anchors.json');
const proceduralWorldEngine = require('../../utils/proceduralWorldEngine');
const settlementZones = require('../../utils/settlementZones');

const RAW_DIR = path.resolve(__dirname, '../../review/v24_raw');
if (!fs.existsSync(RAW_DIR)) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
}

function runAudit(isAfter = false) {
  console.log('='.repeat(70));
  console.log(` AUDIT AKSESIBILITAS PEMUKIMAN V24 (${isAfter ? 'SESUDAH H1-H6' : 'BASELINE H0'})`);
  console.log('='.repeat(70));

  let totalFootprintTiles = 0;
  let totalSolidTiles = 0;
  let totalPromptTiles = 0;

  const settlementDetails = [];
  const simulationResults = [];
  const solidTerrainsCount = {};

  // 1. Audit Footprint 52 Pemukiman
  for (const a of anchors) {
    const sw = a.spanWidth || 2;
    const sh = a.spanHeight || 2;
    let sSolid = 0;
    let sPrompt = 0;
    const tilesList = [];

    for (let dy = 0; dy < sh; dy++) {
      for (let dx = 0; dx < sw; dx++) {
        const tx = a.x + dx;
        const ty = a.y + dy;
        totalFootprintTiles++;

        const tile = proceduralWorldEngine.getTileAt(tx, ty);
        if (tile.isSolid) {
          totalSolidTiles++;
          sSolid++;
        }

        // Pengecekan pemicu prompt
        // Jika before (H0): cek findAnchorByEntrance
        // Jika after (H1+): cek findAnchorBySpan
        const promptAnchor = isAfter
          ? settlementZones.findAnchorBySpan(tx, ty)
          : settlementZones.findAnchorByEntrance(tx, ty);

        if (promptAnchor && promptAnchor.id === a.id) {
          totalPromptTiles++;
          sPrompt++;
        }

        tilesList.push({
          x: tx,
          y: ty,
          dx,
          dy,
          isSolid: tile.isSolid,
          isEntrance: !!tile.isSettlementEntrance,
          label: tile.label,
          settlementId: tile.settlementId,
          hasPrompt: !!(promptAnchor && promptAnchor.id === a.id)
        });
      }
    }

    settlementDetails.push({
      id: a.id,
      name: a.name,
      x: a.x,
      y: a.y,
      spanWidth: sw,
      spanHeight: sh,
      totalTiles: sw * sh,
      solidTiles: sSolid,
      promptTiles: sPrompt
    });
  }

  // 2. Simulasi Langkah Menuju Pemukiman dari 4 Arah Mata Angin
  // Menguji pergerakan 1 langkah dari luar menuju setiap sisi terluar pemukiman
  // 4 Arah: Utara (dari atas menuju baris 0), Selatan (dari bawah menuju baris sh-1),
  // Barat (dari kiri menuju kolom 0), Timur (dari kanan menuju kolom sw-1).
  let blockedSimulations = 0;
  let arrivedSimulations = 0;
  let tebingMessagesCount = 0;

  for (const a of anchors) {
    const sw = a.spanWidth || 2;
    const sh = a.spanHeight || 2;

    const directions = [
      { dir: 'North', fromX: a.x + Math.floor(sw / 2), fromY: a.y - 1, targetX: a.x + Math.floor(sw / 2), targetY: a.y },
      { dir: 'South', fromX: a.x + Math.floor(sw / 2), fromY: a.y + sh, targetX: a.x + Math.floor(sw / 2), targetY: a.y + sh - 1 },
      { dir: 'West',  fromX: a.x - 1, fromY: a.y + Math.floor(sh / 2), targetX: a.x, targetY: a.y + Math.floor(sh / 2) },
      { dir: 'East',  fromX: a.x + sw, fromY: a.y + Math.floor(sh / 2), targetX: a.x + sw - 1, targetY: a.y + Math.floor(sh / 2) }
    ];

    for (const d of directions) {
      const tile = proceduralWorldEngine.getTileAt(d.targetX, d.targetY);
      let stoppedEarly = false;
      let stopReason = null;
      let settlementPrompt = null;

      // Logika step-move
      if (tile.isSolid) {
        stoppedEarly = true;
        stopReason = `Jalur terhalang oleh ${tile.label || 'Tebing Batu Curam'}! Membutuhkan artefak pedang terbang.`;
      } else {
        const spanAnchor = settlementZones.findAnchorBySpan(d.targetX, d.targetY);
        const entranceAnchor = settlementZones.findAnchorByEntrance(d.targetX, d.targetY);
        const promptTarget = isAfter ? spanAnchor : entranceAnchor;

        if (promptTarget) {
          stoppedEarly = isAfter; // Di H1+, kedatangan di span menghentikan rute
          stopReason = isAfter ? `Tiba di gerbang ${promptTarget.name}.` : null;
          settlementPrompt = {
            id: promptTarget.id,
            name: promptTarget.name,
            tier: promptTarget.tier || 1,
            regionSlug: promptTarget.region || promptTarget.regionSlug || 'central_plains'
          };
        }
      }

      if (stoppedEarly && stopReason && stopReason.includes('terhalang')) {
        blockedSimulations++;
        if (stopReason.includes('Tebing')) {
          tebingMessagesCount++;
        }
      } else if (settlementPrompt) {
        arrivedSimulations++;
      }

      simulationResults.push({
        settlementId: a.id,
        direction: d.dir,
        from: { x: d.fromX, y: d.fromY },
        target: { x: d.targetX, y: d.targetY },
        stoppedEarly,
        stopReason,
        settlementPrompt,
        tileSolid: tile.isSolid,
        tileLabel: tile.label
      });
    }
  }

  // 3. Sampel Terrain Solid di Seluruh Dunia (Grid Sampling)
  for (let y = 100; y < 4900; y += 100) {
    for (let x = 100; x < 4900; x += 100) {
      const tile = proceduralWorldEngine.getTileAt(x, y);
      if (tile.isSolid) {
        const tt = tile.terrainType || 'unknown';
        solidTerrainsCount[tt] = (solidTerrainsCount[tt] || 0) + 1;
      }
    }
  }

  console.log(`Total Petak Footprint Pemukiman  : ${totalFootprintTiles}`);
  console.log(`Petak Footprint Solid            : ${totalSolidTiles} / ${totalFootprintTiles} (${((totalSolidTiles / totalFootprintTiles) * 100).toFixed(1)}%)`);
  console.log(`Petak Memicu Prompt              : ${totalPromptTiles} / ${totalFootprintTiles}`);
  console.log(`Simulasi 208 Percobaan (52x4)    :`);
  console.log(`  - Terhalang (Blocked)          : ${blockedSimulations} / 208`);
  console.log(`  - Pesan 'Tebing' pada Desa     : ${tebingMessagesCount}`);
  console.log(`  - Sukses Tiba (Arrived Prompt) : ${arrivedSimulations} / 208`);
  console.log('Distribusi Medan Solid Sampled   :', JSON.stringify(solidTerrainsCount));
  console.log('='.repeat(70));

  const outputPayload = {
    timestamp: new Date().toISOString(),
    mode: isAfter ? 'after' : 'before',
    summary: {
      totalFootprintTiles,
      totalSolidTiles,
      solidPercentage: Number(((totalSolidTiles / totalFootprintTiles) * 100).toFixed(1)),
      totalPromptTiles,
      totalSimulations: simulationResults.length,
      blockedSimulations,
      tebingMessagesCount,
      arrivedSimulations
    },
    solidTerrainsSample: solidTerrainsCount,
    settlements: settlementDetails,
    simulations: simulationResults
  };

  const outFile = path.join(RAW_DIR, isAfter ? 'access_after.json' : 'access_before.json');
  fs.writeFileSync(outFile, JSON.stringify(outputPayload, null, 2), 'utf8');
  console.log(`[OUTPUT] Hasil audit disimpan ke: ${outFile}\n`);
}

const isAfterFlag = process.argv.includes('--after');
runAudit(isAfterFlag);
