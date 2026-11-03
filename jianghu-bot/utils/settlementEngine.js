const fs = require('fs');
const path = require('path');

const ANCHORS_PATH = path.join(__dirname, '../world-data/anchors.json');
const BLUEPRINTS_DIR = path.join(__dirname, '../world-data/settlements');
const FACILITIES_V20_PATH = path.join(__dirname, '../world-data/settlement-facilities-v20.json');

let facilitiesV20Cache = null;
function loadFacilitiesV20() {
    if (facilitiesV20Cache) return facilitiesV20Cache;
    try {
        if (fs.existsSync(FACILITIES_V20_PATH)) {
            facilitiesV20Cache = JSON.parse(fs.readFileSync(FACILITIES_V20_PATH, 'utf8'));
        }
    } catch (err) {
        console.error('[SettlementEngine] Error loading settlement-facilities-v20.json:', err.message);
    }
    return facilitiesV20Cache;
}

// Load blueprints cache
let blueprintsCache = null;
let anchorsCache = null;

function loadBlueprints() {
    if (blueprintsCache) return blueprintsCache;
    blueprintsCache = {};
    return blueprintsCache;
}

function loadAnchors() {
    if (anchorsCache) return anchorsCache;
    try {
        if (fs.existsSync(ANCHORS_PATH)) {
            anchorsCache = JSON.parse(fs.readFileSync(ANCHORS_PATH, 'utf8'));
        } else {
            anchorsCache = [];
        }
    } catch (err) {
        console.error('[SettlementEngine] Error loading anchors:', err.message);
        anchorsCache = [];
    }
    return anchorsCache;
}

/**
 * Resolve anchor to its blueprint category
 */
function resolveBlueprintType(anchor) {
    if (!anchor) return 'village';
    const type = (anchor.type || '').toLowerCase();
    const id = (anchor.id || '').toLowerCase();
    const name = (anchor.name || '').toLowerCase();

    if (type.includes('sect') || id.includes('sect') || name.includes('sekte')) {
        return 'sect';
    }
    if (type === 'port' || type === 'island' || id.includes('dermaga') || name.includes('dermaga') || name.includes('pelabuhan')) {
        return 'port';
    }
    if (type === 'major_city' || type === 'capital_city' || type === 'city' || id === 'tianjing' || id.includes('city') || id.includes('kota')) {
        return 'city';
    }
    if (type === 'outpost' || id.includes('pos_') || id.includes('celah') || name.includes('pos') || name.includes('benteng') || name.includes('kaki_gunung')) {
        return 'outpost';
    }
    return 'village';
}

/**
 * Determine dynamic time of day
 */
function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 8) return 'dawn';
    if (hour >= 8 && hour < 17) return 'day';
    if (hour >= 17 && hour < 20) return 'dusk';
    return 'night';
}

/**
 * Generate canonical NPCs for a settlement if DB has none or few
 */
