const Player = require('../../models/Player');
const Barter = require('../../models/Barter');
const { logTransaction } = require('../../utils/logger');

async function acceptBarter(client, guildId, barterId, actorUserId) {
    const barter = await Barter.findById(barterId);
    if (!barter || barter.status !== 'pending') {
        return { success: false, reason: 'Barter sudah tidak berlaku.' };
    }
    if (barter.toUserId !== actorUserId) {
        return { success: false, reason: 'Hanya penerima barter yang bisa merespon.' };
    }

    const freshSender = await Player.findOne({ discordId: barter.fromUserId, guildId });
    const freshReceiver = await Player.findOne({ discordId: actorUserId, guildId });

    if (!freshSender || freshSender.status !== 'active' || !freshReceiver || freshReceiver.status !== 'active') {
        return { success: false, reason: 'Status salah satu karakter berubah.' };
    }

    // Validasi ulang
    for (const [cur, amt] of Object.entries(barter.offerCurrency.toObject ? barter.offerCurrency.toObject() : barter.offerCurrency)) {
        if (amt > 0 && freshSender.currency[cur] < amt) {
            return { success: false, reason: `Sender tidak lagi punya cukup ${cur}.` };
        }
    }
    for (const [cur, amt] of Object.entries(barter.requestCurrency.toObject ? barter.requestCurrency.toObject() : barter.requestCurrency)) {
        if (amt > 0 && freshReceiver.currency[cur] < amt) {
            return { success: false, reason: `Receiver tidak punya cukup ${cur} yang diminta.` };
        }
    }
    for (const oi of barter.offerItems) {
        const owned = freshSender.inventory.find((i) => i.itemId.equals(oi.itemId));
        if (!owned || owned.quantity < oi.quantity) {
            return { success: false, reason: `Item yang ditawarkan sender sudah tidak cukup.` };
        }
    }
    for (const ri of barter.requestItems) {
        const owned = freshReceiver.inventory.find((i) => i.itemId.equals(ri.itemId));
        if (!owned || owned.quantity < ri.quantity) {
            return { success: false, reason: `Item yang diminta tidak dimiliki receiver.` };
        }
    }

    // Eksekusi: pindahkan currency
    const addCurrency = (offerObj) => Object.entries(offerObj.toObject ? offerObj.toObject() : offerObj);
    for (const [cur, amt] of addCurrency(barter.offerCurrency)) {
        if (amt > 0) { freshSender.currency[cur] -= amt; freshReceiver.currency[cur] += amt; }
    }
    for (const [cur, amt] of addCurrency(barter.requestCurrency)) {
        if (amt > 0) { freshReceiver.currency[cur] -= amt; freshSender.currency[cur] += amt; }
    }
    // Eksekusi: pindahkan item offer
    for (const oi of barter.offerItems) {
        const senderOwned = freshSender.inventory.find((i) => i.itemId.equals(oi.itemId));
        senderOwned.quantity -= oi.quantity;
        if (senderOwned.quantity <= 0) freshSender.inventory = freshSender.inventory.filter((i) => !i.itemId.equals(oi.itemId));
        const recvOwned = freshReceiver.inventory.find((i) => i.itemId.equals(oi.itemId));
        if (recvOwned) recvOwned.quantity += oi.quantity;
        else freshReceiver.inventory.push({ itemId: oi.itemId, quantity: oi.quantity });
    }
    // Eksekusi: pindahkan item request
    for (const ri of barter.requestItems) {
        const recvOwned = freshReceiver.inventory.find((i) => i.itemId.equals(ri.itemId));
        recvOwned.quantity -= ri.quantity;
        if (recvOwned.quantity <= 0) freshReceiver.inventory = freshReceiver.inventory.filter((i) => !i.itemId.equals(ri.itemId));
        const senderOwned = freshSender.inventory.find((i) => i.itemId.equals(ri.itemId));
        if (senderOwned) senderOwned.quantity += ri.quantity;
        else freshSender.inventory.push({ itemId: ri.itemId, quantity: ri.quantity });
    }

    await freshSender.save();
    await freshReceiver.save();
    barter.status = 'accepted';
    await barter.save();

    await logTransaction(client, {
        guildId,
        type: 'barter',
        fromUserId: barter.fromUserId,
        toUserId: barter.toUserId,
        note: `Barter selesai antara ${freshSender.discordId} dan ${freshReceiver.discordId}`,
    });

    return { success: true };
}

async function cancelBarter(client, guildId, barterId, newStatus, actorUserId) {
    const barter = await Barter.findById(barterId);
    if (!barter || barter.status !== 'pending') {
        return { success: false, reason: 'Barter sudah tidak berlaku.' };
    }

    // Status bisa 'cancelled' (oleh sender) atau 'declined' (oleh receiver)
    if (newStatus === 'cancelled' && barter.fromUserId !== actorUserId) {
         return { success: false, reason: 'Hanya pembuat barter yang dapat membatalkannya.' };
    }
    if (newStatus === 'declined' && barter.toUserId !== actorUserId) {
         return { success: false, reason: 'Hanya penerima barter yang dapat menolaknya.' };
    }

    barter.status = newStatus;
    await barter.save();

    return { success: true };
}

module.exports = { acceptBarter, cancelBarter };