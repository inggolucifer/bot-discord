'use client';
import React, { useState, useEffect } from 'react';
import { Shield, Swords, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { Modal } from "@/components/ui/Modal";
import api from '@/lib/api';

export default function SectExamModal({ sectId, onClose }: { sectId: string, onClose: () => void }) {
    const [loading, setLoading] = useState(true);
    const [examInfo, setExamInfo] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const [examStatus, setExamStatus] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [combatLog, setCombatLog] = useState<string[]>([]);
    const [combatResult, setCombatResult] = useState<{success: boolean, message: string} | null>(null);

    useEffect(() => {
        fetchInfo();
        fetchStatus();
    }, [sectId]);

    const fetchInfo = async () => {
        try {
            const res = await api.get(`/sect/${sectId}/examInfo`);
            setExamInfo(res.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal memuat info ujian');
        } finally {
            setLoading(false);
        }
    };

    const fetchStatus = async () => {
        try {
            const res = await api.get('/sect/exam/status');
            setExamStatus(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleStartExam = async () => {
        setActionLoading(true);
        setError(null);
        setCombatLog([]);
        setCombatResult(null);
        try {
            const res = await api.post(`/sect/${sectId}/exam/start`);
            if (res.data.log) {
                setCombatLog(res.data.log);
                setCombatResult({ success: res.data.success, message: res.data.message });
            } else {
                fetchStatus(); // for trial
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal memulai ujian');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCompleteTrial = async () => {
        setActionLoading(true);
        setError(null);
        try {
            const res = await api.post('/sect/exam/complete');
            setCombatResult({ success: res.data.success, message: res.data.message });
            setExamStatus(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Gagal menyelesaikan tugas');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <Modal isOpen={true} onClose={onClose} title="Memuat Info Ujian..."><LoadingState /></Modal>;

    return (
        <Modal isOpen={true} onClose={onClose} title={`Ujian Masuk: ${examInfo?.sectName || 'Sekte'}`}>
            <div className="space-y-4">
                {error && <div className="p-3 bg-red-900/50 text-red-200 rounded-md border border-red-800">{error}</div>}

                {combatResult ? (
                    <div className={`p-4 rounded-md border ${combatResult.success ? 'bg-green-900/30 border-green-800' : 'bg-red-900/30 border-red-800'}`}>
                        <h3 className={`text-lg font-bold flex items-center gap-2 mb-2 ${combatResult.success ? 'text-green-400' : 'text-red-400'}`}>
                            {combatResult.success ? <CheckCircle2 className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                            {combatResult.message}
                        </h3>
                        {combatLog.length > 0 && (
                            <div className="mt-4 max-h-40 overflow-y-auto bg-gray-950 p-2 rounded text-sm font-mono text-gray-300">
                                {combatLog.map((l, i) => <div key={i}>{l}</div>)}
                            </div>
                        )}
                        <Button className="mt-4 w-full" onClick={onClose}>Tutup</Button>
                    </div>
                ) : examStatus?.active ? (
                    <Card className="bg-blue-900/20 border-blue-800/50">
                        <CardContent className="p-4">
                            <h3 className="font-semibold text-blue-200 flex items-center gap-2 mb-2"><Clock className="w-4 h-4"/> Ujian Sedang Berlangsung</h3>
                            <p className="text-gray-300 text-sm mb-4">
                                Anda sedang menjalani tugas: {examStatus.objective === 'wait_time' ? 'Menunggu Batas Waktu' : examStatus.objective}.
                                <br />Batas waktu: {new Date(examStatus.deadlineAt).toLocaleString()}
                            </p>
                            <Button
                                onClick={handleCompleteTrial}
                                disabled={actionLoading}
                                className="w-full"
                            >
                                {actionLoading ? 'Memproses...' : 'Selesaikan Tugas'}
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                            <div className="p-2 bg-gray-700 rounded-md">
                                {examInfo?.type === 'combat' ? <Swords className="w-5 h-5 text-red-400" /> : <Shield className="w-5 h-5 text-blue-400" />}
                            </div>
                            <div>
                                <div className="font-semibold text-gray-200">
                                    Tipe Ujian: {examInfo?.type === 'combat' ? 'Pertarungan' : 'Tugas (Trial)'}
                                </div>
                                <div className="text-sm text-gray-400">
                                    Syarat Realm Index: {examInfo?.minRealmIndex}
                                    {examInfo?.isOnCooldown && (
                                        <div className="text-red-400 mt-1">
                                            Sedang Cooldown: {Math.ceil((examInfo.cooldownRemainingMs || 0) / 60000)} menit lagi
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {examInfo?.type === 'combat' && (
                            <p className="text-sm text-gray-300">Anda akan berhadapan dengan <strong>{examInfo.guardianName}</strong>.</p>
                        )}

                        <Button
                            className="w-full"
                            onClick={handleStartExam}
                            disabled={actionLoading || examInfo?.isOnCooldown}
                        >
                            {actionLoading ? 'Memulai...' : 'Mulai Ujian'}
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