function generateCanonicalNpcs(settlement) {
    const sName = settlement.name || 'Pemukiman';
    const bType = resolveBlueprintType(settlement);

    if (bType === 'port') {
        return [
            {
                _id: `npc_${settlement.id || 'port'}_1`,
                name: 'Kapten Zhang Hai',
                title: 'Nakhoda Feri Ombak Putih',
                realm: 'Ranah Fondasi (Foundation)',
                sect: 'Serikat Pelaut Donghai',
                relationship: 'Friend',
                relationshipPoints: 50,
                greeting: 'Lautan timur luas tak bertepi. Naiklah ke kapal jika ingin menyeberang!',
                hasQuest: true,
                avatarSeed: 'zhang_hai'
            },
            {
                _id: `npc_${settlement.id || 'port'}_2`,
                name: 'Yu Niang',
                title: 'Penyelam Mutiara Roh',
                realm: 'Ranah Kondensasi Qi',
                sect: 'Kultivator Bebas (Rogue)',
                relationship: 'Stranger',
                relationshipPoints: 20,
                greeting: 'Mutiara yang kutemukan di dasar laut mengandung intisari air murni.',
                hasQuest: false,
                avatarSeed: 'yu_niang'
            },
            {
                _id: `npc_${settlement.id || 'port'}_3`,
                name: 'Tetua Mo',
                title: 'Pengawas Dermaga Timur',
                realm: 'Ranah Inti Emas (Golden Core)',
                sect: 'XiTong City Guard',
                relationship: 'Stranger',
                relationshipPoints: 10,
                greeting: 'Patuhi aturan dermaga jika tidak ingin disapu badai spiritual.',
                hasQuest: true,
                avatarSeed: 'elder_mo'
            }
        ];
    }

    if (bType === 'city') {
        return [
            {
                _id: `npc_${settlement.id || 'city'}_1`,
                name: 'Shuang Ke',
                title: 'Pendekar Pedang Bayangan',
                realm: 'Ranah Fondasi Puncak',
                sect: 'Sekte Awan Pedang',
                relationship: 'Friend',
                relationshipPoints: 65,
                greeting: 'Salam, rekan kultivator. Apakah jalan pedangmu seimbang dengan hatimu?',
                hasQuest: true,
                avatarSeed: 'shuang_ke'
            },
            {
                _id: `npc_${settlement.id || 'city'}_2`,
                name: 'Saudagar Jin Fugui',
                title: 'Pemilik Paviliun Harta Karun',
                realm: 'Ranah Kondensasi Qi',
                sect: 'Kamar Dagang Tianyuan',
                relationship: 'Stranger',
                relationshipPoints: 30,
                greeting: 'Batu roh tidak pernah berbohong. Ada emas, ada jalan!',
                hasQuest: true,
                avatarSeed: 'jin_fugui'
            },
            {
                _id: `npc_${settlement.id || 'city'}_3`,
                name: 'Yin Ci',
                title: 'Penjaga Paviliun Kitab',
                realm: 'Ranah Inti Emas',
                sect: 'Akademi Wenchang',
                relationship: 'Stranger',
                relationshipPoints: 15,
                greeting: 'Membaca sutra suci menuntut kejernihan akal budi dan ketenangan dantian.',
                hasQuest: false,
                avatarSeed: 'yin_ci'
            },
            {
                _id: `npc_${settlement.id || 'city'}_4`,
                name: 'Li Keke',
                title: 'Murid Alkimia Bunga Persik',
                realm: 'Ranah Fondasi',
                sect: 'Lembah Tabib Suci',
                relationship: 'Friend',
                relationshipPoints: 80,
                greeting: 'Senang melihatmu kembali dalam keadaan sehat, kawan!',
                hasQuest: true,
                avatarSeed: 'li_keke'
            }
        ];
    }

    if (bType === 'sect') {
        return [
            {
                _id: `npc_${settlement.id || 'sect'}_1`,
                name: 'Tetua Qing Feng',
                title: 'Tetua Penerimaan Murid',
                realm: 'Ranah Jiwa Baru Lahir (Nascent Soul)',
                sect: settlement.name || 'Sekte Surgawi',
                relationship: 'Stranger',
                relationshipPoints: 10,
                greeting: 'Hanya mereka yang memiliki akar spiritual murni yang layak menginjak tangga ini.',
                hasQuest: true,
                avatarSeed: 'qing_feng'
            },
            {
                _id: `npc_${settlement.id || 'sect'}_2`,
                name: 'Mu Bai',
                title: 'Kakak Seperguruan Luar',
                realm: 'Ranah Fondasi Lanjutan',
                sect: settlement.name || 'Sekte Surgawi',
                relationship: 'Friend',
                relationshipPoints: 45,
                greeting: 'Berlatihlah tekun setiap fajar menyingsing, adik seperguruan.',
                hasQuest: false,
                avatarSeed: 'mu_bai'
            }
        ];
    }

    if (bType === 'outpost') {
        return [
            {
                _id: `npc_${settlement.id || 'outpost'}_1`,
                name: 'Panglima Gao',
                title: 'Penjaga Celah Perbatasan',
                realm: 'Ranah Inti Emas (Golden Core)',
                sect: 'Garnisun Kekaisaran',
                relationship: 'Stranger',
                relationshipPoints: 25,
                greeting: 'Di luar celah ini adalah tanah liar. Pastikan pedangmu tajam!',
                hasQuest: true,
                avatarSeed: 'panglima_gao'
            },
            {
                _id: `npc_${settlement.id || 'outpost'}_2`,
                name: 'Pemimpin Kafilah Lu',
                title: 'Pengawal Jalur Kafilah Gurun',
                realm: 'Ranah Fondasi',
                sect: 'Kafilah Dagang Celah',
                relationship: 'Friend',
                relationshipPoints: 50,
                greeting: 'Perjalanan panjang menuntut persediaan air dan stamina yang cukup.',
                hasQuest: true,
                avatarSeed: 'kafilah_lu'
            }
        ];
    }

    // Default Village
    return [
        {
            _id: `npc_${settlement.id || 'village'}_1`,
            name: 'Kakek Wu',
            title: 'Kepala Desa Kasepuhan',
            realm: 'Ranah Kondensasi Qi (Pensiun)',
            sect: 'Tetua Warga',
            relationship: 'Friend',
            relationshipPoints: 60,
            greeting: 'Selamat datang di desa kami yang tenang, anak muda.',
            hasQuest: true,
            avatarSeed: 'kakek_wu'
        },
        {
            _id: `npc_${settlement.id || 'village'}_2`,
            name: 'Wu Binglin',
            title: 'Pemetik Herba Gunung',
            realm: 'Ranah Kondensasi Qi',
            sect: 'Kultivator Bebas',
            relationship: 'Stranger',
            relationshipPoints: 25,
            greeting: 'Herba liar dari pegunungan utara sangat berkhasiat memulihkan Qi!',
            hasQuest: true,
            avatarSeed: 'wu_binglin'
        },
        {
            _id: `npc_${settlement.id || 'village'}_3`,
            name: 'Paman Tie',
            title: 'Pandai Besi Desa',
            realm: 'Ranah Fana (Mortal Body)',
            sect: 'Warga Biasa',
            relationship: 'Stranger',
            relationshipPoints: 15,
            greeting: 'Baja yang baik membutuhkan seribu pukulan palu tempa.',
            hasQuest: false,
            avatarSeed: 'paman_tie'
        }
    ];
}

