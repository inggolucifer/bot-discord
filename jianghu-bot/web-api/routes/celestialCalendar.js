/**
 * CELESTIAL CALENDAR API ROUTES
 * 
 * - GET /api/celestial-calendar/events → Mengambil jadwal 3 fenomena astronomi kosmik
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');

router.get('/events', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    data: {
      events: [
        {
          id: 'twin_moon_eclipse',
          title: 'Gerhana Bulan Kembar (Celestial Alignment)',
          frequency: '1× Sebulan (Tgl 15)',
          isActive: false,
          buffDescription: 'Kecepatan meditasi Qi semesta berlipat ganda (Qi Rate ×2) di seluruh benua!',
          icon: '🌕'
        },
        {
          id: 'midnight_bell',
          title: 'Malam Lonceng Pencerahan (Midnight Enlightenment)',
          frequency: 'Setiap Rabu 20:00–23:00',
          isActive: false,
          buffDescription: 'Kecepatan pemahaman kitab kungfu +50% dan channeling rate ×1.5 selama 3 jam.',
          icon: '🔔'
        },
        {
          id: 'secret_leyline_gates',
          title: 'Pintu Formasi Leylines Rahasia',
          frequency: 'Terbuka 72 Jam Sebulan',
          isActive: true,
          buffDescription: 'Muncul 3 titik koordinat formasi purba dengan tambang meteorit dan herba langka.',
          icon: '🌌'
        }
      ]
    }
  });
});

module.exports = router;
