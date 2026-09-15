const catalog = require('../config/imageCatalog');

function resolveBodyPart(part, key) {
  if (!catalog.body[part]) return null;
  return catalog.body[part][key] || null;
}

function resolveItemImage(item) {
  if (!item) return catalog.ui.placeholder_item;
  if (item.imageUrl && item.imageUrl.startsWith('http')) return item.imageUrl;
  return catalog.items[item.key || item.name] || catalog.ui.placeholder_item;
}

function resolveMonsterImage(monster) {
  if (!monster) return catalog.ui.placeholder_monster;
  if (monster.imageUrl && monster.imageUrl.startsWith('http')) return monster.imageUrl;
  if (monster.portraitUrl && monster.portraitUrl.startsWith('http')) return monster.portraitUrl;
  return catalog.monsters[monster.key || monster.name] || catalog.ui.placeholder_monster;
}

function resolveNpcImage(npc) {
  if (!npc) return catalog.ui.placeholder_npc;
  if (npc.portraitUrl && npc.portraitUrl.startsWith('http')) return npc.portraitUrl;
  if (npc.imageUrl && npc.imageUrl.startsWith('http')) return npc.imageUrl;
  return catalog.npcs[npc.name] || catalog.ui.placeholder_npc;
}

function resolveLocationImage(location) {
  if (!location) return catalog.ui.placeholder_location;
  if (location.imageUrl && location.imageUrl.startsWith('http')) return location.imageUrl;
  return catalog.locations[location.settlementName] || catalog.locations[location.regionSlug] || catalog.ui.placeholder_location;
}

function resolveManualImage(manual) {
  if (!manual) return catalog.ui.placeholder_manual;
  if (manual.imageUrl && manual.imageUrl.startsWith('http')) return manual.imageUrl;
  return catalog.ui.placeholder_manual;
}

module.exports = {
  resolveBodyPart,
  resolveItemImage,
  resolveMonsterImage,
  resolveNpcImage,
  resolveLocationImage,
  resolveManualImage
};
