#!/usr/bin/env node
/**
 * JIANGHU BOT & IMMORTAL-X — 500 CLIENT SOCKET LOAD SIMULATION (scripts/v21/loadSim.js)
 * V21 F3 Gate: Simulasi 500 klien bergerak acak di 25 chunk
 * Tolok Ukur:
 * - Utilisasi CPU / durasi tick p95 < 500 ms
 * - Ukuran payload biner delta < 8 KB (8192 bytes)
 * - Stabilitas memori heap (tidak ada memory leak)
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { NearbyBroadcaster } = require('../../services/nearbyBroadcaster');

async function runLoadSimulation() {
  console.log('=== [LOADSIM] MEMULAI SIMULASI 500 KLIEN BERGERAK DI 25 CHUNK ===');

  const CLIENT_COUNT = 500;
  const CHUNK_GRID_SIZE = 5; // 5x5 = 25 chunks
  const START_CX = 75;
  const START_CY = 75;
  const TOTAL_TICKS = 60; // 60 batch ticks (setara 30 detik real-time pada 500ms)

  // Inisialisasi Mock Socket.io Server
  const deliveredDeltas = [];
  const mockIo = {
    to: (roomName) => ({
      emit: (eventName, payload) => {
        if (eventName === 'nearby_delta') {
          const serialized = JSON.stringify(payload);
          const bytes = Buffer.byteLength(serialized, 'utf8');
          deliveredDeltas.push({
            room: roomName,
            bytes,
            totalActive: payload.totalActive,
            enteredCount: payload.entered?.length || 0,
            movedCount: payload.moved?.length || 0,
            leftCount: payload.left?.length || 0
          });
        }
      }
    })
  };

  const broadcaster = new NearbyBroadcaster();

  // Inisialisasi 500 Client
  const clients = [];
  for (let i = 0; i < CLIENT_COUNT; i++) {
    const cx = START_CX + (i % CHUNK_GRID_SIZE);
    const cy = START_CY + (Math.floor(i / CHUNK_GRID_SIZE) % CHUNK_GRID_SIZE);
    const tileX = cx * 32 + (i % 32);
    const tileY = cy * 32 + ((i * 7) % 32);

    const client = {
      id: `client_${i + 1}`,
      name: `Kultivator Sim #${i + 1}`,
      cx,
      cy,
      tileX,
      tileY,
      socketId: `socket_${i + 1}`
    };

    clients.push(client);

    // Klien subscribe ke chunk saat ini
    broadcaster.addSubscriber(client.socketId, client.cx, client.cy);

    // Register posisi awal
    broadcaster.updateEntity(
      {
        id: client.id,
        name: client.name,
        type: 'player',
        x: client.tileX,
        y: client.tileY,
        status: 'mengembara'
      },
      client.cx,
      client.cy
    );
  }

  console.log(`[LOADSIM] ${clients.length} klien terdaftar di ${CHUNK_GRID_SIZE * CHUNK_GRID_SIZE} chunk.`);

  // Rekam Heap Awal
  if (global.gc) global.gc();
  const heapStartMb = process.memoryUsage().heapUsed / 1024 / 1024;
  const tickDurationsMs = [];

  const simStartTime = performance.now();

  // Jalankan Loop Simulasi
  for (let tick = 1; tick <= TOTAL_TICKS; tick++) {
    // 1. Simulasikan 30-40% pemain berpindah koordinat setiap tick
    const moversCount = Math.floor(CLIENT_COUNT * 0.35);
    for (let m = 0; m < moversCount; m++) {
      const idx = (tick * 17 + m * 31) % CLIENT_COUNT;
      const client = clients[idx];

      const oldCx = client.cx;
      const oldCy = client.cy;

      // Geser 1 petak acak (-1, 0, 1)
      const dx = ((m + tick) % 3) - 1;
      const dy = (((m * 2) + tick) % 3) - 1;

      client.tileX = Math.max(START_CX * 32, Math.min((START_CX + CHUNK_GRID_SIZE) * 32 - 1, client.tileX + dx));
      client.tileY = Math.max(START_CY * 32, Math.min((START_CY + CHUNK_GRID_SIZE) * 32 - 1, client.tileY + dy));

      const newCx = Math.floor(client.tileX / 32);
      const newCy = Math.floor(client.tileY / 32);

      if (newCx !== oldCx || newCy !== oldCy) {
        broadcaster.removeSubscriber(client.socketId, oldCx, oldCy);
        broadcaster.addSubscriber(client.socketId, newCx, newCy);
        client.cx = newCx;
        client.cy = newCy;
      }

      broadcaster.updateEntity(
        {
          id: client.id,
          name: client.name,
          type: 'player',
          x: client.tileX,
          y: client.tileY,
          status: 'melangkah'
        },
        client.cx,
        client.cy,
        oldCx,
        oldCy
      );
    }

    // 2. Eksekusi Batch Broadcaster & Ukur Durasi
    const tickStart = performance.now();
    broadcaster.flushBatch(mockIo);
    const tickDuration = performance.now() - tickStart;
    tickDurationsMs.push(tickDuration);
  }

  const totalSimDurationMs = performance.now() - simStartTime;
  const heapEndMb = process.memoryUsage().heapUsed / 1024 / 1024;

  // Analisis Statistik
  const sortedDurations = [...tickDurationsMs].sort((a, b) => a - b);
  const p50Ms = sortedDurations[Math.floor(sortedDurations.length * 0.50)];
  const p95Ms = sortedDurations[Math.floor(sortedDurations.length * 0.95)];
  const maxMs = sortedDurations[sortedDurations.length - 1];
  const avgMs = tickDurationsMs.reduce((a, b) => a + b, 0) / tickDurationsMs.length;

  const payloadSizes = deliveredDeltas.map(d => d.bytes);
  const maxPayloadBytes = payloadSizes.length > 0 ? Math.max(...payloadSizes) : 0;
  const avgPayloadBytes = payloadSizes.length > 0 ? (payloadSizes.reduce((a, b) => a + b, 0) / payloadSizes.length) : 0;

  console.log('\n=== HASIL BENCHMARK LOADSIM ===');
  console.log(`Total Paket Delta Terkirim : ${deliveredDeltas.length}`);
  console.log(`Durasi Rata-rata per Batch : ${avgMs.toFixed(3)} ms`);
  console.log(`Durasi Batch p50           : ${p50Ms.toFixed(3)} ms`);
  console.log(`Durasi Batch p95           : ${p95Ms.toFixed(3)} ms (Ambang < 500 ms)`);
  console.log(`Durasi Batch Maksimal      : ${maxMs.toFixed(3)} ms`);
  console.log(`Ukuran Payload Maksimal    : ${maxPayloadBytes} bytes (${(maxPayloadBytes / 1024).toFixed(2)} KB) (Ambang < 8192 bytes)`);
  console.log(`Ukuran Payload Rata-rata   : ${avgPayloadBytes.toFixed(1)} bytes`);
  console.log(`Heap Awal                  : ${heapStartMb.toFixed(2)} MB`);
  console.log(`Heap Akhir                 : ${heapEndMb.toFixed(2)} MB (Delta: ${(heapEndMb - heapStartMb).toFixed(2)} MB)`);

  const p95Pass = p95Ms < 500;
  const payloadPass = maxPayloadBytes < 8192;
  const heapPass = (heapEndMb - heapStartMb) < 50; // delta heap < 50 MB
  const isPass = p95Pass && payloadPass && heapPass;

  console.log(`\nStatus Gate F3: ${isPass ? '✅ LULUS (PASS)' : '❌ GAGAL'}`);

  const reportData = {
    timestamp: new Date().toISOString(),
    clientCount: CLIENT_COUNT,
    activeChunks: CHUNK_GRID_SIZE * CHUNK_GRID_SIZE,
    totalTicks: TOTAL_TICKS,
    totalSimDurationMs: Number(totalSimDurationMs.toFixed(2)),
    metrics: {
      deltasDelivered: deliveredDeltas.length,
      tickLatencyAvgMs: Number(avgMs.toFixed(3)),
      tickLatencyP50Ms: Number(p50Ms.toFixed(3)),
      tickLatencyP95Ms: Number(p95Ms.toFixed(3)),
      tickLatencyMaxMs: Number(maxMs.toFixed(3)),
      maxPayloadBytes,
      avgPayloadBytes: Number(avgPayloadBytes.toFixed(1)),
      heapStartMb: Number(heapStartMb.toFixed(2)),
      heapEndMb: Number(heapEndMb.toFixed(2)),
      heapDeltaMb: Number((heapEndMb - heapStartMb).toFixed(2))
    },
    thresholds: {
      maxLatencyP95Ms: 500,
      maxPayloadBytes: 8192,
      maxHeapGrowthMb: 50
    },
    status: isPass ? 'PASS' : 'FAIL'
  };

  const reviewDir = path.resolve(__dirname, '../../review');
  if (!fs.existsSync(reviewDir)) fs.mkdirSync(reviewDir, { recursive: true });

  const outputPath = path.join(reviewDir, 'v21_loadsim.json');
  fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2), 'utf8');
  console.log(`[LOADSIM] Laporan disimpan ke: ${outputPath}`);

  if (!isPass) {
    process.exit(1);
  }
}

runLoadSimulation().catch(err => {
  console.error('[LOADSIM-ERROR]', err);
  process.exit(1);
});
