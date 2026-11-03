const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

// ---------------------------------------------------------------------------
// 1. Update utils/settlementEngine.js
// ---------------------------------------------------------------------------
const enginePath = path.join(ROOT, 'utils/settlementEngine.js');
let engineContent = fs.readFileSync(enginePath, 'utf8').replace(/\r\n/g, '\n');

const oldGetPanorama = `function getSettlementPanoramaData(settlementName, player = null, dbNpcs = []) {`;

// Replace getSettlementPanoramaData with v20-aware facility loading
const newGetPanorama = `function getSettlementPanoramaData(settlementName, player = null, dbNpcs = []) {
    const anchors = loadAnchors();
    const v20Data = loadFacilitiesV20();
    const blueprints = loadBlueprints();

    // Find anchor matching settlementName or ID
    const lowerName = (settlementName || '').toLowerCase().trim();
    let anchor = anchors.find(a => 
        (a.name && a.name.toLowerCase() === lowerName) ||
        (a.id && a.id.toLowerCase() === lowerName) ||
        (a.chineseName && a.chineseName === settlementName)
    );

    if (!anchor) {
        anchor = {
            id: lowerName.replace(/\\s+/g, '_'),
            name: settlementName,
            chineseName: '坊市',
            type: 'village',
            region: 'central_plains',
            x: 2050,
            y: 2650,
            tier: 1,
            label: settlementName,
            description: 'Pemukiman peradaban tempat bernaungnya para kultivator dan penduduk lokal.'
        };
    }

    const bpType = resolveBlueprintType(anchor);
    const profileKey = (anchor.v20 && anchor.v20.facilitiesProfile) || anchor.type || 'village';
    const profile = (v20Data && v20Data.profiles && v20Data.profiles[profileKey]) || 
                    (v20Data && v20Data.profiles && v20Data.profiles.village);

    let buildings = [];
    if (v20Data && profile && Array.isArray(profile.facilities)) {
        const facList = profile.facilities;
        const total = facList.length;
        buildings = facList.map((facId, idx) => {
            const def = v20Data.facilityDefs[facId] || {
                id: facId,
                name: facId,
                type: facId,
                icon: 'Home',
                desc: ''
            };
            const xPct = Math.round(10 + (idx / Math.max(1, total - 1)) * 80);
            return {
                id: def.id,
                type: def.type || def.id,
                name: def.name,
                chineseName: def.chineseName || '',
                bannerText: def.bannerText || \`\${def.chineseName || ''} · \${def.name.split(' ')[0]}\`,
                desc: def.desc || '',
                icon: def.icon || 'Home',
                status: def.status || 'open',
                openStatus: def.status === 'coming_soon' ? 'closed' : 'open',
                scale: 1.0,
                xPercent: xPct,
                layer: 'ground',
                key: \`\${anchor.id}_\${def.id}\`
            };
        });
    } else {
        const blueprint = blueprints[bpType] || blueprints.village || {
            backdropId: 'backdrop_misty_bamboo_village',
            palette: 'ink_cyan',
            buildings: [],
            layers: [],
            defaultExits: []
        };
        buildings = (blueprint.buildings || []).map(b => ({
            ...b,
            key: \`\${anchor.id}_\${b.id}\`
        }));
    }

    // Exits: City Gate returns to entrance
    const exitEntrance = (anchor.v20 && anchor.v20.entrance) ? anchor.v20.entrance : { x: anchor.x, y: anchor.y };
    const exits = [
        {
            type: 'city_gate',
            label: \`🏮 Gerbang \${anchor.name} (Keluar ke Peta Dunia)\`,
            targetTile: { x: exitEntrance.x, y: exitEntrance.y },
            description: \`Melangkah keluar melintasi gerbang utama pemukiman menuju koordinat [\${exitEntrance.x}, \${exitEntrance.y}] di peta alam liar.\`
        }
    ];

    if (bpType === 'port' || anchor.type === 'port' || anchor.type === 'island') {
        exits.push({
            type: 'dock',
            label: '⛵ Dermaga Kapal & Feri Penyeberangan',
            targetTile: { x: exitEntrance.x, y: exitEntrance.y },
            description: 'Menyeberangi perairan laut atau danau menggunakan kapal feri atau rakit bambu resmi.'
        });
    }

    // Compose NPC Ribbon
    let npcStrip = [];
    if (dbNpcs && dbNpcs.length > 0) {
        npcStrip = dbNpcs.map(n => ({
            _id: n._id ? n._id.toString() : \`npc_\${n.name}\`,
            name: n.name,
            title: n.title || 'Kultivator',
            portraitUrl: n.portraitUrl || null,
            greeting: n.greeting || '',
            hasQuest: Array.isArray(n.questIds) && n.questIds.length > 0,
            relationship: 'Stranger'
        }));
    } else {
        npcStrip = generateCanonicalNpcs(anchor);
    }

    const panoramaInfo = (profile && profile.panorama) || {
        backdropId: 'backdrop_misty_bamboo_village',
        palette: 'ink_cyan',
        skyColor: '#0a131c',
        groundColor: '#141c22',
        layers: []
    };

    return {
        settlement: {
            id: anchor.id,
            name: anchor.name,
            chineseName: anchor.chineseName,
            type: anchor.type,
            region: anchor.region || anchor.regionSlug,
            tier: anchor.tier || 1,
            x: anchor.x,
            y: anchor.y,
            v20: anchor.v20
        },
        backdropId: panoramaInfo.backdropId,
        palette: panoramaInfo.palette,
        skyColor: panoramaInfo.skyColor,
        groundColor: panoramaInfo.groundColor,
        description: panoramaInfo.description || anchor.description || '',
        timeOfDay: getTimeOfDay(),
        weather: 'Cerah',
        layers: panoramaInfo.layers || [],
        buildings,
        residences: (anchor.v20 && anchor.v20.residences) || [],
        npcStrip,
        npcs: npcStrip,
        exits,
        tracking: {
            activePlayers: 1,
            reputation: 'Netral (0)',
            isSectHome: anchor.type === 'sect'
        }
    };
}

function _legacyGetSettlementPanoramaData_old`;

