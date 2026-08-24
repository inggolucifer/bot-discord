const fs = require('fs');
let code = fs.readFileSync('jianghu-bot/web-api/server.js', 'utf8');

const oldSocketCors = `
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"]
        },
`;

const newSocketCors = `
        cors: {
            origin: true,
            methods: ["GET", "POST", "OPTIONS"],
            credentials: true
        },
`;

code = code.replace(oldSocketCors, newSocketCors);

fs.writeFileSync('jianghu-bot/web-api/server.js', code);
console.log('patched socket cors');
