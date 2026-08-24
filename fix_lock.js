const fs = require('fs');
const filepath = 'jianghu-bot/web-api/routes/market.js';
let code = fs.readFileSync(filepath, 'utf8');

// 1. Fix the buy lock
code = code.replace("const lockKey = \`market_playershop_buy_\${listingId}_\${userId}\`;", "const lockKey = \`market_playershop_\${listingId}\`;");

// 2. Fix the cancel lock
code = code.replace("const lockKey = \`market_playershop_cancel_\${listingId}_\${userId}\`;", "const lockKey = \`market_playershop_\${listingId}\`;");

fs.writeFileSync(filepath, code);
