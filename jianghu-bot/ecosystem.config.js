// Konfigurasi PM2 - proses manager supaya bot tetap jalan 24/7 di VPS
// Cara pakai: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'jianghu-bot',
      script: 'index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'web-frontend',
      script: 'npm',
      args: 'run start',
      cwd: './web-dashboard',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
      }
    }
  ],
};
