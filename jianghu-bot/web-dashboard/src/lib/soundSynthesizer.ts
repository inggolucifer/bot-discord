/**
 * soundSynthesizer.ts
 * Generator Audio Prosedural Berbasis Web Audio API Bawaan Peramban
 * Zero-Disk Overhead: Menghasilkan efek suara bela diri, instrumen Guzheng/Seruling,
 * dan musik pentatonik Wuxia tanpa mengunduh berkas audio MP3/WAV eksternal.
 */

class SoundSynthesizer {
    private ctx: AudioContext | null = null;
    private isMuted: boolean = false;
    private bgmTimer: any = null;
    private isBgmPlaying: boolean = false;

    // Skala Pentatonik Kuno Tiongkok (Gong, Shang, Jiao, Zhi, Yu): C4, D4, E4, G4, A4, C5, D5
    private readonly PENTATONIC_SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33];

    private initContext() {
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopBgm();
        }
        return this.isMuted;
    }

    public getMuted(): boolean {
        return this.isMuted;
    }

    /**
     * Efek petikan dawai Guzheng (Plucked String Synthesis)
     */
    public playGuzheng(freq = 329.63, duration = 1.2) {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Kombinasi triangle & sine untuk nuansa dawai sutra
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        // Filter resonansi dawai
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 3, now);
        filter.frequency.exponentialRampToValueAtTime(freq, now + duration);

        // Envelope petikan cepat lalu meluruh (pluck ADSR)
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
    }

    /**
     * Efek suara denting pedang / tebasan jurus silat
     */
    public playSwordChime(success = true) {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        if (success) {
            // Denting logam berfrekuensi tinggi
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1480, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        } else {
            // Benturan tumpul tumpul
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        }

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.4);
    }

    /**
     * Efek suara langkah kaki lembut di atas tanah/bambu (Footstep)
     */
    public playFootstep() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Ketukan frekuensi rendah bersahaja
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140 + Math.random() * 20, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.07);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    /**
     * Efek petikan penemuan / panen berhasil (Discovery Chime)
     */
    public playDiscovery() {
        if (this.isMuted) return;
        this.playGuzheng(523.25, 0.4); // C5
        setTimeout(() => {
            if (!this.isMuted) this.playGuzheng(659.25, 0.6); // E5
        }, 120);
    }

    /**
     * Efek tebasan pedang tajam saat sergapan musuh (Sword Slash Ambush)
     */
    public playSwordSlash() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    /**
     * Efek pulsa Qi akupunktur (Harmonic Bell)
     */
    public playQiPulse(isPerfect = true) {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const baseFreq = isPerfect ? 659.25 : 440.00; // E5 untuk Perfect, A4 untuk Good
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.2);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    /**
     * Efek desisan uap kuali tungku alkimia (Filtered Noise)
     */
    public playCauldronSizzle() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.Q.setValueAtTime(3.0, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);
    }

    /**
     * Memulai alunan musik latar belakang pentatonik Wuxia prosedural
     */
    public startAmbientBgm() {
        if (this.isBgmPlaying || this.isMuted) return;
        this.initContext();
        this.isBgmPlaying = true;

        const playNextNote = () => {
            if (!this.isBgmPlaying || this.isMuted) return;
            const randFreq = this.PENTATONIC_SCALE[Math.floor(Math.random() * this.PENTATONIC_SCALE.length)];
            this.playGuzheng(randFreq, 1.8);

            // Interval acak antara 1.2s - 2.8s untuk suasana tenang meditatif
            const nextDelay = 1200 + Math.random() * 1600;
            this.bgmTimer = setTimeout(playNextNote, nextDelay);
        };

        playNextNote();
    }

    public stopBgm() {
        this.isBgmPlaying = false;
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
    }

    public isPlayingBgm(): boolean {
        return this.isBgmPlaying;
    }
}

export const sound = new SoundSynthesizer();
