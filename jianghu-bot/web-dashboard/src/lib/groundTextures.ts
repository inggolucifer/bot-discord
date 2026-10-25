/**
 * JIANGHU WORLD — CLIENT GROUND TEXTURE LOADER & PATTERN CACHE
 * (web-dashboard/src/lib/groundTextures.ts)
 */

export interface GroundManifest {
  tileSizePx: number;
  tilesPerTexture: number;
  terrains: Record<string, { family: string; variants: string[] }>;
}

class GroundTextures {
  manifest: GroundManifest | null = null;
  images = new Map<string, HTMLImageElement | ImageBitmap>();
  patterns = new Map<string, CanvasPattern>(); // key: variantId
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

        // Collect all unique variant IDs
        const uniqueVariants = new Set<string>();
        for (const tInfo of Object.values(this.manifest.terrains)) {
          if (Array.isArray(tInfo.variants)) {
            for (const v of tInfo.variants) {
              uniqueVariants.add(v);
            }
          }
        }

        // Load all unique variants
        const loadPromises = Array.from(uniqueVariants).map(async (variantId) => {
          const url = `/assets/ground/${variantId}.webp`;
          try {
            const imgRes = await fetch(url);
            if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
            const blob = await imgRes.blob();

            if (typeof createImageBitmap === 'function') {
              const bmp = await createImageBitmap(blob);
              this.images.set(variantId, bmp);
            } else {
              await new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                  this.images.set(variantId, img);
                  resolve();
                };
                img.onerror = reject;
                img.src = URL.createObjectURL(blob);
              });
            }
          } catch (err) {
            console.warn(`[GroundTextures] Error loading ${variantId}:`, err);
          }
        });

        await Promise.all(loadPromises);

        if (this.images.size > 0) {
          this.ready = true;
          console.log(`[GroundTextures] Successfully loaded ${this.images.size} ground textures.`);
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
}

export const groundTextures = new GroundTextures();

if (typeof window !== 'undefined') {
  (window as any).groundTextures = groundTextures;
}
