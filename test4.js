const fs = require('fs');
const content = fs.readFileSync('./jianghu-bot/commands/admin/admin.js', 'utf8');

// Use regex to find group name and subcommand names
const groupRegex = /\.addSubcommandGroup\s*\(\s*group\s*=>\s*group\s*\.setName\('([^']+)'\)([\s\S]*?)(?=\.addSubcommandGroup|\.addSubcommand\s*\(\s*sub\s*=>\s*sub\s*\.setName\('(?:realm|leader|set-|clear-))/g;

let match;
while ((match = groupRegex.exec(content)) !== null) {
  const group = match[1];
  const groupContent = match[2];

  const subRegex = /\.addSubcommand\s*\(\s*sub\s*=>\s*sub\s*\.setName\('([^']+)'\)/g;
  let subMatch;
  while ((subMatch = subRegex.exec(groupContent)) !== null) {
    const sub = subMatch[1];
    const expectedKey = `${group}${sub.replace(/-/g, '')}`.toLowerCase();
    console.log(`Group: ${group}, Sub: ${sub}, Expected Key: ${expectedKey}`);
  }
}
