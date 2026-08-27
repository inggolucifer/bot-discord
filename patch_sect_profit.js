const fs = require('fs');

let fileAutoProcess = fs.readFileSync('jianghu-bot/utils/workerAutoProcess.js', 'utf8');

// Require splitSectProfit di bagian atas
if (!fileAutoProcess.includes('splitSectProfit')) {
    fileAutoProcess = fileAutoProcess.replace(
        "const GuildConfig = require('../models/GuildConfig');",
        "const GuildConfig = require('../models/GuildConfig');\nconst { splitSectProfit } = require('./sectProfitSplit');"
    );
}

// Cari letak penambahan profit (Add Currency) untuk sect dan ganti dengan logic distribusi anggota
const targetCode = `// Add Currency (Tipe 1)
             if (assetConfig.dailyProfit > 0) {
                 const profit = affordableHours * assetConfig.dailyProfit * owned.quantity;
                 sect.currency[assetConfig.profitCurrency] += profit;
             }`;

const newCode = `// Add Currency (Tipe 1)
             if (assetConfig.dailyProfit > 0) {
                 const profit = affordableHours * assetConfig.dailyProfit * owned.quantity;
                 // Distribusikan ke anggota sesuai persentase sectProfitSplit
                 const shares = splitSectProfit(sect, profit);
                 if (shares && shares.length > 0) {
                     for (const share of shares) {
                         // Find the player in database directly and give them the currency (lazy load)
                         Player.updateOne(
                             { discordId: share.userId, guildId: sect.guildId },
                             { $inc: { [\`currency.\${assetConfig.profitCurrency}\`]: share.amount } }
                         ).catch(() => {});
                     }
                 } else {
                     // Fallback ke kas sekte jika kosong anggotanya (meski jarang)
                     sect.currency[assetConfig.profitCurrency] += profit;
                 }
             }`;

fileAutoProcess = fileAutoProcess.replace(targetCode, newCode);

fs.writeFileSync('jianghu-bot/utils/workerAutoProcess.js', fileAutoProcess);
