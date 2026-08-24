const fs = require('fs');

const path = 'jianghu-bot/web-dashboard/src/app/market/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add confirmCancelId state
if (!content.includes('const [confirmCancelId, setConfirmCancelId]')) {
    content = content.replace(
        'const [sellModal, setSellModal] = useState<any>(null);',
        'const [sellModal, setSellModal] = useState<any>(null);\n  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);'
    );
}

// Update the handleCancelListing function to also reset the confirm state
if (!content.includes('setConfirmCancelId(null);')) {
    content = content.replace(
        'const handleCancelListing = async (listingId: string) => {\n    try {',
        'const handleCancelListing = async (listingId: string) => {\n    try {\n      setConfirmCancelId(null);'
    );
}

// Replace the button section with inline confirmation
const originalButton = `                  <button
                     disabled={actionLoading}
                     onClick={() => {
                        if (confirm(\`Apakah kamu yakin ingin membatalkan penjualan \${item.name}?\`)) {
                          handleCancelListing(item.id);
                        }
                     }}
                     className="bg-red-900 hover:bg-red-800 disabled:bg-gray-800 text-red-100 text-xs px-3 py-1.5 rounded border border-red-700 transition-colors"
                  >
                    Batalkan Jualan
                  </button>`;

const newButton = `                  {confirmCancelId === item.id ? (
                    <div className="flex flex-col gap-1 items-end">
                      <span className="text-xs text-red-400">Yakin batalkan?</span>
                      <div className="flex gap-2">
                        <button
                          disabled={actionLoading}
                          onClick={() => handleCancelListing(item.id)}
                          className="bg-red-900 hover:bg-red-800 disabled:bg-gray-800 text-white text-xs px-2 py-1 rounded border border-red-700 transition-colors"
                        >
                          Ya
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => setConfirmCancelId(null)}
                          className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white text-xs px-2 py-1 rounded border border-gray-600 transition-colors"
                        >
                          Tidak
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                       disabled={actionLoading}
                       onClick={() => setConfirmCancelId(item.id)}
                       className="bg-red-900 hover:bg-red-800 disabled:bg-gray-800 text-red-100 text-xs px-3 py-1.5 rounded border border-red-700 transition-colors"
                    >
                      Batalkan Jualan
                    </button>
                  )}`;

if (content.includes(originalButton)) {
    content = content.replace(originalButton, newButton);
    fs.writeFileSync(path, content);
    console.log("Successfully updated the frontend page.tsx file.");
} else {
    console.log("Failed to find the original button block in page.tsx");
}
