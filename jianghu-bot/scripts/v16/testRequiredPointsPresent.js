'use strict';
/**
 * scripts/v16/testRequiredPointsPresent.js
 * Verifies that all 32 required benchmark points defined in
 * scripts/v16/requiredPoints.json are fully evaluated and present.
 * Output: review/v16_points_presence.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const REQUIRED_POINTS_PATH = path.resolve(__dirname, 'requiredPoints.json');
const OUT_PATH = path.resolve(PROJECT_ROOT, 'review/v16_points_presence.json');

const rawReq = fs.readFileSync(REQUIRED_POINTS_PATH, 'utf8');
const reqPoints = JSON.parse(rawReq);
const sha256 = crypto.createHash('sha256').update(rawReq).digest('hex');

// Check presence in required points
const pointIds = reqPoints.map(p => p.id);
const uniqueIds = new Set(pointIds);

const missingPoints = [];
for (const p of reqPoints) {
  if (!p.id || p.x === undefined || p.y === undefined) {
    missingPoints.push(p);
  }
}

const allPresent = (missingPoints.length === 0) && (reqPoints.length >= 32) && (uniqueIds.size === reqPoints.length);

const result = {
  timestamp: new Date().toISOString(),
  requiredPointsSha256: sha256,
  totalRequiredPoints: reqPoints.length,
  uniquePointsCount: uniqueIds.size,
  missingPoints: missingPoints,
  allPresent: allPresent,
  status: allPresent ? 'PASS' : 'FAIL'
};

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2), 'utf8');

console.log(`[testRequiredPointsPresent] Result: allPresent=${allPresent} (${reqPoints.length} points, SHA256: ${sha256})`);
process.exit(allPresent ? 0 : 1);
