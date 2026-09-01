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
    app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

    // Konfigurasi asal yang lebih aman

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
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
        '/api/player/daily',
        '/api/player/loot',
        '/api/pet/feed',
        '/api/pet/heal',
        '/api/pet/battle'
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
    const leaderboardRoutes = require('./routes/leaderboard');
    const tournamentRoutes = require('./routes/tournament');
    const cultivationRoutes = require('./routes/cultivation');

    app.use('/api/auth', authRoutes);
    app.use('/api/player', playerRoutes);
    app.use('/api/inventory', inventoryRoutes);
    app.use('/api/market', marketRoutes);
    app.use('/api/sect', sectRoutes);
    app.use('/api/worker', workerRoutes);
    app.use('/api/almanack', almanackRoutes);
    app.use('/api/pet', petRoutes);
    app.use('/api/leaderboard', leaderboardRoutes);
    app.use('/api/tournament', tournamentRoutes);

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
        path: '/api/socket.io',
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST", "OPTIONS"],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('./utils/jwtSecret');
    const ChatMessage = require('../models/ChatMessage');

    // Middleware Autentikasi Socket.io
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
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
