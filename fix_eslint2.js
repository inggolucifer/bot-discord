const fs = require('fs');

const path = 'jianghu-bot/web-dashboard/src/app/market/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = '} catch (err: unknown) {';
const replacement = '} catch {';
if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content);
    console.log("Fixed unused 'err' in market/page.tsx");
} else {
    console.log("Could not find catch block in market/page.tsx to fix unused variable");
}
