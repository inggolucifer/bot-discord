const fs = require('fs');
let fileHelp = fs.readFileSync('jianghu-bot/commands/player/help.js', 'utf8');
fileHelp = fileHelp.replace(/, `\/claim-profit` — Klaim profit aset \(Kecuali aset auto-produksi\)/, '');
fileHelp = fileHelp.replace(/, `claim-profit`/, '');
fs.writeFileSync('jianghu-bot/commands/player/help.js', fileHelp);

let fileSekte = fs.readFileSync('jianghu-bot/commands/player/sekte.js', 'utf8');
fileSekte = fileSekte.replace(/\.addSubcommand\(sub => sub\.setName\('claim-profit'\)\.setDescription\('Klaim profit harian dari aset-aset milik sekte'\)\)\n/g, '');
fileSekte = fileSekte.replace(/if \(sub === 'claim-profit'\) return sekteClaimProfitService\.execute\(interaction\);\n/g, '');
fileSekte = fileSekte.replace(/const sekteClaimProfitService = require\('\.\.\/\.\.\/services\/player\/sekte\/sekteClaimProfit'\);\n/g, '');
fs.writeFileSync('jianghu-bot/commands/player/sekte.js', fileSekte);

let fileSekteWeb = fs.readFileSync('jianghu-bot/web-api/routes/sect.js', 'utf8');
fileSekteWeb = fileSekteWeb.replace(/router\.post\('\/assets\/claim-profit', authenticateToken, async \(req, res\) => \{[\s\S]*?\}\);\n\n/g, '');
fs.writeFileSync('jianghu-bot/web-api/routes/sect.js', fileSekteWeb);

let filePlayerWeb = fs.readFileSync('jianghu-bot/web-api/routes/player.js', 'utf8');
filePlayerWeb = filePlayerWeb.replace(/router\.post\('\/assets\/claim-profit', authenticateToken, async \(req, res\) => \{[\s\S]*?\}\);\n\n/g, '');
fs.writeFileSync('jianghu-bot/web-api/routes/player.js', filePlayerWeb);

// Text updates
let fileBangun = fs.readFileSync('jianghu-bot/services/player/asset/bangunAsset.js', 'utf8');
fileBangun = fileBangun.replace(/sebelum bisa di-claim-profit\/craft/g, 'sebelum bisa berproduksi / digunakan');
fs.writeFileSync('jianghu-bot/services/player/asset/bangunAsset.js', fileBangun);

let fileBeli = fs.readFileSync('jianghu-bot/services/player/beliService.js', 'utf8');
fileBeli = fileBeli.replace(/sebelum bisa di-claim-profit\/craft/g, 'sebelum bisa berproduksi / digunakan');
fs.writeFileSync('jianghu-bot/services/player/beliService.js', fileBeli);

let fileSetWorker = fs.readFileSync('jianghu-bot/services/admin/adminAssetSetWorker.js', 'utf8');
fileSetWorker = fileSetWorker.replace(/saat di-claim-profit/g, 'secara otomatis saat beroperasi');
fs.writeFileSync('jianghu-bot/services/admin/adminAssetSetWorker.js', fileSetWorker);

let fileForceFinish = fs.readFileSync('jianghu-bot/services/admin/adminAssetFinishConstruction.js', 'utf8');
fileForceFinish = fileForceFinish.replace(/claim-profit\/craft/g, 'berproduksi/craft');
fs.writeFileSync('jianghu-bot/services/admin/adminAssetFinishConstruction.js', fileForceFinish);
