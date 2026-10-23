const objectScatter = require('../utils/objectScatter');
const fs = require('fs');
const regions = JSON.parse(fs.readFileSync('world-data/regions.json', 'utf8'));
const anchors = JSON.parse(fs.readFileSync('world-data/anchors.json', 'utf8'));

const REGION_FOCAL_OVERRIDES = {
  mist_insect_valley: { x: 4150, y: 750, focalName: 'Lembah Rimbun Bambu & Padang Herba' },
  frostmoon_sea: { x: 4650, y: 4050, focalName: 'Gugusan Karang Roh Es Lautan Bulan Beku' },
  floating_wind_isles: { x: 4600, y: 2700, focalName: 'Kepulauan Daois Mengambang Angin' },
  eastern_sea: { x: 3880, y: 2750, focalName: 'Sarang Naga Karang & Dermaga Donghai' },
  spirit_wood_sea: { x: 3700, y: 1300, focalName: 'Pohon Persik Roh & Rimba Purba' },
  bone_sea_coast: { x: 1750, y: 150, focalName: 'Pesisir Tulang Leviathan Purba' },
  void_rift: { x: 250, y: 4750, focalName: 'Retakan Ruang Dimensi Hampa' },
  lava_spine: { x: 1100, y: 700, focalName: 'Kawah Magma Padat Punggung Lahar' },
  crimson_battlefield: { x: 2900, y: 600, focalName: 'Monumen Medan Perang Abu Darah' },
  abyssal_scar: { x: 1900, y: 600, focalName: 'Tebing Jurang Bekas Luka Neraka' },
  southern_plague_woods: { x: 3400, y: 550, focalName: 'Kuil Belukar Kayu Mati Wabah' }
};

const anchorsByRegion = {};
anchors.forEach(a => {
  const r = a.region || 'central_plains';
  if (!anchorsByRegion[r]) anchorsByRegion[r] = [];
  anchorsByRegion[r].push(a);
});

console.log('=== OBJECT COUNTS FOR ALL 29 REGIONS ===');
let zeroCount = 0;
regions.forEach((r, i) => {
  const ancs = anchorsByRegion[r.id] || [];
  let x, y;
  if (REGION_FOCAL_OVERRIDES[r.id]) {
    x = REGION_FOCAL_OVERRIDES[r.id].x;
    y = REGION_FOCAL_OVERRIDES[r.id].y;
  } else if (ancs.length > 0) {
    x = ancs[0].x;
    y = ancs[0].y;
  } else {
    x = r.centerX || Math.round((r.bounds.minX + r.bounds.maxX) / 2);
    y = r.centerY || Math.round((r.bounds.minY + r.bounds.maxY) / 2);
  }
  const cx = Math.floor(x / 32);
  const cy = Math.floor(y / 32);
  const objs = objectScatter.getChunkObjects(cx, cy);
  const vp = objectScatter.getViewportObjects(x - 16, y - 16, x + 16, y + 16);
  if (vp.length === 0) zeroCount++;
  console.log(`#${String(i+1).padStart(2, '0')} [${r.id}] (${x}, ${y}) -> chunk: ${objs.length}, viewport: ${vp.length} objects`);
});
console.log('\nTotal regions with 0 viewport objects:', zeroCount);
