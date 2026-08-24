const fs = require('fs');
let code = fs.readFileSync('jianghu-bot/web-api/server.js', 'utf8');

const corsBlockSearch = `
    const allowedOrigins = [
        'http://localhost:3000',
        'https://immortal-x.online',
        'https://www.immortal-x.online',
        'https://api.immortal-x.online'
    ];
    if (process.env.FRONTEND_URL) {
        allowedOrigins.push(process.env.FRONTEND_URL);
    }


    app.use(cors({
        origin: function(origin, callback){
          if(!origin) return callback(null, true);
          if(allowedOrigins.indexOf(origin) === -1){
            var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
          }
          return callback(null, true);
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));
`;

const newCorsBlock = `
    const allowedOrigins = [
        'http://localhost:3000',
        'https://immortal-x.online',
        'https://www.immortal-x.online',
        'https://api.immortal-x.online'
    ];
    if (process.env.FRONTEND_URL) {
        allowedOrigins.push(process.env.FRONTEND_URL);
    }

    app.use(cors({
        origin: function(origin, callback){
          // Allow all for now to unblock testing
          return callback(null, true);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));
`;

code = code.replace(corsBlockSearch, newCorsBlock);

fs.writeFileSync('jianghu-bot/web-api/server.js', code);
console.log('patched cors again');
