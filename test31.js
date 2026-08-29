const regex = /[.*+?^${}()|[\]\\]/g;
const escapeRegex = (string) => string.replace(regex, '\\$&');

// In utils, the file is `utils/escapeRegex.js`
const utilsDir = require('fs').readdirSync('jianghu-bot/utils');
console.log(utilsDir);
