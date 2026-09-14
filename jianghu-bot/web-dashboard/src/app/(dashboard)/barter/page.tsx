'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BarterPage() {
    const router = useRouter();

    const [players, setPlayers] = useState([]);
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Offer form state
    const [targetPlayer, setTargetPlayer] = useState('');
    const [offerCopper, setOfferCopper] = useState(0);
    const [offerSilver, setOfferSilver] = useState(0);
    const [requestCopper, setRequestCopper] = useState(0);
    const [requestSilver, setRequestSilver] = useState(0);

    // Future expansion: Items
    const [offerItems, setOfferItems] = useState([]);
    const [requestItems, setRequestItems] = useState([]);

    const [actionMessage, setActionMessage] = useState(null);

    // For auth info
    const [myUserId, setMyUserId] = useState(null);

    useEffect(() => {
        // Fetch current user details quickly to know our own ID
        const fetchMe = async () => {
            try {
                const res = await fetch('/api/player/profile'); // Using existing endpoint
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.data) {
                        setMyUserId(data.data.discordId);
                    }
                }
            } catch (e) {
                console.error("Failed fetching user ID");
            }
        };
        fetchMe();
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const nearbyRes = await fetch('/api/barter/nearby-players');
            if (nearbyRes.ok) {
                const nearbyData = await nearbyRes.json();
                if (nearbyData.success) {
                    setPlayers(nearbyData.data);
                }
            }
            const offersRes = await fetch('/api/barter/offers');
            if (offersRes.ok) {
                const offersData = await offersRes.json();
                if (offersData.success) {
                    setOffers(offersData.data);
                }
            }
        } catch (err) {
            setError('Gagal mengambil data barter.');
        }
        setLoading(false);
    };

    const handleCreateOffer = async (e) => {
        e.preventDefault();
        setActionMessage(null);
        if (!targetPlayer) {
            setActionMessage({ type: 'error', text: 'Pilih pemain target terlebih dahulu.' });
            return;
        }

        try {
            const res = await fetch('/api/barter/offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toUserId: targetPlayer,
                    offer: { copper: Number(offerCopper), silver: Number(offerSilver), items: offerItems },
                    request: { copper: Number(requestCopper), silver: Number(requestSilver), items: requestItems }
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setActionMessage({ type: 'success', text: 'Tawaran barter berhasil dibuat!' });
                fetchData();
                setOfferCopper(0);
                setOfferSilver(0);
                setRequestCopper(0);
                setRequestSilver(0);
                setOfferItems([]);
                setRequestItems([]);
                setTargetPlayer('');
            } else {
                setActionMessage({ type: 'error', text: data.error || 'Gagal membuat tawaran barter.' });
            }
        } catch (err) {
            setActionMessage({ type: 'error', text: 'Terjadi kesalahan jaringan.' });
        }
    };

    const handleAction = async (offerId, action) => {
        setActionMessage(null);
        try {
            const res = await fetch(`/api/barter/offers/${offerId}/${action}`, { method: 'POST' });
            const data = await res.json();
            if (res.ok && data.success) {
                setActionMessage({ type: 'success', text: data.message });
                fetchData();
            } else {
                setActionMessage({ type: 'error', text: data.error || `Gagal ${action} barter.` });
            }
        } catch (err) {
            setActionMessage({ type: 'error', text: 'Terjadi kesalahan jaringan.' });
        }
    };

    if (loading) return <div className="p-4">Memuat data barter...</div>;

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Barter Antar Pemain</h1>
            {error && <div className="bg-red-500/20 text-red-400 p-2 rounded mb-4">{error}</div>}
            {actionMessage && (
                <div className={`p-2 rounded mb-4 ${actionMessage.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                    {actionMessage.text}
                </div>
            )}

            <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-3">Buat Tawaran Baru</h2>
                <form onSubmit={handleCreateOffer}>
                    <div className="mb-3">
                        <label className="block text-sm text-gray-300 mb-1">Target Pemain (Di Lokasi yang Sama)</label>
                        <select
                            className="w-full bg-gray-700 text-white p-2 rounded"
                            value={targetPlayer}
                            onChange={(e) => setTargetPlayer(e.target.value)}
                        >
                            <option value="">-- Pilih Pemain --</option>
                            {players.map(p => (
                                <option key={p.discordId} value={p.discordId}>{p.characterName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-700 p-3 rounded">
                            <h3 className="font-semibold mb-2">Kamu Menawarkan:</h3>
                            <div className="flex space-x-2">
                                <div>
                                    <label className="block text-xs">Silver</label>
                                    <input type="number" min="0" className="w-full bg-gray-600 text-white p-1 rounded" value={offerSilver} onChange={e => setOfferSilver(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs">Copper</label>
                                    <input type="number" min="0" className="w-full bg-gray-600 text-white p-1 rounded" value={offerCopper} onChange={e => setOfferCopper(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-700 p-3 rounded">
                            <h3 className="font-semibold mb-2">Kamu Meminta:</h3>
                            <div className="flex space-x-2">
                                <div>
                                    <label className="block text-xs">Silver</label>
                                    <input type="number" min="0" className="w-full bg-gray-600 text-white p-1 rounded" value={requestSilver} onChange={e => setRequestSilver(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs">Copper</label>
                                    <input type="number" min="0" className="w-full bg-gray-600 text-white p-1 rounded" value={requestCopper} onChange={e => setRequestCopper(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                        Kirim Tawaran
                    </button>
                </form>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-3">Daftar Tawaran</h2>
                {offers.length === 0 ? (
                    <p className="text-gray-400">Tidak ada tawaran barter.</p>
                ) : (
                    <div className="space-y-4">
                        {offers.map(offer => {
                            const isIncoming = myUserId ? offer.toUserId === myUserId : false;
                            const isOutgoing = myUserId ? offer.fromUserId === myUserId : false;

                            const formatItems = (items) => {
                                if (!items || items.length === 0) return null;
                                return items.map(i => `${i.quantity}x ${i.itemName}`).join(', ');
                            };

                            return (
                                <div key={offer._id} className="bg-gray-700 p-3 rounded flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-gray-300">
                                            Status: <span className="font-bold">{offer.status}</span>
                                            {isIncoming ? ' (Masuk)' : ' (Keluar)'}
                                        </p>
                                        <div className="text-sm">
                                            <span className="text-green-400">Menawarkan: </span>
                                            {offer.offer?.silver || 0} Silver, {offer.offer?.copper || 0} Copper
                                            {formatItems(offer.offer?.items) && <span>, {formatItems(offer.offer?.items)}</span>}
                                            <br />
                                            <span className="text-red-400">Meminta: </span>
                                            {offer.request?.silver || 0} Silver, {offer.request?.copper || 0} Copper
                                            {formatItems(offer.request?.items) && <span>, {formatItems(offer.request?.items)}</span>}
                                        </div>
                                    </div>
                                    {offer.status === 'pending' && (
                                        <div className="space-x-2">
                                            {isIncoming && <button onClick={() => handleAction(offer._id, 'accept')} className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm">Terima</button>}
                                            {isIncoming && <button onClick={() => handleAction(offer._id, 'reject')} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm">Tolak</button>}
                                            {isOutgoing && <button onClick={() => handleAction(offer._id, 'cancel')} className="bg-gray-500 hover:bg-gray-600 px-3 py-1 rounded text-sm">Batal</button>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
