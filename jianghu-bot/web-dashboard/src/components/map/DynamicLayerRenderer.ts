/**
 * JIANGHU WORLD — DYNAMIC LAYER RENDERER (components/map/DynamicLayerRenderer.ts)
 * V21 F2 Modular Extraction:
 * - Y-Sorting: Objects, Player, Monsters, NPCs
 * - AABB Frustum Culling & 1,500 Sprite Budget
 * - Building & Landmark Solids & Occlusion Silhouette
 * - Monster Aggro Rings, Health Bars & Aura
 * - A* Glowing Path Ribbon & Target Mandala Ring
 * - Active Player Golden Frame & Silhouette
 */

import { TileData, MapObjectInstance, WorldObjectDef } from '@/types/world';
import { Point } from '@/hooks/useAStarGridPath';
import {
  OBJECT_DEFINITIONS,
  scaleCanon,
  renderL4ProceduralObject,
  renderL6FogOfWarCell,
  renderL7NpcBadge,
  renderL7MonsterInkRing,
  renderL7AggroRadius,
  renderL7ResourceSparkle,
  resolveMonsterAtlasFrameWithFallback
} from '@/lib/proceduralObjects';
import { atlasLoader } from '@/lib/atlasLoader';
import { isDefIdQuarantined } from '@/config/assetQuarantine';
import { chunkManager } from '@/lib/chunkManager';
import { perfProbe } from '@/lib/perfProbe';
import { computeSpriteRect, GridEntry } from '@/lib/gridRect';
import gridCanonData from '@/config/gridCanon.json';
import { LightSource } from './WeatherParticleOverlay';
import { ResourceLabelItem } from './InteractionOverlay';

const gridCanon = (gridCanonData.frames || {}) as Record<string, GridEntry>;

export interface YSortEntry {
  type: 'object' | 'player' | 'monster' | 'npc';
  sortKey: number;
  tileX: number;
  tileY: number;
  footprintBottomY: number;
  data: any;
}

const RESOURCE_ICON_FRAMES: Record<string, string[]> = {
  herb: ['icon_res_herb', 'resource_ancient_herb_garden'],
  ore:  ['icon_res_ore', 'resource_iron_ore', 'resource_heavenly_iron_ore'],
  wood: ['icon_res_wood', 'resource_spirit_wood', 'resource_ironwood_log'],
  fish: ['icon_res_fish', 'resource_golden_carp', 'resource_spirit_koi_pool'],
};

function getObjectPriority(def: WorldObjectDef): number {
  if (def.tags?.includes('landmark') || def.tags?.includes('setpiece')) return 1;
  if (def.tags?.includes('building') || def.tags?.includes('structure') || def.id.includes('house') || def.id.includes('gate') || def.id.includes('tower')) return 2;
  if (def.tags?.includes('tree') || def.id.includes('tree') || def.id.includes('pine') || def.id.includes('bamboo')) return 3;
  if (def.tags?.includes('rock') || def.id.includes('rock') || def.id.includes('pillar') || def.id.includes('cliff')) return 4;
  return 5;
}

export interface DynamicLayerRenderParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  camera: { x: number; y: number; zoom: number };
  currentTileSize: number;
  tileMap: Map<string, TileData>;
  playerPos: { x: number; y: number };
  animatedPlayerPos: React.MutableRefObject<{ x: number; y: number }>;
  activePath?: Point[];
  targetTile?: Point | null;
  toScreenX: (worldX: number) => number;
  toScreenY: (worldY: number) => number;
  time: number;
  isWalking: boolean;
  exploredChunkSet: Set<string>;
  hoveredTile: TileData | null;
  loadedImages: any;
  warnedMissingDefs: Set<string>;
}

export interface DynamicLayerRenderOutput {
  visibleLights: LightSource[];
  eligibleResourceLabels: ResourceLabelItem[];
}

