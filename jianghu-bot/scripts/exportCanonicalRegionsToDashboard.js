const fs = require('fs');
const path = require('path');

const regions = JSON.parse(fs.readFileSync(path.join(__dirname, '../world-data/regions.json'), 'utf8'));
const anchors = JSON.parse(fs.readFileSync(path.join(__dirname, '../world-data/anchors.json'), 'utf8'));

const tsRegions = regions.map(r => ({
  regionSlug: r.id,
  displayName: r.name,
  chineseName: r.chineseName || '',
  centerX: Math.round((r.bounds.minX + r.bounds.maxX) / 2),
  centerY: Math.round((r.bounds.minY + r.bounds.maxY) / 2),
  dangerTier: r.dangerTier || r.tier || 1,
  qiDensityModifier: r.qiDensityModifier || 1.0,
  tempRangeC: r.tempRangeC || { min: 15, max: 25 },
  bounds: r.bounds,
  lawAffinities: r.lawAffinities || [],
  resourceTags: r.resourceTags || [],
  palette: r.palette || { primary: '#3a5f38', accent: '#d4b16a', terrainColor: '#4d7348' },
  description: r.description || ''
}));

const tsLandmarks = anchors.map(a => ({
  x: a.x,
  y: a.y,
  name: a.name,
  chineseName: a.chineseName || '',
  type: a.type || 'village',
  region: a.regionId,
  dangerTier: a.tier || 1
}));

const output = `/**
 * SSOT CANONICAL REGIONS & LANDMARKS
 * Generated from world-data/regions.json & anchors.json
 */

import { RegionTopology, WorldLandmark } from '@/types/world';

export const CANONICAL_REGIONS: (RegionTopology & { bounds: { minX: number; maxX: number; minY: number; maxY: number }; palette: any })[] = ${JSON.stringify(tsRegions, null, 2)} as any;

export const CANONICAL_LANDMARKS: WorldLandmark[] = ${JSON.stringify(tsLandmarks, null, 2)};
`;

const dest = path.join(__dirname, '../web-dashboard/src/config/canonicalRegions.ts');
fs.writeFileSync(dest, output, 'utf8');
console.log('SUCCESS: Written', tsRegions.length, 'regions and', tsLandmarks.length, 'landmarks to', dest);
