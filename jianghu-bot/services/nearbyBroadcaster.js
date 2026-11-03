/**
 * JIANGHU BOT & IMMORTAL-X — NEARBY BROADCASTER SERVICE (services/nearbyBroadcaster.js)
 * V21 F3: Batch broadcaster 500ms (2x/detik) per room aktif untuk Socket.io nearby_delta
 */

const { generateNearbyDelta } = require('../utils/nearbyEngine');

class NearbyBroadcaster {
  constructor() {
    // chunkKey ('cx:cy') -> Set of socket IDs
    this.roomSubscribers = new Map();
    // chunkKey -> Map of entityId -> entityData
    this.chunkEntities = new Map();
    // chunkKey -> Map of entityId -> entityData (keadaan saat broadcast terakhir)
    this.previousState = new Map();
    // Set chunkKey yang mengalami mutasi dalam interval saat ini
    this.dirtyChunks = new Set();
    this.batchTimer = null;
  }

  start(io, intervalMs = 500) {
    if (this.batchTimer) return;
    this.batchTimer = setInterval(() => {
      this.flushBatch(io);
    }, intervalMs);
  }

  stop() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  addSubscriber(socketId, cx, cy) {
    const key = `${cx}:${cy}`;
    if (!this.roomSubscribers.has(key)) {
      this.roomSubscribers.set(key, new Set());
    }
    this.roomSubscribers.get(key).add(socketId);
  }

  removeSubscriber(socketId, cx, cy) {
    const key = `${cx}:${cy}`;
    const set = this.roomSubscribers.get(key);
    if (set) {
      set.delete(socketId);
      if (set.size === 0) {
        this.roomSubscribers.delete(key);
        this.previousState.delete(key);
      }
    }
  }

  removeSocketAll(socketId) {
    for (const [key, set] of this.roomSubscribers.entries()) {
      set.delete(socketId);
      if (set.size === 0) {
        this.roomSubscribers.delete(key);
        this.previousState.delete(key);
      }
    }
  }

  updateEntity(entity, cx, cy, oldCx, oldCy) {
    const id = String(entity.id || entity._id);
    const newKey = `${cx}:${cy}`;

    if (oldCx !== undefined && oldCy !== undefined) {
      const oldKey = `${oldCx}:${oldCy}`;
      if (oldKey !== newKey) {
        const oldMap = this.chunkEntities.get(oldKey);
        if (oldMap) {
          oldMap.delete(id);
          this.dirtyChunks.add(oldKey);
        }
      }
    }

    if (!this.chunkEntities.has(newKey)) {
      this.chunkEntities.set(newKey, new Map());
    }
    this.chunkEntities.get(newKey).set(id, {
      id,
      name: entity.name,
      type: entity.type || 'player',
      x: entity.x,
      y: entity.y,
      status: entity.status || 'aktif'
    });
    this.dirtyChunks.add(newKey);
  }

  removeEntity(id, cx, cy) {
    const key = `${cx}:${cy}`;
    const map = this.chunkEntities.get(key);
    if (map) {
      map.delete(String(id));
      this.dirtyChunks.add(key);
    }
  }

  flushBatch(io) {
    if (!io || this.dirtyChunks.size === 0) return;

    const chunksToProcess = Array.from(this.dirtyChunks);
    this.dirtyChunks.clear();

    const timestamp = Date.now();

    for (const chunkKey of chunksToProcess) {
      // Hanya broadcast jika ada subscriber di room ini
      const subscribers = this.roomSubscribers.get(chunkKey);
      if (!subscribers || subscribers.size === 0) {
        continue;
      }

      const currentEntitiesMap = this.chunkEntities.get(chunkKey) || new Map();
      const previousMap = this.previousState.get(chunkKey) || new Map();
      const currentList = Array.from(currentEntitiesMap.values());

      const { delta, nextMap } = generateNearbyDelta({
        previousMap,
        currentEntities: currentList,
        chunkKey,
        timestamp
      });

      // Simpan state terkini
      this.previousState.set(chunkKey, nextMap);

      // Hanya kirim jika ada perubahan mutasi
      if (delta.entered.length > 0 || delta.moved.length > 0 || delta.left.length > 0) {
        io.to(`chunk:${chunkKey}`).emit('nearby_delta', delta);
      }
    }
  }
}

const nearbyBroadcaster = new NearbyBroadcaster();

module.exports = {
  NearbyBroadcaster,
  nearbyBroadcaster
};
