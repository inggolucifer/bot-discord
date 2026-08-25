const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'jianghu-bot/web-dashboard/src/app/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update state variable
content = content.replace(
  `const [transferUserId, setTransferUserId] = useState('');`,
  `const [transferTargetName, setTransferTargetName] = useState('');`
);

// Update logic
content = content.replace(
  `if(!transferUserId || transferAmount <= 0) return;`,
  `if(!transferTargetName || transferAmount <= 0) return;`
);

content = content.replace(
  `              targetUserId: transferUserId,`,
  `              targetName: transferTargetName,`
);

content = content.replace(
  `          setTransferUserId('');`,
  `          setTransferTargetName('');`
);

content = content.replace(
  `disabled={actionLoading || !transferUserId || transferAmount <= 0}`,
  `disabled={actionLoading || !transferTargetName || transferAmount <= 0}`
);

// Update UI text
content = content.replace(
  `<label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">ID Discord Penerima</label>`,
  `<label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Nama Karakter Penerima</label>`
);

content = content.replace(
  `placeholder="Masukkan ID Discord (contoh: 123456789...)"`,
  `placeholder="Masukkan Nama Karakter Penerima"`
);

content = content.replace(
  `value={transferUserId}`,
  `value={transferTargetName}`
);

content = content.replace(
  `onChange={(e) => setTransferUserId(e.target.value)}`,
  `onChange={(e) => setTransferTargetName(e.target.value)}`
);

fs.writeFileSync(filePath, content);
console.log('Transfer frontend updated to use targetName.');
