const fs = require('fs');

const files = [
    'jianghu-bot/web-api/routes/inventory.js',
    'jianghu-bot/web-api/routes/sect.js',
    'jianghu-bot/web-api/routes/market.js',
    'jianghu-bot/web-api/routes/pet.js',
    'jianghu-bot/web-api/routes/player.js'
];

for (const file of files) {
    let code = fs.readFileSync(file, 'utf8');

    // Some routes might not have Item or CustomError required at the top, but they are used in the appended code
    if (!code.includes("const Item = require('../../models/Item');") && file.includes('inventory.js')) {
        code = "const Item = require('../../models/Item');\n" + code;
    }

    if (!code.includes("const { withTransaction } = require('../utils/dbTransaction');")) {
         if (file.includes('pet.js')) {
             code = "const { withTransaction } = require('../utils/dbTransaction');\n" + code;
         }
    }

    if (!code.includes("const CustomError = require('../utils/CustomError');") && !code.includes("const CustomError = require('../utils/customError');")) {
        if (file.includes('pet.js')) {
             code = "const CustomError = require('../utils/CustomError');\n" + code;
         }
    }

    if (file.includes('pet.js')) {
        if (!code.includes("const LockManager = require('../utils/lockManager');")) {
            code = "const LockManager = require('../utils/lockManager');\n" + code;
        }
    }

    fs.writeFileSync(file, code);
}
