const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development-only';

// Middleware to authenticate API requests from the frontend using JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    // Format is usually "Bearer <token>"
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ error: 'Akses Ditolak: Token tidak ditemukan.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Akses Ditolak: Token tidak valid atau telah kadaluarsa.' });
        }

        // Add the verified user payload to the request
        // user object will contain { userId, guildId, etc. }
        req.user = user;
        next();
    });
};

module.exports = { authenticateToken };
