const fs = require('fs');
let code = fs.readFileSync('jianghu-bot/web-api/routes/worker.js', 'utf8');

const newEndpoint = `
const { calculateProgress } = require('../utils/assetProgress');
const LockManager = require('../utils/lockManager');

router.post('/stop-mandiri', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const lockKey = \`worker_stop_\${userId}\`;
    const releaseLock = await LockManager.acquire(lockKey);
    try {
        const player = await Player.findOne({ discordId: userId });
        if (!player) return res.status(404).json({ error: 'Karakter tidak ditemukan.' });

        let found = false;
        for (const owned of player.assets) {
            if (owned.assignedWorkers) {
                const myIndex = owned.assignedWorkers.findIndex(w => w.workerId === userId);
                if (myIndex !== -1) {
                    owned.progressAccumulated = (owned.progressAccumulated || 0) + calculateProgress(owned);
                    owned.lastProgressUpdate = new Date();
                    owned.assignedWorkers.splice(myIndex, 1);
                    found = true;
                }
            }
        }

        if (!found) {
            return res.status(400).json({ error: 'Kamu tidak sedang bekerja secara mandiri di aset mana pun milikmu.' });
        }

        player.customStatus = null;
        await player.save();

        res.json({ success: true, message: 'Kamu berhenti bekerja di asetmu.' });
    } catch (error) {
        console.error('[API-WORKER] Stop mandiri error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    } finally {
        releaseLock();
    }
});
`;

code = code.replace(/module\.exports = router;/, newEndpoint + '\nmodule.exports = router;');
fs.writeFileSync('jianghu-bot/web-api/routes/worker.js', code);
console.log('patched worker api');
