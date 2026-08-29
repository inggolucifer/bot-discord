const fs = require('fs');

const adminRouter = fs.readFileSync('jianghu-bot/services/adminRouter.js', 'utf8');

const regex = /let key = group \? `\$\{group\}\$\{sub\.replace\(\/-\/g, ''\)\}`\.toLowerCase\(\) : sub\.replace\(\/-\/g, ''\)\.toLowerCase\(\);/g;

console.log(regex.test(adminRouter));
