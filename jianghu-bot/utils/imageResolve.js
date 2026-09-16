const fs = require('fs');
const path = require('path');
const vm = require('vm');

let cachedAssets = null;
let lastMtime = 0;

function getGlobalAssets() {
  try {
    const tsPath = path.resolve(__dirname, '../web-dashboard/src/config/globalAssets.ts');
    if (!fs.existsSync(tsPath)) {
      return cachedAssets || {};
    }

    const stat = fs.statSync(tsPath);
    if (cachedAssets && stat.mtimeMs === lastMtime) {
      return cachedAssets;
    }

    let code = fs.readFileSync(tsPath, 'utf8');
    // Remove TypeScript export type / interface lines
    code = code.replace(/export\s+type\s+[^;]+;/g, '');
    code = code.replace(/export\s+interface\s+[\s\S]*?}/g, '');
    // Change "export const GLOBAL_ASSETS =" to assign to sandbox variable
    code = code.replace(/export\s+const\s+GLOBAL_ASSETS\s*=/, 'GLOBAL_ASSETS =');

    const sandbox = { GLOBAL_ASSETS: {} };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);

    cachedAssets = sandbox.GLOBAL_ASSETS || {};
    lastMtime = stat.mtimeMs;
    return cachedAssets;
  } catch (err) {
    console.error('[imageResolve] Error loading globalAssets.ts:', err.message);
    return cachedAssets || {};
  }
}

function isUsableUrl(url) {
  return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
}

function getEmoji(kind) {
  const assets = getGlobalAssets();
  const emoji = assets.emoji || {};
  return emoji[kind] || emoji.default || '🖼️';
}

function resolveBodyPart(part, key) {
  const assets = getGlobalAssets();
  if (!assets.body || !assets.body[part]) return null;
  const url = assets.body[part][key];
  return isUsableUrl(url) ? url : null;
}

function resolveItemImage(item) {
  if (!item) return null;
  if (isUsableUrl(item.imageUrl)) return item.imageUrl;

  const assets = getGlobalAssets();
  const items = assets.items || {};
  const catalogUrl = items[item.key || item.name];
  return isUsableUrl(catalogUrl) ? catalogUrl : null;
}

function resolveMonsterImage(monster) {
  if (!monster) return null;
  if (isUsableUrl(monster.imageUrl)) return monster.imageUrl;
  if (isUsableUrl(monster.portraitUrl)) return monster.portraitUrl;

  const assets = getGlobalAssets();
  const monsters = assets.monsters || {};
  const catalogUrl = monsters[monster.key || monster.name];
  return isUsableUrl(catalogUrl) ? catalogUrl : null;
}

function resolveNpcImage(npc) {
  if (!npc) return null;
  if (isUsableUrl(npc.portraitUrl)) return npc.portraitUrl;
  if (isUsableUrl(npc.imageUrl)) return npc.imageUrl;

  const assets = getGlobalAssets();
  const npcs = assets.npcs || {};
  const catalogUrl = npcs[npc.name];
  return isUsableUrl(catalogUrl) ? catalogUrl : null;
}

function resolveLocationImage(location) {
  if (!location) return null;
  if (isUsableUrl(location.imageUrl)) return location.imageUrl;

  const assets = getGlobalAssets();
  const locations = assets.locations || assets.cities || {};
  const catalogUrl = locations[location.settlementName] || locations[location.regionSlug];
  return isUsableUrl(catalogUrl) ? catalogUrl : null;
}

function resolveManualImage(manual) {
  if (!manual) return null;
  if (isUsableUrl(manual.imageUrl)) return manual.imageUrl;

  const assets = getGlobalAssets();
  const manuals = assets.manuals || {};
  const catalogUrl = manuals[manual.name];
  return isUsableUrl(catalogUrl) ? catalogUrl : null;
}

module.exports = {
  getGlobalAssets,
  isUsableUrl,
  getEmoji,
  resolveBodyPart,
  resolveItemImage,
  resolveMonsterImage,
  resolveNpcImage,
  resolveLocationImage,
  resolveManualImage
};
