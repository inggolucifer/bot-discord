const fs = require('fs');

const content = fs.readFileSync('./jianghu-bot/commands/admin/admin.js', 'utf8');
const lelangGroupMatch = content.match(/\.addSubcommandGroup\s*\(\s*group\s*=>\s*group\s*\.setName\('lelang'\)[\s\S]*?(?=\),)/);

if (lelangGroupMatch) {
  const subRegex = /\.addSubcommand\s*\(\s*sub\s*=>\s*sub\s*\.setName\('([^']+)'\)/g;
  let match;
  while ((match = subRegex.exec(lelangGroupMatch[0])) !== null) {
      console.log(`  Subcommand: ${match[1]} -> Key: lelang${match[1].replace(/-/g, '')}`);
  }
}

const othersMatch = content.match(/\/\/ OTHERS[\s\S]*?(?=\.addSubcommandGroup|\),)/);
if(othersMatch) {
    const subRegex = /\.addSubcommand\s*\(\s*sub\s*=>\s*sub\s*\.setName\('([^']+)'\)/g;
    let match;
    console.log("\n--- OTHERS ---");
    while ((match = subRegex.exec(othersMatch[0])) !== null) {
        console.log(`  Subcommand: ${match[1]} -> Key: ${match[1].replace(/-/g, '')}`);
    }
}
