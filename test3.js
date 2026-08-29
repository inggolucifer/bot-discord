const fs = require('fs');

const content = fs.readFileSync('./jianghu-bot/commands/admin/admin.js', 'utf8');
const subcommandGroups = [...content.matchAll(/\.setName\('([^']+)'\)/g)].map(m => m[1]);
console.log(subcommandGroups);
