/**
 * JIANGHU BOT V21 — CLIENT PERFORMANCE TELEMETRY PROBE
 * File: web-dashboard/src/lib/perfProbe.ts
 * 
 * Probe telemetri ringan untuk mengukur latensi eksekusi kanvas, ground renderer,
 * dan resource usage. Aktif HANYA bila localStorage.perfProbe === '1' atau URL query ?perf=1.
 */

export interface MetricSummary {
  count: number;
  totalMs: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

interface MetricBucket {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
  samples: number[];
}

class PerfProbe {
  private enabled: boolean = false;
  private metrics: Map<string, MetricBucket> = new Map();
  private counters: Map<string, number> = new Map();
  private fpsSamples: number[] = [];
  private lastFrameTime: number = 0;
  private firstFrameTime: number | null = null;
  private startTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        this.enabled = window.localStorage.getItem('perfProbe') === '1' || urlParams.get('perf') === '1';
        if (this.enabled) {
          this.startTime = performance.now();
          (window as any).__perfProbe = this;
          console.log('%c[PERF-PROBE] Telemetry probe aktif (?perf=1 / localStorage.perfProbe=1)', 'color: #c5a880; font-weight: bold;');
        }
      } catch {
        this.enabled = false;
      }
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
    if (typeof window !== 'undefined') {
      try {
        if (val) window.localStorage.setItem('perfProbe', '1');
        else window.localStorage.removeItem('perfProbe');
      } catch {}
    }
  }

  /**
   * Catat durasi manual dengan nama label dan nilai ms
   */
  public mark(name: string, durationMs?: number): void {
    if (!this.enabled) return;
    const ms = typeof durationMs === 'number' ? durationMs : 0;
    this.recordSample(name, ms);
  }

  /**
   * Ukur eksekusi fungsi sinkron
   */
  public measure<T>(name: string, fn: () => T): T {
    if (!this.enabled) return fn();
    const t0 = performance.now();
    try {
      return fn();
    } finally {
      this.recordSample(name, performance.now() - t0);
    }
  }

  /**
   * Ukur eksekusi fungsi asinkron
   */
  public async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) return fn();
    const t0 = performance.now();
    try {
      return await fn();
    } finally {
      this.recordSample(name, performance.now() - t0);
    }
  }

  /**
   * Naikkan counter kuantitatif (misal objek digambar, chunk dimuat)
   */
  public count(name: string, amount: number = 1): void {
    if (!this.enabled) return;
    this.counters.set(name, (this.counters.get(name) || 0) + amount);
  }

  /**
   * Catat frame render untuk penghitungan FPS
   */
  public recordFrame(): void {
    if (!this.enabled) return;
    const now = performance.now();
    if (!this.firstFrameTime) {
      this.firstFrameTime = now;
      this.mark('time_to_first_frame', now - this.startTime);
    }
    if (this.lastFrameTime > 0) {
      const delta = now - this.lastFrameTime;
      if (delta > 0) {
        const fps = 1000 / delta;
        if (this.fpsSamples.length < 1000) {
          this.fpsSamples.push(fps);
        }
      }
    }
    this.lastFrameTime = now;
  }

  private recordSample(name: string, ms: number): void {
    let bucket = this.metrics.get(name);
    if (!bucket) {
      bucket = { count: 0, totalMs: 0, minMs: ms, maxMs: ms, samples: [] };
      this.metrics.set(name, bucket);
    }
    bucket.count++;
    bucket.totalMs += ms;
    if (ms < bucket.minMs) bucket.minMs = ms;
    if (ms > bucket.maxMs) bucket.maxMs = ms;
    if (bucket.samples.length < 1000) {
      bucket.samples.push(ms);
    }
  }

  /**
   * Dapatkan ringkasan statistik komprehensif
   */
  public getSummary(): {
    metrics: Record<string, MetricSummary>;
    counters: Record<string, number>;
    fps: { avg: number; min: number; max: number; p50: number; p95: number; samplesCount: number };
    memory?: { jsHeapSizeLimit: number; totalJSHeapSize: number; usedJSHeapSize: number };
  } {
    const metricsRes: Record<string, MetricSummary> = {};
    for (const [name, bucket] of this.metrics.entries()) {
      const sorted = [...bucket.samples].sort((a, b) => a - b);
      const len = sorted.length;
      const p50 = len > 0 ? sorted[Math.floor(len * 0.5)] : 0;
      const p95 = len > 0 ? sorted[Math.floor(len * 0.95)] : 0;
      const p99 = len > 0 ? sorted[Math.floor(len * 0.99)] : 0;

      metricsRes[name] = {
        count: bucket.count,
        totalMs: Number(bucket.totalMs.toFixed(2)),
        avgMs: Number((bucket.totalMs / (bucket.count || 1)).toFixed(2)),
        minMs: Number(bucket.minMs.toFixed(2)),
        maxMs: Number(bucket.maxMs.toFixed(2)),
        p50Ms: Number(p50.toFixed(2)),
        p95Ms: Number(p95.toFixed(2)),
        p99Ms: Number(p99.toFixed(2))
      };
    }

    const countersRes: Record<string, number> = {};
    for (const [k, v] of this.counters.entries()) {
      countersRes[k] = v;
    }

    const sortedFps = [...this.fpsSamples].sort((a, b) => a - b);
    const fpsLen = sortedFps.length;
    const avgFps = fpsLen > 0 ? sortedFps.reduce((a, b) => a + b, 0) / fpsLen : 0;
    const p50Fps = fpsLen > 0 ? sortedFps[Math.floor(fpsLen * 0.5)] : 0;
    const p95Fps = fpsLen > 0 ? sortedFps[Math.floor(fpsLen * 0.95)] : 0;

    let memory: any = undefined;
    if (typeof window !== 'undefined' && (performance as any).memory) {
      const mem = (performance as any).memory;
      memory = {
        jsHeapSizeLimit: Math.round(mem.jsHeapSizeLimit / 1024 / 1024),
        totalJSHeapSize: Math.round(mem.totalJSHeapSize / 1024 / 1024),
        usedJSHeapSize: Math.round(mem.usedJSHeapSize / 1024 / 1024)
      };
    }

    return {
      metrics: metricsRes,
      counters: countersRes,
      fps: {
        avg: Number(avgFps.toFixed(1)),
        min: Number((sortedFps[0] || 0).toFixed(1)),
        max: Number((sortedFps[fpsLen - 1] || 0).toFixed(1)),
        p50: Number(p50Fps.toFixed(1)),
        p95: Number(p95Fps.toFixed(1)),
        samplesCount: fpsLen
      },
      memory
    };
  }

  public reset(): void {
    this.metrics.clear();
    this.counters.clear();
    this.fpsSamples = [];
    this.lastFrameTime = 0;
  }
}

export const perfProbe = new PerfProbe();
