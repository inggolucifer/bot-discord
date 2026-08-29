const adminPath = require('path').join(__dirname, 'jianghu-bot', 'services', 'admin');
const files = require('fs').readdirSync(adminPath).filter(f => f.endsWith('.js'));
for(const f of files) {
  const content = require('fs').readFileSync(require('path').join(adminPath, f), 'utf8');
  if(content.includes('new RegExp')) {
     const match = content.match(/new RegExp\([^)]+\)/g);
     if(match) console.log(`${f}: ${match.join(' | ')}`);
  }
}
