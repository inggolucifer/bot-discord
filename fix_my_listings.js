const fs = require('fs');
const filepath = 'jianghu-bot/web-dashboard/src/app/market/page.tsx';
let code = fs.readFileSync(filepath, 'utf8');

code = code.replace("const myListingsRes = await api.get('/market/player-shop/my-listings');\n      const myListingsRes = await api.get('/market/player-shop/my-listings');\n      setMyListings(myListingsRes.data.data);", "const myListingsRes = await api.get('/market/player-shop/my-listings');\n      setMyListings(myListingsRes.data.data);");

fs.writeFileSync(filepath, code);
