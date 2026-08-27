const fs = require('fs');

let fileWorker = fs.readFileSync('jianghu-bot/web-dashboard/src/app/worker/page.tsx', 'utf8');
fileWorker = fileWorker.replace(
  /interface Asset \{[\s\S]*?\}/,
  'interface Asset {\n  id: string;\n  name: string;\n  underConstruction: boolean;\n  assignedWorkers: any[];\n  status?: string;\n  quantity?: number;\n}'
);

fs.writeFileSync('jianghu-bot/web-dashboard/src/app/worker/page.tsx', fileWorker);
