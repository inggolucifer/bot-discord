/**
 * binaryProtocol.js
 * Protokol Paket Biner 12-Byte untuk Sinkronisasi State Spasial Berkinerja Tinggi
 * Mengeliminasi JSON string allocation & GC thrashing pada server VPS 6 GB RAM
 *
 * Struktur Paket 12-Byte:
 * Offset 0..3 (4B): Entity_ID (UInt32)
 * Offset 4..5 (2B): Coord_X (Int16)
 * Offset 6..7 (2B): Coord_Y (Int16)
 * Offset 8..9 (2B): Current_HP_Percent (UInt16: 0 - 10000 -> 0.00% - 100.00%)
 * Offset 10..11 (2B): Motion_Vector_Flags (Bitmask UInt16: arah hadap, lari, efek suhu, status interior)
 */

const FLAG_MASKS = {
    FACING_DIR: 0x0007,        // Bit 0..2: 0=North, 1=NorthEast, 2=East, 3=SouthEast, 4=South, 5=SouthWest, 6=West, 7=NorthWest
    IS_RUNNING: 0x0008,        // Bit 3: 1 jika sedang bergerak cepat / tunggangan
    IN_INTERIOR: 0x0010,       // Bit 4: 1 jika berada di dalam interior sub-grid
    THERMAL_BREACH: 0x0020,    // Bit 5: 1 jika sedang mengalami anomali suhu (dingin/panas)
    MERIDIAN_DAMAGED: 0x0040,  // Bit 6: 1 jika meridian rusak
    IS_IN_COMBAT: 0x0080       // Bit 7: 1 jika dalam pertempuran
};

/**
 * Mengemas data state entitas ke dalam Buffer biner 12-byte (Node.js & Browser compatible)
 */
function packMovementPacket({
    entityId = 1,
    coordX = 0,
    coordY = 0,
    hpPercent = 100.0, // 0.0 s/d 100.0
    facing = 0,
    isRunning = false,
    inInterior = false,
    thermalBreach = false,
    meridianDamaged = false,
    isInCombat = false
}) {
    const buffer = Buffer.alloc ? Buffer.alloc(12) : new Uint8Array(12);
    const view = buffer.buffer ? new DataView(buffer.buffer, buffer.byteOffset, 12) : new DataView(buffer);

    // Entity ID (UInt32, 4 bytes)
    view.setUint32(0, entityId >>> 0, true);

    // Coordinates (Int16, 2 bytes each)
    view.setInt16(4, Math.trunc(coordX), true);
    view.setInt16(6, Math.trunc(coordY), true);

    // HP Percentage (UInt16, scale by 100 -> 0 to 10000)
    const scaledHp = Math.min(10000, Math.max(0, Math.round(hpPercent * 100)));
    view.setUint16(8, scaledHp, true);

    // Flags (UInt16, bitmask)
    let flags = (facing & 0x07);
    if (isRunning) flags |= FLAG_MASKS.IS_RUNNING;
    if (inInterior) flags |= FLAG_MASKS.IN_INTERIOR;
    if (thermalBreach) flags |= FLAG_MASKS.THERMAL_BREACH;
    if (meridianDamaged) flags |= FLAG_MASKS.MERIDIAN_DAMAGED;
    if (isInCombat) flags |= FLAG_MASKS.IS_IN_COMBAT;

    view.setUint16(10, flags, true);

    return buffer;
}

/**
 * Membuka paket biner 12-byte menjadi objek JavaScript
 */
function unpackMovementPacket(binaryBuffer) {
    if (!binaryBuffer || binaryBuffer.byteLength < 12) {
        throw new Error('Invalid packet length: expected 12 bytes');
    }

    const view = binaryBuffer.buffer
        ? new DataView(binaryBuffer.buffer, binaryBuffer.byteOffset, 12)
        : new DataView(binaryBuffer);

    const entityId = view.getUint32(0, true);
    const coordX = view.getInt16(4, true);
    const coordY = view.getInt16(6, true);
    const hpPercent = (view.getUint16(8, true) / 100);
    const flags = view.getUint16(10, true);

    return {
        entityId,
        coordX,
        coordY,
        hpPercent,
        facing: flags & FLAG_MASKS.FACING_DIR,
        isRunning: Boolean(flags & FLAG_MASKS.IS_RUNNING),
        inInterior: Boolean(flags & FLAG_MASKS.IN_INTERIOR),
        thermalBreach: Boolean(flags & FLAG_MASKS.THERMAL_BREACH),
        meridianDamaged: Boolean(flags & FLAG_MASKS.MERIDIAN_DAMAGED),
        isInCombat: Boolean(flags & FLAG_MASKS.IS_IN_COMBAT)
    };
}

module.exports = {
    FLAG_MASKS,
    packMovementPacket,
    unpackMovementPacket
};
