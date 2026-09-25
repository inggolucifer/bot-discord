
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Player = require('../../models/Player');
const EmailVerification = require('../../models/EmailVerification');
const { sendOtpEmail } = require('../utils/emailService');
const { JWT_SECRET } = require('../utils/jwtSecret');
const { authenticateToken } = require('../middlewares/auth');

const express = require('express');
const router = express.Router();

// Helper validasi nama karakter: 5-7 huruf abjad alfabet murni, tanpa spasi, tanpa angka
function validateCharacterName(name) {
    if (!name || typeof name !== 'string') {
        return { valid: false, error: 'Nama pendekar wajib diisi.' };
    }
    const trimmed = name.trim();
    if (/\s/.test(trimmed)) {
        return { valid: false, error: 'Nama pendekar tidak boleh mengandung spasi.' };
    }
    if (/\d/.test(trimmed)) {
        return { valid: false, error: 'Nama pendekar tidak boleh mengandung angka.' };
    }
    if (!/^[a-zA-Z]+$/.test(trimmed)) {
        return { valid: false, error: 'Hanya boleh menggunakan huruf alfabet murni (A-Z, a-z).' };
    }
    if (trimmed.length < 5 || trimmed.length > 7) {
        return { valid: false, error: 'Nama pendekar harus terdiri dari 5 hingga 7 huruf.' };
    }
    return { valid: true, name: trimmed };
}

// Helper untuk menandatangani JWT dan menyetel cookie sesi
function issueAuthSession(res, player) {
    const tokenPayload = {
        userId: player.discordId,
        username: player.username || player.characterName,
        avatar: player.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png',
        guildId: player.guildId || process.env.GUILD_ID || 'DEFAULT_GUILD'
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

    return {
        accessToken,
        user: {
            id: player.discordId,
            username: player.username || player.characterName,
            avatar: player.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png',
            hasCharacter: true,
            appearanceCompleted: !!player.appearanceCompleted,
            character: {
                characterName: player.characterName,
                realm: player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)',
                gender: player.gender,
                body: player.body
            }
        }
    };
}

