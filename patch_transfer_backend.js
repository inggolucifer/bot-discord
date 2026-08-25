const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'jianghu-bot/web-api/routes/player.js');
let content = fs.readFileSync(filePath, 'utf8');

// The replacement was mangled in the bash script. Let's fix the receiver findOne block manually.
const badBlock = `        const receiver = await Player.findOne({
            characterName: { $regex: new RegExp('^' + targetName + '
            return res.status(400).json({ error: \`Saldo \${currencyType} kamu tidak mencukupi.\` });
        }`;

const goodBlock = `        const receiver = await Player.findOne({
            characterName: { $regex: new RegExp('^' + targetName + '$', 'i') },
            guildId
        });

        if (!receiver) return res.status(404).json({ error: 'Karakter penerima tidak ditemukan di sekte/guild yang sama.' });
        if (receiver.status !== 'active') return res.status(403).json({ error: \`Penerima berstatus \${receiver.status}.\` });

        if (receiver.discordId === userId) {
            return res.status(400).json({ error: 'Tidak bisa transfer ke diri sendiri.' });
        }

        if (sender.currency[currencyType] < amount) {
            return res.status(400).json({ error: \`Saldo \${currencyType} kamu tidak mencukupi.\` });
        }`;

content = content.replace(badBlock, goodBlock);
fs.writeFileSync(filePath, content);
console.log('Transfer backend fixed.');
