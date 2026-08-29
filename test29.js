const fs = require('fs');
const content = fs.readFileSync('./jianghu-bot/commands/admin/admin.js', 'utf8');

const regex = /panel/gi;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log("Found panel in admin.js at index:", match.index);
}
