const fs = require('fs');
const path = require('path');

const userUploadedDir = 'C:/Users/User/.gemini/antigravity-ide/brain/5f45876c-f5a0-489a-9c9a-51feae0b2915/.user_uploaded';
const brainDir = 'C:/Users/User/.gemini/antigravity-ide/brain/5f45876c-f5a0-489a-9c9a-51feae0b2915';

const mappings = [
  { file: 'media_1792304657936.jpg', name: 'structure_interior_sect_five_phases_brewing_distillery.jpg' },
  { file: 'media_1792304657995.jpg', name: 'structure_dungeon_ancient_soul_devouring_blood_coffin.jpg' },
  { file: 'media_1792304658060.jpg', name: 'structure_interior_sect_celestial_talisman_drying_rotunda.jpg' },
  { file: 'media_1792304658154.jpg', name: 'structure_dungeon_ancient_chasm_broken_chain_bridge_anchor.jpg' },
  { file: 'media_1792304658198.jpg', name: 'structure_interior_sect_dragon_carved_scroll_archive_chest.jpg' }
];

for (const m of mappings) {
  const src = path.join(userUploadedDir, m.file);
  const dest = path.join(brainDir, m.name);
  fs.copyFileSync(src, dest);
  console.log(`Copied ${m.file} -> ${m.name}`);
}
