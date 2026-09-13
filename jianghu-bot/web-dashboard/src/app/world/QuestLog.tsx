'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { CheckCircle, Clock, Package, MapPin, RefreshCw, Gift, FileText } from 'lucide-react';

export default function QuestLog({ questLog, onQuestUpdated }: { questLog: any[], onQuestUpdated: () => void }) {
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const activeQuests = questLog.filter(q => q.status === 'active' || q.status === 'completed');

    const handleEvaluate = async (questId: string) => {
        setLoadingAction(questId);
        setError(''); setMessage('');
        try {
            const res = await api.post(`/world/quests/${questId}/evaluate`);
            if (res.data.completed) {
                setMessage('Quest selesai! Siap diklaim.');
            } else {
                setMessage(res.data.message);
            }
            onQuestUpdated();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Gagal evaluasi quest.');
        } finally {
            setLoadingAction(null);
        }
    };

    const handleClaim = async (questId: string) => {
        setLoadingAction(questId);
        setError(''); setMessage('');
        try {
            const res = await api.post(`/world/quests/${questId}/claim`);
            setMessage(res.data.message + ' ' + (res.data.rewardsStr ? `Mendapatkan: ${res.data.rewardsStr}` : ''));
            onQuestUpdated();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Gagal klaim quest.');
        } finally {
            setLoadingAction(null);
        }
    };

    const handleSubmitItem = async (questId: string, itemName: string, quantity: number) => {
        setLoadingAction(questId);
        setError(''); setMessage('');
        try {
            const res = await api.post(`/world/quests/${questId}/submit-item`, { itemName, quantity });
            if (res.data.completed) {
                setMessage('Item diserahkan dan objektif selesai!');
            } else {
                setMessage('Item berhasil diserahkan.');
            }
            onQuestUpdated();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Gagal serahkan item.');
        } finally {
            setLoadingAction(null);
        }
    };

    if (activeQuests.length === 0) {
        return (
            <div className="bg-[#1a1f2e]/80 border border-[#2a3142] rounded-xl p-8 shadow-xl text-center">
                <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-400">Log Quest Kosong</h3>
                <p className="text-gray-500 mt-2">Temui NPC di berbagai tempat untuk mencari pekerjaan atau petualangan.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {error && <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-4 rounded-lg">{error}</div>}
            {message && <div className="bg-green-900/50 border border-green-500/50 text-green-200 p-4 rounded-lg">{message}</div>}

            {activeQuests.map((questEntry) => {
                const quest = questEntry.questId;
                if (!quest) return null; // populated object

                const isCompleted = questEntry.status === 'completed';

                return (
                    <div key={questEntry._id} className={`bg-[#1a1f2e]/80 border ${isCompleted ? 'border-green-500/50' : 'border-[#2a3142]'} rounded-xl p-6 shadow-xl`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                                    {isCompleted && <CheckCircle className="w-5 h-5 text-green-400" />}
                                    {quest.title}
                                </h3>
                                <p className="text-sm text-gray-400 mt-1">{quest.description}</p>
                            </div>

                            {isCompleted ? (
                                <button
                                    disabled={loadingAction === quest._id}
                                    onClick={() => handleClaim(quest._id)}
                                    className="bg-green-600/80 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    <Gift className="w-4 h-4" /> Klaim Reward
                                </button>
                            ) : (
                                <button
                                    disabled={loadingAction === quest._id}
                                    onClick={() => handleEvaluate(quest._id)}
                                    className="bg-gray-700 hover:bg-gray-600 text-gray-200 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
                                    title="Perbarui Status"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loadingAction === quest._id ? 'animate-spin' : ''}`} />
                                </button>
                            )}
                        </div>

                        <div className="space-y-3 bg-[#0f131c] p-4 rounded-lg">
                            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Objektif:</h4>
                            {quest.objectives.map((obj: any, idx: number) => {
                                const prog = questEntry.objectiveProgress.find((p: any) => p.index === idx);
                                const done = prog?.done;

                                return (
                                    <div key={idx} className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${done ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-gray-600 text-transparent'}`}>
                                            {done && <CheckCircle className="w-3 h-3" />}
                                        </div>
                                        <div className="flex-1">
                                            <span className={`text-sm ${done ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                                                {obj.description}
                                            </span>

                                            {!done && obj.type === 'submit_item' && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">
                                                        ({prog?.submittedQty || 0} / {obj.quantity})
                                                    </span>
                                                    <button
                                                        onClick={() => handleSubmitItem(quest._id, obj.itemName, obj.quantity - (prog?.submittedQty || 0))}
                                                        className="text-xs bg-blue-900/40 hover:bg-blue-800 text-blue-300 px-2 py-1 rounded border border-blue-700/50 transition-colors"
                                                    >
                                                        Serahkan {obj.itemName}
                                                    </button>
                                                </div>
                                            )}

                                            {!done && obj.type === 'wait_time' && prog?.waitDeadlineAt && (
                                                <div className="mt-1 text-xs text-orange-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Tunggu hingga: {new Date(prog.waitDeadlineAt).toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
