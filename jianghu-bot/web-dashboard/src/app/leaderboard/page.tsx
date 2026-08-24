'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import FallbackImage from '@/components/FallbackImage';
import { useAuthStore } from '@/lib/store';
import { Trophy } from 'lucide-react';

interface PlayerRank {
  discordId: string;
  characterName: string;
  sect: string;
  stage: string;
  realm: string;
  characterImage: string | null;
  currency: {
    silver: number;
    gold: number;
    jade: number;
    spirit: number;
  };
  totalWealth: number;
}

const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const { hasCharacter } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<PlayerRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasCharacter) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    const fetchLeaderboard = async () => {
      try {
        const res = await api.get('/leaderboard');
        setLeaderboard(res.data);
      } catch (err: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e = err as any;
        setError(e.response?.data?.error || 'Gagal memuat leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [hasCharacter]);

  if (!hasCharacter) return null;
  if (loading) return <div className="text-center py-20 text-[#c5a880] animate-pulse">Memuat Gulungan Peringkat...</div>;
  if (error) return <div className="text-center py-20 text-[#8b0000]">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#c5a880] font-serif mb-2 flex items-center justify-center gap-3">
          <Trophy className="text-yellow-500" /> Leaderboard Kekayaan
        </h1>
        <p className="text-gray-400 text-sm">10 Pendekar Terkaya di Jianghu</p>
      </div>

      <div className="bg-black/80 border border-[#333] rounded-lg p-6 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
        {leaderboard.length === 0 ? (
          <p className="text-center text-gray-500 py-10">Belum ada pendekar yang terdaftar di papan peringkat.</p>
        ) : (
          <div className="space-y-4">
            {leaderboard.map((player, index) => (
              <div
                key={player.discordId}
                className={`flex flex-col md:flex-row items-center gap-4 p-4 rounded-md border ${index < 3 ? 'border-yellow-600/50 bg-[#1a1a00]/50' : 'border-[#222] bg-[#111]'} transition-transform hover:scale-[1.01]`}
              >
                {/* Rank & Avatar */}
                <div className="flex items-center gap-4 w-full md:w-1/3">
                  <div className="text-2xl w-8 text-center font-bold">
                    {MEDAL[index] || <span className="text-gray-500 text-lg">#{index + 1}</span>}
                  </div>
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#c5a880] flex-shrink-0">
                    <FallbackImage src={player.characterImage || ''} alt={player.characterName} fallbackHtml='<div class="bg-gray-800 w-full h-full flex items-center justify-center text-xs">👤</div>' />
                  </div>
                  <div>
                    <div className="font-bold text-[#c5a880]">{player.characterName}</div>
                    <div className="text-xs text-gray-400">{player.sect}</div>
                  </div>
                </div>

                {/* Cultivation */}
                <div className="w-full md:w-1/3 text-center md:text-left text-sm text-gray-300">
                  <span className="text-gray-500">Kultivasi: </span>
                  {player.realm} <span className="text-xs">({player.stage})</span>
                </div>

                {/* Wealth */}
                <div className="w-full md:w-1/3 text-center md:text-right text-sm">
                  <div className="text-gray-500 text-xs mb-1">Kekayaan:</div>
                  <div className="flex justify-center md:justify-end gap-2 flex-wrap">
                    {player.currency.silver > 0 && <span>{player.currency.silver} 🥈</span>}
                    {player.currency.gold > 0 && <span>{player.currency.gold} 🥇</span>}
                    {player.currency.jade > 0 && <span>{player.currency.jade} 💎</span>}
                    {player.currency.spirit > 0 && <span>{player.currency.spirit} 🔮</span>}
                    {player.totalWealth === 0 && <span className="text-gray-600">0</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
