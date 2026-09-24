"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Moon, Bell, Compass, Calendar, Sparkles, Loader2 } from 'lucide-react';

interface CelestialCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CelestialEvent {
  id: string;
  title: string;
  frequency: string;
  isActive: boolean;
  buffDescription: string;
  icon: string;
}

export default function CelestialCalendarModal({ isOpen, onClose }: CelestialCalendarModalProps) {
  const { data: eventsRes, isLoading } = useQuery<{ success: boolean; data: { events: CelestialEvent[] } }>({
    queryKey: ['celestialEvents'],
    queryFn: async () => {
      const { data } = await api.get('/celestial-calendar/events');
      return data;
    },
    enabled: isOpen
  });

  const events = eventsRes?.data?.events || [
    {
      id: 'twin_moon_eclipse',
      title: 'Gerhana Bulan Kembar (Celestial Alignment)',
      frequency: '1× Sebulan (Tgl 15)',
      isActive: false,
      buffDescription: 'Kecepatan meditasi Qi semesta berlipat ganda (Qi Rate ×2) di seluruh benua!',
      icon: '🌕'
    },
    {
      id: 'midnight_bell',
      title: 'Malam Lonceng Pencerahan (Midnight Enlightenment)',
      frequency: 'Setiap Rabu 20:00–23:00',
      isActive: false,
      buffDescription: 'Kecepatan pemahaman kitab kungfu +50% dan channeling rate ×1.5 selama 3 jam.',
      icon: '🔔'
    },
    {
      id: 'secret_leyline_gates',
      title: 'Pintu Formasi Leylines Rahasia',
      frequency: 'Terbuka 72 Jam Sebulan',
      isActive: true,
      buffDescription: 'Muncul 3 titik koordinat formasi purba dengan tambang meteorit dan herba langka.',
      icon: '🌌'
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🌕 Kalender Fenomena Surgawi (Celestial Calendar / 天象秘境谱)">
      <div className="space-y-4 text-stone-200 p-1 text-xs">
        <p className="text-stone-400 text-[11px] leading-relaxed">
          Peredaran bintang dan fenomena kosmik semesta secara otomatis memicu peristiwa spiritual berkala di seluruh benua Jianghu. Manfaatkan momen astronomis ini untuk mempercepat kultivasi!
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-stone-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Menyelaraskan peredaran rasi bintang...
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((evt) => (
              <Card
                key={evt.id}
                className={`p-4 border transition-all flex items-start gap-4 ${
                  evt.isActive
                    ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-stone-900 to-black shadow-lg shadow-amber-500/10'
                    : 'border-stone-800 bg-stone-950/60'
                }`}
              >
                <div className="rounded-lg bg-black/60 p-2.5 text-2xl flex-shrink-0 border border-stone-800">
                  {evt.icon}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-serif font-bold text-amber-200 text-sm">
                      {evt.title}
                    </h4>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                        evt.isActive
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40 animate-pulse'
                          : 'bg-stone-900 text-stone-400 border-stone-800'
                      }`}
                    >
                      {evt.isActive ? 'Sedang Aktif 🔥' : evt.frequency}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    {evt.buffDescription}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
