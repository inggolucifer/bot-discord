const fs = require('fs');
const path = require('path');

const inventoryPath = path.join(__dirname, 'jianghu-bot', 'web-dashboard', 'src', 'app', 'inventory', 'page.tsx');
if (fs.existsSync(inventoryPath)) {
    let content = fs.readFileSync(inventoryPath, 'utf8');

    // Inject button to discard
    // Looking at the rendering loop: {filteredInventory.map((item, index) => (
    const cardTarget = `<div className="flex justify-between items-start mb-2">`;
    const replaceCardTarget = `<div className="flex justify-between items-start mb-2">
              <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] text-red-500 border-red-500/50 hover:bg-red-500/20 absolute bottom-2 right-2" onClick={(e) => { e.stopPropagation(); setItemToDiscard(item); setDiscardQuantity(1); setDiscardModalOpen(true); }}>Buang</Button>`;

    if (!content.includes('setItemToDiscard(item)')) {
        content = content.replace(cardTarget, replaceCardTarget);
        fs.writeFileSync(inventoryPath, content);
        console.log('Fixed inventory button.');
    }
}
