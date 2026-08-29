const fs = require('fs');

const files = fs.readdirSync('jianghu-bot/services/admin').filter(f => f.endsWith('.js'));
let modified = 0;
for (const f of files) {
    const p = `jianghu-bot/services/admin/${f}`;
    let code = fs.readFileSync(p, 'utf8');

    let changed = false;
    code = code.replace(/new RegExp\(`\^(\$\{.*?\})\$`, 'i'\)/g, (match, p1) => {
         changed = true;
         const inner = p1.substring(2, p1.length - 1); // remove ${ and }
         return `new RegExp(\`^\${escapeRegex(${inner})}\$\`, 'i')`;
    });

    if (changed) {
        fs.writeFileSync(p, code);
        modified++;
    }
}
console.log(`Modified ${modified} files.`);
