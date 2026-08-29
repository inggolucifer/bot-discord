const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('./jianghu-bot/commands/admin/admin.js', 'utf8');

const groups = ['item', 'pet', 'asset', 'shop', 'player', 'channel', 'sekte', 'tournament', 'lelang'];

groups.forEach(groupName => {
    console.log(`\n--- GROUP: ${groupName} ---`);
    const regex = new RegExp(`\\.addSubcommandGroup\\s*\\(\\s*group\\s*=>\\s*group\\s*\\.setName\\('${groupName}'\\)[\\s\\S]*?(?=\\.addSubcommandGroup|\\/\\/ OTHERS)`, 'g');

    let groupMatch;
    while ((groupMatch = regex.exec(content)) !== null) {
        const subRegex = /\.addSubcommand\s*\(\s*sub\s*=>\s*sub\s*\.setName\('([^']+)'\)/g;
        let match;
        while ((match = subRegex.exec(groupMatch[0])) !== null) {
            const sub = match[1];
            const expectedKey = `${groupName}${sub.replace(/-/g, '')}`.toLowerCase();
            console.log(`  Subcommand: ${sub} -> Key: ${expectedKey}`);
        }
    }
});
