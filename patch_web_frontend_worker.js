const fs = require('fs');
let fileAssets = fs.readFileSync('jianghu-bot/web-dashboard/src/app/assets/page.tsx', 'utf8');

// Asset Page
fileAssets = fileAssets.replace(
  /disabled=\{actionLoading \|\| \(\!selectedAsset\.underConstruction && selectedAsset\.assignedWorkers\.length >= 1\)\}/g,
  'disabled={actionLoading || (!selectedAsset.underConstruction && selectedAsset.status === "active" && selectedAsset.assignedWorkers.length >= selectedAsset.quantity) || ((selectedAsset.underConstruction || selectedAsset.status !== "active") && selectedAsset.assignedWorkers.length >= 4)}'
);

fileAssets = fileAssets.replace(
  /\(\!selectedAsset\.underConstruction && selectedAsset\.assignedWorkers\.length >= 1\)/g,
  '((!selectedAsset.underConstruction && selectedAsset.status === "active" && selectedAsset.assignedWorkers.length >= selectedAsset.quantity) || ((selectedAsset.underConstruction || selectedAsset.status !== "active") && selectedAsset.assignedWorkers.length >= 4))'
);

fileAssets = fileAssets.replace(
  /disabled=\{\!a\.underConstruction && a\.assignedWorkers\.length >= 1\}/g,
  'disabled={(!a.underConstruction && a.status === "active" && a.assignedWorkers.length >= a.quantity) || ((a.underConstruction || a.status !== "active") && a.assignedWorkers.length >= 4)}'
);

fileAssets = fileAssets.replace(
  /\!\a\.underConstruction && a\.assignedWorkers\.length >= 1 \? '\(Penuh\)'/g,
  '((!a.underConstruction && a.status === "active" && a.assignedWorkers.length >= a.quantity) || ((a.underConstruction || a.status !== "active") && a.assignedWorkers.length >= 4)) ? \'(Penuh)\''
);
fs.writeFileSync('jianghu-bot/web-dashboard/src/app/assets/page.tsx', fileAssets);

let fileWorker = fs.readFileSync('jianghu-bot/web-dashboard/src/app/worker/page.tsx', 'utf8');

fileWorker = fileWorker.replace(
  /disabled=\{\!a\.underConstruction && a\.assignedWorkers\.length >= 1\}/g,
  'disabled={(!a.underConstruction && a.status === "active" && a.assignedWorkers.length >= a.quantity) || ((a.underConstruction || a.status !== "active") && a.assignedWorkers.length >= 4)}'
);

fileWorker = fileWorker.replace(
  /\!\a\.underConstruction && a\.assignedWorkers\.length >= 1 \? '\(Penuh\)'/g,
  '((!a.underConstruction && a.status === "active" && a.assignedWorkers.length >= a.quantity) || ((a.underConstruction || a.status !== "active") && a.assignedWorkers.length >= 4)) ? \'(Penuh)\''
);

fs.writeFileSync('jianghu-bot/web-dashboard/src/app/worker/page.tsx', fileWorker);
