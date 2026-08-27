const fs = require('fs');

// Patch worker page interfaces
let fileWorker = fs.readFileSync('jianghu-bot/web-dashboard/src/app/worker/page.tsx', 'utf8');

fileWorker = fileWorker.replace(
  /export interface Asset \{([\s\S]*?)\}/,
  'export interface Asset {\n$1\n  status?: string;\n  quantity?: number;\n}'
);

fs.writeFileSync('jianghu-bot/web-dashboard/src/app/worker/page.tsx', fileWorker);
