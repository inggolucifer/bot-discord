const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/jianghu')
  .then(async () => {
    const Item = require('./jianghu-bot/models/Item');
    const item = await Item.findOne({ name: 'Pedang Bambu' });
    console.log("Pedang Bambu ATK:", item ? item.baseAtk : 'not found');
    const Player = require('./jianghu-bot/models/Player');
    const p = await Player.findOne();
    if(p) console.log("Player stats:", p.stats);
    process.exit(0);
  });
