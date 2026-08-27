const fs = require('fs');
let fileAssets = fs.readFileSync('jianghu-bot/web-dashboard/src/app/assets/page.tsx', 'utf8');

fileAssets = fileAssets.replace(
  /Belum bisa claim profit/g,
  'Belum ada hasil produksi (butuh 1 jam)'
);
fileAssets = fileAssets.replace(
  /Waktu tersisa sebelum claim profit/g,
  'Waktu tersisa sebelum panen otomatis'
);

fs.writeFileSync('jianghu-bot/web-dashboard/src/app/assets/page.tsx', fileAssets);

let fileSect = fs.readFileSync('jianghu-bot/web-dashboard/src/app/sect/page.tsx', 'utf8');
fileSect = fileSect.replace(
  /Belum bisa claim profit/g,
  'Belum ada hasil produksi (butuh 1 jam)'
);
fileSect = fileSect.replace(
  /Waktu tersisa sebelum claim profit/g,
  'Waktu tersisa sebelum panen otomatis'
);

fs.writeFileSync('jianghu-bot/web-dashboard/src/app/sect/page.tsx', fileSect);
