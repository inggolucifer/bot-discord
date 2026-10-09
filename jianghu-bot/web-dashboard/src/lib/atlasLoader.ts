/**
 * JIANGHU WORLD — CLIENT ATLAS LOADER & SPRITE CACHE (src/lib/atlasLoader.ts)
 * Loads WebP texture atlases and JSON coordinate manifests for:
 * - objects_nature (bamboo, trees, rocks, karst mountains)
 * - objects_structures (pavilions, huts, sect gates, pagodas)
 * - markers_entities (monster rings, quest beacons)
 * - autotiles (rivers, roads)
 *
 * Implements high-performance frame slicing, LRU caching, and smooth fallback
 * to procedural graphics (proceduralObjects.ts) when atlas is loading or offline.
 */

export interface AtlasFrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AtlasFrameData {
  frame: AtlasFrameRect;
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: AtlasFrameRect;
  sourceSize: { w: number; h: number };
  metadata?: any;
}

export interface AtlasManifest {
  meta: {
    app: string;
    version: string;
    size: { w: number; h: number };
    format: string;
    image: string;
  };
  frames: Record<string, AtlasFrameData>;
}

class AtlasLoader {
  private static instance: AtlasLoader;
  private manifests: Map<string, AtlasManifest> = new Map();
  private textures: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<boolean>> = new Map();
  private frameCanvasCache: Map<string, HTMLCanvasElement> = new Map();

  private constructor() {}

  public static getInstance(): AtlasLoader {
    if (!AtlasLoader.instance) {
      AtlasLoader.instance = new AtlasLoader();
    }
    return AtlasLoader.instance;
  }

  /**
   * Loads manifest JSON and WebP texture for a given atlas set.
   */
  public async loadAtlas(atlasName: string): Promise<boolean> {
    if (this.manifests.has(atlasName) && this.textures.has(atlasName)) {
      return true;
    }

    if (this.loadingPromises.has(atlasName)) {
      return this.loadingPromises.get(atlasName)!;
    }

    const loadPromise = (async () => {
      try {
        const manifestRes = await fetch(`/assets/atlas/${atlasName}.json`);
        if (!manifestRes.ok) return false;
        const manifest: AtlasManifest = await manifestRes.json();
        this.manifests.set(atlasName, manifest);

        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load WebP: /assets/atlas/${atlasName}.webp`));
          img.src = `/assets/atlas/${atlasName}.webp`;
        });

        this.textures.set(atlasName, img);
        return true;
      } catch (err) {
        console.warn(`[AtlasLoader] Failed to load atlas "${atlasName}":`, err);
        return false;
      }
    })();

    this.loadingPromises.set(atlasName, loadPromise);
    return loadPromise;
  }

  /**
   * Preloads all 4 core atlases.
   */
  public async preloadCoreAtlases(): Promise<void> {
    await Promise.all([
      this.loadAtlas('objects_nature'),
      this.loadAtlas('objects_structures'),
      this.loadAtlas('markers_entities'),
      this.loadAtlas('autotiles')
    ]);
  }

  /**
   * Checks whether a specific atlas and frame exist and are loaded.
   */
  public hasFrame(atlasName: string, frameId: string): boolean {
    const manifest = this.manifests.get(atlasName);
    return Boolean(manifest && manifest.frames[frameId] && this.textures.has(atlasName));
  }

  /**
   * Retrieves frame metadata if available.
   */
  public getFrameData(atlasName: string, frameId: string): AtlasFrameData | null {
    const manifest = this.manifests.get(atlasName);
    if (!manifest || !manifest.frames[frameId]) return null;
    return manifest.frames[frameId];
  }

  /**
   * Draws a frame from an atlas directly onto a 2D canvas context.
   * Returns true if successfully rendered from atlas, false if caller should use fallback.
   */
  public drawAtlasFrame(
    ctx: CanvasRenderingContext2D,
    atlasName: string,
    frameId: string,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    alpha: number = 1.0,
    flipX: boolean = false
  ): boolean {
    const manifest = this.manifests.get(atlasName);
    const texture = this.textures.get(atlasName);

    if (!manifest || !texture) {
      // Trigger lazy load in background
      this.loadAtlas(atlasName);
      return false;
    }

    const frameInfo = manifest.frames[frameId];
    if (!frameInfo) {
      return false;
    }

    const { x, y, w, h } = frameInfo.frame;

    ctx.save();
    if (alpha < 1.0) ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    if (flipX) {
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(texture, x, y, w, h, 0, 0, dw, dh);
    } else {
      ctx.drawImage(texture, x, y, w, h, dx, dy, dw, dh);
    }

    ctx.restore();
    return true;
  }
}

export const atlasLoader = AtlasLoader.getInstance();
