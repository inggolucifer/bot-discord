/**
 * scripts/v25/auditTierCap.js
 * Audit Spasial Batas Tier di Sekitar Pemukiman (52 Settlement Anchors)
 * Menguji 17.472 Titik Pemeriksaan Menghasilkan review/v25_raw/tier_cap.json
 */

const fs = require('fs');
const path = require('path');
const proceduralWorldEngine = require('../../utils/proceduralWorldEngine');
const worldRegionEngine = require('../../utils/worldRegionEngine');
const anchors = require('../../world-data/anchors.json');

function runTierCapAudit() {
  const radiiOffsets = [0, 1, 3, 6, 9, 12, 15]; // R, R+1, R+3, R+6, R+9, R+12, R+15
  const angles = 16;
  let totalChecked = 0;
  let totalViolations = 0;
  const violationSamples = [];

  for (const anc of anchors) {
    const R = (anc.v20 && typeof anc.v20.exclusionRadius === 'number') ? anc.v20.exclusionRadius : 10;
    const settlementTier = anc.tier || 1;

    for (const offset of radiiOffsets) {
      const dist = R + offset;

      // Hitung batas maksimum yang sah menurut formula otoritatif V25
      let maxAllowed;
      if (offset === 0) {
        maxAllowed = 1; // Di dalam / batas eksklusi R: zona aman mutlak
      } else if (offset <= 12) {
        maxAllowed = settlementTier + 1; // Cincin R+1..R+12
      } else {
        const extra = Math.floor((offset - 12) / 12);
        maxAllowed = settlementTier + 1 + extra; // Cincin > R+12
      }

      for (let a = 0; a < angles; a++) {
        const theta = (a * 2 * Math.PI) / angles;
        const x = Math.max(0, Math.min(4999, Math.round(anc.x + Math.cos(theta) * dist)));
        const y = Math.max(0, Math.min(4999, Math.round(anc.y + Math.sin(theta) * dist)));

        // Sumber 1: proceduralWorldEngine.getTileAt
        const tile = proceduralWorldEngine.getTileAt(x, y);
        const tileTier = tile.dangerTier;
        totalChecked++;

        if (tileTier > maxAllowed) {
          totalViolations++;
          if (violationSamples.length < 10) {
            violationSamples.push({
              source: 'getTileAt',
              settlementId: anc.id,
              settlementTier,
              offset,
              dist,
              x,
              y,
              foundTier: tileTier,
              maxAllowed
            });
          }
        }

        // Sumber 2: worldRegionEngine.getEffectiveDanger
        const effDanger = Math.floor(worldRegionEngine.getEffectiveDanger(x, y));
        totalChecked++;

        if (effDanger > maxAllowed) {
          totalViolations++;
          if (violationSamples.length < 10) {
            violationSamples.push({
              source: 'getEffectiveDanger',
              settlementId: anc.id,
              settlementTier,
              offset,
              dist,
              x,
              y,
              foundTier: effDanger,
              maxAllowed
            });
          }
        }

        // Sumber 3: worldRegionEngine.getTerritoryInfo
        const terrInfo = worldRegionEngine.getTerritoryInfo(x, y, tile.terrainType || 'plains', false);
        const terrTier = terrInfo.dangerTierBase;
        totalChecked++;

        if (terrTier > maxAllowed) {
          totalViolations++;
          if (violationSamples.length < 10) {
            violationSamples.push({
              source: 'getTerritoryInfo',
              settlementId: anc.id,
              settlementTier,
              offset,
              dist,
              x,
              y,
              foundTier: terrTier,
              maxAllowed
            });
          }
        }
      }
    }
  }

  const pass = totalViolations === 0;

  const result = {
    totalAnchors: anchors.length,
    radiiOffsets,
    anglesCount: angles,
    totalPointsChecked: totalChecked,
    totalViolations,
    pass,
    violationSamples,
    timestamp: new Date().toISOString()
  };

  const outDir = path.resolve(__dirname, '../../review/v25_raw');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'tier_cap.json'), JSON.stringify(result, null, 2), 'utf8');

  console.log(`[V25 K5] Audit Batas Tier Pemukiman (52 Anchors):`);
  console.log(`  Total Titik Diperiksa : ${totalChecked}`);
  console.log(`  Total Pelanggaran     : ${totalViolations}`);
  console.log(`  Status                : ${pass ? 'PASS (0 Pelanggaran)' : 'FAIL'}`);

  return result;
}

if (require.main === module) {
  runTierCapAudit();
}

module.exports = { runTierCapAudit };
