// Standalone script to update DB directly
const mongoose = require('mongoose');
const Item = require('./jianghu-bot/models/Item');

async function patch() {
    await mongoose.connect('mongodb://localhost:27017/jianghu', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to DB');

    // Update categories
    const result = await Item.updateMany({ category: 'cloth' }, { $set: { category: 'armor' } });
    console.log(`Updated ${result.modifiedCount} items from cloth to armor`);

    mongoose.disconnect();
}
patch().catch(console.error);
