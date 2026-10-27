/**
 * JIANGHU WORLD — CLIENT GROUND TEXTURE LOADER & PATTERN CACHE
 * (web-dashboard/src/lib/groundTextures.ts)
 */

export interface GroundManifest {
  version?: number;
  tileSizePx: number;
  macroSizePx?: number;
  macroCells?: number;
  detailOpacity?: number;
  terrains: Record<string, { family: string; variants: string[] }>;
}

class GroundTextures {
  manifest: GroundManifest | null = null;
  images = new Map<string, HTMLImageElement | ImageBitmap>();
  patterns = new Map<string, CanvasPattern>(); // key: variantId or detailId
  transitionMasks = new Map<string, HTMLImageElement | ImageBitmap>();
  ready = false;
  private loadPromise: Promise<void> | null = null;

  async load(): Promise<void> {
    if (this.ready) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        if (typeof window === 'undefined') return;

        const res = await fetch('/assets/ground/ground-manifest.json');
        if (!res.ok) {
          console.warn('[GroundTextures] Failed to fetch manifest:', res.status);
          this.ready = false;
          return;
        }

        this.manifest = (await res.json()) as GroundManifest;
        if (!this.manifest || !this.manifest.terrains) {
          this.ready = false;
          return;
        }

        // Collect all unique variant IDs and unique family names
        const uniqueVariants = new Set<string>();
        const uniqueFamilies = new Set<string>();

        for (const tInfo of Object.values(this.manifest.terrains)) {
          if (tInfo.family) uniqueFamilies.add(tInfo.family);
          if (Array.isArray(tInfo.variants)) {
            for (const v of tInfo.variants) {
              uniqueVariants.add(v);
            }
          }
        }

        const fetchImage = async (url: string): Promise<HTMLImageElement | ImageBitmap | null> => {
          try {
            const imgRes = await fetch(url);
            if (!imgRes.ok) return null;
            const blob = await imgRes.blob();
            if (typeof createImageBitmap === 'function') {
              return await createImageBitmap(blob);
            }
            return await new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = URL.createObjectURL(blob);
            });
          } catch {
            return null;
          }
        };

        // 1. Load macro variants
        const variantPromises = Array.from(uniqueVariants).map(async (variantId) => {
          const url = `/assets/ground/${variantId}.webp`;
          const bmp = await fetchImage(url);
          if (bmp) this.images.set(variantId, bmp);
        });

        // 2. Load detail overlays
        const detailPromises = Array.from(uniqueFamilies).map(async (fam) => {
          const url = `/assets/ground/v11/${fam}_detail.png`;
          const bmp = await fetchImage(url);
          if (bmp) this.images.set(`v11/${fam}_detail`, bmp);
        });

        // 3. Load transition masks (a, b, c, d)
        const maskKeys = ['a', 'b', 'c', 'd'];
        const maskPromises = maskKeys.map(async (k) => {
          const url = `/assets/ground/v11/transition_mask_${k}.png`;
          const bmp = await fetchImage(url);
          if (bmp) this.transitionMasks.set(k, bmp);
        });

        await Promise.all([...variantPromises, ...detailPromises, ...maskPromises]);

        if (this.images.size > 0) {
          this.ready = true;
          console.log(`[GroundTextures] Successfully loaded ${this.images.size} textures & ${this.transitionMasks.size} masks.`);
        } else {
          this.ready = false;
        }
      } catch (err) {
        console.warn('[GroundTextures] Loading failed, using procedural fallback:', err);
        this.ready = false;
      }
    })();

    return this.loadPromise;
  }

  familyOf(terrain: string): { family: string; variants: string[] } | null {
    if (!this.manifest || !this.manifest.terrains) return null;
    return this.manifest.terrains[terrain] || null;
  }

  getImage(id: string): HTMLImageElement | ImageBitmap | null {
    return this.images.get(id) || null;
  }

  getTransitionMask(keyOrIdx: string | number): HTMLImageElement | ImageBitmap | null {
    const keys = ['a', 'b', 'c', 'd'];
    const k = typeof keyOrIdx === 'number' ? keys[Math.abs(keyOrIdx) % keys.length] : keyOrIdx;
    return this.transitionMasks.get(k) || null;
  }

  getPattern(ctx: CanvasRenderingContext2D, variantId: string): CanvasPattern | null {
    if (this.patterns.has(variantId)) {
      return this.patterns.get(variantId)!;
    }
    const img = this.images.get(variantId);
    if (!img) return null;
    try {
      const pattern = ctx.createPattern(img, 'repeat');
      if (pattern) {
        this.patterns.set(variantId, pattern);
        return pattern;
      }
    } catch (err) {
      console.warn(`[GroundTextures] Failed to create pattern for ${variantId}:`, err);
    }
    return null;
  }

  getDetailPattern(ctx: CanvasRenderingContext2D, family: string): CanvasPattern | null {
    const detailKey = `v11/${family}_detail`;
    if (this.patterns.has(detailKey)) {
      return this.patterns.get(detailKey)!;
    }
    const img = this.images.get(detailKey);
    if (!img) return null;
    try {
      const pattern = ctx.createPattern(img, 'repeat');
      if (pattern) {
        this.patterns.set(detailKey, pattern);
        return pattern;
      }
    } catch (err) {
      console.warn(`[GroundTextures] Failed to create detail pattern for ${detailKey}:`, err);
    }
    return null;
  }
}

export const groundTextures = new GroundTextures();

if (typeof window !== 'undefined') {
  (window as any).groundTextures = groundTextures;
}
