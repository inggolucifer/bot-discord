/**
 * web-api/socket/chunkSubscriptions.js
 * Handler soket produksi untuk langganan stream chunk & pembaruan entitas sekitar (V21, V25 K7, V26 P5)
 */

/**
 * Mendaftarkan handler subscribe_chunks dan unsubscribe_chunks pada soket klien
 * @param {Object} io Instans Server Socket.io
 * @param {Object} socket Instans Socket klien yang terhubung
 * @param {Object} deps Dependensi { getPlayerChunk, nearbyBroadcaster }
 */
function registerChunkSubscriptionHandlers(io, socket, deps = {}) {
  const { getPlayerChunk, nearbyBroadcaster } = deps;

  socket.on('subscribe_chunks', async (data) => {
    try {
      const chunks = Array.isArray(data?.chunks) ? data.chunks.slice(0, 25) : [];
      if (chunks.length === 0) return;

      let playerChunk = null;
      if (typeof getPlayerChunk === 'function') {
        playerChunk = await getPlayerChunk(socket);
      }

      for (const c of chunks) {
        if (Number.isInteger(c.cx) && Number.isInteger(c.cy)) {
          // Tolak chunk yang jarak Chebyshev-nya > 2 chunk (anti-radar & privacy)
          if (playerChunk && Number.isInteger(playerChunk.cx) && Number.isInteger(playerChunk.cy)) {
            const dChunk = Math.max(Math.abs(c.cx - playerChunk.cx), Math.abs(c.cy - playerChunk.cy));
            if (dChunk > 2) {
              continue;
            }
          }

          socket.join(`chunk:${c.cx}:${c.cy}`);
          if (nearbyBroadcaster && typeof nearbyBroadcaster.addSubscriber === 'function') {
            nearbyBroadcaster.addSubscriber(socket.id, c.cx, c.cy);
          }
        }
      }
    } catch (err) {
      console.warn('[SOCKET] subscribe_chunks error:', err.message);
    }
  });

  socket.on('unsubscribe_chunks', (data) => {
    try {
      const chunks = Array.isArray(data?.chunks) ? data.chunks.slice(0, 25) : [];
      for (const c of chunks) {
        if (Number.isInteger(c.cx) && Number.isInteger(c.cy)) {
          socket.leave(`chunk:${c.cx}:${c.cy}`);
          if (nearbyBroadcaster && typeof nearbyBroadcaster.removeSubscriber === 'function') {
            nearbyBroadcaster.removeSubscriber(socket.id, c.cx, c.cy);
          }
        }
      }
    } catch (err) {
      console.warn('[SOCKET] unsubscribe_chunks error:', err.message);
    }
  });
}

module.exports = {
  registerChunkSubscriptionHandlers
};
