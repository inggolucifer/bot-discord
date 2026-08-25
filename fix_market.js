const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'jianghu-bot/web-dashboard/src/app/market/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  `api.get('/market/auction'),`,
  `api.get('/market/auctions'),`
);

fs.writeFileSync(filePath, content);
console.log('Market Auction API call updated successfully.');
