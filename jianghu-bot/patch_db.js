const mongoose = require('mongoose');
const fs = require('fs');

async function patch() {
    try {
        await mongoose.connect('mongodb://localhost:27017/jianghu');
        console.log('Connected to DB');

        const path = '../MongoDB/jianghu.items.json';
        const data = fs.readFileSync(path, 'utf8');
        const items = JSON.parse(data);

        const Item = require('./models/Item');
        let updated = 0;

        for (const jsonItem of items) {
            if (jsonItem._id && jsonItem._id.$oid) {
                try {
                    const doc = await Item.findById(jsonItem._id.$oid);
                    if (doc) {
                        let changed = false;
                        const statsToCheck = ['baseAtk', 'baseDef', 'baseHp', 'baseSpd'];

                        for (const stat of statsToCheck) {
                            if (jsonItem[stat] !== undefined && doc[stat] !== jsonItem[stat]) {
                                doc[stat] = jsonItem[stat];
                                changed = true;
                            }
                        }

                        if (changed) {
                            await doc.save();
                            updated++;
                        }
                    }
                } catch(e) {}
            }
        }

        console.log(`Successfully patched ${updated} existing items directly inside MongoDB.`);
        mongoose.disconnect();
    } catch(err) {
        console.log('Failed to connect to local DB (expected in CI/CD sandbox):', err.message);
    }
}

patch();
