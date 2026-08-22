'use client';

import React, { useState } from 'react';

interface FallbackImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackHtml: string;
}

export default function FallbackImage({ src, alt, className, fallbackHtml }: FallbackImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`${className} flex items-center justify-center animate-in fade-in duration-300`}
        dangerouslySetInnerHTML={{ __html: fallbackHtml }}
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
