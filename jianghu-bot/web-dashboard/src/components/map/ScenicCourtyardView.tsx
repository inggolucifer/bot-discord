'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowLeft, Sun, Moon, Wind, Heart } from 'lucide-react';
import api from '@/lib/api';

interface ScenicCourtyardViewProps {
  locationName: string;
  onExit: () => void;
}

export default function ScenicCourtyardView({ locationName, onExit }: ScenicCourtyardViewProps) {
  const [isMeditating, setIsMeditating] = useState(false);
  const [qiGained, setQiGained] = useState<number>(0);
  const [message, setMessage] = useState<string | null>(null);
  const [characterPos, setCharacterPos] = useState<{ x: number; y: number }>({ x: 420, y: 360 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animasi Guguran Daun Ginkgo Emas & Partikel Qi (Gambar 5)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number = 0;

    // Inisialisasi daun ginkgo emas berguguran
    const leaves: Array<{ x: number; y: number; size: number; speedY: number; speedX: number; rot: number; rotSpeed: number }> = [];
    for (let i = 0; i < 35; i++) {
      leaves.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 4 + 3,
        speedY: Math.random() * 0.8 + 0.4,
        speedX: Math.random() * 0.6 - 0.3,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.04
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Gambar Tanah Halaman Batu & Tanah Lembap (Sesuai Gambar 5)
      ctx.fillStyle = '#2b2927';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Tekstur ubin batu bulat melingkar di bawah pohon & paviliun
      const circles = [
        { cx: 620, cy: 190, r: 110, color: '#38332d' }, // Lingkaran Pohon Ginkgo Besar
        { cx: 800, cy: 380, r: 60, color: '#38332d' },  // Lingkaran Pohon Kecil
        { cx: 280, cy: 260, r: 90, color: '#312d29' }   // Lingkaran Kolam
      ];

      circles.forEach(c => {
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#473f37';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // 2. Kolam Teratai Batu (Lotus Pond - Gambar 5 Kiri)
      ctx.save();
      ctx.fillStyle = '#1c2826'; // Air hijau tua lumut
      ctx.beginPath();
      ctx.ellipse(260, 260, 95, 60, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4a4843';
      ctx.lineWidth = 8;
      ctx.stroke();

      // Daun teratai hijau di dalam kolam
      ctx.fillStyle = '#2f573c';
      for (let lp = 0; lp < 6; lp++) {
        ctx.beginPath();
        ctx.arc(230 + lp * 12, 250 + (lp % 3) * 10, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tiang Lentera Naga Batu di Tepi Kolam
      ctx.fillStyle = '#8c3d2e';
      ctx.fillRect(340, 220, 5, 55);
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(342, 215, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Paviliun Batu Ukir Bertingkat (Stone Gazebo Pavilion - Gambar 5 Tengah)
      ctx.save();
      const pvx = 480;
      const pvy = 360;

      // Pondasi Batu
      ctx.fillStyle = '#4a443e';
      ctx.fillRect(pvx - 45, pvy - 15, 90, 45);
      ctx.strokeStyle = '#6e655c';
      ctx.strokeRect(pvx - 45, pvy - 15, 90, 45);

      // Tangga Batu Masuk
      ctx.fillStyle = '#5c544d';
      for (let s = 0; s < 3; s++) {
        ctx.fillRect(pvx - 20, pvy + 25 + s * 4, 40, 4);
      }

      // Tiang Kayu Paviliun
      ctx.fillStyle = '#2b1b13';
      ctx.fillRect(pvx - 38, pvy - 60, 6, 50);
      ctx.fillRect(pvx + 32, pvy - 60, 6, 50);
      ctx.fillRect(pvx - 18, pvy - 65, 5, 55);
      ctx.fillRect(pvx + 13, pvy - 65, 5, 55);

      // Atap Melengkung Paviliun (Curved Gazebo Eaves)
      ctx.fillStyle = '#1c1815';
      ctx.beginPath();
      ctx.moveTo(pvx - 65, pvy - 45);
      ctx.lineTo(pvx, pvy - 95);
      ctx.lineTo(pvx + 65, pvy - 45);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8c7d6b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Puncak Keemasan Paviliun
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(pvx, pvy - 98, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 4. Pohon Ginkgo Emas Raksasa (Ancient Golden Ginkgo - Gambar 5 Kanan Atas)
      ctx.save();
      const gkx = 620;
      const gky = 160;

      // Batang Pohon Tua
      ctx.fillStyle = '#241a14';
      ctx.fillRect(gkx - 12, gky - 10, 24, 50);

      // Mahkota Dedaunan Emas Bersinar
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(gkx - 30, gky - 40, 55, 0, Math.PI * 2);
      ctx.arc(gkx + 35, gky - 35, 50, 0, Math.PI * 2);
      ctx.arc(gkx, gky - 60, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 5. Karakter Pendekar di Halaman
      ctx.save();
      const cx = characterPos.x;
      const cy = characterPos.y;

      // Efek Aura Meditasi Melingkar jika sedang Meditasi
      if (isMeditating) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(cx, cy, 25, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('MENYERAP QI...', cx, cy - 32);
      }

      // Bayangan
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 6, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sprite Karakter
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 4, cy - 16, 8, 18);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx, cy - 20, 4, 0, Math.PI * 2);
      ctx.fill();

      // Pedang Cahaya di Belakang Punggung (Gambar 5)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 22);
      ctx.lineTo(cx - 6, cy - 2);
      ctx.stroke();
      ctx.restore();

      // 6. Animasi Guguran Daun Emas (Golden Leaves Falling)
      ctx.save();
      ctx.fillStyle = '#facc15';
      leaves.forEach(leaf => {
        leaf.y += leaf.speedY;
        leaf.x += leaf.speedX;
        leaf.rot += leaf.rotSpeed;

        if (leaf.y > canvas.height) {
          leaf.y = -10;
          leaf.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, leaf.size, leaf.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [characterPos, isMeditating]);

  // Handle Klik Halaman untuk Berjalan
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
    setCharacterPos({ x: clickX, y: clickY });
  };

  const handleToggleMeditation = () => {
    if (isMeditating) {
      setIsMeditating(false);
      setMessage('Selesai bermeditasi. Hawa batin terasa tenang dan jernih.');
    } else {
      setIsMeditating(true);
      setMessage('Mulai bermeditasi di bawah keteduhan paviliun ginkgo emas...');
      const timer = setInterval(() => {
        setQiGained(prev => prev + 5);
      }, 2000);
      setTimeout(() => clearInterval(timer), 10000);
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#161413] select-none flex flex-col">
      {/* Top HUD */}
      <div className="flex-shrink-0 bg-[#0e0c0b]/95 border-b border-amber-900/40 px-4 py-2 z-20 flex justify-between items-center backdrop-blur-md">
        <button
          onClick={onExit}
          className="bg-black/80 hover:bg-black text-gray-200 border border-gray-700 px-3 py-1.5 rounded-lg text-xs font-serif font-bold shadow-md flex items-center gap-1.5 transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400" />
          <span>Kembali ke Peta</span>
        </button>

        <div className="bg-black/80 border border-amber-800/60 px-4 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <h3 className="text-amber-200 font-serif font-bold text-xs">{locationName}</h3>
          <span className="text-[10px] text-gray-400 font-mono">| Tempat Meditasi Suci</span>
        </div>
      </div>

      {/* Canvas Halaman Pemandangan Meditasi */}
      <div className="flex-1 min-h-0 w-full h-full relative cursor-pointer">
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          onClick={handleCanvasClick}
          className="w-full h-full object-cover"
        />

        {/* Action Notification */}
        {message && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-black/90 border border-amber-500/70 text-amber-200 px-4 py-2 rounded-lg text-xs font-semibold shadow-2xl backdrop-blur-md animate-in fade-in">
            {message}
          </div>
        )}
      </div>

      {/* Bottom Bar: Kontrol Meditasi & Serap Qi */}
      <div className="flex-shrink-0 bg-[#0e0c0b] border-t border-amber-900/40 px-4 py-2.5 z-20 flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-3 text-xs text-gray-300">
          <span className="text-gray-400">Klik di mana saja pada lantai batu untuk berjalan.</span>
          {qiGained > 0 && (
            <span className="text-amber-300 font-semibold">
              ✨ Qi Alami Terserap: +{qiGained}
            </span>
          )}
        </div>

        <button
          onClick={handleToggleMeditation}
          className={`px-4 py-1.5 rounded-lg text-xs font-serif font-bold shadow-md border transition-all flex items-center gap-1.5 active:scale-95 ${
            isMeditating
              ? 'bg-blue-900/80 border-blue-500 text-blue-100 animate-pulse'
              : 'bg-amber-900/80 hover:bg-amber-800 border-amber-600/60 text-amber-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isMeditating ? 'Hentikan Meditasi' : 'Duduk Bermeditasi'}</span>
        </button>
      </div>
    </div>
  );
}
