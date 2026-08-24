const fs = require('fs');
let code = fs.readFileSync('jianghu-bot/web-api/server.js', 'utf8');

const replacement = `
    const allowedOrigins = [
        'http://localhost:3000',
        'https://immortal-x.online',
        'https://www.immortal-x.online',
        'https://api.immortal-x.online'
    ];
    if (process.env.FRONTEND_URL) {
        allowedOrigins.push(process.env.FRONTEND_URL);
    }
`;

code = code.replace(/const allowedOrigins = process\.env\.FRONTEND_URL \? \[process\.env\.FRONTEND_URL\] : \['http:\/\/localhost:3000', 'https:\/\/immortal-x\.online', 'https:\/\/www\.immortal-x\.online'\];/, replacement);

fs.writeFileSync('jianghu-bot/web-api/server.js', code);
console.log('patched cors');
