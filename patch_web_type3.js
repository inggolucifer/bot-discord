const fs = require('fs');

let fileWorker = fs.readFileSync('jianghu-bot/web-dashboard/src/app/worker/page.tsx', 'utf8');
fileWorker = fileWorker.replace(
  /a\.quantity/g,
  '(a.quantity || 1)'
);

fs.writeFileSync('jianghu-bot/web-dashboard/src/app/worker/page.tsx', fileWorker);

let fileAsset = fs.readFileSync('jianghu-bot/web-dashboard/src/app/assets/page.tsx', 'utf8');
fileAsset = fileAsset.replace(
  /a\.quantity/g,
  '(a.quantity || 1)'
);
fs.writeFileSync('jianghu-bot/web-dashboard/src/app/assets/page.tsx', fileAsset);
