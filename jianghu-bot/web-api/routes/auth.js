const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Player = require('../../models/Player');
const { JWT_SECRET } = require('../utils/jwtSecret');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

// Email & Password Registration (Hybrid Login)
router.post('/email-register', async (req, res) => {
    try {
        const { email, username, password, characterName, gender } = req.body;
        if (!email || !username || !password || !characterName) {
            return res.status(400).json({ error: 'Email, Username, Password, dan Nama Karakter wajib diisi.' });
        }

        // Check if email or username already exists
        const existingUser = await Player.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Email atau Username sudah terdaftar.' });
        }

        const trimmedName = characterName.trim();
        const nameTaken = await Player.findOne({ characterName: trimmedName });
        if (nameTaken) {
            return res.status(400).json({ error: 'Nama karakter sudah digunakan oleh pendekar lain.' });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const targetGuildId = process.env.GUILD_ID || '1169651733470126100';
        const validGender = (gender === 'Perempuan') ? 'Perempuan' : 'Laki-laki';
        
        // ID Semu untuk menjaga relasi lama (atau biarkan null jika diizinkan schema)
        const pseudoDiscordId = `email_${username.toLowerCase()}_${Date.now()}`;

        const newPlayer = await Player.create({
            discordId: pseudoDiscordId,
            guildId: targetGuildId,
            email,
            username,
            passwordHash,
            characterName: trimmedName,
            gender: validGender,
            age: 18,
            schemaVersion: 2,
            avatarUrl: null,
            currentLocation: {
                regionSlug: 'central_plains',
                settlementName: 'Desa Xingcun',
                buildingName: null
            },
            gridPosition: {
                zoneId: 'xingcun_village',
                tileX: 16,
                tileY: 16
            },
            systemCultivation: {
                realm: 'Fondasi Fana (Mortal Foundation)',
                stage: 0,
                qi: 0,
                lastSyncAt: new Date(),
                isFlawedFoundation: false
            },
            currency: {
                copper: 1000,
                silver: 50,
                gold: 1,
                spirit: 0,
                jade: 0
            }
        });

        res.json({
            success: true,
            message: `Karakter ${newPlayer.characterName} berhasil didaftarkan! Silakan login.`,
        });

    } catch (err) {
        console.error('[API-AUTH] Email Register Error:', err);
        res.status(500).json({ error: 'Gagal mendaftar: ' + err.message });
    }
});

// Email & Password Login (Hybrid Login)
router.post('/email-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email dan Password wajib diisi.' });
        }

        const player = await Player.findOne({ email });
        if (!player || !player.passwordHash) {
            return res.status(400).json({ error: 'Email atau password salah.' });
        }

        const isMatch = await bcrypt.compare(password, player.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Email atau password salah.' });
        }

        // Generate token JWT
        const tokenPayload = {
            userId: player.discordId,
            username: player.username || player.characterName,
            avatar: player.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png'
        };

        const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '30d' });

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        };

        res.cookie('accessToken', accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000
        });

        res.cookie('refreshToken', refreshToken, {
            ...cookieOptions,
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            token: accessToken,
            user: {
                id: player.discordId, // Still using discordId field as the universal ID internally
                username: player.username || player.characterName,
                avatar: player.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png',
                hasCharacter: true,
                character: {
                    characterName: player.characterName,
                    realm: player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)',
                    guildId: player.guildId
                }
            }
        });
    } catch (err) {
        console.error('[API-AUTH] Email Login Error:', err);
        res.status(500).json({ error: 'Gagal memproses login: ' + err.message });
    }
});