// Verifikasi Google Token resmi (Google Identity Services)
async function verifyGoogleToken(token) {
    if (!token) throw new Error('Token Google tidak ditemukan.');

    // Dukungan mode simulasi/testing pengembang lokal jika Google Client ID belum aktif
    if (token.startsWith('simulated_google_')) {
        if (process.env.NODE_ENV !== 'production') {
            const parts = token.split('_');
            const email = parts[2] ? decodeURIComponent(parts[2]) : 'cultivator@jianghu.local';
            return {
                email: email,
                sub: 'sim_' + Buffer.from(email).toString('hex').slice(0, 16),
                name: 'Cultivator',
                picture: 'https://cdn.discordapp.com/embed/avatars/0.png'
            };
        }
        throw new Error('Token simulasi tidak diizinkan di lingkungan produksi.');
    }

    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`;
    const response = await axios.get(url, { timeout: 10000 });
    const payload = response.data;

    if (!payload || !payload.email || !payload.sub) {
        throw new Error('Data token Google tidak valid atau telah kadaluarsa.');
    }

    return payload;
}

const VALID_STARTER_OUTFITS = [
    'outfit_vagrant_black',
    'outfit_mortal_linen',
    'outfit_outer_disciple',
    'outfit_wanderer_bamboo',
    'outfit_novice_daoist'
];

const VALID_FACES = ['face_01', 'face_02', 'face_03', 'face_04'];
const VALID_FRONT_HAIRS = ['front_hair_01', 'front_hair_02', 'front_hair_03', 'front_hair_04'];
const VALID_BACK_HAIRS = ['back_hair_01', 'back_hair_02', 'back_hair_03', 'back_hair_04'];

// Endpoint: GET /api/auth/check-name (Pengecekan Nama Real-Time untuk Centang Hijau)
router.get('/check-name', async (req, res) => {
    try {
        const { name } = req.query;
        const validation = validateCharacterName(name);
        if (!validation.valid) {
            return res.json({
                success: true,
                available: false,
                error: validation.error
            });
        }

        const trimmedName = validation.name;
        // Pengecekan case-insensitive di database
        const existingPlayer = await Player.findOne({
            characterName: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
        });

        if (existingPlayer) {
            return res.json({
                success: true,
                available: false,
                error: 'Nama ini sudah digunakan oleh pendekar lain di Jianghu.'
            });
        }

        return res.json({
            success: true,
            available: true,
            message: 'Nama pendekar sah dan tersedia untuk digunakan!'
        });
    } catch (err) {
        console.error('[API-AUTH] Check Name Error:', err);
        res.status(500).json({ error: 'Gagal memeriksa ketersediaan nama.' });
    }
});

// Endpoint: POST /api/auth/email-register (Registrasi Email + Password + Nama 5-7 Huruf)
router.post('/email-register', async (req, res) => {
    try {
        const { email, password, characterName, gender } = req.body;
        if (!email || !password || !characterName) {
            return res.status(400).json({ error: 'Email, Password, dan Nama Karakter wajib diisi.' });
        }

        const nameValidation = validateCharacterName(characterName);
        if (!nameValidation.valid) {
            return res.status(400).json({ error: nameValidation.error });
        }
        const trimmedName = nameValidation.name;

        // Pengecekan email
        const existingEmail = await Player.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ error: 'Email ini sudah terdaftar. Silakan langsung login.' });
        }

        // Pengecekan nama kembar
        const nameTaken = await Player.findOne({
            characterName: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
        });
        if (nameTaken) {
            return res.status(400).json({ error: 'Nama karakter sudah digunakan oleh pendekar lain.' });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const targetGuildId = process.env.GUILD_ID || '1169651733470126100';
        const validGender = (gender === 'Perempuan') ? 'Perempuan' : 'Laki-laki';
        const pseudoDiscordId = `email_${trimmedName.toLowerCase()}_${Date.now()}`;

        const newPlayer = await Player.create({
            discordId: pseudoDiscordId,
            guildId: targetGuildId,
            email,
            username: trimmedName,
            passwordHash,
            characterName: trimmedName,
            gender: validGender,
            appearanceCompleted: false,
            body: {
                face: 'face_01',
                frontHair: 'front_hair_01',
                backHair: 'back_hair_01',
                outfit: 'outfit_vagrant_black',
                hair: 'front_hair_01',
                cloth: 'outfit_vagrant_black'
            },
            age: 18,
            schemaVersion: 2,
            avatarUrl: null,
            currentLocation: {
                regionSlug: 'central_plains',
                settlementName: 'Desa Xingcun',
                buildingName: null
            },
            gridPosition: {
                zoneId: 'tianyuan_world_map',
                tileX: 2455,
                tileY: 2485
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

        // Langsung terbitkan sesi autentikasi agar pemain langsung diarahkan ke Studio Penampilan
        const session = issueAuthSession(res, newPlayer);

        res.json({
            success: true,
            token: session.accessToken,
            user: session.user,
            requiresAppearance: true,
            message: `Karakter ${newPlayer.characterName} berhasil didaftarkan! Silakan sesuaikan penampilanmu.`
        });

    } catch (err) {
        console.error('[API-AUTH] Email Register Error:', err);
        res.status(500).json({ error: 'Gagal mendaftar: ' + err.message });
    }
});

// Endpoint: POST /api/auth/send-otp (Mengirimkan Kode Verifikasi 6-Digit ke Email Pendaftar)
router.post('/send-otp', async (req, res) => {
    try {
        const { email, password, characterName, gender } = req.body;
        if (!email || !password || !characterName) {
            return res.status(400).json({ error: 'Email, Password, dan Nama Karakter wajib diisi.' });
        }

        const nameValidation = validateCharacterName(characterName);
        if (!nameValidation.valid) {
            return res.status(400).json({ error: nameValidation.error });
        }
        const trimmedName = nameValidation.name;
        const normalizedEmail = email.toLowerCase().trim();

        // 1. Pengecekan apakah email sudah terdaftar di Player
        const existingEmail = await Player.findOne({ email: normalizedEmail });
        if (existingEmail) {
            return res.status(400).json({ error: 'Email ini sudah terdaftar sebagai pendekar di Jianghu. Silakan login langsung.' });
        }

        // 2. Pengecekan apakah nama karakter sudah dipakai
        const nameTaken = await Player.findOne({
            characterName: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
        });
        if (nameTaken) {
            return res.status(400).json({ error: 'Nama karakter sudah digunakan oleh pendekar lain.' });
        }

        // 3. Generate 6-Digit OTP acak
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // 4. Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const validGender = (gender === 'Perempuan') ? 'Perempuan' : 'Laki-laki';

        // 5. Simpan / perbarui ke model EmailVerification (berlaku 10 menit via TTL)
        await EmailVerification.findOneAndUpdate(
            { email: normalizedEmail },
            {
                email: normalizedEmail,
                characterName: trimmedName,
                passwordHash,
                gender: validGender,
                otp: otpCode,
                attempts: 0,
                createdAt: new Date()
            },
            { upsert: true, new: true }
        );

        // 6. Kirim email OTP
        const emailResult = await sendOtpEmail(normalizedEmail, trimmedName, otpCode);

        res.json({
            success: true,
            message: `Kode verifikasi 6-digit telah dikirim ke ${normalizedEmail}.`,
            isDevSimulated: emailResult.isDevSimulated,
            devOtp: emailResult.devOtp
        });

    } catch (err) {
        console.error('[API-AUTH] Send OTP Error:', err);
        res.status(500).json({ error: 'Gagal mengirim kode verifikasi: ' + err.message });
    }
});

// Endpoint: POST /api/auth/verify-otp (Validasi Kode 6-Digit & Aktivasi Akun Pendekar)
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ error: 'Email dan Kode Verifikasi wajib diisi.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const cleanOtp = otp.toString().trim();

        const record = await EmailVerification.findOne({ email: normalizedEmail });
        if (!record) {
            return res.status(400).json({
                error: 'Kode verifikasi telah kedaluwarsa atau tidak ditemukan. Silakan minta kode baru.'
            });
        }

        if (record.attempts >= 5) {
            await EmailVerification.deleteOne({ _id: record._id });
            return res.status(400).json({
                error: 'Terlalu banyak percobaan salah. Kode dinonaktifkan demi keamanan. Silakan minta kode baru.'
            });
        }

        if (record.otp !== cleanOtp) {
            record.attempts += 1;
            await record.save();
            return res.status(400).json({
                error: `Kode verifikasi tidak cocok. Sisa kesempatan: ${5 - record.attempts} kali.`
            });
        }

        // Verifikasi Sukses! Buat Karakter Player resmi
        const targetGuildId = process.env.GUILD_ID || '1169651733470126100';
        const pseudoDiscordId = `email_${record.characterName.toLowerCase()}_${Date.now()}`;

        const newPlayer = await Player.create({
            discordId: pseudoDiscordId,
            guildId: targetGuildId,
            email: record.email,
            username: record.characterName,
            passwordHash: record.passwordHash,
            characterName: record.characterName,
            gender: record.gender,
            appearanceCompleted: false,
            body: {
                face: 'face_01',
                frontHair: 'front_hair_01',
                backHair: 'back_hair_01',
                outfit: 'outfit_vagrant_black',
                hair: 'front_hair_01',
                cloth: 'outfit_vagrant_black'
            },
            age: 18,
            schemaVersion: 2,
            avatarUrl: null,
            currentLocation: {
                regionSlug: 'central_plains',
                settlementName: 'Desa Xingcun',
                buildingName: null
            },
            gridPosition: {
                zoneId: 'tianyuan_world_map',
                tileX: 2455,
                tileY: 2485
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

        // Hapus dokumen verifikasi setelah sukses
        await EmailVerification.deleteOne({ _id: record._id });

        // Terbitkan sesi login
        const session = issueAuthSession(res, newPlayer);

        res.json({
            success: true,
            token: session.accessToken,
            user: session.user,
            requiresAppearance: true,
            message: `Verifikasi berhasil! Selamat datang, Pendekar ${newPlayer.characterName}.`
        });

    } catch (err) {
        console.error('[API-AUTH] Verify OTP Error:', err);
        res.status(500).json({ error: 'Gagal memverifikasi kode: ' + err.message });
    }
});

// Endpoint: POST /api/auth/google (Google Sign-In & Verification)
router.post('/google', async (req, res) => {
    try {
        const { credential, id_token, token } = req.body;
        const googleToken = credential || id_token || token;

        if (!googleToken) {
            return res.status(400).json({ error: 'Token otorisasi Google tidak ditemukan.' });
        }

        const googlePayload = await verifyGoogleToken(googleToken);
        const { email, sub: googleId, name, picture } = googlePayload;

        // Cari apakah pemain dengan googleId atau email sudah ada
        let player = await Player.findOne({
            $or: [{ googleId }, { email }]
        });

        if (player) {
            // Sinkronkan googleId jika belum terikat
            if (!player.googleId) {
                player.googleId = googleId;
                await player.save();
            }

            const session = issueAuthSession(res, player);
            return res.json({
                success: true,
                token: session.accessToken,
                user: session.user,
                requiresAppearance: !player.appearanceCompleted
            });
        }

        // Pengguna Google Baru: Butuh mengisi nama (5-7 huruf) dan gender
        // Buat nama saran awal dari nama Google
        let suggestedName = '';
        if (name) {
            const cleanLetters = name.replace(/[^a-zA-Z]/g, '');
            if (cleanLetters.length >= 5) {
                suggestedName = cleanLetters.slice(0, 7);
            }
        }

        return res.json({
            success: true,
            isNewUser: true,
            email,
            googleId,
            suggestedName
        });

    } catch (err) {
        console.error('[API-AUTH] Google Auth Error:', err);
        res.status(400).json({ error: 'Gagal mengautentikasi dengan Google: ' + err.message });
    }
});

// Endpoint: POST /api/auth/google-finalize (Pengguna Baru Google Mengisi Nama & Gender)
router.post('/google-finalize', async (req, res) => {
    try {
        const { googleToken, email, googleId, characterName, gender } = req.body;

        if (!email || !googleId || !characterName) {
            return res.status(400).json({ error: 'Data pendaftaran Google tidak lengkap.' });
        }

        const nameValidation = validateCharacterName(characterName);
        if (!nameValidation.valid) {
            return res.status(400).json({ error: nameValidation.error });
        }
        const trimmedName = nameValidation.name;

        // Cek kembali ketersediaan email dan nama
        const existingPlayer = await Player.findOne({
            $or: [
                { email },
                { googleId },
                { characterName: { $regex: new RegExp(`^${trimmedName}$`, 'i') } }
            ]
        });

        if (existingPlayer) {
            if (existingPlayer.characterName.toLowerCase() === trimmedName.toLowerCase()) {
                return res.status(400).json({ error: 'Nama karakter sudah digunakan pendekar lain.' });
            }
            return res.status(400).json({ error: 'Akun ini sudah terdaftar sebelumnya. Silakan login langsung.' });
        }

        const targetGuildId = process.env.GUILD_ID || '1169651733470126100';
        const validGender = (gender === 'Perempuan') ? 'Perempuan' : 'Laki-laki';
        const pseudoDiscordId = `google_${googleId.slice(0, 20)}_${Date.now()}`;

        const newPlayer = await Player.create({
            discordId: pseudoDiscordId,
            guildId: targetGuildId,
            email,
            googleId,
            username: trimmedName,
            characterName: trimmedName,
            gender: validGender,
            appearanceCompleted: false,
            body: {
                face: 'face_01',
                frontHair: 'front_hair_01',
                backHair: 'back_hair_01',
                outfit: 'outfit_vagrant_black',
                hair: 'front_hair_01',
                cloth: 'outfit_vagrant_black'
            },
            age: 18,
            schemaVersion: 2,
            avatarUrl: null,
            currentLocation: {
                regionSlug: 'central_plains',
                settlementName: 'Desa Xingcun',
                buildingName: null
            },
            gridPosition: {
                zoneId: 'tianyuan_world_map',
                tileX: 2455,
                tileY: 2485
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

        const session = issueAuthSession(res, newPlayer);

        res.json({
            success: true,
            token: session.accessToken,
            user: session.user,
            requiresAppearance: true,
            message: `Karakter ${newPlayer.characterName} berhasil didaftarkan via Google! Silakan tentukan penampilanmu.`
        });

    } catch (err) {
        console.error('[API-AUTH] Google Finalize Error:', err);
        res.status(500).json({ error: 'Gagal menyelesaikan pendaftaran Google: ' + err.message });
    }
});

// Endpoint: POST /api/auth/set-appearance (Menyimpan Kustomisasi Penampilan Karakter)
router.post('/set-appearance', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { face, frontHair, backHair, outfit } = req.body;

        const player = await Player.findOne({ discordId: userId });
        if (!player) {
            return res.status(404).json({ error: 'Pendekar tidak ditemukan.' });
        }

        // Validasi pilihan starter outfit
        const chosenOutfit = VALID_STARTER_OUTFITS.includes(outfit) ? outfit : 'outfit_vagrant_black';
        const chosenFace = VALID_FACES.includes(face) ? face : 'face_01';
        const chosenFrontHair = VALID_FRONT_HAIRS.includes(frontHair) ? frontHair : 'front_hair_01';
        const chosenBackHair = VALID_BACK_HAIRS.includes(backHair) ? backHair : 'back_hair_01';

        if (!player.body) player.body = {};
        player.body.face = chosenFace;
        player.body.frontHair = chosenFrontHair;
        player.body.backHair = chosenBackHair;
        player.body.outfit = chosenOutfit;
        player.body.cloth = chosenOutfit; // backward compatibility
        player.body.hair = chosenFrontHair; // backward compatibility

        player.appearanceCompleted = true;
        await player.save();

        res.json({
            success: true,
            message: 'Penampilan pendekar berhasil dipahat di Jianghu!',
            body: player.body,
            appearanceCompleted: true
        });

    } catch (err) {
        console.error('[API-AUTH] Set Appearance Error:', err);
        res.status(500).json({ error: 'Gagal menyimpan penampilan karakter: ' + err.message });
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
                appearanceCompleted: !!player.appearanceCompleted,
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
                currency: { copper: 500, silver: 10, gold: 0, jade: 0, spirit: 0 },
                schemaVersion: 2,
                avatarUrl: null,
                currentLocation: {
                    regionSlug: 'central_plains',
                    settlementName: 'Desa Xingcun',
                    buildingName: null
                },
                gridPosition: {
                    zoneId: 'tianyuan_world_map',
                    tileX: 2455,
                    tileY: 2485
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
            avatar: avatarUrl,
            guildId: player?.guildId || process.env.GUILD_ID || 'DEFAULT_GUILD'
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
            avatar: user.avatar,
            guildId: user.guildId || process.env.GUILD_ID || 'DEFAULT_GUILD'
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
            avatar: user.avatar,
            guildId: user.guildId || process.env.GUILD_ID || 'DEFAULT_GUILD'
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
                appearanceCompleted: !!player?.appearanceCompleted,
                character: player ? {
                    characterName: player.characterName,
                    realm: player.systemCultivation?.realm || 'Fondasi Fana (Mortal Foundation)',
                    guildId: player.guildId,
                    gender: player.gender,
                    totalWealth: player.totalWealth || 0,
                    body: player.body || {
                        face: 'face_01',
                        frontHair: 'front_hair_01',
                        backHair: 'back_hair_01',
                        outfit: 'outfit_vagrant_black'
                    }
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
            currency: { copper: 500, silver: 10, gold: 0, jade: 0, spirit: 0 },
            schemaVersion: 2,
            avatarUrl: req.user.avatar || null,
            currentLocation: {
                regionSlug: 'central_plains',
                settlementName: 'Desa Xingcun',
                buildingName: null
            },
            gridPosition: {
                zoneId: 'tianyuan_world_map',
                tileX: 2455,
                tileY: 2485
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