/**
 * Get comprehensive settlement panorama data conforming to §6.4
 */
function getSettlementPanoramaData(settlementName, player = null, dbNpcs = []) {
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
            id: lowerName.replace(/\s+/g, '_'),
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
                bannerText: def.bannerText || `${def.chineseName || ''} · ${def.name.split(' ')[0]}`,
                desc: def.desc || '',
                icon: def.icon || 'Home',
                status: def.status || 'open',
                openStatus: def.status === 'coming_soon' ? 'closed' : 'open',
                scale: 1.0,
                xPercent: xPct,
                layer: 'ground',
                key: `${anchor.id}_${def.id}`
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
            key: `${anchor.id}_${b.id}`
        }));
    }

    // Exits: City Gate returns to entrance
    const exitEntrance = (anchor.v20 && anchor.v20.entrance) ? anchor.v20.entrance : { x: anchor.x, y: anchor.y };
    const exits = [
        {
            type: 'city_gate',
            label: `🏮 Gerbang ${anchor.name} (Keluar ke Peta Dunia)`,
            targetTile: { x: exitEntrance.x, y: exitEntrance.y },
            description: `Melangkah keluar melintasi gerbang utama pemukiman menuju koordinat [${exitEntrance.x}, ${exitEntrance.y}] di peta alam liar.`
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
            _id: n._id ? n._id.toString() : `npc_${n.name}`,
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


module.exports = {
    loadAnchors,
    loadBlueprints,
    resolveBlueprintType,
    getTimeOfDay,
    generateCanonicalNpcs,
    getSettlementPanoramaData
};
