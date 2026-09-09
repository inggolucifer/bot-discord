import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from '@/components/ui/Toast';

interface FertilizerModalProps {
    plotIndex: number;
    inventory: any[];
    onClose: () => void;
}

export default function FertilizerModal({ plotIndex, inventory, onClose }: FertilizerModalProps) {
    const queryClient = useQueryClient();
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [isApplying, setIsApplying] = useState(false);

    const fertilizers = inventory.filter((item: any) =>
        item.itemId &&
        item.itemId.effectType === 'farm_grow_speed' &&
        item.quantity > 0
    );

    const applyMutation = useMutation({
        mutationFn: () => api.post('/professions/farming/apply-fertilizer', { plotIndex, inventoryItemId: selectedItemId }),
        onSuccess: (res: any) => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            toast.show({ message: res.data.message || 'Pupuk berhasil digunakan!', type: 'success' });
            onClose();
        },
        onError: (err: any) => {
            toast.show({ message: err.response?.data?.error || 'Gagal menggunakan pupuk.', type: 'error' });
            setIsApplying(false);
        }
    });

    const handleApply = () => {
        if (!selectedItemId) {
            toast.show({ message: 'Pilih pupuk terlebih dahulu.', type: 'error' });
            return;
        }
        setIsApplying(true);
        applyMutation.mutate();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-amber-600 p-6 rounded-lg max-w-md w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">✕</button>
                <h3 className="text-xl font-bold text-amber-500 mb-4">Gunakan Pupuk (Plot #{plotIndex + 1})</h3>

                {fertilizers.length === 0 ? (
                    <div className="text-gray-400 mb-4">Kamu tidak memiliki pupuk. Craft pupuk di Asset atau beli di shop.</div>
                ) : (
                    <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {fertilizers.map((item: any) => (
                            <button
                                key={item._id}
                                onClick={() => setSelectedItemId(item._id)}
                                className={`w-full text-left p-3 rounded border transition-colors flex justify-between items-center ${selectedItemId === item._id ? 'bg-amber-900/40 border-amber-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}
                            >
                                <div>
                                    <div className="font-bold text-gray-200">{item.itemId.name}</div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        Percepat Panen: {(item.itemId.effectValue * 100).toFixed(0)}%
                                    </div>
                                </div>
                                <div className="text-amber-500 font-bold">x{item.quantity}</div>
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex gap-4">
                    <button
                        onClick={handleApply}
                        disabled={isApplying || fertilizers.length === 0 || !selectedItemId}
                        className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2 rounded transition-colors"
                    >
                        {isApplying ? 'Menggunakan...' : 'Pakai Pupuk'}
                    </button>
                </div>
            </div>
        </div>
    );
}