// Standalone Web Direct Login & Character Registration (Discord-Independent)
router.post('/web-login', async (req, res) => {
    try {
        const { characterName, gender } = req.body;
        if (!characterName || typeof characterName !== 'string' || characterName.trim().length === 0) {
            return res.status(400).json({ error: 'Nama pendekar wajib diisi.' });
        }

        const trimmedName = characterName.trim();
        const targetGuildId = process.env.GUILD_ID || '1169651733470126100';

        // 1. Cari apakah karakter sudah ada
        let player = await Player.findOne({ characterName: trimmedName });

        if (!player) {
            const webUserId = `web_${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
            player = await Player.findOne({ discordId: webUserId });
        }

        if (!player) {
            // Buat Karakter Pendekar Baru langsung di Web
            const webUserId = `web_${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
            const validGender = (gender === 'Perempuan') ? 'Perempuan' : 'Laki-laki';

            player = await Player.create({
                discordId: webUserId,
                guildId: targetGuildId,
                characterName: trimmedName,
                gender: validGender,
                age: 18,
                schemaVersion: 2,
                avatarUrl: null,
                currentLocation: {
                    regionSlug: 'central_plains',
                    settlementName: 'Desa Xingcun',
                    buildingName: null
                },
                gridPosition: {
                    zoneId: 'xingcun_village',
                    tileX: 16,
                    tileY: 16
                },
                systemCultivation: {
                    realm: 'Fondasi Fana (Mortal Foundation)',
                    stage: 0,
                    qi: 0,
                    lastSyncAt: new Date(),
                    isFlawedFoundation: false
                },
                currency: {
                    copper: 1000,
                    silver: 50,
                    gold: 1,
                    spirit: 0,
                    jade: 0
                }
            });
        }

        // Generate token JWT
        const tokenPayload = {
            userId: player.discordId,
            username: player.characterName,
            avatar: player.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png'
        };

        const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '30d' });

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        };

        res.cookie('accessToken', accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000
        });

        res.cookie('refreshToken', refreshToken, {
            ...cookieOptions,
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            token: accessToken,
            user: {
                id: player.discordId,
                username: player.characterName,
                avatar: player.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png',
                hasCharacter: true,
                character: {
                    characterName: player.characterName,
                    realm: player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)',
                    guildId: player.guildId
                }
            }
        });
    } catch (err) {
        console.error('[API-AUTH] Web login error:', err);
        res.status(500).json({ error: 'Gagal memproses login web: ' + err.message });
    }
});

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
        const refreshToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '30d' });

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
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        res.json({
            token: accessToken, // Still returning for backward compatibility/local storage during migration, will be phased out
            user: {
                id: userId,
                username: discordUser.username,
                avatar: avatarUrl,
                hasCharacter,
                character: player ? {
                    characterName: player.characterName,
                    realm: player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)',
                    guildId: player.guildId
                } : null
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
        const refreshToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '30d' });

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
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
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

// Route to check current authenticated session & character status
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId }).lean();

        res.json({
            success: true,
            user: {
                id: userId,
                username: req.user.username,
                avatar: req.user.avatar,
                hasCharacter: !!player,
                character: player ? {
                    characterName: player.characterName,
                    realm: player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)',
                    guildId: player.guildId,
                    totalWealth: player.totalWealth || 0
                } : null
            }
        });
    } catch (err) {
        console.error('[API-AUTH] Error in /me:', err);
        res.status(500).json({ error: 'Gagal mengambil status sesi.' });
    }
});

// Route to register a character directly from Web
router.post('/register-character', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { characterName, gender, age, guildId } = req.body;

        if (!characterName || typeof characterName !== 'string' || characterName.trim().length === 0) {
            return res.status(400).json({ error: 'Nama karakter wajib diisi.' });
        }

        const trimmedName = characterName.trim();
        if (trimmedName.length > 32) {
            return res.status(400).json({ error: 'Nama karakter maksimal 32 karakter.' });
        }

        const targetGuildId = guildId || process.env.GUILD_ID || 'DEFAULT_GUILD';

        // Check if user already has a character
        const existingPlayer = await Player.findOne({ discordId: userId, guildId: targetGuildId });
        if (existingPlayer) {
            return res.status(400).json({
                error: `Kamu sudah memiliki karakter bernama ${existingPlayer.characterName} di server ini.`
            });
        }

        // Check if character name is already taken
        const nameTaken = await Player.findOne({ guildId: targetGuildId, characterName: trimmedName });
        if (nameTaken) {
            return res.status(400).json({ error: 'Nama karakter sudah digunakan oleh pendekar lain. Silakan pilih nama lain.' });
        }

        const validGender = (gender === 'Perempuan') ? 'Perempuan' : 'Laki-laki';
        const parsedAge = Math.min(9999, Math.max(1, parseInt(age, 10) || 16));

        const newPlayer = await Player.create({
            discordId: userId,
            guildId: targetGuildId,
            characterName: trimmedName,
            gender: validGender,
            age: parsedAge,
            schemaVersion: 2,
            avatarUrl: req.user.avatar || null,
            currentLocation: {
                regionSlug: 'central_plains',
                settlementName: 'Desa Xingcun',
                buildingName: null
            },
            gridPosition: {
                zoneId: 'central_plains_bamboo_forest',
                tileX: 0,
                tileY: 0
            },
            systemCultivation: {
                realm: 'Fondasi Fana (Mortal Foundation)',
                stage: 0,
                qi: 0,
                lastSyncAt: new Date(),
                isFlawedFoundation: false
            }
        });

        res.json({
            success: true,
            message: `Karakter ${newPlayer.characterName} berhasil didaftarkan! Selamat datang di Jianghu World.`,
            character: {
                characterName: newPlayer.characterName,
                realm: newPlayer.systemCultivation.realm,
                guildId: newPlayer.guildId,
                gender: newPlayer.gender,
                age: newPlayer.age
            }
        });
    } catch (err) {
        console.error('[API-AUTH] Error in /register-character:', err);
        res.status(500).json({ error: 'Gagal membuat karakter baru.' });
    }
});

module.exports = router;