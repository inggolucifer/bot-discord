const fs = require('fs');
let content = fs.readFileSync('jianghu-bot/services/player/worker/kerjaMandiri.js', 'utf8');
content = content.replace(
  /if \(\!isUnderConstruction\(targetAsset\)\) \{([\s\S]*?)return interaction\.editReply[\s\S]*?\}\n    \}/m,
  `if (!isUnderConstruction(targetAsset) && targetAsset.status !== 'pending' && targetAsset.status !== 'building') {
      if (!targetAsset.assignedWorkers) targetAsset.assignedWorkers = [];
      const activeWorkers = targetAsset.assignedWorkers.filter(w => !w.endTime || w.endTime.getTime() > Date.now()).length;
      if (activeWorkers >= targetAsset.quantity) {
        return interaction.editReply({ content: \`❌ Aset yang sudah jadi hanya boleh maksimal memiliki 1 pekerja per unit (maks \${targetAsset.quantity} pekerja).\` });
      }
    } else {
      if (!targetAsset.assignedWorkers) targetAsset.assignedWorkers = [];
      const activeWorkers = targetAsset.assignedWorkers.filter(w => !w.endTime || w.endTime.getTime() > Date.now()).length;
      if (activeWorkers >= 4) {
        return interaction.editReply({ content: \`❌ Aset yang sedang dibangun maksimal menampung 4 pekerja.\` });
      }
    }`
);
fs.writeFileSync('jianghu-bot/services/player/worker/kerjaMandiri.js', content);
