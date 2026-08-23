const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development-only';

if (JWT_SECRET === 'fallback-secret-for-development-only') {
    console.warn('[WARNING] JWT_SECRET tidak diatur di environment variables! Menggunakan fallback secret. JANGAN gunakan ini di production.');
}

module.exports = { JWT_SECRET };