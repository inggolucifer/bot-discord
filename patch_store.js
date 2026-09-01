const fs = require('fs');
const path = './jianghu-bot/web-dashboard/src/lib/store.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /token: null,/,
  `token: typeof window !== 'undefined' ? localStorage.getItem('jianghu_token') : null,`
);
code = code.replace(
  /user: null,/,
  `user: typeof window !== 'undefined' && localStorage.getItem('jianghu_user') ? JSON.parse(localStorage.getItem('jianghu_user') || '{}') : null,`
);
code = code.replace(
  /hasCharacter: false,/,
  `hasCharacter: typeof window !== 'undefined' && localStorage.getItem('jianghu_user') ? JSON.parse(localStorage.getItem('jianghu_user') || '{}').hasCharacter || false : false,`
);

fs.writeFileSync(path, code);
