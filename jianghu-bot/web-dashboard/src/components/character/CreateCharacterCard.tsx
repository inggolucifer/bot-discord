'use client';

import React, { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Sparkles, Loader2, User, Shield, Compass, Swords } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

interface CreateCharacterCardProps {
  onCreated: () => void;
}

export default function CreateCharacterCard({ onCreated }: CreateCharacterCardProps) {
  const [characterName, setCharacterName] = useState('');
  const [gender, setGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [age, setAge] = useState(16);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterName.trim()) {
      setErrorMsg('Silakan masukkan nama pendekar Anda.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.post('/auth/register-character', {
        characterName: characterName.trim(),
        gender,
        age
      });

      toast.show({
        message: res.data.message || 'Karakter berhasil didaftarkan!',
        type: 'success'
      });

      onCreated();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Gagal mendaftarkan karakter. Silakan coba lagi.';
      setErrorMsg(msg);
      toast.show({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-gradient-to-b from-[#141416] via-[#101114] to-[#0a0a0c] border border-[#c5a880]/40 rounded-2xl p-6 sm:p-8 shadow-[0_0_35px_rgba(197,168,128,0.15)] relative overflow-hidden backdrop-blur-md">
      {/* Decorative Wuxia Flourishes */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#c5a880]/10 rounded-full filter blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#8b0000]/15 rounded-full filter blur-2xl pointer-events-none" />

      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#c5a880]/20 to-[#8b0000]/20 border border-[#c5a880]/40 text-[#c5a880] mb-3 shadow-[0_0_15px_rgba(197,168,128,0.2)]">
          <Swords size={24} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[#c5a880] tracking-wide">
          Daftarkan Pendekar
        </h2>
        <p className="text-xs sm:text-sm text-gray-400 mt-2 max-w-md mx-auto leading-relaxed">
          Akun Discord Anda telah terhubung. Tentukan nama dan jati diri untuk mengawali langkah di dunia kultivasi Jianghu.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-5 p-3 rounded-lg bg-red-900/30 border border-red-700/50 text-red-300 text-xs sm:text-sm text-center">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-[#c5a880] uppercase tracking-wider mb-2">
            Nama Karakter (Maks. 32 Karakter)
          </label>
          <div className="relative">
            <input
              type="text"
              required
              maxLength={32}
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="Contoh: Xiao Feng, Bai Ling, dll."
              className="w-full bg-black/60 border border-[#444] focus:border-[#c5a880] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#c5a880] transition-all"
            />
            <User size={16} className="absolute right-4 top-3.5 text-gray-500 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#c5a880] uppercase tracking-wider mb-2">
            Jenis Kelamin
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setGender('Laki-laki')}
              className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                gender === 'Laki-laki'
                  ? 'bg-[#c5a880]/20 border-[#c5a880] text-[#c5a880] shadow-[0_0_12px_rgba(197,168,128,0.3)]'
                  : 'bg-black/40 border-[#333] text-gray-400 hover:border-gray-600'
              }`}
            >
              <Shield size={16} /> Laki-laki
            </button>
            <button
              type="button"
              onClick={() => setGender('Perempuan')}
              className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                gender === 'Perempuan'
                  ? 'bg-[#c5a880]/20 border-[#c5a880] text-[#c5a880] shadow-[0_0_12px_rgba(197,168,128,0.3)]'
                  : 'bg-black/40 border-[#333] text-gray-400 hover:border-gray-600'
              }`}
            >
              <Compass size={16} /> Perempuan
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#c5a880] uppercase tracking-wider mb-2">
            Umur Karakter
          </label>
          <input
            type="number"
            min={1}
            max={9999}
            value={age}
            onChange={(e) => setAge(parseInt(e.target.value, 10) || 16)}
            className="w-full bg-black/60 border border-[#444] focus:border-[#c5a880] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#c5a880] font-mono transition-all"
          />
          <p className="text-[11px] text-gray-500 mt-1">
            *Dapat diubah kembali sewaktu-waktu di dalam game.
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading || !characterName.trim()}
          className="w-full py-3.5 bg-gradient-to-r from-[#8b2635] via-[#a32839] to-[#c5a880] hover:from-[#a32839] hover:to-[#dfb76c] text-white font-serif font-bold text-sm tracking-wider rounded-xl shadow-[0_0_20px_rgba(139,38,53,0.4)] transition-all flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Menempa Takdir...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Masuki Dunia Jianghu
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
