'use client';
import React from 'react';
import WorldCanvas, { WorldCanvasProps, TileData } from './WorldCanvas';

export type { TileData };

/**
 * TaleOfImmortalCanvas (Legacy Wrapper)
 * Redirects seamlessly to the unified 10-layer WorldCanvas (Renderer v2).
 */
export default function TaleOfImmortalCanvas(props: WorldCanvasProps) {
  return <WorldCanvas {...props} />;
}
