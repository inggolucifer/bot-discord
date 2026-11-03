/**
 * JIANGHU WORLD — WEATHER, LIGHTING & AMBIENT PARTICLE OVERLAY
 * (components/map/WeatherParticleOverlay.ts)
 * V21 F2 Modular Extraction:
 * - Dynamic Weather (Rain, Snow, Miasma)
 * - Biome Ambient Drifting Fog & Atmospheric Layers
 * - Night Mode Multi-Lamp Lighting Punch-out & Additive Glaze
 * - Procedural Biome Micro-Particles (Peach petals, Snow motes, Qi spores)
 */

import { renderBiomeAmbientFog } from '@/lib/groundRenderer';

export interface LightSource {
  sx: number;
  sy: number;
  radius: number;
  color: string;
  flicker: number;
}

export interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  rot: number;
  vRot: number;
}

export interface WeatherOverlayParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  weather: 'rain' | 'snow' | 'miasma' | 'none';
  isNight: boolean;
  time: number;
  zoom: number;
  curRegion: any;
  playerScreenPos: { sx: number; sy: number };
  currentTileSize: number;
  visibleLights: LightSource[];
  nightCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  ambientParticlesRef: React.MutableRefObject<AmbientParticle[]>;
  fps: number;
}

export function renderWeatherAndLighting({
  ctx,
  width,
  height,
  weather,
  isNight,
  time,
  zoom,
  curRegion,
  playerScreenPos,
  currentTileSize,
  visibleLights,
  nightCanvasRef,
  ambientParticlesRef,
  fps
}: WeatherOverlayParams): void {
  ctx.save();

  // 1. Weather Precipitation
  if (weather === 'rain') {
    ctx.strokeStyle = 'rgba(200, 220, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 200; i++) {
      const rx = (Math.random() * width + time * 300) % width;
      const ry = (Math.random() * height + time * 500) % height;
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 5, ry + 15);
    }
    ctx.stroke();
  } else if (weather === 'snow') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    for (let i = 0; i < 150; i++) {
      const sx = (Math.random() * width + Math.sin(time + i) * 20) % width;
      const sy = (Math.random() * height + time * 100) % height;
      ctx.moveTo(sx, sy);
      ctx.arc(sx, sy, Math.random() * 2 * zoom, 0, Math.PI * 2);
    }
    ctx.fill();
  } else if (weather === 'miasma') {
    const miasmaGradient = ctx.createRadialGradient(width / 2, height / 2, height / 4, width / 2, height / 2, width);
    miasmaGradient.addColorStop(0, 'rgba(120, 50, 150, 0.1)');
    miasmaGradient.addColorStop(1, 'rgba(80, 20, 100, 0.4)');
    ctx.fillStyle = miasmaGradient;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Biome Ambient Drifting Fog Overlay
  renderBiomeAmbientFog(ctx, width, height, curRegion, time, zoom);

  // 3. Night Filter with Multi-Lamp Additive Glaze
  if (isNight) {
    if (!nightCanvasRef.current && typeof document !== 'undefined') {
      nightCanvasRef.current = document.createElement('canvas');
    }
    const nightCanvas = nightCanvasRef.current;
    if (nightCanvas) {
      if (nightCanvas.width !== width || nightCanvas.height !== height) {
        nightCanvas.width = width;
        nightCanvas.height = height;
      }

      const nightCtx = nightCanvas.getContext('2d');
      if (nightCtx) {
        nightCtx.clearRect(0, 0, width, height);
        nightCtx.fillStyle = 'rgba(10, 15, 35, 0.68)';
        nightCtx.fillRect(0, 0, width, height);

        const allLights: LightSource[] = [
          {
            sx: playerScreenPos.sx,
            sy: playerScreenPos.sy,
            radius: Math.max(45, currentTileSize * 3.5),
            color: '#FFAA50',
            flicker: 0.04
          },
          ...visibleLights
        ];

        // Punch holes on the offscreen night canvas
        nightCtx.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < allLights.length; i++) {
          const lit = allLights[i];
          const flicker = 1.0 + Math.sin(time * 6 + i * 2.3) * lit.flicker;
          const r = lit.radius * flicker;
          const glow = nightCtx.createRadialGradient(lit.sx, lit.sy, 8 * zoom, lit.sx, lit.sy, r);
          glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
          glow.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
          glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
          nightCtx.fillStyle = glow;
          nightCtx.beginPath();
          nightCtx.arc(lit.sx, lit.sy, r, 0, Math.PI * 2);
          nightCtx.fill();
        }
        nightCtx.globalCompositeOperation = 'source-over';

        // Draw dark night layer onto canvas
        ctx.drawImage(nightCanvas, 0, 0);

        // Add warm additive light tint around sources
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < allLights.length; i++) {
          const lit = allLights[i];
          const flicker = 1.0 + Math.sin(time * 6 + i * 2.3) * lit.flicker;
          const warmRadius = lit.radius * 1.15 * flicker;
          const warmGlow = ctx.createRadialGradient(lit.sx, lit.sy, 6 * zoom, lit.sx, lit.sy, warmRadius);

          if (lit.color === '#50E3C2') {
            warmGlow.addColorStop(0, 'rgba(80, 227, 194, 0.30)');
            warmGlow.addColorStop(0.5, 'rgba(80, 227, 194, 0.12)');
            warmGlow.addColorStop(1, 'rgba(80, 227, 194, 0)');
          } else if (lit.color === '#FFD700') {
            warmGlow.addColorStop(0, 'rgba(255, 215, 0, 0.32)');
            warmGlow.addColorStop(0.5, 'rgba(255, 215, 0, 0.14)');
            warmGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
          } else if (lit.color === '#FF7720') {
            warmGlow.addColorStop(0, 'rgba(255, 119, 32, 0.32)');
            warmGlow.addColorStop(0.5, 'rgba(255, 119, 32, 0.14)');
            warmGlow.addColorStop(1, 'rgba(255, 119, 32, 0)');
          } else if (lit.color === '#F59E0B') {
            warmGlow.addColorStop(0, 'rgba(245, 158, 11, 0.36)');
            warmGlow.addColorStop(0.45, 'rgba(245, 158, 11, 0.16)');
            warmGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
          } else {
            warmGlow.addColorStop(0, 'rgba(255, 170, 80, 0.28)');
            warmGlow.addColorStop(0.5, 'rgba(255, 160, 60, 0.12)');
            warmGlow.addColorStop(1, 'rgba(255, 150, 40, 0)');
          }

          ctx.fillStyle = warmGlow;
          ctx.beginPath();
          ctx.arc(lit.sx, lit.sy, warmRadius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  // 4. Procedural Ambient Biome Particles
  if (zoom >= 0.4 && weather === 'none' && !isNight && fps >= 40) {
    const biomeSlug = curRegion?.regionSlug || '';
    const maxParticles = 120;
    const particles = ambientParticlesRef.current;

    while (particles.length < maxParticles) {
      let color = '#FFAAA6';
      let vy = 0.6 + Math.random() * 0.8;
      let vx = 0.4 + Math.random() * 0.6;
      let size = 2 + Math.random() * 2.5;

      if (biomeSlug === 'central_plains') {
        color = '#FFAAA6';
        vx = 0.8 + Math.random() * 0.7;
        vy = 0.5 + Math.random() * 0.6;
      } else if (biomeSlug === 'nine_springs_delta') {
        color = 'rgba(214, 230, 242, 0.45)';
        vx = 0.2 + Math.random() * 0.3;
        vy = 0.1 + Math.random() * 0.2;
        size = 6 + Math.random() * 8;
      } else if (biomeSlug.includes('north') || biomeSlug.includes('frost') || biomeSlug.includes('snow')) {
        color = '#FFFFFF';
        vx = (Math.random() - 0.5) * 0.4;
        vy = 0.8 + Math.random() * 0.9;
      } else if (biomeSlug.includes('lava') || biomeSlug.includes('demon')) {
        color = Math.random() > 0.5 ? '#FF5722' : '#FF9800';
        vx = (Math.random() - 0.5) * 0.5;
        vy = -(0.7 + Math.random() * 1.0);
      } else if (biomeSlug.includes('venom') || biomeSlug.includes('insect') || biomeSlug.includes('mire')) {
        color = '#A8E6CF';
        vx = (Math.random() - 0.5) * 0.4;
        vy = (Math.random() - 0.5) * 0.4;
        size = 1.8 + Math.random() * 2.2;
      } else if (biomeSlug.includes('desert') || biomeSlug.includes('ruins')) {
        color = '#FFD700';
        vx = 1.2 + Math.random() * 1.5;
        vy = (Math.random() - 0.5) * 0.3;
      } else if (biomeSlug.includes('wood') || biomeSlug.includes('forest')) {
        color = '#A7F3D0';
        vx = (Math.random() - 0.5) * 0.3;
        vy = -(0.4 + Math.random() * 0.6);
        size = 2.5 + Math.random() * 2.5;
      }

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx,
        vy,
        size,
        alpha: 0.2 + Math.random() * 0.6,
        color,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.05
      });
    }

    ctx.save();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vRot;

      if (p.x > width + 20) p.x = -10;
      if (p.x < -20) p.x = width + 10;
      if (p.y > height + 20) p.y = -10;
      if (p.y < -20) p.y = height + 10;

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      if (p.size > 5) {
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.ellipse(0, 0, Math.max(0.1, p.size * 1.5), Math.max(0.1, p.size * 0.75), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  ctx.restore();
}
