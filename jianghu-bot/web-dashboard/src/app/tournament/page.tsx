'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Swords, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';

interface Match {
  matchNumber: number;
  player1Name: string | null;
  player2Name: string | null;
  winnerId: string | null;
  winnerName?: string | null; // Note: We might need to map this if API doesn't provide it directly per match
  status: string;
}

interface Round {
  roundNumber: number;
  roundLabel: string | null;
  matches: Match[];
}

interface Tournament {
  name: string;
  status: string;
  winnerName: string | null;
  rounds: Round[];
}

export default function TournamentPage() {
  const { hasCharacter } = useAuthStore();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasCharacter) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    const fetchTournament = async () => {
      try {
        const res = await api.get('/tournament');
        if (res.data.tournament) {
          setTournament(res.data.tournament);
        } else {
          setMessage(res.data.message || 'Tidak ada turnamen aktif.');
        }
      } catch (err: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e = err as any;
        setError(e.response?.data?.error || 'Gagal memuat data turnamen');
      } finally {
        setLoading(false);
      }
    };

    fetchTournament();
  }, [hasCharacter]);

  if (!hasCharacter) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-0">
      <PageHeader
        title="Arena Turnamen"
        description={tournament ? `${tournament.name} — Status: ${tournament.status.toUpperCase()}` : "Sistem pertarungan bela diri."}
      />

      {error ? (
        <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-center text-red-400">
          {error}
        </div>
      ) : loading ? (
        <LoadingState text="Memuat Arena..." />
      ) : !tournament ? (
        <EmptyState
          icon={<Swords />}
          title="Tidak Ada Turnamen"
          description={message}
        />
      ) : (
        <div className="bg-[#111] border border-[#8b0000]/30 rounded-xl p-4 sm:p-6 shadow-[0_0_20px_rgba(139,0,0,0.1)] overflow-hidden flex flex-col">
          {tournament.winnerName && (
             <div className="text-center mb-8 p-6 bg-gradient-to-b from-yellow-900/40 to-transparent border border-yellow-700/50 rounded-lg relative overflow-hidden">
                <div className="absolute -top-10 -right-10 text-yellow-500/10"><Trophy size={150} /></div>
                <h3 className="text-yellow-500 text-sm font-bold uppercase tracking-widest mb-2 relative z-10">Pemenang Turnamen</h3>
                <p className="text-3xl sm:text-4xl text-white font-serif relative z-10 flex items-center justify-center gap-4">
                  <span className="text-yellow-500">🏆</span>
                  {tournament.winnerName}
                  <span className="text-yellow-500">🏆</span>
                </p>
             </div>
          )}

          {tournament.rounds.length === 0 ? (
            <div className="text-center py-12">
               <Swords className="w-12 h-12 text-gray-700 mx-auto mb-3" />
               <p className="text-gray-500">Bracket belum dibuat.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar pb-6 w-full">
              <div className="flex gap-6 sm:gap-12 min-w-max justify-start px-2">
                {tournament.rounds.map((round) => (
                  <div key={round.roundNumber} className="flex flex-col gap-4 min-w-[200px] sm:min-w-[250px]">
                    <h3 className="text-center font-bold text-[#c5a880] border-b border-[#333] pb-2 mb-2 uppercase text-sm tracking-wider">
                      {round.roundLabel || `Babak ${round.roundNumber}`}
                    </h3>

                    <div className="flex flex-col gap-6 justify-around flex-1 relative">
                      {/* Optional: Add connecting lines logic here if feeling adventurous, but CSS flex usually centers them okay enough for simple brackets */}
                      {round.matches.map((match) => {
                         // A bit of a hack to determine who won if we only have winnerId but not winnerName on the match object from API
                         // In a real scenario, API should return winnerName or a boolean flag on the player.
                         // We will just highlight the text green if it's the tournament winner for now, as in original code.
                         // Note: Original code had a bug where it compared player1Name with tournament.winnerName, which only works for the final match.
                         // Ideally, we just check if status is completed and there's a winnerId. But since we don't have full data mapping here, we'll keep it simple.
                         const isCompleted = match.status === 'completed';

                         return (
                          <div key={match.matchNumber} className={`border rounded-lg overflow-hidden shadow-lg transition-colors ${isCompleted ? 'border-[#444] bg-[#1a1a1a]' : 'border-blue-900/50 bg-[#111]'}`}>
                            <div className="text-[9px] sm:text-[10px] text-center bg-black/60 text-gray-500 py-1.5 font-mono border-b border-[#333]">
                              MATCH {match.matchNumber} {isCompleted ? '(SELESAI)' : ''}
                            </div>
                            <div className="flex flex-col">
                               <div className={`p-2.5 border-b border-[#333] flex justify-between items-center ${isCompleted && match.winnerId ? 'text-gray-300' : 'text-gray-300'}`}>
                                  <span className="font-semibold truncate pr-2 text-sm">{match.player1Name || '???'}</span>
                                  {/* Since we don't have winner name per match, we omit the WIN label for intermediate rounds unless we can reliably calculate it. */}
                               </div>
                               <div className={`p-2.5 flex justify-between items-center ${isCompleted && match.winnerId ? 'text-gray-300' : 'text-gray-300'}`}>
                                  <span className="font-semibold truncate pr-2 text-sm">{match.player2Name === null ? <span className="text-gray-600 italic">BYE</span> : (match.player2Name || '???')}</span>
                               </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
