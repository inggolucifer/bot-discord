const admin = require('./jianghu-bot/commands/admin/admin.js');
const obj = admin.data.toJSON();
console.log(obj.options.length);
