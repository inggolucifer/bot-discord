const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const http = require('http');
const { Server } = require('socket.io');

const setupServer = (client) => {
    const app = express();
    const server = http.createServer(app);

    const cookieParser = require('cookie-parser');

    // Konfigurasi asal yang lebih aman & fleksibel
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'https://immortal-x.online',
        'https://www.immortal-x.online',
        'https://api.immortal-x.online'
    ];
    if (process.env.FRONTEND_URL) {
        allowedOrigins.push(process.env.FRONTEND_URL);
    }

    const isAllowedOrigin = (origin) => {
        if (!origin) return true;
        const normalized = origin.trim().replace(/\/$/, '').toLowerCase();
        if (allowedOrigins.some(o => o.toLowerCase() === normalized)) return true;
        if (allowedOrigins.includes('*')) return true;
        if (normalized.endsWith('immortal-x.online')) return true;
        if (normalized.includes('localhost') || normalized.includes('127.0.0.1')) return true;
        return false;
    };

    const corsOptions = {
        origin: function (origin, callback) {
            if (isAllowedOrigin(origin)) {
                return callback(null, true);
            }
            // Return false instead of throwing Error to prevent 500 crashes
            return callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'Accept', 'Origin'],
        exposedHeaders: ['Set-Cookie']
    };

    // Apply CORS before other middlewares
    app.use(cors(corsOptions));

    // Handle preflight OPTIONS explicitly for all routes (Express 5 safe)
    app.use((req, res, next) => {
        const origin = req.headers.origin;
        if (origin && isAllowedOrigin(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With, Accept, Origin');
        }
        if (req.method === 'OPTIONS') {
            return res.sendStatus(204);
        }
        next();
    });

    // Security middlewares
    app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
    app.use(cookieParser());
    app.use(express.json());

    const io = new Server(server, {
        path: '/api/socket.io',
        cors: {
            origin: function (origin, callback) {
                if (isAllowedOrigin(origin)) {
                    callback(null, true);
                } else {
                    callback(null, false);
                }
            },
            methods: ["GET", "POST", "OPTIONS"],
            credentials: true
        },
        transports: ['polling', 'websocket'],
        allowEIO3: true
    });


    // io moved up


    // io moved up


    // Basic Rate Limiting to prevent brute force/spam API calls
    const apiLimiter = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute windows
        max: 60, // Limit each IP to 60 requests per windowMs
        message: 'Terlalu banyak permintaan dari IP ini, silakan coba lagi setelah 1 menit.',
        standardHeaders: true,
        legacyHeaders: false,
    });

    // Strict limiter for transactions (Anti-Spam Click)
    const transactionLimiter = rateLimit({
        windowMs: 3 * 1000, // 3 seconds window
        max: 1, // Max 1 transaction per 3 seconds per IP
        message: 'Aksi terlalu cepat, harap tunggu beberapa detik (Anti-Spam).'
    });

    // Kecualikan /api/socket.io dari apiLimiter agar tidak memutus polling Socket.io
    app.use('/api/', (req, res, next) => {
        if (req.path.startsWith('/socket.io')) {
            return next();
        }
        return apiLimiter(req, res, next);
    });

    // Apply transactionLimiter to mutating routes
    const transactionRoutes = [
        '/api/market/buy',
        '/api/market/sell',
        '/api/market/bid',
        '/api/worker/hire',
        '/api/inventory/craft',
        '/api/player/transfer',
        '/api/barter/offers',
        '/api/player/daily',
        '/api/player/loot',
        '/api/pet/feed',
        '/api/player/laws/learn',
        '/api/player/laws/reset',
        '/api/sect/donate',
        '/api/pet/heal',
        '/api/pet/battle',
        '/api/pve/start',
        '/api/professions/start',
        '/api/professions/complete',
        '/api/professions/unlock',
        '/api/pve/claim',
        '/api/minigame/acupoint/submit',
        '/api/minigame/kata/submit',
        '/api/minigame/crucible/submit',
        '/api/world/zone/enter-property',
        '/api/world/zone/upgrade-property-facility'
    ];
    app.use((req, res, next) => {
        if (transactionRoutes.some(route => req.path.startsWith(route)) || req.path.startsWith('/api/transaction/')) {
             return transactionLimiter(req, res, next);
        }
        next();
    });

    // Pass discord client to req for routes to use (e.g. fetching user info)
    app.use((req, res, next) => {
        req.discordClient = client;
        req.io = io;
        next();
    });

    // API Routes
    const authRoutes = require('./routes/auth');
    const barterRoutes = require('./routes/barter');
    const playerRoutes = require('./routes/player');
    const inventoryRoutes = require('./routes/inventory');
    const marketRoutes = require('./routes/market');
    const sectRoutes = require('./routes/sect');
    const sectExamRoutes = require('./routes/sectExam');
    const workerRoutes = require('./routes/worker');
    const almanackRoutes = require('./routes/almanack');
    const manualsRoutes = require('./routes/manuals');
    const petRoutes = require('./routes/pet');
    const leaderboardRoutes = require('./routes/leaderboard');
    const tournamentRoutes = require('./routes/tournament');
    const cultivationRoutes = require('./routes/cultivation');
    const battleRoutes = require('./routes/battle');
    const adminRoutes = require('./routes/admin');
    const pveRoutes = require('./routes/pve');
    const worldRoutes = require('./routes/world');
    const questRoutes = require('./routes/quest');
    const mapRoutes = require('./routes/map');
    const professionRoutes = require('./routes/professions');
    const equipmentRoutes = require('./routes/equipment');
    const marriageRoutes = require('./routes/marriage');
    const minigameRoutes = require('./routes/minigame');

    app.use('/api/auth', authRoutes);
    app.use('/api/barter', barterRoutes);
    app.use('/api/player', playerRoutes);
    app.use('/api/inventory', inventoryRoutes);
    app.use('/api/market', marketRoutes);
    app.use('/api/sect', sectExamRoutes);
    app.use('/api/sect', sectRoutes);
    app.use('/api/worker', workerRoutes);
    app.use('/api/almanack', almanackRoutes);
    app.use('/api/manuals', manualsRoutes);
    app.use('/api/pet', petRoutes);
    app.use('/api/leaderboard', leaderboardRoutes);
    app.use('/api/tournament', tournamentRoutes);
    app.use('/api/cultivation', cultivationRoutes);
    app.use('/api/battle', battleRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/pve', pveRoutes);
    app.use('/api/world', worldRoutes);
    app.use('/api/world/quests', questRoutes);
    app.use('/api/map', mapRoutes);
    app.use('/api/professions', professionRoutes);
    app.use('/api/equipment', equipmentRoutes);
    app.use('/api/marriage', marriageRoutes);
    app.use('/api/minigame', minigameRoutes);

    const gridSimulationRoutes = require('./routes/gridSimulation');
    app.use('/api/grid', gridSimulationRoutes);

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
    // io moved up

    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('./utils/jwtSecret');
    const ChatMessage = require('../models/ChatMessage');

    // Middleware Autentikasi Socket.io
    const cookie = require('cookie');
    io.use((socket, next) => {
        let token = socket.handshake.auth.token;

        // Try to read from cookie if handshake token is not present
        if (!token && socket.request.headers.cookie) {
            const cookies = cookie.parse(socket.request.headers.cookie);
            token = cookies.accessToken;
        }

        if (!token) {
            return next(new Error('Authentication error: Token missing'));
        }
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) return next(new Error('Authentication error: Invalid token'));
            socket.user = user;
            next();
        });
    });

    io.on('connection', async (socket) => {
        // Rate limiting in-memory per koneksi socket (maksimal 1 pesan per 3 detik)
        let lastMessageTime = 0;

        try {
            // Ambil 50 pesan terakhir dari database
            const chatHistoryDB = await ChatMessage.find().sort({ createdAt: -1 }).limit(50);

            // Format ulang agar sesuai dengan yang diharapkan frontend
            const formattedHistory = chatHistoryDB.reverse().map(msg => ({
                id: msg._id.toString(),
                user: msg.user,
                message: msg.message,
                timestamp: msg.createdAt
            }));

            // Kirim chat history
            socket.emit('chat_history', formattedHistory);
        } catch (error) {
            console.error('[SOCKET] Failed to load chat history:', error);
        }

        socket.on('send_message', async (data) => {
            // Rate Limit
            const now = Date.now();
            if (now - lastMessageTime < 3000) {
                return; // Ignore spam
            }
            lastMessageTime = now;

            // Validasi input
            const messageText = typeof data.message === 'string' ? data.message.trim() : '';
            if (!messageText || messageText.length === 0 || messageText.length > 200) {
                return; // Abaikan pesan kosong atau terlalu panjang
            }

            // Gunakan identitas dari JWT yang terverifikasi, BUKAN dari payload client
            const verifiedUser = {
                id: socket.user.userId,
                name: socket.user.username,
                avatar: socket.user.avatar
            };

            try {
                // Simpan ke database
                const newMessage = new ChatMessage({
                    user: verifiedUser,
                    message: messageText
                });
                await newMessage.save();

                // Format untuk di-broadcast
                const broadcastMessage = {
                    id: newMessage._id.toString(),
                    user: verifiedUser,
                    message: messageText,
                    timestamp: newMessage.createdAt
                };

                io.emit('new_message', broadcastMessage);
            } catch (error) {
                console.error('[SOCKET] Failed to save chat message:', error);
            }
        });


    });

    return { app, server, io };
};

module.exports = setupServer;

if (require.main === module) {
    require('dotenv').config();
    const { connectDB } = require('../config/database');
    const dns = require('dns');
    try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch (e) {}

    (async () => {
        try {
            await connectDB();
            const dummyClient = {
                guilds: { cache: new Map() },
                user: { username: 'Jianghu-System' },
                channels: { fetch: async () => null }
            };
            setupServer(dummyClient);
            console.log('[API] Server running independently in Standalone Web-First Mode.');
        } catch (err) {
            console.error('[API] Failed to start standalone API server:', err);
            process.exit(1);
        }
    })();
}
