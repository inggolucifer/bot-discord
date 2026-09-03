const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const Player = require('../../models/Player');
const { JWT_SECRET } = require('../utils/jwtSecret');

const router = express.Router();

// Route for the frontend to exchange a Discord OAuth code for a JWT
router.post('/login', async (req, res) => {
    const { code, redirectUri } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
    }

    try {
        // 1. Exchange the code for an access token with Discord
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri
        }).toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const discordAccessToken = tokenResponse.data.access_token;

        // 2. Fetch the user's data from Discord using the access token
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: {
                authorization: `Bearer ${discordAccessToken}`
            }
        });

        const discordUser = userResponse.data;
        const userId = discordUser.id;

        // You might want to get the specific guild the user is in.
        // For now, we rely on the bot's database to verify if they are registered.

        // 3. Pengecekan Karakter (Player)
        const player = await Player.findOne({ discordId: userId });
        const hasCharacter = !!player;

        // 4. Generate our own JWT for session management
        // We embed the userId in the token
        const avatarHash = discordUser.avatar;
        // Fallback to default avatar if avatarHash is null
        const defaultAvatarId = (BigInt(userId) >> 22n) % 6n;
        const defaultAvatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarId}.png`;
        const avatarUrl = avatarHash
            ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`
            : defaultAvatarUrl;

        const tokenPayload = {
            userId: userId,
            username: discordUser.username,
            avatar: avatarUrl
        };

        const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        };

        res.cookie('accessToken', accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('refreshToken', refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            token: accessToken, // Still returning for backward compatibility/local storage during migration, will be phased out
            user: {
                id: userId,
                username: discordUser.username,
                avatar: avatarUrl,
                hasCharacter
            }
        });

    } catch (error) {
        console.error('[API-AUTH] Discord OAuth Error:', error.response ? error.response.data : error.message);

        if (error.response && error.response.data && error.response.data.error === 'invalid_request') {
            return res.status(400).json({ error: 'invalid_request' });
        }

        res.status(500).json({ error: 'Gagal mengautentikasi dengan Discord.' });
    }
});

// Route to refresh token
router.post('/refresh', (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token tidak ditemukan.' });
    }

    jwt.verify(refreshToken, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Refresh token tidak valid atau telah kadaluarsa.' });
        }

        const tokenPayload = {
            userId: user.userId,
            username: user.username,
            avatar: user.avatar
        };

        const newAccessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '15m' });

        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.json({ success: true, token: newAccessToken });
    });
});

// Route to migrate from localStorage to cookies (called by client if local storage token exists but no cookies)
router.post('/migrate', (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token tidak valid' });
        }

        const tokenPayload = {
            userId: user.userId,
            username: user.username,
            avatar: user.avatar
        };

        const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        };

        res.cookie('accessToken', accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('refreshToken', refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ success: true, token: accessToken });
    });
});

// Route to logout (clear cookies)
router.post('/logout', (req, res) => {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ success: true });
});

module.exports = router;