engineContent = engineContent.replace(oldGetPanorama, newGetPanorama);
fs.writeFileSync(enginePath, engineContent, 'utf8');
console.log('[P6] utils/settlementEngine.js updated with v20 facilities & residences.');

// ---------------------------------------------------------------------------
// 2. Update web-dashboard/src/components/map/SettlementPanoramaView.tsx
// ---------------------------------------------------------------------------
const viewPath = path.join(ROOT, 'web-dashboard/src/components/map/SettlementPanoramaView.tsx');
let viewContent = fs.readFileSync(viewPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add extra lucide icons
const iconImportTarget = `  ChevronRight,
  User,
  Sparkles,
  MapPin,
  Clock,
  Swords`;

const iconImportRepl = `  ChevronRight,
  User,
  Sparkles,
  MapPin,
  Clock,
  Swords,
  Home,
  Gavel,
  Shield,
  Sword,
  FlaskConical,
  Store`;

if (viewContent.includes(iconImportTarget) && !viewContent.includes('FlaskConical,')) {
  viewContent = viewContent.replace(iconImportTarget, iconImportRepl);
}

// 2. Add showResidencesModal state
const stateTarget = `  const [selectedBuilding, setSelectedBuilding] = useState<any | null>(null);`;
const stateRepl = `  const [selectedBuilding, setSelectedBuilding] = useState<any | null>(null);
  const [showResidencesModal, setShowResidencesModal] = useState<boolean>(false);
  const [selectedResident, setSelectedResident] = useState<any | null>(null);`;

if (viewContent.includes(stateTarget) && !viewContent.includes('showResidencesModal')) {
  viewContent = viewContent.replace(stateTarget, stateRepl);
}

// 3. Handle residences and coming_soon clicks in handleBuildingClick
const clickTarget = `    if (bId === 'inn' && onOpenInn) {
      onOpenInn();
      return;
    }`;

const clickRepl = `    // V20: Coming soon facilities
    if (building.status === 'coming_soon' || ['auction', 'storage', 'teleport_array'].includes(bId)) {
      showNotice(\`🏮 [\${building.name}] sedang dalam persiapan dan akan segera hadir!\`);
      return;
    }

    // V20: Residences modal
    if (bId === 'residences' || bType === 'residences') {
      setShowResidencesModal(true);
      return;
    }

    if (bId === 'inn' && onOpenInn) {
      onOpenInn();
      return;
    }`;

if (viewContent.includes(clickTarget) && !viewContent.includes('// V20: Residences modal')) {
  viewContent = viewContent.replace(clickTarget, clickRepl);
}

// 4. Update icon mapping in buildings loop
const iconMapTarget = `            let IconComp = BedDouble;
            if (b.id === 'tavern' || b.type === 'tavern') IconComp = Wine;
            if (b.id === 'market' || b.type === 'market') IconComp = ShoppingBag;
            if (b.id === 'workshop' || b.type === 'workshop') IconComp = Hammer;
            if (b.id === 'manual_pavilion' || b.type === 'manual_pavilion') IconComp = BookOpen;
            if (b.id === 'bounty_board' || b.type === 'bounty_board') IconComp = FileText;
            if (b.id === 'courier_stables' || b.type === 'courier_stables') IconComp = Compass;
            if (b.id === 'vault' || b.type === 'vault') IconComp = Archive;
            if (b.id === 'dock' || b.type === 'dock') IconComp = Ship;
            if (b.id === 'sect_hall' || b.type === 'sect_hall') IconComp = Swords;
            if (b.id === 'dungeon' || b.type === 'dungeon_entrance') IconComp = Sparkles;`;

const iconMapRepl = `            let IconComp = BedDouble;
            if (b.id === 'tavern' || b.type === 'tavern') IconComp = Wine;
            if (b.id === 'market' || b.type === 'market') IconComp = ShoppingBag;
            if (b.id === 'workshop' || b.type === 'workshop') IconComp = Hammer;
            if (b.id === 'manual_pavilion' || b.type === 'manual_pavilion') IconComp = BookOpen;
            if (b.id === 'bounty_board' || b.type === 'bounty_board') IconComp = FileText;
            if (b.id === 'courier_stables' || b.type === 'courier_stables') IconComp = Compass;
            if (b.id === 'vault' || b.id === 'storage' || b.type === 'storage') IconComp = Archive;
            if (b.id === 'dock' || b.type === 'dock') IconComp = Ship;
            if (b.id === 'sect_hall' || b.type === 'sect_hall') IconComp = Swords;
            if (b.id === 'dungeon' || b.type === 'dungeon_entrance') IconComp = Sparkles;
            if (b.id === 'residences' || b.type === 'residences') IconComp = Home;
            if (b.id === 'auction' || b.type === 'auction') IconComp = Gavel;
            if (b.id === 'barracks' || b.type === 'barracks') IconComp = Shield;
            if (b.id === 'armory' || b.type === 'armory') IconComp = Sword;
            if (b.id === 'alchemy_hall' || b.type === 'alchemy_hall') IconComp = FlaskConical;
            if (b.id === 'meditation_grounds' || b.type === 'meditation_grounds') IconComp = Sparkles;
            if (b.id === 'sect_market' || b.type === 'sect_market') IconComp = Store;`;

if (viewContent.includes(iconMapTarget) && !viewContent.includes('IconComp = Home;')) {
  viewContent = viewContent.replace(iconMapTarget, iconMapRepl);
}

// 5. Add ResidencesModal JSX before the closing </div>
const closingTarget = `      {/* 5. MODAL INTERAKSI TOKOH / NPC (STANDAR TALE OF IMMORTAL) */}`;
const modalMarkup = `      {/* MODAL RESIDENCES / RUMAH PENDUDUK V20 */}
      {showResidencesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-[#0e131b] border-2 border-[#c5a880]/80 rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden font-serif">
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#18202c] to-[#0f141d] border-b border-amber-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-200 font-bold text-sm">
                <Home className="w-4 h-4 text-amber-400" />
                <span>Rumah Penduduk — {settlement.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-mono">
                  {(data?.residences || []).length} Warga
                </span>
              </div>
              <button
                onClick={() => { setShowResidencesModal(false); setSelectedResident(null); }}
                className="w-7 h-7 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 flex items-center justify-center text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {(!data?.residences || data.residences.length === 0) ? (
                <div className="text-center py-10 text-stone-500 text-xs">
                  Belum ada catatan kediaman warga di pemukiman ini.
                </div>
              ) : (
                (data.residences as any[]).map((res: any, idx: number) => (
                  <div
                    key={res.id || idx}
                    onClick={() => setSelectedResident(res)}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#141b25] hover:bg-[#1c2635] border border-amber-900/30 hover:border-amber-500/60 cursor-pointer transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-b from-amber-900/40 to-stone-900 border border-amber-700/50 flex items-center justify-center text-xs text-amber-200 font-bold shadow-inner">
                        {res.npcName ? res.npcName.charAt(0) : 'W'}
                      </div>
                      <div>
                        <div className="text-xs text-gray-100 font-bold flex items-center gap-2">
                          <span>{res.npcName || 'Warga'}</span>
                          <span className="text-[9px] text-amber-300 font-normal px-1.5 py-0.5 bg-black/50 rounded border border-amber-900/60">
                            {res.profession || 'Penduduk'}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-400 font-sans mt-0.5">
                          {res.houseName || 'Pondok Warga'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        showNotice(\`💬 \${res.npcName}: "\${res.dialog || 'Salam, Pendekar! Semoga harimu diberkahi kedamaian.'}"\`);
                      }}
                      className="px-3 py-1 text-[11px] bg-amber-900/40 hover:bg-amber-800/60 border border-amber-700/50 text-amber-200 rounded font-serif shadow-sm transition-all active:scale-95"
                    >
                      Sapa
                    </button>
                  </div>
                ))
              )}
            </div>

            {selectedResident && (
              <div className="px-5 py-3 bg-[#121822] border-t border-amber-900/50 text-xs text-amber-100 flex items-center justify-between">
                <div className="italic text-[11px] text-stone-300 truncate max-w-[360px]">
                  "{selectedResident.dialog || 'Semoga Dao melindungimu dalam perjalanan.'}"
                </div>
                <span className="text-[10px] text-amber-400 font-mono flex-shrink-0">— {selectedResident.npcName}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. MODAL INTERAKSI TOKOH / NPC (STANDAR TALE OF IMMORTAL) */}`;

if (viewContent.includes(closingTarget) && !viewContent.includes('MODAL RESIDENCES / RUMAH PENDUDUK V20')) {
  viewContent = viewContent.replace(closingTarget, modalMarkup);
}

fs.writeFileSync(viewPath, viewContent, 'utf8');
console.log('[P6] SettlementPanoramaView.tsx updated with residences modal & coming soon badges.');
