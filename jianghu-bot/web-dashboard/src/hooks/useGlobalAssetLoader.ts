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
    const newLoadedImages: any = {};
    const promises: Promise<void>[] = [];

    // Iterate through categories (terrain, sects, resources, etc.)
    for (const [categoryStr, items] of Object.entries(GLOBAL_ASSETS)) {
      const category = categoryStr;
      if (category === 'emoji') continue;
      newLoadedImages[category] = {};

      const processEntry = (key: string, urlVal: any, targetMap: any) => {
        if (typeof urlVal === 'object' && urlVal !== null) {
          targetMap[key] = {};
          for (const [subKey, subVal] of Object.entries(urlVal)) {
            processEntry(subKey, subVal, targetMap[key]);
          }
          return;
        }

        const url = typeof urlVal === 'string' ? urlVal.trim() : '';
        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
          targetMap[key] = null;
          return;
        }

        promises.push(
          new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              if (isMounted) targetMap[key] = img;
              resolve();
            };
            img.onerror = () => {
              console.warn(`Failed to load asset [${category}.${key}] from URL: ${url}`);
              if (isMounted) targetMap[key] = null;
              resolve();
            };
            img.src = url;
          })
        );
      };

      for (const [keyStr, urlStr] of Object.entries(items as Record<string, any>)) {
        processEntry(keyStr, urlStr, newLoadedImages[category]);
      }
    }

    Promise.all(promises).then(() => {
      if (isMounted) {
        setLoadedImages(newLoadedImages as LoadedImagesMap);
        setIsReady(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return { loadedImages, isReady };
}
