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

        const token = jwt.sign(
            {
                userId: userId,
                username: discordUser.username,
                avatar: avatarUrl
            },
            JWT_SECRET,
            { expiresIn: '24h' } // Token expires in 24 hours
        );

        res.json({
            token,
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

module.exports = router;