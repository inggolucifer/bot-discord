const fs = require('fs');
let code = fs.readFileSync('jianghu-bot/utils/workerAutoProcess.js', 'utf8');

code = code.replace(/const activeAssets = sect\.assets\.filter\(a => !a\.isDamaged && !isUnderConstruction\(a\) && a\.status !== 'pending' && a\.status !== 'building'\);/g, "const activeAssets = sect.assets.filter(a => !a.isDamaged && a.status !== 'pending' && a.status !== 'building' && !isUnderConstruction(a));");

fs.writeFileSync('jianghu-bot/utils/workerAutoProcess.js', code);
