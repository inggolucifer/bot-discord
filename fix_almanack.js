const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'jianghu-bot/web-dashboard/src/app/almanack/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The first replace didn't match perfectly, let's make it more robust
content = content.replace(
/const res = await api\.get\('\/almanack'\);\s*setItems\(res\.data\.data\.items\);\s*setAssets\(res\.data\.data\.assets\);/g,
`const [itemsRes, assetsRes] = await Promise.all([
          api.get('/almanack/items'),
          api.get('/almanack/assets')
        ]);
        setItems(itemsRes.data.data);
        setAssets(assetsRes.data.data);`
);

fs.writeFileSync(filePath, content);
console.log('Almanack API calls updated successfully.');
