const fs = require('fs');

const path = 'jianghu-bot/web-dashboard/src/app/market/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = '} catch (err: unknown) {';
const replacement = '} catch {';
// The previous replacement only replaced the first occurrence. We need to replace all or target the right one
while(content.includes(target)) {
    content = content.replace(target, replacement);
}

fs.writeFileSync(path, content);
console.log("Fixed all unused 'err' in market/page.tsx");
