const fs = require('fs');
const filepath = 'jianghu-bot/utils/cultivation.js';
let content = fs.readFileSync(filepath, 'utf8');

if (!content.includes("function getRealmName(idx)")) {
    content += `

function getRealmName(idx) {
  const realm = SYSTEM_REALMS[idx];
  if (realm) return realm.name;
  return 'Unknown Realm';
}
module.exports.getRealmName = getRealmName;
`;
}
fs.writeFileSync(filepath, content);
console.log('patched');
