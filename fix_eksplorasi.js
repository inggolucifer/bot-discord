const fs = require('fs');
let code = fs.readFileSync('jianghu-bot/commands/player/eksplorasi.js', 'utf8');

// Fix 1: locationData.monsters -> locationData.drops?.monsters
code = code.replace(/locationData\.monsters/g, "locationData.drops?.monsters");

// Fix 2: 'admin_grant' -> 'exploration_claim'
code = code.replace(/type: 'admin_grant',/g, "type: 'exploration_claim',");

// Fix 3: lokasinya monsters di LOCATIONS.forEach(loc => ...)
code = code.replace(/loc\.monsters \?/g, "loc.drops?.monsters ?");
code = code.replace(/loc\.monsters\.map/g, "loc.drops.monsters.map");

fs.writeFileSync('jianghu-bot/commands/player/eksplorasi.js', code);
