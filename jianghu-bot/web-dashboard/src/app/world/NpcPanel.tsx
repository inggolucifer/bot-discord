'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { ArrowLeft, MessageSquare, Gift } from 'lucide-react';

export default function NpcPanel({ npcId, onBack, onQuestAccepted }: { npcId: string, onBack: () => void, onQuestAccepted: () => void }) {
    const [loading, setLoading] = useState(true);
    const [npcData, setNpcData] = useState<any>(null);
    const [availableQuests, setAvailableQuests] = useState<any[]>([]);
    const [dialogHistory, setDialogHistory] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchNpcData();
    }, [npcId]);

    const fetchNpcData = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/world/npc/${npcId}`);
            setNpcData(res.data.npc);
            setAvailableQuests(res.data.availableQuests);

            // Initiate talk to evaluate objective and get greeting
            const talkRes = await api.post(`/world/npc/${npcId}/talk`, {});
            setDialogHistory([talkRes.data.message]);

        } catch (err: any) {
            setError(err.response?.data?.error || 'Gagal memuat data NPC.');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptQuest = async (questId: string) => {
        setError('');
        setMessage('');
        try {
            const res = await api.post(`/world/quests/${questId}/accept`, { npcId });
            setMessage(res.data.message);
            onQuestAccepted();
            fetchNpcData(); // Refresh quests list
        } catch (err: any) {
            setError(err.response?.data?.error || 'Gagal mengambil quest.');
        }
    };

    if (loading) return <div className="text-gray-400 text-center py-8 animate-pulse">Menghampiri NPC...</div>;
    if (error && !npcData) return <div className="text-red-400 text-center py-8">{error} <br/><button onClick={onBack} className="mt-4 text-blue-400 underline">Kembali</button></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-[#2a3142] rounded-lg transition-colors text-gray-400">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h3 className="text-2xl font-bold text-gray-100">{npcData.name}</h3>
                    <p className="text-sm text-gray-400">{npcData.title} • {npcData.description}</p>
                </div>
            </div>

            {error && <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">{error}</div>}
            {message && <div className="bg-green-900/50 border border-green-500/50 text-green-200 p-3 rounded-lg text-sm">{message}</div>}

            <div className="bg-[#0f131c] border border-[#2a3142] rounded-lg p-6">
                <div className="space-y-4 mb-6">
                    {dialogHistory.map((msg, i) => (
                        <div key={i} className="flex gap-3">
                            <MessageSquare className="w-5 h-5 text-blue-400 shrink-0 mt-1" />
                            <p className="text-gray-300 leading-relaxed font-serif italic">"{msg}"</p>
                        </div>
                    ))}
                </div>
            </div>

            {availableQuests.length > 0 && (
                <div className="mt-8 border-t border-[#2a3142] pt-6">
                    <h4 className="text-lg font-bold text-[#c5a880] mb-4 flex items-center gap-2">
                        <Gift className="w-5 h-5" /> Tawaran Bantuan
                    </h4>
                    <div className="space-y-3">
                        {availableQuests.map((quest) => (
                            <div key={quest._id} className="bg-[#1e2532] border border-[#2a3142] rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h5 className="font-bold text-gray-200">{quest.title}</h5>
                                    <p className="text-sm text-gray-400">{quest.description}</p>
                                </div>
                                <button
                                    onClick={() => handleAcceptQuest(quest._id)}
                                    className="bg-blue-600/80 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
                                >
                                    Ambil Quest
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
