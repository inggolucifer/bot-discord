const fs = require('fs');
const path = require('path');
const { loadImage } = require('../../../node_modules/@napi-rs/canvas');

const ASSETS_GROUND = path.resolve(__dirname, '../../../web-dashboard/public/assets/ground');

class NodeGroundTextures {
  constructor() {
    this.manifest = null;
    this.images = new Map();
    this.patterns = new Map();
    this.transitionMasks = new Map();
    this.ready = false;
  }

  async load() {
    if (this.ready) return;

    const manifestPath = path.join(ASSETS_GROUND, 'ground-manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`ground-manifest.json tidak ditemukan di: ${manifestPath}`);
    }

    this.manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // Check v15 clean families
    let cleanMap = {};
    const v15Path = path.join(ASSETS_GROUND, 'ground-manifest-v15.json');
    if (fs.existsSync(v15Path)) {
      try {
        const v15Data = JSON.parse(fs.readFileSync(v15Path, 'utf8'));
        if (v15Data.cleanFamilies) {
          for (const [fam, vars] of Object.entries(v15Data.cleanFamilies)) {
            if (Array.isArray(vars)) {
              for (const vNum of vars) {
                cleanMap[`${fam}_m${vNum}.webp`] = true;
              }
            }
          }
        }
        if (Array.isArray(v15Data.rejectedList)) {
          for (const item of v15Data.rejectedList) {
            if (item && item.file) cleanMap[item.file] = false;
          }
        }
      } catch (_) {}
    }

    // Filter variants in manifest
    for (const tInfo of Object.values(this.manifest.terrains)) {
      if (Array.isArray(tInfo.variants)) {
        const cleanVariants = tInfo.variants.filter((v) => {
          const fileKey = v.replace(/^v11\//, '') + '.webp';
          return cleanMap[fileKey] !== false;
        });
        tInfo.variants = cleanVariants.length > 0
          ? cleanVariants
          : (tInfo.family === 'plains' ? ['v11/meadow_m1'] : [`v11/${tInfo.family}_m1`]);
      }
    }

    // Aliases v15
    const aliasPath = path.join(ASSETS_GROUND, 'ground-alias-v15.json');
    if (fs.existsSync(aliasPath)) {
      try {
        const aliasData = JSON.parse(fs.readFileSync(aliasPath, 'utf8'));
        if (aliasData.aliases) {
          for (const [fam, aliasVars] of Object.entries(aliasData.aliases)) {
            if (Array.isArray(aliasVars)) {
              for (const tInfo of Object.values(this.manifest.terrains)) {
                if (tInfo.family === fam) {
                  const cleanAlias = aliasVars.filter(v => {
                    const fileKey = v.replace(/^v11\//, '') + '.webp';
                    return cleanMap[fileKey] !== false;
                  });
                  tInfo.variants = [...new Set([...(tInfo.variants || []), ...cleanAlias])];
                }
              }
            }
          }
        }
      } catch (_) {}
    }

    // Collect unique variants & families
    const uniqueVariants = new Set();
    const uniqueFamilies = new Set();
    for (const tInfo of Object.values(this.manifest.terrains)) {
      if (tInfo.family) uniqueFamilies.add(tInfo.family);
      if (Array.isArray(tInfo.variants)) {
        for (const v of tInfo.variants) uniqueVariants.add(v);
      }
    }

    // Load macro variant images
    for (const variantId of uniqueVariants) {
      const fullPath = path.join(ASSETS_GROUND, `${variantId}.webp`);
      if (fs.existsSync(fullPath)) {
        try {
          const img = await loadImage(fullPath);
          this.images.set(variantId, img);
        } catch (_) {}
      }
    }

    // Load detail overlays
    for (const fam of uniqueFamilies) {
      const fullPath = path.join(ASSETS_GROUND, `v11/${fam}_detail.png`);
      if (fs.existsSync(fullPath)) {
        try {
          const img = await loadImage(fullPath);
          this.images.set(`v11/${fam}_detail`, img);
        } catch (_) {}
      }
    }

    // Load transition masks
    for (const k of ['a', 'b', 'c', 'd']) {
      const fullPath = path.join(ASSETS_GROUND, `v11/transition_mask_${k}.png`);
      if (fs.existsSync(fullPath)) {
        try {
          const img = await loadImage(fullPath);
          this.transitionMasks.set(k, img);
        } catch (_) {}
      }
    }

    this.ready = this.images.size > 0;
    return this;
  }

  familyOf(terrainOrFamily) {
    if (!this.manifest || !this.manifest.terrains) return null;
    if (this.manifest.terrains[terrainOrFamily]) return this.manifest.terrains[terrainOrFamily];
    for (const info of Object.values(this.manifest.terrains)) {
      if (info && info.family === terrainOrFamily && Array.isArray(info.variants) && info.variants.length > 0) {
        return info;
      }
    }
    return null;
  }

  getImage(id) {
    return this.images.get(id) || null;
  }

  getPattern(ctx, variantId) {
    if (!ctx) return null;
    const img = this.getImage(variantId);
    if (!img) return null;
    return ctx.createPattern(img, 'repeat');
  }

  getDetailPattern(ctx, family) {
    if (!ctx) return null;
    const img = this.images.get(`v11/${family}_detail`);
    if (!img) return null;
    return ctx.createPattern(img, 'repeat');
  }

  getTransitionMask(keyOrIdx) {
    const keys = ['a', 'b', 'c', 'd'];
    const k = typeof keyOrIdx === 'number' ? keys[Math.abs(keyOrIdx) % keys.length] : keyOrIdx;
    return this.transitionMasks.get(k) || null;
  }
}

module.exports = new NodeGroundTextures();
