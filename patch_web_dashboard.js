const fs = require('fs');

// Patch Asset Page
let fileAssets = fs.readFileSync('jianghu-bot/web-dashboard/src/app/assets/page.tsx', 'utf8');
fileAssets = fileAssets.replace(
  /<Button onClick=\{handleClaimProfit\} disabled=\{actionLoading\} className="bg-\[\#c5a880\] text-black hover:bg-\[\#b09570\] font-semibold">[\s\S]*?<\/Button>/g,
  ''
);
fileAssets = fileAssets.replace(
  /const handleClaimProfit = async \(\) => \{[\s\S]*?    \};/g,
  ''
);
// Update tulisan card dari klaim manual menjadi otomatis
fileAssets = fileAssets.replace(
  /Waktu tersisa sebelum claim profit/g,
  'Waktu tersisa sebelum panen otomatis'
);
fileAssets = fileAssets.replace(
  /Belum bisa claim profit/g,
  'Belum ada hasil panen (butuh 1 jam)'
);
fs.writeFileSync('jianghu-bot/web-dashboard/src/app/assets/page.tsx', fileAssets);


// Patch Sect Page
let fileSect = fs.readFileSync('jianghu-bot/web-dashboard/src/app/sect/page.tsx', 'utf8');
fileSect = fileSect.replace(
  /<Button onClick=\{handleClaimProfit\} disabled=\{actionLoading\} className="bg-\[\#c5a880\] text-black hover:bg-\[\#b09570\] font-semibold whitespace-nowrap">[\s\S]*?<\/Button>/g,
  ''
);
fileSect = fileSect.replace(
  /const handleClaimProfit = async \(\) => \{[\s\S]*?    \};/g,
  ''
);
// Update tulisan
fileSect = fileSect.replace(
  /Waktu tersisa sebelum claim profit/g,
  'Waktu tersisa sebelum panen otomatis'
);
fileSect = fileSect.replace(
  /Belum bisa claim profit/g,
  'Belum ada hasil panen (butuh 1 jam)'
);
fs.writeFileSync('jianghu-bot/web-dashboard/src/app/sect/page.tsx', fileSect);
