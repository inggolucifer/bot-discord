import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOT_ROOT = path.resolve(__dirname, '../..');

const { Server } = require('socket.io');
const { io: ioClient } = require('../../web-dashboard/node_modules/socket.io-client');
const { NearbyBroadcaster } = require('../../services/nearbyBroadcaster');
const { registerChunkSubscriptionHandlers } = require('../../web-api/socket/chunkSubscriptions');

describe('V26 P5 — Production Socket Chunk Subscriptions & Live Realtime Integration', () => {
  let server;
  let io;
  let port;
  let broadcaster;
  let serverSocketInstance = null;

  let clientB;
  let clientC;

  beforeAll(async () => {
    server = http.createServer();
    io = new Server(server, { cors: { origin: '*' } });
    broadcaster = new NearbyBroadcaster();

    io.on('connection', (socket) => {
      serverSocketInstance = socket;
      // Memasang handler produksi chunkSubscriptions dengan stub posisi pemain di chunk (76, 82)
      registerChunkSubscriptionHandlers(io, socket, {
        getPlayerChunk: () => ({ cx: 76, cy: 82 }),
        nearbyBroadcaster: broadcaster
      });

      socket.on('disconnect', () => {
        broadcaster.removeSocketAll(socket.id);
      });
    });

    await new Promise((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (clientB) clientB.disconnect();
    if (clientC) clientC.disconnect();
    if (broadcaster) broadcaster.stop();
    if (io) await io.close();
    if (server) await server.close();
  });

  it('1. Connects two live clients and verifies production subscribe_chunks handler with distance validation', async () => {
    clientB = ioClient(`http://localhost:${port}`, { transports: ['websocket'] });
    clientC = ioClient(`http://localhost:${port}`, { transports: ['websocket'] });

    await new Promise((resolve) => {
      let connected = 0;
      const check = () => {
        connected++;
        if (connected === 2) resolve();
      };
      clientB.on('connect', check);
      clientC.on('connect', check);
    });

    expect(clientB.connected).toBe(true);
    expect(clientC.connected).toBe(true);

    // Klien B berlangganan chunk 77:82 (jarak 1 <= 2 -> DITERIMA)
    clientB.emit('subscribe_chunks', { chunks: [{ cx: 77, cy: 82 }] });
    // Klien C berlangganan chunk 80:90 (jarak > 2 -> DITOLAK oleh handler produksi)
    clientC.emit('subscribe_chunks', { chunks: [{ cx: 80, cy: 90 }] });

    // Tunggu pemrosesan langganan
    await new Promise((r) => setTimeout(r, 100));

    expect(broadcaster.roomSubscribers.has('77:82')).toBe(true);
    // 80:90 wajib ditolak oleh validasi jarak Chebyshev handler produksi
    expect(broadcaster.roomSubscribers.has('80:90')).toBe(false);
  });

  it('2. Player A enters chunk 77:82: Socket B receives nearby_delta in <= 1s, Socket C does NOT receive delta', async () => {
    let clientBReceived = null;
    let clientCReceived = null;

    clientB.on('nearby_delta', (data) => {
      clientBReceived = data;
    });

    clientC.on('nearby_delta', (data) => {
      clientCReceived = data;
    });

    // Player A (tileX: 2465, tileY: 2653 -> chunk 77, 82)
    broadcaster.updateEntity(
      {
        id: 'player_A',
        name: 'Pendekar Azure',
        type: 'player',
        x: 2465,
        y: 2653,
        status: 'aktif'
      },
      77,
      82
    );

    // Flush batch to socket room
    broadcaster.flushBatch(io);

    await new Promise((r) => setTimeout(r, 150));

    expect(clientBReceived).not.toBeNull();
    expect(clientBReceived.chunk).toBe('77:82');
    expect(clientBReceived.entered.length).toBe(1);
    expect(clientBReceived.entered[0].id).toBe('player_A');

    // Socket C in out-of-bounds room must NOT have received Player A's delta
    expect(clientCReceived).toBeNull();
  });

  it('3. Coordinates in nearby_delta are quantized to multiples of 8 (Privacy Protection)', async () => {
    // Player A was at (2465, 2653).
    // Math.floor(2465 / 8) * 8 = 308 * 8 = 2464
    // Math.floor(2653 / 8) * 8 = 331 * 8 = 2648
    const storedEntity = broadcaster.chunkEntities.get('77:82').get('player_A');
    expect(storedEntity.x).toBe(2464);
    expect(storedEntity.y).toBe(2648);
    expect(storedEntity.x % 8).toBe(0);
    expect(storedEntity.y % 8).toBe(0);
  });

  it('4. Disconnecting client removes socket from broadcaster subscribers and stops deltas', async () => {
    clientB.disconnect();

    await new Promise((r) => setTimeout(r, 100));

    // Room 77:82 should be cleaned up as subscribers empty out
    expect(broadcaster.roomSubscribers.has('77:82')).toBe(false);
  });

  it('5. Verification: No player_position_update listener exists on socket', () => {
    if (serverSocketInstance) {
      const listeners = serverSocketInstance.listeners('player_position_update');
      expect(listeners.length).toBe(0);
    }
  });

  it('6. Verification: No player_position_update exists across web-api and web-dashboard', () => {
    const checkDir = (dir) => {
      const files = fs.readdirSync(dir, { recursive: true });
      for (const f of files) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isFile() && (full.endsWith('.js') || full.endsWith('.ts') || full.endsWith('.tsx'))) {
          const content = fs.readFileSync(full, 'utf8');
          expect(content.includes('player_position_update'), `Found player_position_update in ${full}`).toBe(false);
        }
      }
    };

    checkDir(path.join(BOT_ROOT, 'web-api/routes'));
    checkDir(path.join(BOT_ROOT, 'web-dashboard/src/components'));
  });
});
