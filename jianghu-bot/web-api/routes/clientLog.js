const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Rate limiter: maksimal 20 log per menit per IP
const clientLogLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Rate limit log klien terlampaui.' }
});

// Ring buffer in-memory untuk menyimpan 100 log crash klien terbaru (tanpa token/rahasia)
const memoryLogBuffer = [];
const MAX_LOGS = 100;

router.post('/', clientLogLimiter, (req, res) => {
  try {
    const { message, stack, component, componentStack, url } = req.body || {};

    const cleanEntry = {
      timestamp: new Date().toISOString(),
      component: typeof component === 'string' ? component.slice(0, 100) : 'unknown',
      message: typeof message === 'string' ? message.slice(0, 500) : 'no message',
      stack: typeof stack === 'string' ? stack.slice(0, 1500) : '',
      componentStack: typeof componentStack === 'string' ? componentStack.slice(0, 1000) : '',
      url: typeof url === 'string' ? url.slice(0, 200) : '',
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown'
    };

    console.warn(`[CLIENT-CRASH-LOG] [${cleanEntry.component}] ${cleanEntry.message} (from ${cleanEntry.url})`);

    memoryLogBuffer.unshift(cleanEntry);
    if (memoryLogBuffer.length > MAX_LOGS) {
      memoryLogBuffer.pop();
    }

    return res.json({ ok: true, received: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Endpoint untuk memeriksa histori log klien (read-only)
router.get('/', (req, res) => {
  res.json({ ok: true, count: memoryLogBuffer.length, logs: memoryLogBuffer });
});

module.exports = router;
