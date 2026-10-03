if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('[FATAL SECURITY] JWT_SECRET wajib dikonfigurasi di environment variabel saat NODE_ENV=production. Server menolak startup demi keamanan data.');
}

const JWT_SECRET = process.env.JWT_SECRET || 'jianghu_wuxian_jwt_secret_dev_2026_key_auto';

if (!process.env.JWT_SECRET) {
    console.warn('[SECURITY] JWT_SECRET environment variable is unset. Using default development secret.');
}

module.exports = { JWT_SECRET };
