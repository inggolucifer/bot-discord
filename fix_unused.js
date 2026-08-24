const fs = require('fs');
const filepath = 'jianghu-bot/web-dashboard/src/app/market/page.tsx';
let code = fs.readFileSync(filepath, 'utf8');

code = code.replace("const res = await api.post('/market/shop/buy', { shopId, quantity: quantityToBuy });", "await api.post('/market/shop/buy', { shopId, quantity: quantityToBuy });");
code = code.replace("const res = await api.post('/market/player-shop/buy', { listingId, quantity: quantityToBuy });", "await api.post('/market/player-shop/buy', { listingId, quantity: quantityToBuy });");

fs.writeFileSync(filepath, code);
