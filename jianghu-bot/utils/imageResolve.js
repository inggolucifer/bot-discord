const catalog = require('../config/imageCatalog');

function isUsableUrl(url) {
  return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
}

function getEmoji(kind) {
  return catalog.emoji[kind] || catalog.emoji.default;
}

function resolveBodyPart(part, key) {
  if (!catalog.body[part]) return null;
  const url = catalog.body[part][key];
  return isUsableUrl(url) ? url : null;
}

function resolveItemImage(item) {
  if (!item) return null;
  if (isUsableUrl(item.imageUrl)) return item.imageUrl;

  const catalogUrl = catalog.items[item.key || item.name];
  return isUsableUrl(catalogUrl) ? catalogUrl : null;
}

function resolveMonsterImage(monster) {
  if (!monster) return null;
  if (isUsableUrl(monster.imageUrl)) return monster.imageUrl;
  if (isUsableUrl(monster.portraitUrl)) return monster.portraitUrl;

  const catalogUrl = catalog.monsters[monster.key || monster.name];
  return isUsableUrl(catalogUrl) ? catalogUrl : null;
}

function resolveNpcImage(npc) {
  if (!npc) return null;
  if (isUsableUrl(npc.portraitUrl)) return npc.portraitUrl;
  if (isUsableUrl(npc.imageUrl)) return npc.imageUrl;

  const catalogUrl = catalog.npcs[npc.name];
  return isUsableUrl(catalogUrl) ? catalogUrl : null;
}

function resolveLocationImage(location) {
  if (!location) return null;
  if (isUsableUrl(location.imageUrl)) return location.imageUrl;

  const catalogUrl = catalog.locations[location.settlementName] || catalog.locations[location.regionSlug];
  return isUsableUrl(catalogUrl) ? catalogUrl : null;
}

function resolveManualImage(manual) {
  if (!manual) return null;
  if (isUsableUrl(manual.imageUrl)) return manual.imageUrl;

  const catalogUrl = catalog.manuals?.[manual.name];
  return isUsableUrl(catalogUrl) ? catalogUrl : null;
}

module.exports = {
  isUsableUrl,
  getEmoji,
  resolveBodyPart,
  resolveItemImage,
  resolveMonsterImage,
  resolveNpcImage,
  resolveLocationImage,
  resolveManualImage
};
