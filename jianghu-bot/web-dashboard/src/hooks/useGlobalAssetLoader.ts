import { useState, useEffect } from 'react';
import { GLOBAL_ASSETS } from '../config/globalAssets';

type LoadedImagesMap = {
  [Category in keyof typeof GLOBAL_ASSETS]?: {
    [Key in keyof typeof GLOBAL_ASSETS[Category]]?: HTMLImageElement | null;
  }
};

export function useGlobalAssetLoader() {
  const [loadedImages, setLoadedImages] = useState<LoadedImagesMap>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const newLoadedImages: LoadedImagesMap = {};
    const promises: Promise<void>[] = [];

    // Iterate through categories (terrain, sects, resources, etc.)
    for (const [categoryStr, items] of Object.entries(GLOBAL_ASSETS)) {
      const category = categoryStr as keyof typeof GLOBAL_ASSETS;
      newLoadedImages[category] = {};

      // Iterate through each item inside the category
      for (const [keyStr, urlStr] of Object.entries(items)) {
        const key = keyStr as keyof typeof GLOBAL_ASSETS[typeof category];
        const url = urlStr as string;

        if (!url || url.trim() === "") {
          // If no URL is provided, explicitly set to null so the canvas knows to fallback
          newLoadedImages[category]![key] = null;
        } else {
          // Attempt to preload the image
          promises.push(
            new Promise<void>((resolve) => {
              const img = new Image();
              img.crossOrigin = "anonymous"; // Enable CORS for external images
              img.onload = () => {
                if (isMounted) newLoadedImages[category]![key] = img;
                resolve();
              };
              img.onerror = () => {
                console.warn(`Failed to load asset [${category}.${key}] from URL: ${url}`);
                if (isMounted) newLoadedImages[category]![key] = null;
                resolve();
              };
              img.src = url;
            })
          );
        }
      }
    }

    Promise.all(promises).then(() => {
      if (isMounted) {
        setLoadedImages(newLoadedImages);
        setIsReady(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return { loadedImages, isReady };
}
