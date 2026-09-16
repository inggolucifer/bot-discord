'use client';
import React, { useRef, useEffect, useState } from 'react';
import api from '@/lib/api';
import { Map as MapIcon, X } from 'lucide-react';

interface Landmark {
  x: number;
  y: number;
  name: string;
  type: string;
  region: string;
}

interface WorldScrollMapViewProps {
  playerPos: { x: number; y: number };
  onClose: () => void;
}

export default function WorldScrollMapView({ playerPos, onClose }: WorldScrollMapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [camera, setCamera] = useState({ x: 2500, y: 2500, zoom: 0.15 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cameraStart, setCameraStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fetchMacroData = async () => {
      try {
        const res = await api.get('/world/macro-map');
        if (res.data.landmarks) {
          setLandmarks(res.data.landmarks);
        }
        setCamera({ x: playerPos.x, y: playerPos.y, zoom: 0.2 });
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to fetch macro map:', err);
        setError('Gagal memuat Peta Benua.');
        setLoading(false);
      }
    };
    fetchMacroData();
  }, [playerPos]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || loading) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const render = () => {
      time += 0.01;
      const width = canvas.width;
      const height = canvas.height;

      // Latar belakang perkamen tua (Vintage Scroll)
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#d1c0a1');
      grad.addColorStop(0.5, '#deb887');
      grad.addColorStop(1, '#cdb38b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Pinggiran kertas gelap (vignette)
      const vignette = ctx.createRadialGradient(width/2, height/2, height/3, width/2, height/2, width*0.8);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(80, 50, 20, 0.6)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      const WORLD_SIZE = 5000;
      const TILE_SIZE = 54;
      const SCALED_TILE = TILE_SIZE * camera.zoom;
      
      const toScreenX = (wx: number) => (wx - camera.x) * SCALED_TILE + width / 2;
      const toScreenY = (wy: number) => (wy - camera.y) * SCALED_TILE + height / 2;

      // Gambar batas dunia (Garis tinta kotak)
      const minX = toScreenX(0);
      const minY = toScreenY(0);
      const maxX = toScreenX(WORLD_SIZE);
      const maxY = toScreenY(WORLD_SIZE);
      
      ctx.strokeStyle = 'rgba(70, 50, 30, 0.4)';
      ctx.lineWidth = 4;
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

      // Gambar Region Overlays
      const regions = [
        { id: 'central_plains', name: 'Central Plains', bounds: { minX: 2000, maxX: 3500, minY: 2000, maxY: 3200 }, color: 'rgba(76, 175, 80, 0.15)' },
        { id: 'azure_mountain', name: 'Azure Mountain Range', bounds: { minX: 1000, maxX: 2200, minY: 2000, maxY: 3500 }, color: 'rgba(0, 150, 136, 0.15)' },
        { id: 'southern_demon', name: 'Southern Demon Domain', bounds: { minX: 1800, maxX: 3200, minY: 1000, maxY: 2000 }, color: 'rgba(103, 58, 183, 0.15)' },
        { id: 'eastern_sea', name: 'Eastern Sea Region', bounds: { minX: 3500, maxX: 5000, minY: 1500, maxY: 3500 }, color: 'rgba(33, 150, 243, 0.15)' },
        { id: 'northern_desolate', name: 'Northern Desolate Territory', bounds: { minX: 1000, maxX: 4000, minY: 3200, maxY: 5000 }, color: 'rgba(255, 255, 255, 0.15)' },
        { id: 'western_desert', name: 'Western Sacred Deserts', bounds: { minX: 0, maxX: 1500, minY: 1500, maxY: 4000 }, color: 'rgba(255, 193, 7, 0.15)' }
      ];

      ctx.save();
      regions.forEach(reg => {
        const rMinX = toScreenX(reg.bounds.minX);
        const rMinY = toScreenY(reg.bounds.minY);
        const rMaxX = toScreenX(reg.bounds.maxX);
        const rMaxY = toScreenY(reg.bounds.maxY);

        ctx.fillStyle = reg.color;
        ctx.fillRect(rMinX, rMinY, rMaxX - rMinX, rMaxY - rMinY);

        // Region Label
        ctx.fillStyle = 'rgba(82, 69, 48, 0.5)';
        ctx.font = 'bold 24px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(reg.name.toUpperCase(), (rMinX + rMaxX) / 2, (rMinY + rMaxY) / 2);
      });
      ctx.restore();

      // Gambar Topografi Abstrak (Garis kontur)
      ctx.save();
      ctx.strokeStyle = 'rgba(100, 80, 50, 0.15)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const cx = minX + (maxX - minX) * (0.3 + i * 0.1);
        const cy = minY + (maxY - minY) * (0.2 + i * 0.15);
        ctx.ellipse(cx, cy, (maxX - minX) * 0.4, (maxY - minY) * 0.3, Math.sin(time + i), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Render Landmarks
      landmarks.forEach(lm => {
        const lx = toScreenX(lm.x);
        const ly = toScreenY(lm.y);

        // Jangan render jika di luar layar
        if (lx < -100 || lx > width + 100 || ly < -100 || ly > height + 100) return;

        ctx.save();
        
        // Ikon Penanda (Kaligrafi Stempel Merah untuk Kota, Gunung Tinta untuk Sekte)
        if (lm.type === 'city' || lm.type === 'village') {
          ctx.fillStyle = 'rgba(180, 40, 40, 0.8)';
          ctx.fillRect(lx - 20, ly - 20, 40, 40);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.strokeRect(lx - 16, ly - 16, 32, 32);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 16px serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('城', lx, ly); // Karakter Kota
        } else if (lm.type === 'sect') {
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.moveTo(lx, ly - 25);
          ctx.lineTo(lx + 20, ly + 15);
          ctx.lineTo(lx - 20, ly + 15);
          ctx.fill();
        } else if (lm.type === 'danger') {
          ctx.fillStyle = '#8b5cf6'; // Ungu beracun/bahaya
          ctx.beginPath();
          ctx.moveTo(lx, ly - 20);
          ctx.lineTo(lx + 20, ly + 5);
          ctx.lineTo(lx, ly + 20);
          ctx.lineTo(lx - 20, ly + 5);
          ctx.fill();
        }

        // Teks Nama Landmark
        ctx.fillStyle = '#292218';
        ctx.font = 'bold 16px serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(255,255,255,0.7)';
        ctx.shadowBlur = 4;
        ctx.fillText(lm.name, lx, ly + 35);
        ctx.shadowBlur = 0;
        
        // Teks Regional
        ctx.fillStyle = '#524530';
        ctx.font = 'italic 12px serif';
        ctx.fillText(`[${lm.region}]`, lx, ly + 50);

        ctx.restore();
      });

      // Penanda Lokasi Pemain (Titik Kuning Emas)
      const px = toScreenX(playerPos.x);
      const py = toScreenY(playerPos.y);
      ctx.save();
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(px, py, 6 + Math.sin(time*5)*2, 0, Math.PI*2);
      ctx.fill();
      
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Posisimu', px, py - 15);
      ctx.restore();

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [camera, landmarks, loading, playerPos]);

  // Interaksi Drag
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setCameraStart({ x: camera.x, y: camera.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const currentTileSize = 54 * camera.zoom;
      const dx = (e.clientX - dragStart.x) / currentTileSize;
      const dy = (e.clientY - dragStart.y) / currentTileSize;
      setCamera(prev => ({
        ...prev,
        x: Math.max(0, Math.min(5000, cameraStart.x - dx)),
        y: Math.max(0, Math.min(5000, cameraStart.y - dy))
      }));
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.01, Math.min(1.0, prev.zoom * zoomFactor))
    }));
  };

  return (
    <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
      <div className="w-full h-full relative overflow-hidden bg-[#e3d5bd] shadow-[0_0_50px_rgba(0,0,0,0.8)] border-[6px] border-[#383329]">
        
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-[#524530] font-serif font-bold text-xl">
            Menggulung Peta Benua...
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center text-red-800 font-serif font-bold text-xl">
            {error}
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          />
        )}

        {/* HUD Overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#292218]/95 px-6 py-2 border-2 border-[#524530] rounded-b-lg shadow-2xl flex flex-col items-center pointer-events-none">
          <h1 className="text-[#e8dcc7] font-serif font-bold text-2xl tracking-[0.2em]">PETA BENUA JIANGHU</h1>
          <p className="text-[#8c7a5f] font-mono text-xs mt-1 tracking-widest">DUNIA XIANXIA MAHALUAS</p>
        </div>

        <button
          onClick={onClose}
          className="absolute top-6 right-6 bg-[#292218] hover:bg-[#1c160f] text-[#e8dcc7] p-2 rounded-full border border-[#524530] shadow-xl transition-transform hover:scale-110"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="absolute bottom-6 left-6 flex gap-3">
          <button
            onClick={() => setCamera(prev => ({ ...prev, x: playerPos.x, y: playerPos.y, zoom: 0.15 }))}
            className="bg-[#292218]/90 hover:bg-[#3d3324] text-[#d8c3a5] px-4 py-2 border border-[#524530] rounded-sm shadow-xl font-serif text-sm backdrop-blur-md transition-colors"
          >
            Fokus Lokasiku
          </button>
          <button
            onClick={() => setCamera({ x: 2500, y: 2500, zoom: 0.05 })}
            className="bg-[#292218]/90 hover:bg-[#3d3324] text-[#8c7a5f] px-4 py-2 border border-[#524530] rounded-sm shadow-xl font-serif text-sm backdrop-blur-md transition-colors"
          >
            Lihat Seluruh Dunia
          </button>
        </div>
      </div>
    </div>
  );
}
