'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Swords } from 'lucide-react';

interface Match {
  matchNumber: number;
  player1Name: string | null;
  player2Name: string | null;
  winnerId: string | null;
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
  if (loading) return <div className="text-center py-20 text-[#c5a880] animate-pulse">Memuat Arena...</div>;
  if (error) return <div className="text-center py-20 text-[#8b0000]">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#c5a880] font-serif mb-2 flex items-center justify-center gap-3">
          <Swords className="text-[#8b0000]" /> Arena Turnamen
        </h1>
        {tournament && (
           <p className="text-gray-400 text-sm">
             {tournament.name} — Status: <span className="uppercase text-[#c5a880] font-bold">{tournament.status}</span>
           </p>
        )}
      </div>

      {!tournament ? (
        <div className="bg-black/80 border border-[#333] rounded-lg p-10 text-center shadow-[0_0_15px_rgba(0,0,0,0.5)] text-gray-500">
           {message}
        </div>
      ) : (
        <div className="bg-black/80 border border-[#333] rounded-lg p-6 shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-x-auto">
          {tournament.winnerName && (
             <div className="text-center mb-8 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                <h3 className="text-yellow-500 text-lg font-bold">Pemenang Turnamen</h3>
                <p className="text-2xl text-white font-serif mt-2">🏆 {tournament.winnerName} 🏆</p>
             </div>
          )}

          {tournament.rounds.length === 0 ? (
            <p className="text-center text-gray-500">Bracket belum dibuat.</p>
          ) : (
            <div className="flex gap-8 justify-center min-w-max">
              {tournament.rounds.map((round) => (
                <div key={round.roundNumber} className="flex flex-col gap-4 min-w-[250px]">
                  <h3 className="text-center font-bold text-[#c5a880] border-b border-[#333] pb-2 mb-2">
                    {round.roundLabel || `Babak ${round.roundNumber}`}
                  </h3>

                  <div className="flex flex-col gap-6 justify-around flex-1">
                    {round.matches.map((match) => (
                      <div key={match.matchNumber} className="border border-[#444] rounded bg-[#111] overflow-hidden shadow-md">
                        <div className="text-[10px] text-center bg-[#222] text-gray-500 py-1">
                          Match {match.matchNumber} {match.status === 'completed' ? '(Selesai)' : ''}
                        </div>
                        <div className="flex flex-col">
                           <div className={`p-2 border-b border-[#333] flex justify-between items-center ${match.winnerId && match.player1Name === tournament.winnerName ? 'bg-green-900/20 text-green-400' : 'text-gray-300'}`}>
                              <span className="font-semibold truncate pr-2">{match.player1Name || '???'}</span>
                              {match.winnerId && match.player1Name === tournament.winnerName && <span className="text-xs">WIN</span>}
                           </div>
                           <div className={`p-2 flex justify-between items-center ${match.winnerId && match.player2Name === tournament.winnerName ? 'bg-green-900/20 text-green-400' : 'text-gray-300'}`}>
                              <span className="font-semibold truncate pr-2">{match.player2Name === null ? '(BYE)' : (match.player2Name || '???')}</span>
                              {match.winnerId && match.player2Name === tournament.winnerName && <span className="text-xs">WIN</span>}
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
