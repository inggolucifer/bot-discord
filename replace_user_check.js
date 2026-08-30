const fs = require('fs');
const file = 'jianghu-bot/web-dashboard/src/app/market/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<div className="flex items-center gap-4">\s*<button\s*onClick=\{([^}]+)\}\s*className="px-4 py-2 bg-amber-900\/80 hover:bg-amber-800 text-amber-100 rounded-lg text-sm border border-amber-700\/50 transition-colors"\s*>\s*Jual ke Sistem\s*<\/button>\s*<\/div>/,
  `{user && (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={$1}
                      className="px-4 py-2 bg-amber-900/80 hover:bg-amber-800 text-amber-100 rounded-lg text-sm border border-amber-700/50 transition-colors"
                    >
                      Jual ke Sistem
                    </button>
                  </div>
                )}`
);

fs.writeFileSync(file, content);
console.log("Restored {user &&} check");
