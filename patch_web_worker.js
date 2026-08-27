const fs = require('fs');
let content = fs.readFileSync('jianghu-bot/web-api/routes/worker.js', 'utf8');

// Patch logic sewa pekerja di backend Express API
content = content.replace(
  /if \(\!isUnderConstruction\(ownedAsset\)\) \{([\s\S]*?)return res\.status\(400\)\.json\(\{ error: \`Aset yang sudah jadi[\s\S]*?\}\n        \}/m,
  `if (!isUnderConstruction(ownedAsset) && ownedAsset.status !== 'pending' && ownedAsset.status !== 'building') {
            if (!ownedAsset.assignedWorkers) ownedAsset.assignedWorkers = [];
            const activeWorkers = ownedAsset.assignedWorkers.filter(w => !w.endTime || new Date(w.endTime).getTime() > Date.now()).length;
            if (activeWorkers >= ownedAsset.quantity) {
                return res.status(400).json({ error: \`Aset yang sudah jadi hanya boleh maksimal memiliki 1 pekerja per unit (maks \${ownedAsset.quantity} pekerja).\` });
            }
        } else {
            if (!ownedAsset.assignedWorkers) ownedAsset.assignedWorkers = [];
            const activeWorkers = ownedAsset.assignedWorkers.filter(w => !w.endTime || new Date(w.endTime).getTime() > Date.now()).length;
            if (activeWorkers >= 4) {
                return res.status(400).json({ error: \`Aset yang sedang dibangun maksimal menampung 4 pekerja.\` });
            }
        }`
);
fs.writeFileSync('jianghu-bot/web-api/routes/worker.js', content);
