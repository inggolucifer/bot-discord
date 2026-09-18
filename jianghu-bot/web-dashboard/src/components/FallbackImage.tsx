'use client';

import React, { useState } from 'react';

import { GLOBAL_ASSETS } from '@/config/globalAssets';

interface FallbackImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackCategory?: string;
  fallbackHtml?: string;
  fallbackNode?: React.ReactNode;
}

export default function FallbackImage({ src, alt, className, fallbackCategory, fallbackHtml, fallbackNode }: FallbackImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (hasError || !src) {
    if (fallbackNode) {
       return (
        <div className={`${className || ''} flex items-center justify-center animate-in fade-in duration-300`}>
          {fallbackNode}
        </div>
       );
    }

    if (fallbackCategory) {
      const emoji = (GLOBAL_ASSETS.emoji as any)?.[fallbackCategory] || '👤';
      return (
        <div className={`${className || ''} flex items-center justify-center bg-[#181d29] text-2xl select-none animate-in fade-in duration-300`}>
          <span>{emoji}</span>
        </div>
      );
    }

    return (
      <div
        className={`${className || ''} flex items-center justify-center animate-in fade-in duration-300`}
        dangerouslySetInnerHTML={{ __html: fallbackHtml || '' }}
      />
    );
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Loading Skeleton / Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-[#333]/20 animate-pulse rounded-full" />
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`w-full h-full object-cover transition-opacity duration-500 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </div>
  );
}
