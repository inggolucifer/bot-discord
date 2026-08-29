const fs = require('fs');

const content = fs.readFileSync('./jianghu-bot/commands/admin/admin.js', 'utf8');

// Match everything between group 'item' and group 'pet'
const itemGroupMatch = content.match(/\.addSubcommandGroup\s*\(\s*group\s*=>\s*group\s*\.setName\('item'\)[\s\S]*?(?=\.addSubcommandGroup)/);
if (itemGroupMatch) {
  const subRegex = /\.addSubcommand\s*\(\s*sub\s*=>\s*sub\s*\.setName\('([^']+)'\)/g;
  let match;
  console.log("ITEM GROUP SUBCOMMANDS:");
  while ((match = subRegex.exec(itemGroupMatch[0])) !== null) {
    console.log(match[1]);
  }
}

const petGroupMatch = content.match(/\.addSubcommandGroup\s*\(\s*group\s*=>\s*group\s*\.setName\('pet'\)[\s\S]*?(?=\.addSubcommandGroup)/);
if (petGroupMatch) {
  const subRegex = /\.addSubcommand\s*\(\s*sub\s*=>\s*sub\s*\.setName\('([^']+)'\)/g;
  let match;
  console.log("PET GROUP SUBCOMMANDS:");
  while ((match = subRegex.exec(petGroupMatch[0])) !== null) {
    console.log(match[1]);
  }
}

const assetGroupMatch = content.match(/\.addSubcommandGroup\s*\(\s*group\s*=>\s*group\s*\.setName\('asset'\)[\s\S]*?(?=\.addSubcommandGroup)/);
if (assetGroupMatch) {
  const subRegex = /\.addSubcommand\s*\(\s*sub\s*=>\s*sub\s*\.setName\('([^']+)'\)/g;
  let match;
  console.log("ASSET GROUP SUBCOMMANDS:");
  while ((match = subRegex.exec(assetGroupMatch[0])) !== null) {
    console.log(match[1]);
  }
}
