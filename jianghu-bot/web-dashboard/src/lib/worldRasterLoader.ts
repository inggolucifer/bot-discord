/**
 * JIANGHU WORLD — MACRO WORLD RASTER LOADER & CACHE (src/lib/worldRasterLoader.ts)
 * Implements Fase H5 Specification:
 * - Singleton loader and GPU texture cache for 1250x1250 macro world raster
 * - Loads /assets/world-raster.webp with PNG fallback
 * - Memory footprint <= 2.5 MB
 * - Synchronous texture handle access for 60 FPS canvas render loops
 */

let cachedRasterImage: HTMLImageElement | null = null;
let loadPromise: Promise<HTMLImageElement> | null = null;
let isLoaded = false;

export function loadWorldRasterImage(): Promise<HTMLImageElement> {
  if (cachedRasterImage && isLoaded && cachedRasterImage.complete && cachedRasterImage.naturalWidth > 0) {
    return Promise.resolve(cachedRasterImage);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window undefined in SSR'));
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/assets/world-raster.webp';

    img.onload = () => {
      cachedRasterImage = img;
      isLoaded = true;
      resolve(img);
    };

    img.onerror = () => {
      // Fallback to PNG if WebP fails
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = 'anonymous';
      fallbackImg.src = '/assets/world-raster.png';

      fallbackImg.onload = () => {
        cachedRasterImage = fallbackImg;
        isLoaded = true;
        resolve(fallbackImg);
      };

      fallbackImg.onerror = (err) => {
        console.warn('[WorldRasterLoader] Failed to load world raster:', err);
        reject(err);
      };
    };
  });

  return loadPromise;
}

export function getWorldRasterImageSync(): HTMLImageElement | null {
  if (cachedRasterImage && isLoaded && cachedRasterImage.complete && cachedRasterImage.naturalWidth > 0) {
    return cachedRasterImage;
  }
  if (!loadPromise && typeof window !== 'undefined') {
    loadWorldRasterImage().catch(() => {});
  }
  return null;
}
