const fs = require('fs');

const utilContent = `function escapeRegex(string) {
    if (typeof string !== 'string') return string;
    return string.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\\\$&');
}

module.exports = { escapeRegex };
`;
fs.writeFileSync('jianghu-bot/utils/escapeRegex.js', utilContent);

const files = fs.readdirSync('jianghu-bot/services/admin').filter(f => f.endsWith('.js'));
let modified = 0;
for (const f of files) {
    const p = `jianghu-bot/services/admin/${f}`;
    let code = fs.readFileSync(p, 'utf8');
    if (code.includes('new RegExp')) {
        let changed = false;
        if (!code.includes("escapeRegex")) {
            code = "const { escapeRegex } = require('../../utils/escapeRegex');\n" + code;
            changed = true;
        }

        // This is tricky to regex replace safely. Let's do it with a careful replace.
        code = code.replace(/new RegExp\(\`\^\\$\{(.*?)\}\\$\`,\s*'i'\)/g, (match, p1) => {
             changed = true;
             return `new RegExp(\`^\${escapeRegex(${p1})}\$\`, 'i')`;
        });

        code = code.replace(/new RegExp\(focused(.*?),\s*'i'\)/g, (match, p1) => {
             changed = true;
             return `new RegExp(escapeRegex(focused${p1}), 'i')`;
        });

        if (changed) {
            fs.writeFileSync(p, code);
            modified++;
        }
    }
}
console.log(`Modified ${modified} files.`);
