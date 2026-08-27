const fs = require('fs');
let content = fs.readFileSync('jianghu-bot/services/player/worker/pindahWorker.js', 'utf8');
content = content.replace(
  /if \(\!isUnderConstruction\(ownedAsset\)\) \{([\s\S]*?)return interaction\.editReply[\s\S]*?\}\n    \}/m,
  `if (!isUnderConstruction(ownedAsset) && ownedAsset.status !== 'pending' && ownedAsset.status !== 'building') {
      if (!ownedAsset.assignedWorkers) ownedAsset.assignedWorkers = [];
      const activeWorkers = ownedAsset.assignedWorkers.filter(w => !w.endTime || w.endTime.getTime() > Date.now()).length;
      if (activeWorkers >= ownedAsset.quantity) {
        return interaction.editReply({ content: \`❌ Aset yang sudah jadi hanya boleh maksimal memiliki 1 pekerja per unit (maks \${ownedAsset.quantity} pekerja).\` });
      }
    } else {
      if (!ownedAsset.assignedWorkers) ownedAsset.assignedWorkers = [];
      const activeWorkers = ownedAsset.assignedWorkers.filter(w => !w.endTime || w.endTime.getTime() > Date.now()).length;
      if (activeWorkers >= 4) {
        return interaction.editReply({ content: \`❌ Aset yang sedang dibangun maksimal menampung 4 pekerja.\` });
      }
    }`
);
fs.writeFileSync('jianghu-bot/services/player/worker/pindahWorker.js', content);
