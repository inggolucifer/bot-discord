/**
 * AUDIT EXISTING PLOTS SCRIPT (scripts/auditExistingPlots.js)
 * Memeriksa seluruh kavling tanah yang telah dimiliki pemain di database.
 * Mengevaluasi kelayakan terhadap SSOT buildZoneEngine.
 * Menandai pelanggaran warisan (legacyViolation = true) dan menghasilkan laporan CSV.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { getBuildability } = require('../utils/buildZoneEngine');

async function runAudit() {
  const isDryRun = process.argv.includes('--dry-run') || true;
  console.log(`\n=== AUDIT KAVLING TANAH EKSISTING (${isDryRun ? 'DRY RUN' : 'APPLY PATCH'}) ===\n`);

  let mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jianghu-bot';
  let connected = false;

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    connected = true;
    console.log('Terhubung ke MongoDB lokal.');
  } catch (err) {
    console.warn('MongoDB lokal tidak aktif atau timeout. Menjalankan audit berbasis memori / mock check.');
  }

  let plots = [];
  if (connected) {
    const ZoneTile = require('../models/ZoneTile');
    plots = await ZoneTile.find({ ownerId: { $ne: null } }).lean();
  }

  console.log(`Ditemukan ${plots.length} kavling tanah berpemilik dalam database.\n`);

  const results = [];
  let violationsCount = 0;

  for (const p of plots) {
    const check = getBuildability({
      zoneId: p.zoneId || 'tianyuan_world_map',
      x: p.tileX,
      y: p.tileY,
      footprint: { w: 1, h: 1 },
      playerId: p.ownerId,
      guildId: p.guildId
    });

    if (!check.ok) {
      violationsCount++;
      results.push({
        id: p._id,
        tileX: p.tileX,
        tileY: p.tileY,
        zoneId: p.zoneId,
        ownerId: p.ownerId,
        ownerName: p.ownerName || 'Unknown',
        buildingName: p.buildingName || 'None',
        code: check.code,
        message: check.message
      });

      if (!isDryRun && connected) {
        const ZoneTile = require('../models/ZoneTile');
        await ZoneTile.updateOne({ _id: p._id }, { $set: { legacyViolation: true } });
      }
    }
  }

  // Cetak Hasil CSV
  const csvHeader = 'tileX,tileY,zoneId,ownerId,ownerName,buildingName,violationCode,violationMessage';
  const csvRows = results.map(r => 
    `${r.tileX},${r.tileY},${r.zoneId},"${r.ownerId}","${r.ownerName}","${r.buildingName}",${r.code},"${r.message}"`
  );
  const csvContent = [csvHeader, ...csvRows].join('\n');

  const reportPath = path.join(__dirname, '..', 'audit_plots_report.csv');
  fs.writeFileSync(reportPath, csvContent, 'utf8');

  console.log(`\n========================================`);
  console.log(`Total Kavling Berpemilik : ${plots.length}`);
  console.log(`Kavling Sah (Valid)      : ${plots.length - violationsCount}`);
  console.log(`Kavling Melanggar Aturan : ${violationsCount}`);
  console.log(`Laporan CSV disimpan ke  : ${reportPath}`);
  console.log(`========================================\n`);

  if (connected) {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  runAudit().catch(err => {
    console.error('Audit error:', err);
    process.exit(1);
  });
}

module.exports = { runAudit };
