'use client';

import React, { useState, useEffect } from 'react';
import { atlasLoader } from '@/lib/atlasLoader';

export interface AtlasSpriteProps {
  atlas: 'objects_nature' | 'objects_structures' | 'markers_entities' | 'icons' | 'autotiles';
  frame: string;
  className?: string;
  alt?: string;
  fallback?: React.ReactNode;
  title?: string;
  onClick?: () => void;
}

export default function AtlasSprite({
  atlas,
  frame,
  className = '',
  alt = '',
  fallback = null,
  title,
  onClick
}: AtlasSpriteProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(() => {
    return atlasLoader.getFrameDataUrl(atlas, frame);
  });

  useEffect(() => {
    let isMounted = true;
    const current = atlasLoader.getFrameDataUrl(atlas, frame);
    if (current) {
      setDataUrl(current);
      return;
    }

    atlasLoader.loadAtlas(atlas).then((success) => {
      if (!isMounted) return;
      if (success) {
        const url = atlasLoader.getFrameDataUrl(atlas, frame);
        setDataUrl(url);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [atlas, frame]);

  if (!dataUrl) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <img
      src={dataUrl}
      alt={alt || frame}
      title={title}
      onClick={onClick}
      className={`select-none ${className}`}
      draggable={false}
    />
  );
}
