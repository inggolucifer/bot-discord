'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import FallbackImage from '@/components/FallbackImage';
import { useAuthStore } from '@/lib/store';
import { Trophy, RefreshCw, Loader2, Coins } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';

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
  const { user, hasCharacter } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<PlayerRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
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

  useEffect(() => {
    if (!hasCharacter) {
      setTimeout(() => setLoading(false), 0);
      return;
    }
    setTimeout(() => fetchLeaderboard(), 0);
  }, [hasCharacter]);

  if (!user || !hasCharacter) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-0">
      <PageHeader
        title="Papan Peringkat"
        description="Daftar Pendekar Terkaya di Jianghu."
        action={
          <Button variant="outline" onClick={fetchLeaderboard} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
        }
      />

      {error ? (
        <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-center text-red-400">
          {error}
        </div>
      ) : loading && leaderboard.length === 0 ? (
        <LoadingState text="Memuat Gulungan Peringkat..." />
      ) : leaderboard.length === 0 ? (
        <EmptyState
          icon={<Trophy />}
          title="Gulungan Kosong"
          description="Belum ada pendekar yang terdaftar di papan peringkat."
        />
      ) : (
        <div className="bg-[#111] border border-[#333] rounded-xl p-4 sm:p-6 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <div className="space-y-3 sm:space-y-4">
            {leaderboard.map((player, index) => {
              // Highlight the logged-in user
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const isCurrentUser = player.discordId === ((user as any)?.userId || user?.id);

              return (
                <div
                  key={player.discordId}
                  className={`flex flex-col sm:flex-row items-center sm:items-stretch gap-4 p-4 rounded-lg border transition-all hover:scale-[1.01] hover:shadow-lg ${
                    index < 3
                      ? 'border-yellow-600/50 bg-[#1a1a00]/30 hover:border-yellow-500'
                      : isCurrentUser
                        ? 'border-[#c5a880]/50 bg-[#c5a880]/10 hover:border-[#c5a880]'
                        : 'border-[#333] bg-black/40 hover:border-[#555]'
                  }`}
                >
                  {/* Rank & Avatar */}
                  <div className="flex items-center gap-4 w-full sm:w-5/12">
                    <div className="text-xl sm:text-2xl w-8 text-center font-bold font-serif shrink-0">
                      {MEDAL[index] || <span className="text-gray-500 text-base sm:text-lg">#{index + 1}</span>}
                    </div>
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 flex-shrink-0 bg-[#222] ${index < 3 ? 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'border-[#555]'}`}>
                      <FallbackImage
                        src={player.characterImage || ''}
                        alt={player.characterName}
                        fallbackNode={<div className="w-full h-full flex items-center justify-center text-xl">👤</div>}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className={`font-bold truncate text-sm sm:text-base ${index < 3 ? 'text-yellow-500' : 'text-[#c5a880]'}`} title={player.characterName}>
                        {player.characterName} {isCurrentUser && <span className="text-[10px] bg-[#c5a880] text-black px-1 rounded ml-1">Anda</span>}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-400 truncate mt-0.5">{player.sect}</div>
                    </div>
                  </div>

                  {/* Cultivation */}
                  <div className="w-full sm:w-3/12 flex items-center justify-center sm:justify-start text-xs sm:text-sm text-gray-300 border-t sm:border-t-0 sm:border-l border-[#333] pt-3 sm:pt-0 sm:pl-4">
                    <div className="flex flex-col items-center sm:items-start w-full">
                       <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Kultivasi</span>
                       <span className="font-semibold text-gray-200 truncate w-full text-center sm:text-left">{player.realm}</span>
                       <span className="text-[10px] text-gray-400">({player.stage})</span>
                    </div>
                  </div>

                  {/* Wealth */}
                  <div className="w-full sm:w-4/12 flex items-center justify-center sm:justify-end text-sm border-t sm:border-t-0 sm:border-l border-[#333] pt-3 sm:pt-0 sm:pl-4">
                    <div className="flex flex-col items-center sm:items-end w-full">
                      <div className="text-gray-500 text-[10px] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Coins size={10} /> Kekayaan
                      </div>
                      <div className="flex justify-center sm:justify-end gap-1.5 flex-wrap">
                        {player.currency.silver > 0 && <span className="bg-[#222] px-1.5 py-0.5 rounded text-[10px] border border-[#444] font-mono">{player.currency.silver} 🥈</span>}
                        {player.currency.gold > 0 && <span className="bg-[#222] px-1.5 py-0.5 rounded text-[10px] border border-yellow-900/50 font-mono">{player.currency.gold} 🥇</span>}
                        {player.currency.jade > 0 && <span className="bg-[#222] px-1.5 py-0.5 rounded text-[10px] border border-green-900/50 font-mono">{player.currency.jade} 💎</span>}
                        {player.currency.spirit > 0 && <span className="bg-[#222] px-1.5 py-0.5 rounded text-[10px] border border-blue-900/50 font-mono">{player.currency.spirit} 🔮</span>}
                        {player.totalWealth === 0 && <span className="text-gray-600 text-xs italic">Miskin</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
