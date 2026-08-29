const fs = require('fs');

const playerPath = require('path').join(__dirname, 'jianghu-bot', 'commands', 'player');
const files = fs.readdirSync(playerPath).filter(f => f.endsWith('.js'));
let modified = 0;
for (const f of files) {
    const p = `jianghu-bot/commands/player/${f}`;
    let code = fs.readFileSync(p, 'utf8');

    if (code.includes('new RegExp')) {
        let changed = false;
        if (!code.includes("escapeRegex")) {
            code = "const { escapeRegex } = require('../../utils/escapeRegex');\n" + code;
            changed = true;
        }

        code = code.replace(/new RegExp\(`\^(\$\{.*?\})\$`, 'i'\)/g, (match, p1) => {
             changed = true;
             const inner = p1.substring(2, p1.length - 1);
             return `new RegExp(\`^\${escapeRegex(${inner})}\$\`, 'i')`;
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
console.log(`Modified ${modified} files in player.`);
