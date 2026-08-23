const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const http = require('http');
const { Server } = require('socket.io');

const setupServer = (client) => {
    const app = express();
    const server = http.createServer(app);

    // Security middlewares
    app.use(helmet());

    // Konfigurasi asal yang lebih aman
    const allowedOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['http://localhost:3000', 'https://immortal-x.online', 'https://www.immortal-x.online'];

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
    app.use(express.json());

    // Basic Rate Limiting to prevent brute force/spam API calls
    const apiLimiter = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minutes
        max: 60, // Limit each IP to 60 requests per windowMs
        message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi setelah 1 menit.',
        standardHeaders: true,
        legacyHeaders: false,
    });

    // Strict limiter for transactions (Anti-Spam Click)
    const transactionLimiter = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 15, // Max 15 transactions per minute per IP
        message: 'Anda melakukan transaksi terlalu cepat. Mohon perlambat.'
    });

    app.use('/api/', apiLimiter);
    app.use('/api/transaction/', transactionLimiter);

    // Pass discord client to req for routes to use (e.g. fetching user info)
    app.use((req, res, next) => {
        req.discordClient = client;
        next();
    });

    // API Routes
    const authRoutes = require('./routes/auth');
    const playerRoutes = require('./routes/player');
    const inventoryRoutes = require('./routes/inventory');
    const marketRoutes = require('./routes/market');
    const sectRoutes = require('./routes/sect');
    const workerRoutes = require('./routes/worker');
    const almanackRoutes = require('./routes/almanack');
    const petRoutes = require('./routes/pet');

    app.use('/api/auth', authRoutes);
    app.use('/api/player', playerRoutes);
    app.use('/api/inventory', inventoryRoutes);
    app.use('/api/market', marketRoutes);
    app.use('/api/sect', sectRoutes);
    app.use('/api/worker', workerRoutes);
    app.use('/api/almanack', almanackRoutes);
    app.use('/api/pet', petRoutes);

    // Root test endpoint
    app.get('/api/health', (req, res) => {
        res.json({ status: 'OK', message: 'Jianghu API Server is running', antiCheat: 'Active' });
    });

    // Start server
    const PORT = process.env.API_PORT || 3001;
    server.listen(PORT, () => {
        console.log(`[API] Web API Server running on port ${PORT}`);
        console.log(`[API] Anti-Cheat Locks & Rate Limiters Initialized.`);
    });

    // Setup Socket.io
    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"]
        }
    });

    // Chat history in memory
    const chatHistory = [];

    io.on('connection', (socket) => {
        // Send chat history to new connection
        socket.emit('chat_history', chatHistory);

        socket.on('send_message', (data) => {
            if (!data.user || !data.message) return;
            const message = {
                id: Date.now().toString(),
                user: data.user, // { id, name, avatar }
                message: data.message,
                timestamp: new Date()
            };

            chatHistory.push(message);
            if (chatHistory.length > 50) {
                chatHistory.shift();
            }

            io.emit('new_message', message);
        });
    });

    return { app, server, io };
};

module.exports = setupServer;
