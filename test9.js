const fs = require('fs');
const content = fs.readFileSync('./jianghu-bot/commands/admin/admin.js', 'utf8');

const regex = /\.addSubcommandGroup\s*\(\s*group\s*=>\s*group\s*\.setName\('player'\)[\s\S]*?(?=\.addSubcommandGroup)/g;
const match = regex.exec(content);
if(match) console.log(match[0]);
