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

describe('V25 K7 — Multi-Client Realtime Socket & Privacy Quantization', () => {
  let server;
  let io;
  let port;
  let broadcaster;

  let clientB;
  let clientC;

  beforeAll(async () => {
    server = http.createServer();
    io = new Server(server, { cors: { origin: '*' } });
    broadcaster = new NearbyBroadcaster();

    io.on('connection', (socket) => {
      socket.on('subscribe_chunks', (data) => {
        const chunks = Array.isArray(data?.chunks) ? data.chunks : [];
        for (const c of chunks) {
          // Simulasi validasi server posisi pemain (mock: player berada di chunk 76:82)
          const playerCx = 76;
          const playerCy = 82;
          const dChunk = Math.max(Math.abs(c.cx - playerCx), Math.abs(c.cy - playerCy));

          if (dChunk <= 2) {
            socket.join(`chunk:${c.cx}:${c.cy}`);
            broadcaster.addSubscriber(socket.id, c.cx, c.cy);
          }
        }
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

  it('1. Connects two live clients and subscribes to rooms', async () => {
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

    // Client B subscribes to its local chunk 76:82
    clientB.emit('subscribe_chunks', { chunks: [{ cx: 76, cy: 82 }] });
    // Client C attempts to subscribe to distant chunk 10:10 (out-of-bounds)
    clientC.emit('subscribe_chunks', { chunks: [{ cx: 10, cy: 10 }] });

    // Wait for subscription processing
    await new Promise((r) => setTimeout(r, 100));

    expect(broadcaster.roomSubscribers.has('76:82')).toBe(true);
    // 10:10 should be rejected by server validation (distance 66 > 2)
    expect(broadcaster.roomSubscribers.has('10:10')).toBe(false);
  });

  it('2. Player A enters chunk: Socket B receives delta, Socket C does NOT receive delta', async () => {
    let clientBReceived = null;
    let clientCReceived = null;

    clientB.on('nearby_delta', (data) => {
      clientBReceived = data;
    });

    clientC.on('nearby_delta', (data) => {
      clientCReceived = data;
    });

    // Player A (tileX: 2451, tileY: 2653 -> chunk 76, 82)
    broadcaster.updateEntity(
      {
        id: 'player_A',
        name: 'Pendekar Azure',
        type: 'player',
        x: 2451,
        y: 2653,
        status: 'aktif'
      },
      76,
      82
    );

    // Flush batch to socket room
    broadcaster.flushBatch(io);

    await new Promise((r) => setTimeout(r, 150));

    expect(clientBReceived).not.toBeNull();
    expect(clientBReceived.chunk).toBe('76:82');
    expect(clientBReceived.entered.length).toBe(1);
    expect(clientBReceived.entered[0].id).toBe('player_A');

    // Socket C in distant room must NOT have received Player A's delta
    expect(clientCReceived).toBeNull();
  });

  it('3. Coordinates in nearby_delta are quantized to multiples of 8 (Privacy Protection)', async () => {
    // Player A was at (2451, 2653).
    // Math.floor(2451 / 8) * 8 = 306 * 8 = 2448
    // Math.floor(2653 / 8) * 8 = 331 * 8 = 2648
    const storedEntity = broadcaster.chunkEntities.get('76:82').get('player_A');
    expect(storedEntity.x).toBe(2448);
    expect(storedEntity.y).toBe(2648);
    expect(storedEntity.x % 8).toBe(0);
    expect(storedEntity.y % 8).toBe(0);
  });

  it('4. Player A moves within chunk: Socket B receives moved event', async () => {
    let movedDelta = null;
    clientB.on('nearby_delta', (data) => {
      if (data.moved && data.moved.length > 0) {
        movedDelta = data;
      }
    });

    // Player A moves to (2465, 2653) -> quantized to (2464, 2648)
    broadcaster.updateEntity(
      {
        id: 'player_A',
        name: 'Pendekar Azure',
        type: 'player',
        x: 2465,
        y: 2653,
        status: 'aktif'
      },
      76,
      82
    );

    broadcaster.flushBatch(io);

    await new Promise((r) => setTimeout(r, 150));

    expect(movedDelta).not.toBeNull();
    expect(movedDelta.moved.length).toBe(1);
    expect(movedDelta.moved[0].id).toBe('player_A');
    expect(movedDelta.moved[0].x).toBe(2464);
  });

  it('5. Disconnecting client removes socket from broadcaster subscribers', async () => {
    const socketId = clientB.id;
    clientB.disconnect();

    await new Promise((r) => setTimeout(r, 100));

    // Room 76:82 should be cleaned up as subscribers empty out
    expect(broadcaster.roomSubscribers.has('76:82')).toBe(false);
  });

  it('6. Verification: No player_position_update exists in web-api or web-dashboard', () => {
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
