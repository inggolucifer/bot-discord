const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const setupServer = (client) => {
    const app = express();

    // Security middlewares
    app.use(helmet());
    app.use(cors({
        origin: '*', // For development. Change to your domain in production
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

    app.use('/api/auth', authRoutes);
    app.use('/api/player', playerRoutes);
    app.use('/api/inventory', inventoryRoutes);

    // Root test endpoint
    app.get('/api/health', (req, res) => {
        res.json({ status: 'OK', message: 'Jianghu API Server is running', antiCheat: 'Active' });
    });

    // Start server
    const PORT = process.env.API_PORT || 3000;
    app.listen(PORT, () => {
        console.log(`[API] Web API Server running on port ${PORT}`);
        console.log(`[API] Anti-Cheat Locks & Rate Limiters Initialized.`);
    });

    return app;
};

module.exports = setupServer;
