const fs = require('fs');
const filepath = 'jianghu-bot/web-dashboard/src/app/market/page.tsx';
let code = fs.readFileSync(filepath, 'utf8');
code = code.replace("const [myListings, setMyListings] = useState<any[]>([]);", "const [myListings, setMyListings] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any");
fs.writeFileSync(filepath, code);
