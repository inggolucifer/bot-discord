const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../web-dashboard/src');

function patch(rel, fn) {
  const p = path.join(ROOT, rel);
  let c = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  const u = fn(c);
  if (c === u) {
    console.log(`[P5] ${rel}: No change needed or already patched.`);
  } else {
    fs.writeFileSync(p, u, 'utf8');
    console.log(`[P5] ${rel}: Successfully patched.`);
  }
}

// 1. chunkManager.ts
patch('lib/chunkManager.ts', content => {
  const targetSpecial = `    isSettlementOrigin?: boolean;
    settlementName?: string | null;`;
  const replSpecial = `    isSettlementOrigin?: boolean;
    isSettlementEntrance?: boolean;
    settlementData?: any;
    settlementName?: string | null;`;

  if (content.includes(targetSpecial) && !content.includes('isSettlementEntrance?: boolean;')) {
    content = content.replace(targetSpecial, replSpecial);
  }

  const targetTileInit = `          isSettlementOrigin: special.isSettlementOrigin || false,
          objects: tileScatter`;
  const replTileInit = `          isSettlementOrigin: special.isSettlementOrigin || false,
          isSettlementEntrance: special.isSettlementEntrance || false,
          settlementData: special.settlementData || null,
          objects: tileScatter`;

  if (content.includes(targetTileInit) && !content.includes('isSettlementEntrance: special.isSettlementEntrance || false,')) {
    content = content.replace(targetTileInit, replTileInit);
  }

  return content;
});

// 2. ZoneGridView.tsx
patch('components/map/ZoneGridView.tsx', content => {
  // Add settlementPrompt state
  if (!content.includes('const [settlementPrompt, setSettlementPrompt]')) {
    content = content.replace(
      `  const [activeSettlementName, setActiveSettlementName] = useState<string>('XiTong City');`,
      `  const [activeSettlementName, setActiveSettlementName] = useState<string>('XiTong City');\n  const [settlementPrompt, setSettlementPrompt] = useState<{ id: string; name: string; tier?: number; regionSlug?: string } | null>(null);`
    );
  }

  // Hook step-move / resolve-move response for settlementPrompt
  const stepMoveCheck = `      if (res.data?.success) {`;
  const stepMoveRepl = `      if (res.data?.success) {
        if (res.data.settlementPrompt) {
          setSettlementPrompt(res.data.settlementPrompt);
        }`;
  if (content.includes(stepMoveCheck) && !content.includes('setSettlementPrompt(res.data.settlementPrompt)')) {
    content = content.replace(stepMoveCheck, stepMoveRepl);
  }

  // When clicking a settlement tile / marker, open settlementPrompt
  const handleTileClickTarget = `  const handleTileClick = useCallback((tile: TileData) => {`;
  const handleTileClickRepl = `  const handleTileClick = useCallback((tile: TileData) => {
    // V20: Clicking on a settlement marker or entrance tile prompts to enter
    if (tile.isSettlementEntrance || tile.isSettlementOrigin || (tile.settlementName && tile.terrainType === 'settlement')) {
      const sName = tile.settlementName || tile.label || 'Pemukiman';
      const sId = tile.settlementData?.id || sName.toLowerCase().replace(/\\s+/g, '_');
      setSettlementPrompt({
        id: sId,
        name: sName,
        tier: tile.settlementData?.tier || 1
      });
      return;
    }`;

  if (content.includes(handleTileClickTarget) && !content.includes('// V20: Clicking on a settlement marker')) {
    content = content.replace(handleTileClickTarget, handleTileClickRepl);
  }

  // Render the settlement prompt modal dialog
  const modalInsertionPoint = `{/* MODAL-MODAL OVERLAY SISTEM INTERAKTIF */}`;
  const modalMarkup = `{/* MODAL PROMPT MASUK PEMUKIMAN V20 (TALE OF IMMORTAL) */}
      {settlementPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#10141d] border-2 border-[#c5a880]/80 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4">
            <div className="text-3xl">🏮</div>
            <h3 className="text-lg font-serif font-bold text-[#f2e6d0]">
              Masuk ke {settlementPrompt.name}?
            </h3>
            <p className="text-xs text-[#a09a8e] leading-relaxed">
              Kamu telah tiba di gerbang pemukiman. Di dalam terdapat penginapan, pasar, kedai, dan balai lainnya.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  const sName = settlementPrompt.name;
                  setSettlementPrompt(null);
                  handleEnterSettlement(sName);
                }}
                className="px-5 py-2 bg-[#8c2d19] hover:bg-[#a1351e] text-[#fff6e5] font-serif font-bold rounded-lg border border-[#c5a880]/60 text-sm shadow-md transition-all active:scale-95"
              >
                Masuk
              </button>
              <button
                onClick={() => setSettlementPrompt(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-serif rounded-lg border border-stone-600 text-sm transition-all"
              >
                Tetap di Luar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL-MODAL OVERLAY SISTEM INTERAKTIF */}`;

  if (content.includes(modalInsertionPoint) && !content.includes('MODAL PROMPT MASUK PEMUKIMAN V20')) {
    content = content.replace(modalInsertionPoint, modalMarkup);
  }

  return content;
});

console.log('Frontend P5 patches finished.');
