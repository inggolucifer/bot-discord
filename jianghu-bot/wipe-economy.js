require('dotenv').config();
const mongoose = require('mongoose');

const Item   = require('./models/Item');
const Asset  = require('./models/Asset');
const Pet    = require('./models/Pet');
const Shop   = require('./models/Shop');
const Player = require('./models/Player');
const PlayerListing = require('./models/PlayerListing');
const Auction = require('./models/Auction');

async function wipeDatabase() {
    try {
        console.log('Connecting to database...');
        if (!process.env.MONGODB_URI) {
           throw new Error('MONGODB_URI is not set in .env');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        console.log('Wiping Item collection...');
        await Item.deleteMany({});
        console.log('Wiping Asset collection...');
        await Asset.deleteMany({});
        console.log('Wiping Pet collection...');
        await Pet.deleteMany({});
        console.log('Wiping Shop collection...');
        await Shop.deleteMany({});
        console.log('Wiping PlayerListing collection...');
        await PlayerListing.deleteMany({});
        console.log('Wiping Auction collection...');
        await Auction.deleteMany({});

        console.log('Clearing player inventories, pets, and assets...');
        await Player.updateMany({}, {
            $set: {
                inventory: [],
                pets: [],
                assets: []
            }
        });
        console.log('Wipe complete.');
    } catch(err) {
        console.error('Error during wipe:', err);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed.');
    }
}
wipeDatabase();