export function renderDynamicLayer({
  ctx,
  width,
  height,
  camera,
  currentTileSize,
  tileMap,
  playerPos,
  animatedPlayerPos,
  activePath,
  targetTile,
  toScreenX,
  toScreenY,
  time,
  isWalking,
  exploredChunkSet,
  hoveredTile,
  loadedImages,
  warnedMissingDefs
}: DynamicLayerRenderParams): DynamicLayerRenderOutput {
  const tObj0 = performance.now();
  const visibleLights: LightSource[] = [];
  const eligibleResourceLabels: ResourceLabelItem[] = [];
  const seenLabelCells = new Set<string>();

  const viewTilesX = width / currentTileSize;
  const viewTilesY = height / currentTileSize;
  const minTileX = Math.max(0, Math.floor(camera.x - viewTilesX / 2) - 1);
  const maxTileX = Math.min(4999, Math.ceil(camera.x + viewTilesX / 2) + 1);
  const minTileY = Math.max(0, Math.floor(camera.y - viewTilesY / 2) - 1);
  const maxTileY = Math.min(4999, Math.ceil(camera.y + viewTilesY / 2) + 1);

  // 1. Gather Candidate Objects within Viewport (+6 margin for tall buildings)
  const ySortQueue: YSortEntry[] = [];
  const MAX_SPRITE_BUDGET = 1500;
  const candidateObjects: Array<{
    def: WorldObjectDef;
    instance: MapObjectInstance;
    priority: number;
    bottomY: number;
  }> = [];

  const objMinTileX = Math.max(0, minTileX - 6);
  const objMaxTileX = Math.min(4999, maxTileX + 6);
  const objMinTileY = Math.max(0, minTileY - 6);
  const objMaxTileY = Math.min(4999, maxTileY + 6);

  for (let ty = objMinTileY; ty <= objMaxTileY; ty++) {
    for (let tx = objMinTileX; tx <= objMaxTileX; tx++) {
      const tile = tileMap.get(`${tx},${ty}`) || chunkManager.getTile(tx, ty);
      if (!tile || !tile.objects || tile.objects.length === 0) continue;

      for (const obj of tile.objects) {
        if (isDefIdQuarantined(obj.defId)) continue;

        let def = OBJECT_DEFINITIONS[obj.defId];
        if (!def && scaleCanon[obj.defId]) {
          const sc = scaleCanon[obj.defId];
          def = {
            id: obj.defId,
            name: obj.defId,
            px: { w: sc.srcW || 256, h: sc.srcH || 256 },
            footprint: { cw: Math.max(1, Math.round(sc.visualW || 2)), ch: Math.max(1, Math.round(sc.visualH || 2)) },
            anchor: sc.anchor || { x: 0.5, y: 0.95 },
            overhangCells: 0.5,
            collision: sc.collision || 'solid',
            staminaMult: 1.0,
            sortBias: 0,
            fogFoot: true,
            tags: [sc.category || 'nature']
          };
        }
        if (!def) {
          if (!warnedMissingDefs.has(obj.defId)) {
            warnedMissingDefs.add(obj.defId);
            console.warn(`[WorldCanvas] Unknown defId '${obj.defId}', skipping.`);
          }
          continue;
        }

        // LOD: Skip micro-clutter at far zoom
        if (camera.zoom < 0.50 && def.footprint.cw <= 1 && def.footprint.ch <= 1) {
          const isImportant = def.tags?.includes('landmark') || def.tags?.includes('setpiece') || def.tags?.includes('monster') || def.tags?.includes('structure') || def.tags?.includes('tree') || def.tags?.includes('bamboo') || obj.defId.startsWith('tree_') || obj.defId.startsWith('bamboo_');
          if (!isImportant) continue;
        }

        const priority = getObjectPriority(def);
        const g = gridCanon[obj.defId];
        const fh = g ? g.fh : def.footprint.ch;
        candidateObjects.push({
          def,
          instance: obj,
          priority,
          bottomY: obj.y + fh
        });
      }
    }
  }

  // Budget clamping
  if (candidateObjects.length > MAX_SPRITE_BUDGET) {
    candidateObjects.sort((a, b) => a.priority - b.priority);
    candidateObjects.length = MAX_SPRITE_BUDGET;
  }

  for (const cand of candidateObjects) {
    ySortQueue.push({
      type: 'object',
      sortKey: cand.bottomY * 1000 + cand.instance.x + (cand.def.sortBias || 0),
      tileX: cand.instance.x,
      tileY: cand.instance.y,
      footprintBottomY: cand.bottomY,
      data: { def: cand.def, instance: cand.instance }
    });
  }

  // 2. Insert Player into Y-Sort Queue
  animatedPlayerPos.current.x += (playerPos.x - animatedPlayerPos.current.x) * 0.15;
  animatedPlayerPos.current.y += (playerPos.y - animatedPlayerPos.current.y) * 0.15;
  const pTileX = animatedPlayerPos.current.x;
  const pTileY = animatedPlayerPos.current.y;
  ySortQueue.push({
    type: 'player',
    sortKey: (pTileY + 1) * 1000 + pTileX,
    tileX: pTileX,
    tileY: pTileY,
    footprintBottomY: pTileY + 1,
    data: null
  });

  // Sort queue by bottom footprint
  ySortQueue.sort((a, b) => a.sortKey - b.sortKey);

  // 3. Render Y-Sorted Queue
  let isPlayerBehindBuilding = false;

  for (const item of ySortQueue) {
    if (item.type === 'object') {
      const { def, instance } = item.data as { def: WorldObjectDef; instance: MapObjectInstance };
      const g = gridCanon[def.id];
      const canon = scaleCanon[def.id];

      let drawX: number;
      let drawY: number;
      let dw: number;
      let dh: number;
      let footX: number;
      let footY: number;
      let colH: number;

      if (g) {
        const rect = computeSpriteRect(g, instance.x, instance.y, currentTileSize, toScreenX, toScreenY);
        drawX = rect.drawX;
        drawY = rect.drawY;
        dw = rect.dw;
        dh = rect.dh;
        footX = rect.footX;
        footY = rect.footY;
        colH = g.fh;
      } else {
        const visualW = canon ? canon.visualW : def.footprint.cw;
        const visualH = canon ? canon.visualH : (def.footprint.ch + def.overhangCells);
        colH = canon?.collision?.h ?? def.footprint.ch;
        const colOffsetX = canon?.collision?.offsetX ?? (def.footprint.cw * 0.5);
        const anchorX = canon?.anchor?.x ?? def.anchor.x;
        const anchorY = canon?.anchor?.y ?? def.anchor.y;

        footX = toScreenX(instance.x + colOffsetX);
        footY = toScreenY(instance.y + colH);
        dw = visualW * currentTileSize;
        dh = visualH * currentTileSize;
        drawX = footX - dw * anchorX;
        drawY = footY - dh * anchorY;
      }

      // Footprint Shadow
      const isSpriteReady = atlasLoader.isSpriteReady(def.id);
      if (isSpriteReady) {
        const isXsObject = g
          ? (g.class === 'XS' || (g.fw <= 1 && g.fh <= 1 && (def.tags?.includes('flora') || def.tags?.includes('herb') || def.tags?.includes('crop'))))
          : (canon?.class === 'XS' || (def.footprint.cw <= 1 && def.footprint.ch <= 1 && (def.tags?.includes('flora') || def.tags?.includes('herb') || def.tags?.includes('crop'))));
        if (!isXsObject) {
          const fw = g ? g.fw : (def.footprint?.cw || 1);
          const fh = g ? g.fh : (def.footprint?.ch || 1);
          const shadowCenterX = footX;
          const shadowCenterY = footY - Math.min(0.20 * currentTileSize, 0.12 * fh * currentTileSize);
          const shadowW = Math.min(dw * 0.9, Math.max(fw * 0.75, 1.2) * currentTileSize);
          const shadowH = Math.min(1.2 * currentTileSize, Math.max(0.28, fh * 0.14) * currentTileSize);
          const isSolid = (g?.mode === 'solid' || def.collision === 'solid' || canon?.collision === 'solid');
          const shadowAlpha = isSolid ? 0.24 : 0.12;

          ctx.save();
          ctx.fillStyle = `rgba(10, 14, 20, ${shadowAlpha})`;
          ctx.beginPath();
          ctx.ellipse(shadowCenterX, shadowCenterY, Math.max(0.1, shadowW / 2), Math.max(0.1, shadowH / 2), 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Multi-lamp collection
      const isHut = def.id.includes('cottage') || def.id.includes('hermitage') || def.id.includes('hut') || def.id.includes('shack') || (instance as any)?.hutType === 'living' || (instance as any)?.isEnterable;
      const hutLight = (isHut && (instance as any)?.hutType !== 'abandoned') ? { r: 3.2, color: '#F59E0B', flicker: 0.06 } : null;
      const lightSource = canon?.light || hutLight;
      if (lightSource && visibleLights.length < 24) {
        visibleLights.push({
          sx: footX,
          sy: footY - (colH * 0.45 * currentTileSize),
          radius: Math.max(35, lightSource.r * currentTileSize),
          color: lightSource.color || '#F59E0B',
          flicker: lightSource.flicker || 0.06
        });
      }

      // Building identification
      const isBuilding =
        def.tags?.includes('building') ||
        def.tags?.includes('structure') ||
        def.tags?.includes('landmark') ||
        canon?.category === 'building' ||
        canon?.category === 'landmark' ||
        def.id.startsWith('building_') ||
        def.id.startsWith('structure_') ||
        def.id.startsWith('landmark_') ||
        def.id.includes('pagoda') ||
        def.id.includes('pavilion') ||
        def.id.includes('altar') ||
        def.id.includes('citadel') ||
        def.id.includes('city') ||
        def.id.includes('gate');

      let objAlpha = 1.0;
      let isPlayerBehind = false;
      if (g) {
        isPlayerBehind =
          pTileY >= instance.y - g.vh * 0.8 &&
          pTileY <= instance.y + g.fh &&
          pTileX >= instance.x - g.vw * 0.4 &&
          pTileX <= instance.x + g.vw * 0.6;
      } else {
        const visualW = canon ? canon.visualW : def.footprint.cw;
        const visualH = canon ? canon.visualH : (def.footprint.ch + def.overhangCells);
        isPlayerBehind =
          pTileY >= instance.y - visualH * 0.8 &&
          pTileY <= instance.y + colH &&
          pTileX >= instance.x - visualW * 0.4 &&
          pTileX <= instance.x + visualW * 0.6;
      }

      const isBlockingPlayer = isPlayerBehind && item.sortKey > (pTileY + 1) * 1000 + pTileX;

      if (isBuilding) {
        objAlpha = 1.0;
        if (isBlockingPlayer) isPlayerBehindBuilding = true;
      } else if (isBlockingPlayer) {
        objAlpha = 0.80;
      }

      // Render Procedural Object
      renderL4ProceduralObject(ctx, def.id, drawX, drawY, dw, time, objAlpha, instance.flipX, dh);

      // Building & Settlement Marker Label
      const t = tileMap.get(`${instance.x},${instance.y}`) || chunkManager.getTile(instance.x, instance.y);
      const isMarker = Boolean(instance.tags?.includes('settlement_marker') || t?.isSettlementOrigin);
      const labelText = isMarker ? (instance.customLabel || t?.settlementName || t?.buildingName) : (t?.buildingName);

      if (labelText && (camera.zoom >= 0.65 || isMarker)) {
        const bLabel = labelText;
        const fontSize = Math.max(isMarker ? 9 : 7, (isMarker ? 11 : 8.5) * camera.zoom);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        const textW = ctx.measureText(bLabel).width;
        const pillW = textW + (isMarker ? 16 : 8) * camera.zoom;
        const pillH = (isMarker ? 16 : 11) * camera.zoom;
        const pillX = footX - pillW / 2;
        const pillY = footY + (isMarker ? 6 : 4) * camera.zoom;

        ctx.fillStyle = isMarker ? 'rgba(15, 10, 5, 0.92)' : 'rgba(10, 14, 23, 0.85)';
        ctx.fillRect(pillX, pillY, pillW, pillH);
        ctx.strokeStyle = isMarker ? '#C5A880' : '#D97706';
        ctx.lineWidth = isMarker ? 1.5 : 1;
        ctx.strokeRect(pillX, pillY, pillW, pillH);
        ctx.fillStyle = isMarker ? '#F5E6C8' : '#FEF08A';
        ctx.fillText(bLabel, pillX + pillW / 2, pillY + pillH - (isMarker ? 4 : 2.5) * camera.zoom);
      }
    } else if (item.type === 'player') {
      const footX = toScreenX(animatedPlayerPos.current.x + 0.5);
      const footY = toScreenY(animatedPlayerPos.current.y + 1.0);
      const pw = currentTileSize * 0.55;
      const ph = currentTileSize * 0.90;

      ctx.save();
      // Player Footprint Shadow
      ctx.fillStyle = 'rgba(10, 14, 20, 0.25)';
      ctx.beginPath();
      ctx.ellipse(footX, footY - currentTileSize * 0.08, Math.max(0.1, pw * 0.45), Math.max(0.1, currentTileSize * 0.12), 0, 0, Math.PI * 2);
      ctx.fill();

      if (loadedImages?.sprites?.player_default) {
        ctx.drawImage(loadedImages.sprites.player_default, footX - pw / 2, footY - ph, pw, ph);
        if (loadedImages.sprites?.flying_sword_aura) {
          ctx.drawImage(loadedImages.sprites.flying_sword_aura, footX - pw / 2, footY - currentTileSize * 0.1, pw, currentTileSize * 0.25);
        }
      } else {
        // Radiant Qi Aura
        const auraPulse = (pw * 0.72) + Math.sin(time * 3.5) * (currentTileSize * 0.04);
        ctx.fillStyle = 'rgba(45, 212, 191, 0.20)';
        ctx.beginPath();
        ctx.arc(footX, footY - ph * 0.48, auraPulse, 0, Math.PI * 2);
        ctx.fill();

        // Outer Robe Body (Jade / Cyan Daoist Robe #1E6075)
        ctx.fillStyle = '#1E6075';
        ctx.beginPath();
        ctx.moveTo(footX, footY - ph * 0.72);
        ctx.lineTo(footX + pw * 0.46, footY - currentTileSize * 0.05);
        ctx.lineTo(footX - pw * 0.46, footY - currentTileSize * 0.05);
        ctx.closePath();
        ctx.fill();

        // Inner Silk Robe
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.moveTo(footX, footY - ph * 0.72);
        ctx.lineTo(footX + pw * 0.14, footY - ph * 0.48);
        ctx.lineTo(footX - pw * 0.14, footY - ph * 0.48);
        ctx.closePath();
        ctx.fill();

        // Gold Silk Sash
        ctx.fillStyle = '#C5A880';
        ctx.fillRect(footX - pw * 0.22, footY - ph * 0.50, pw * 0.44, ph * 0.09);
        ctx.fillRect(footX - pw * 0.06, footY - ph * 0.41, pw * 0.12, ph * 0.18);

        // Skin Face
        ctx.fillStyle = '#FBD38D';
        ctx.beginPath();
        ctx.arc(footX, footY - ph * 0.78, pw * 0.22, 0, Math.PI * 2);
        ctx.fill();

        // Dark Hair & Topknot Bun
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(footX, footY - ph * 0.81, pw * 0.24, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(footX, footY - ph * 0.94, pw * 0.13, 0, Math.PI * 2);
        ctx.fill();

        // Jade Hairpin
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = Math.max(1.5, currentTileSize * 0.035);
        ctx.beginPath();
        ctx.moveTo(footX - pw * 0.24, footY - ph * 0.94);
        ctx.lineTo(footX + pw * 0.24, footY - ph * 0.94);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // Silhouette when behind building
  if (isPlayerBehindBuilding) {
    const px = toScreenX(animatedPlayerPos.current.x) + currentTileSize / 2;
    const py = toScreenY(animatedPlayerPos.current.y) + currentTileSize / 2;
    ctx.save();
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.beginPath();
    ctx.arc(px, py - 6 * camera.zoom, 11 * camera.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(px, py - 14 * camera.zoom, 3.5 * camera.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 4. Fog of War Cells
  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      const chunkX = Math.floor(tx / 16);
      const chunkY = Math.floor(ty / 16);
      const isFogActive = exploredChunkSet.size > 0;
      const isExplored = !isFogActive || exploredChunkSet.has(`${chunkX},${chunkY}`);
      if (!isExplored) {
        const sx = toScreenX(tx);
        const sy = toScreenY(ty);
        renderL6FogOfWarCell(ctx, sx, sy, currentTileSize, 'unknown');
      }
    }
  }

  // 5. NPC & Monster Badges
  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      const tile = tileMap.get(`${tx},${ty}`) || chunkManager.getTile(tx, ty);
      if (!tile) continue;

      const sx = toScreenX(tx);
      const sy = toScreenY(ty);

      if (tile.npcs && tile.npcs.length > 0) {
        renderL7NpcBadge(ctx, sx + currentTileSize * 0.5, sy + currentTileSize * 0.5, currentTileSize * 0.4, tile.npcs.length, 'friendly');
      }

      if (tile.spawnedMonster) {
        const m = tile.spawnedMonster as any;
        renderL7MonsterInkRing(ctx, sx + currentTileSize * 0.5, sy + currentTileSize * 0.5, currentTileSize * 0.45, m.tier || 1, Boolean(m.isBoss), time);

        const frameId = resolveMonsterAtlasFrameWithFallback(m.monsterId || m.key, m.category);
        const drawn = atlasLoader.drawAtlasFrame(
          ctx,
          'monsters',
          frameId,
          sx + currentTileSize * 0.15,
          sy + currentTileSize * 0.15,
          currentTileSize * 0.7,
          currentTileSize * 0.7,
          0.95
        );
        if (!drawn) {
          ctx.save();
          ctx.fillStyle = '#DC2626';
          ctx.font = `${Math.max(16, 20 * camera.zoom)}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('👹', sx + currentTileSize * 0.5, sy + currentTileSize * 0.5);
          ctx.restore();
        }

        // Aggro Radius
        if (m.aggroRadius && m.aggroRadius > 0 && camera.zoom >= 0.5) {
          renderL7AggroRadius(ctx, sx + currentTileSize * 0.5, sy + currentTileSize * 0.5, m.aggroRadius * currentTileSize, time);
        }

        // Monster Name & Level Tag
        if (camera.zoom >= 0.65) {
          const mLabel = `Lv.${m.level || 1} ${m.name}`;
          const fontSize = Math.max(7, 8.5 * camera.zoom);
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          const textW = ctx.measureText(mLabel).width;
          const pillW = textW + 6 * camera.zoom;
          const pillH = 10 * camera.zoom;
          const pillX = sx + (currentTileSize - pillW) / 2;
          const pillY = sy + currentTileSize * 0.88 - pillH;

          ctx.fillStyle = 'rgba(15, 5, 5, 0.85)';
          ctx.fillRect(pillX, pillY, pillW, pillH);
          ctx.strokeStyle = (m.isBoss || (m.tier && m.tier >= 4)) ? '#EF4444' : '#F59E0B';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(pillX, pillY, pillW, pillH);
          ctx.fillStyle = '#FCA5A5';
          ctx.fillText(mLabel, sx + currentTileSize / 2, pillY + pillH - 2 * camera.zoom);
        }
      }

      // Spiritual Resource Gathering Nodes
      if ((camera.zoom >= 0.75 || hoveredTile) && (tile.resourceType || tile.tileType === 'resource_node')) {
        const isDormant = Boolean(tile.nodeRespawnAt && new Date(tile.nodeRespawnAt).getTime() > Date.now());
        const isHovered = hoveredTile && hoveredTile.tileX === tile.tileX && hoveredTile.tileY === tile.tileY;

        const rt = tile.resourceType || 'herb';
        const candidates = RESOURCE_ICON_FRAMES[rt] || ['icon_res_herb'];
        for (const frameId of candidates) {
          if (
            atlasLoader.drawAtlasFrame(ctx, 'icons', frameId, sx + currentTileSize * 0.25, sy + currentTileSize * 0.25, currentTileSize * 0.5, currentTileSize * 0.5, 0.85) ||
            atlasLoader.drawAtlasFrame(ctx, 'objects_nature', frameId, sx + currentTileSize * 0.25, sy + currentTileSize * 0.25, currentTileSize * 0.5, currentTileSize * 0.5, 0.85)
          ) {
            break;
          }
        }

        renderL7ResourceSparkle(ctx, sx + currentTileSize * 0.5, sy + currentTileSize * 0.5, currentTileSize * 0.38, tile.resourceType || 'herb', time, isDormant);

        if (!isDormant) {
          const dist = Math.max(Math.abs(tile.tileX - playerPos.x), Math.abs(tile.tileY - playerPos.y));
          const isSelected = targetTile && targetTile.x === tile.tileX && targetTile.y === tile.tileY;
          const isPlayerOnCell = Math.floor(playerPos.x) === tile.tileX && Math.floor(playerPos.y) === tile.tileY;
          const cellKey = `${tile.tileX},${tile.tileY}`;

          if (!seenLabelCells.has(cellKey)) {
            if (isHovered || isSelected || (camera.zoom >= 0.75 && dist <= 1.5 && (!isPlayerOnCell || tile.resourceType))) {
              seenLabelCells.add(cellKey);
              const resLabel = (
                tile.resourceType === 'herb' ? 'Herba Roh' :
                tile.resourceType === 'ore' ? 'Urat Bijih' :
                tile.resourceType === 'wood' ? 'Kayu Roh' :
                tile.resourceType === 'fish' ? 'Lubuk Ikan' :
                tile.label || 'Sumber Daya'
              );
              eligibleResourceLabels.push({
                tile,
                screenX: sx + currentTileSize * 0.5,
                screenY: sy + currentTileSize * 0.85,
                dist: isHovered ? -1 : dist,
                label: resLabel
              });
            }
          }
        }
      }
    }
  }

  // 6. Active A* Glowing Path Ribbon
  if (activePath && activePath.length > 1) {
    ctx.save();
    ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
    ctx.shadowBlur = 12 * camera.zoom;
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = Math.max(3.5, 4.8 * camera.zoom);
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';

    ctx.beginPath();
    activePath.forEach((pt, idx) => {
      const px = toScreenX(pt.x) + currentTileSize / 2;
      const py = toScreenY(pt.y) + currentTileSize / 2;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = Math.max(1, 1.6 * camera.zoom);
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();
  }

  // 7. Target Selection Mandala
  if (targetTile) {
    const sx = toScreenX(targetTile.x);
    const sy = toScreenY(targetTile.y);
    ctx.save();
    ctx.translate(sx + currentTileSize / 2, sy + currentTileSize / 2);
    ctx.rotate(time * 1.5);
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.8)';
    ctx.lineWidth = 2 * camera.zoom;

    ctx.beginPath();
    const r = currentTileSize * 0.45;
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.moveTo(r, 0);
      ctx.quadraticCurveTo(0, 0, 0, r);
    }
    ctx.stroke();
    ctx.restore();
  }

  // 8. Active Player Cell Golden Frame
  const curTileX = Math.round(animatedPlayerPos.current.x);
  const curTileY = Math.round(animatedPlayerPos.current.y);
  const pTileSx = toScreenX(curTileX);
  const pTileSy = toScreenY(curTileY);

  ctx.save();
  ctx.fillStyle = 'rgba(254, 243, 199, 0.35)';
  ctx.fillRect(pTileSx, pTileSy, currentTileSize, currentTileSize);
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = Math.max(1.5, 2.4 * camera.zoom);
  ctx.shadowColor = 'rgba(245, 158, 11, 0.65)';
  ctx.shadowBlur = 8 * camera.zoom;
  ctx.strokeRect(pTileSx + 0.5, pTileSy + 0.5, currentTileSize - 1, currentTileSize - 1);
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;
  ctx.strokeRect(pTileSx + 3 * camera.zoom, pTileSy + 3 * camera.zoom, currentTileSize - 6 * camera.zoom, currentTileSize - 6 * camera.zoom);
  ctx.restore();

  perfProbe.mark('render:objects', performance.now() - tObj0);

  return {
    visibleLights,
    eligibleResourceLabels
  };
}
