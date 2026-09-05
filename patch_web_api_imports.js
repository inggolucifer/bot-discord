const fs = require('fs');

const targetFile = 'jianghu-bot/web-api/routes/player.js';
let content = fs.readFileSync(targetFile, 'utf8');

if (!content.includes('const { calculateDailyGuardCost, calculateRepairCost } = require("../../utils/assetCostCalculator");')) {
    content = content.replace(
        "const { MONGODB_URI } = require('../../config/database');",
        "const { MONGODB_URI } = require('../../config/database');\nconst { calculateDailyGuardCost, calculateRepairCost } = require('../../utils/assetCostCalculator');\nconst { formatCurrency, convertFromCopper } = require('../../utils/currencyUtils');"
    );
    fs.writeFileSync(targetFile, content);
    console.log('Imports added successfully.');
} else {
    console.log('Imports already exist.');
}
