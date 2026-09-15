const express = require('express');
const router = express.Router();
const Manual = require('../../models/Manual');

// API to list all manuals for Almanack
router.get('/', async (req, res) => {
    try {
        const manuals = await Manual.find({}).populate('requiredSectId', 'name').lean();

        const formatted = manuals.map(m => {
            return {
                ...m,
                sectLocked: !!m.requiredSectId,
                requiredSectName: m.requiredSectId ? m.requiredSectId.name : null
            };
        });

        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('[API-MANUALS] Error fetching manuals:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat memuat manual.' });
    }
});

module.exports = router;
