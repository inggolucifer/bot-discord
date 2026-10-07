
const express = require('express');
const router = express.Router();
const RegionMap = require('../../models/RegionMap');
const Location = require('../../models/Location');
const Player = require('../../models/Player');
const Npc = require('../../models/Npc');
const Quest = require('../../models/Quest');
const Travel = require('../../models/Travel');
const { authenticateToken } = require('../middlewares/auth');
const travelDistances = require('../../config/travelDistances');
const { worldMapImageUrl } = require('../../config/worldMapImage');

router.get('/world', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId }).lean();

        if (!player) {
            return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
        }

        const { REGIONS } = require('../../utils/worldRegionEngine');

        const regionsWithDiscovery = REGIONS.map(reg => {
            const centerX = Math.round((reg.bounds.minX + reg.bounds.maxX) / 2);
            const centerY = Math.round((reg.bounds.minY + reg.bounds.maxY) / 2);
            // Konversi spasial 5000x5000 ke koordinat layar CSS (Y=5000 di utara/atas, Y=0 di selatan/bawah)
            const worldMapX = Math.max(5, Math.min(95, Math.round((centerX / 5000) * 100)));
            const worldMapY = Math.max(5, Math.min(95, Math.round((1 - (centerY / 5000)) * 100)));

            let terrainType = 'plains';
            if (reg.id.includes('mountain') || reg.id.includes('peak') || reg.id.includes('cliff')) terrainType = 'mountain';
            else if (reg.id.includes('glacial') || reg.id.includes('ice') || reg.id.includes('desolate')) terrainType = 'glacial';
            else if (reg.id.includes('swamp') || reg.id.includes('demon') || reg.id.includes('plague') || reg.id.includes('mire')) terrainType = 'swamp';
            else if (reg.id.includes('sea') || reg.id.includes('water') || reg.id.includes('river')) terrainType = 'water';
            else if (reg.id.includes('desert') || reg.id.includes('dune')) terrainType = 'desert';
            else if (reg.id.includes('volcanic') || reg.id.includes('magma') || reg.id.includes('scar')) terrainType = 'volcanic';

            return {
                regionSlug: reg.id,
                displayName: reg.name,
                worldMapX,
                worldMapY,
                centerX,
                centerY,
                bounds: reg.bounds,
                dangerTier: reg.dangerTier,
                qiDensityModifier: reg.qiDensityModifier,
                walkDefault: reg.walkDefault,
                tempRangeC: reg.tempRangeC,
                terrainType,
                lawAffinities: reg.lawAffinities || [],
                resourceTags: reg.resourceTags || [],
                discovered: true
            };
        });

        let activeTravel = null;
        const travel = await Travel.findOne({
            discordId: userId,
            status: { $in: ['traveling', 'ambushed'] }
        }).lean();
        if (travel) {
            activeTravel = {
                status: travel.status,
                from: travel.fromLocation,
                to: travel.toLocation,
                startTime: travel.startTime,
                arrivalTime: travel.arrivalTime
            };
        }

        res.json({
            worldMapImageUrl: worldMapImageUrl || null,
            regions: regionsWithDiscovery,
            player: {
                discoveredRegions: player.discoveredRegions,
                discoveredLocations: player.discoveredLocations,
                currentLocation: player.currentLocation
            },
            activeTravel
        });
    } catch (error) {
        console.error('[API-MAP-WORLD] Error fetching world map:', error);
        res.status(500).json({ error: 'Gagal mengambil data peta dunia.' });
    }
});


router.get('/region/:regionSlug', authenticateToken, async (req, res) => {
    try {
        const { regionSlug } = req.params;
        const userId = req.user.userId;
        const player = await Player.findOne({ discordId: userId }).lean();

        if (!player) {
            return res.status(404).json({ error: 'Karakter tidak ditemukan.' });
        }

        const region = await RegionMap.findOne({ regionSlug }).lean();

        if (!region) {
            return res.status(404).json({ error: 'Region tidak ditemukan.' });
        }

        // Fetch plazas to represent settlements on the map
        const plazas = await Location.find({
            guildId: player.guildId,
            regionSlug,
            buildingType: 'plaza'
        }).lean();

        const npcs = await Npc.find({ guildId: player.guildId, regionSlug }).populate('questIds').lean();

        const settlements = plazas.map(plaza => {
            const settlementConfig = travelDistances.settlements.find(
                s => s.regionSlug === regionSlug && s.name === plaza.settlementName
            );

            const key = `${regionSlug}|${plaza.settlementName}`;


            let hasActiveQuest = false;
            const npcsInSettlement = npcs.filter(n => n.settlementName === plaza.settlementName && n.isActive);
            for (const npc of npcsInSettlement) {
                 for (const q of (npc.questIds || [])) {
                      if (!q.isActive) continue;
                      const isCompleted = player.completedQuests && player.completedQuests.includes(q.key);
                      const isActive = player.questLog && player.questLog.some(ql => ql.questId.toString() === q._id.toString());

                      if (!isCompleted && !isActive) {
                          hasActiveQuest = true;
                          break;
                      }
                 }
                 if (hasActiveQuest) break;
            }

            return {
                hasActiveQuest,
                name: plaza.settlementName,
                regionSlug: plaza.regionSlug,
                mapX: plaza.mapX,
                mapY: plaza.mapY,
                mapIconType: plaza.mapIconType,
                minRealmIndex: settlementConfig ? settlementConfig.minRealmIndex : 0,
                discovered: (player.discoveredLocations || []).includes(key),
                key
            };
        });

        // Filter intra-region edges
        const edges = [];
        const distances = travelDistances.distancesLi;

        const settlementNames = settlements.map(s => s.name);

        const processedEdges = new Set();

        for (const fromName of settlementNames) {
            if (distances[fromName]) {
                for (const toName in distances[fromName]) {
                     if (settlementNames.includes(toName)) {
                         const edgeKey = [fromName, toName].sort().join('-');
                         if (!processedEdges.has(edgeKey)) {
                              edges.push({
                                  from: fromName,
                                  to: toName,
                                  distanceLi: distances[fromName][toName]
                              });
                              processedEdges.add(edgeKey);
                         }
                     }
                }
            }
        }

        let activeTravel = null;
        const travel = await Travel.findOne({
            discordId: userId,
            status: { $in: ['traveling', 'ambushed'] }
        }).lean();
        if (travel) {
            activeTravel = {
                status: travel.status,
                from: travel.fromLocation,
                to: travel.toLocation,
                startTime: travel.startTime,
                arrivalTime: travel.arrivalTime
            };
        }

        res.json({
            region,
            settlements,
            edges,
            player: {
                discoveredRegions: player.discoveredRegions,
                discoveredLocations: player.discoveredLocations,
                currentLocation: player.currentLocation
            },
            activeTravel
        });
    } catch (error) {
        console.error('[API-MAP-REGION] Error fetching region map:', error);
        res.status(500).json({ error: 'Gagal mengambil data peta region.' });
    }
});

module.exports = router;
