/**
 * Authoritative NPC Spatial Position Resolver (V28 / B2)
 * Ensures every NPC resolves to valid world coordinates and prevents (0, 0) drops.
 */

function resolveNpcTile(npc, anchorMap = null) {
  if (!npc) {
    throw new Error('[npcPosition] Objek NPC tidak valid.');
  }

  let tx = npc.schedule?.tileX;
  let ty = npc.schedule?.tileY;

  // Fallback to top-level tileX / tileY
  if (tx == null || ty == null || (tx === 0 && ty === 0)) {
    tx = npc.tileX;
    ty = npc.tileY;
  }

  // Fallback to anchor coordinates if anchorMap provided
  if ((tx == null || ty == null || (tx === 0 && ty === 0)) && anchorMap) {
    const anchorId = npc.schedule?.currentAnchorId || npc.schedule?.homeAnchorId;
    const anchor = anchorMap[anchorId] || (anchorMap.get ? anchorMap.get(anchorId) : null);
    if (anchor && (anchor.x != null || anchor.tileX != null)) {
      tx = anchor.x ?? anchor.tileX;
      ty = anchor.y ?? anchor.tileY;
    }
  }

  // Strict check: coordinates must exist and must not be (0, 0)
  if (tx == null || ty == null || (tx === 0 && ty === 0)) {
    throw new Error(`[npcPosition] NPC "${npc.name || npc._id}" tidak memiliki koordinat spasial yang sah (tx: ${tx}, ty: ${ty}).`);
  }

  return {
    tileX: Math.floor(tx),
    tileY: Math.floor(ty)
  };
}

module.exports = {
  resolveNpcTile
};
