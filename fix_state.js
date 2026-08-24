const fs = require('fs');

const path = 'jianghu-bot/web-dashboard/src/app/market/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// The original string
const originalState = "const [sellModal, setSellModal] = useState<{ isOpen: boolean } | null>(null);";

// The string with our new state added
const newState = "const [sellModal, setSellModal] = useState<{ isOpen: boolean } | null>(null);\n  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);";

if (content.includes(originalState)) {
    content = content.replace(originalState, newState);
    fs.writeFileSync(path, content);
    console.log("Successfully added the state variable.");
} else {
    console.log("Could not find the original state variable line.");
}
