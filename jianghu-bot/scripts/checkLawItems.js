const mongoose = require('mongoose');
require('dotenv').config();
const Item = require('../models/Item');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jianghu');
  const items = await Item.find({ 
    $or: [
      { category: 'law' },
      { tags: { $in: ['catalyst', 'gu_larva', 'beast_core', 'blood_vial', 'venom_sac', 'yin_stone', 'abyssal_scroll'] } },
      { name: { $regex: /gu|serangga|inti|darah|racun|esensi/i } }
    ]
  }).select('name category tags rank tier').lean();
  console.log('Found items count:', items.length);
  console.log(items.slice(0, 25));
  await mongoose.disconnect();
}
check();
