'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import {
  Sparkles, Shield, User, Lock, Mail, CheckCircle2, XCircle,
  Loader2, ArrowRight, Compass, Flame, Scroll, Award, Eye, EyeOff,
  KeyRound, RefreshCw, ArrowLeft, Check
} from 'lucide-react';

interface AuthPortalModalProps {
  onSuccess?: () => void;
}

type AuthMode = 'login' | 'register';

export default function AuthPortalModal({ onSuccess }: AuthPortalModalProps) {
  const { login } = useAuthStore();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Field pendaftaran karakter
  const [characterName, setCharacterName] = useState('');
  const [gender, setGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');

  // Status validasi nama real-time (Centang Hijau)
  const [isNameChecking, setIsNameChecking] = useState(false);
  const [nameStatus, setNameStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [nameFeedback, setNameFeedback] = useState<string | null>(null);

  // State Verifikasi OTP 6-Digit Email
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState(0);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // State untuk alur lanjutan Google Signup (Pengguna Baru Google)
  const [googleSetupData, setGoogleSetupData] = useState<{
    googleId: string;
    email: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const checkNameTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown timer untuk pengiriman ulang OTP
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpTimer]);

  // Debounced check name availability
  const checkNameAvailability = useCallback(async (rawName: string) => {
    const trimmed = rawName.trim();

    if (!trimmed) {
      setNameStatus('idle');
      setNameFeedback(null);
      setIsNameChecking(false);
      return;
    }

    // Client-side checks
    if (/\s/.test(trimmed)) {
      setNameStatus('invalid');
      setNameFeedback('Nama pendekar dilarang mengandung spasi.');
      setIsNameChecking(false);
      return;
    }

    if (/\d/.test(trimmed)) {
      setNameStatus('invalid');
      setNameFeedback('Nama pendekar dilarang mengandung angka.');
      setIsNameChecking(false);
      return;
    }

    if (!/^[a-zA-Z]+$/.test(trimmed)) {
      setNameStatus('invalid');
      setNameFeedback('Hanya boleh menggunakan huruf alfabet murni (A-Z, a-z).');
      setIsNameChecking(false);
      return;
    }

    if (trimmed.length < 5) {
      setNameStatus('invalid');
      setNameFeedback(`Nama terlalu pendek (${trimmed.length}/5 huruf). Minimal 5 huruf.`);
      setIsNameChecking(false);
      return;
    }

    if (trimmed.length > 7) {
      setNameStatus('invalid');
      setNameFeedback(`Nama terlalu panjang (${trimmed.length}/7 huruf). Maksimal 7 huruf.`);
      setIsNameChecking(false);
      return;
    }

    // Jika format 5-7 huruf sah, panggil server API untuk cek keunikan
    setIsNameChecking(true);
    setNameFeedback('Memeriksa kitab silsilah nama Jianghu...');

    try {
      const res = await api.get('/auth/check-name', {
        params: { name: trimmed }
      });

      if (res.data?.available) {
        setNameStatus('valid');
        setNameFeedback('Nama pendekar sah dan tersedia untuk digunakan!');
      } else {
        setNameStatus('invalid');
        setNameFeedback(res.data?.error || 'Nama ini sudah digunakan oleh pendekar lain.');
      }
    } catch (err: any) {
      setNameStatus('invalid');
      setNameFeedback(err.response?.data?.error || 'Gagal memverifikasi ketersediaan nama.');
    } finally {
      setIsNameChecking(false);
    }
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCharacterName(val);
    setErrorMessage(null);

    if (checkNameTimerRef.current) {
      clearTimeout(checkNameTimerRef.current);
    }

    if (!val.trim()) {
      setNameStatus('idle');
      setNameFeedback(null);
      setIsNameChecking(false);
      return;
    }

    // Tampilkan loading debounce
    setIsNameChecking(true);
    checkNameTimerRef.current = setTimeout(() => {
      checkNameAvailability(val);
    }, 300);
  };

  // Inisialisasi Google Identity Services (GIS)
  useEffect(() => {
    const googleClientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      '794903681615-tl9r1c44lj9arab1o8rbqo8qtjval55o.apps.googleusercontent.com';

    const handleGoogleResponse = async (response: any) => {
      if (!response.credential) return;
      setSubmitting(true);
      setErrorMessage(null);

      try {
        const res = await api.post('/auth/google', {
          credential: response.credential
        });

        if (res.data?.isNewUser) {
          // Akun baru: butuh mengisi nama 5-7 huruf & gender
          setGoogleSetupData({
            googleId: res.data.googleId,
            email: res.data.email
          });
          if (res.data.suggestedName) {
            setCharacterName(res.data.suggestedName);
            checkNameAvailability(res.data.suggestedName);
          }
          setSuccessMessage('Akun Google terverifikasi! Lengkapi nama pendekar & jenis kelaminmu.');
        } else if (res.data?.success && res.data?.token) {
          login(res.data.token, res.data.user);
          onSuccess?.();
        }
      } catch (err: any) {
        setErrorMessage(err.response?.data?.error || 'Gagal masuk dengan Google.');
      } finally {
        setSubmitting(false);
      }
    };

    // Load GIS script if not present
    if (typeof window !== 'undefined' && !(window as any).google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if ((window as any).google && googleBtnRef.current) {
          try {
            (window as any).google.accounts.id.initialize({
              client_id: googleClientId,
              callback: handleGoogleResponse
            });
            (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'filled_black',
              size: 'large',
              width: '100%',
              text: 'continue_with',
              shape: 'pill'
            });
          } catch (e) {
            console.warn('[GIS] Error rendering Google button:', e);
          }
        }
      };
      document.body.appendChild(script);
    } else if ((window as any).google && googleBtnRef.current) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse
        });
        (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: '100%',
          text: 'continue_with',
          shape: 'pill'
        });
      } catch (e) {
        console.warn('[GIS] Error rendering Google button:', e);
      }
    }
  }, [checkNameAvailability, login, onSuccess]);

  // Handler Submit Email Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Email dan password wajib diisi.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.post('/auth/email-login', { email, password });
      if (res.data?.success && res.data?.token) {
        login(res.data.token, res.data.user);
        onSuccess?.();
      } else {
        setErrorMessage(res.data?.error || 'Gagal masuk.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Email atau kata sandi tidak cocok.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handler Kirim OTP (Langkah 1 Pendaftaran Email)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !characterName) {
      setErrorMessage('Semua kolom formulir pendaftaran wajib diisi.');
      return;
    }

    if (nameStatus !== 'valid') {
      setErrorMessage('Nama pendekar belum valid atau belum disetujui (wajib centang hijau).');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Kata sandi minimal 6 karakter.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await api.post('/auth/send-otp', {
        email: email.trim(),
        password,
        characterName: characterName.trim(),
        gender
      });

      if (res.data?.success) {
        setIsVerifyingOtp(true);
        setOtpTimer(60);
        setOtpValues(['', '', '', '', '', '']);
        if (res.data.devOtp) {
          setDevOtpCode(res.data.devOtp);
        }
        setSuccessMessage(res.data.message || `Kode verifikasi 6-digit telah dikirim ke ${email}.`);
        setTimeout(() => {
          otpInputsRef.current[0]?.focus();
        }, 150);
      } else {
        setErrorMessage(res.data?.error || 'Gagal mengirim kode verifikasi.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Terjadi kesalahan saat mengirim kode verifikasi.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handler Manajemen Input Digit OTP
  const handleOtpChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned) {
      const updated = [...otpValues];
      updated[index] = '';
      setOtpValues(updated);
      return;
    }

    // Jika user paste beberapa angka langsung ke salah satu kotak
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 6).split('');
      const updated = [...otpValues];
      chars.forEach((c, i) => {
        if (index + i < 6) updated[index + i] = c;
      });
      setOtpValues(updated);
      const nextIndex = Math.min(5, index + chars.length);
      otpInputsRef.current[nextIndex]?.focus();
      return;
    }

    const updated = [...otpValues];
    updated[index] = cleaned[0];
    setOtpValues(updated);

    if (index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpValues[index] && index > 0) {
        otpInputsRef.current[index - 1]?.focus();
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const chars = pasted.split('');
    const updated = [...otpValues];
    chars.forEach((c, i) => {
      if (i < 6) updated[i] = c;
    });
    setOtpValues(updated);
    const targetIdx = Math.min(5, chars.length);
    otpInputsRef.current[targetIdx]?.focus();
  };

  const fillDevOtp = () => {
    if (!devOtpCode) return;
    const digits = devOtpCode.split('').slice(0, 6);
    const updated = [...otpValues];
    digits.forEach((d, i) => {
      if (i < 6) updated[i] = d;
    });
    setOtpValues(updated);
    otpInputsRef.current[5]?.focus();
  };

  // Handler Verifikasi Kode OTP (Langkah 2 Pendaftaran Email)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpValues.join('').trim();
    if (fullOtp.length !== 6) {
      setErrorMessage('Silakan lengkapi 6 digit kode verifikasi.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.post('/auth/verify-otp', {
        email: email.trim(),
        otp: fullOtp
      });

      if (res.data?.success && res.data?.token) {
        login(res.data.token, res.data.user);
        setSuccessMessage('Verifikasi berhasil! Mengalihkan ke Studio Penampilan...');
        setTimeout(() => {
          onSuccess?.();
        }, 800);
      } else {
        setErrorMessage(res.data?.error || 'Kode verifikasi salah atau kadaluarsa.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Gagal memverifikasi kode OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handler Kirim Ulang Kode OTP
  const handleResendOtp = async () => {
    if (otpTimer > 0 || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await api.post('/auth/send-otp', {
        email: email.trim(),
        password,
        characterName: characterName.trim(),
        gender
      });

      if (res.data?.success) {
        setOtpTimer(60);
        setOtpValues(['', '', '', '', '', '']);
        if (res.data.devOtp) {
          setDevOtpCode(res.data.devOtp);
        }
        setSuccessMessage('Kode verifikasi baru telah dikirimkan ke email!');
      } else {
        setErrorMessage(res.data?.error || 'Gagal mengirim ulang kode.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Gagal mengirim ulang kode.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handler Submit Google Finalize (Akun Baru Google yang melengkapi nama & gender)
  const handleGoogleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleSetupData || !characterName) {
      setErrorMessage('Nama pendekar wajib diisi.');
      return;
    }

    if (nameStatus !== 'valid') {
      setErrorMessage('Nama pendekar harus berstatus centang hijau.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.post('/auth/google-finalize', {
        email: googleSetupData.email,
        googleId: googleSetupData.googleId,
        characterName: characterName.trim(),
        gender
      });

      if (res.data?.success && res.data?.token) {
        login(res.data.token, res.data.user);
        setSuccessMessage('Karakter Google berhasil dibuat! Mengalihkan ke Studio Penampilan...');
        setTimeout(() => {
          onSuccess?.();
        }, 800);
      } else {
        setErrorMessage(res.data?.error || 'Gagal menyelesaikan pendaftaran Google.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Gagal menyelesaikan pendaftaran Google.');
    } finally {
      setSubmitting(false);
    }
  };

  // Tombol Simulasi Google untuk Pengujian Developer Lokal
  const handleSimulatedGoogleLogin = async () => {
    const dummyEmail = `pendekar_${Date.now().toString().slice(-4)}@jianghu.local`;
    const dummyToken = `simulated_google_token_${encodeURIComponent(dummyEmail)}`;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.post('/auth/google', { token: dummyToken });
      if (res.data?.isNewUser) {
        setGoogleSetupData({
          googleId: res.data.googleId,
          email: res.data.email
        });
        setSuccessMessage('Simulasi Google Terhubung! Silakan isi nama 5-7 huruf & jenis kelamin.');
      } else if (res.data?.success && res.data?.token) {
        login(res.data.token, res.data.user);
        onSuccess?.();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Gagal simulasi Google auth.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] w-screen h-screen overflow-y-auto bg-[#070a12] text-[#f2e7d3] font-serif flex items-center justify-center p-3 sm:p-6 select-none">
      {/* Background Classical Ink Wash & Spiritual Particles */}
      <div
        className="fixed inset-0 bg-cover bg-center transition-all duration-1000 scale-105 pointer-events-none opacity-40 mix-blend-screen"
        style={{
          backgroundImage: `radial-gradient(ellipse at center, rgba(14,20,32,0.6) 0%, rgba(7,10,18,0.95) 100%), url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2069&auto=format&fit=crop')`,
        }}
      />
      <div className="fixed inset-0 bg-gradient-to-t from-[#070a12] via-transparent to-[#070a12]/80 pointer-events-none" />

      {/* Main Container: 2-Column Grand Portal */}
      <div className="relative z-10 w-full max-w-5xl bg-[#0f131d]/95 border-2 border-[#826b48] rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col md:flex-row backdrop-blur-xl">

        {/* LEFT COLUMN: GRAND IMMERSION & GAME LORE HIGHLIGHTS ("INFO BAGUS") */}
        <div className="w-full md:w-5/12 bg-gradient-to-b from-[#181d2a] via-[#10141f] to-[#0a0d14] p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#3a3020]">
          <div>
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-600/50 text-[11px] text-amber-300 font-sans mb-4 shadow-inner">
              <Sparkles size={12} className="text-amber-400 animate-spin-slow" />
              <span>Gerbang Alam Keabadian • Immortal X</span>
            </div>

            {/* Title Calligraphy */}
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-widest text-[#f5ebd7] font-serif">
                江湖八荒
              </h1>
              <span className="px-2 py-0.5 rounded bg-red-950/80 border border-red-500 text-red-200 text-xs font-bold">
                仙
              </span>
            </div>
            <p className="text-xs text-amber-200/80 font-sans tracking-wide uppercase mb-6">
              Tale of Immortal • Open-World Wuxia MMORPG
            </p>

            {/* Immersion Lore Paragraph */}
            <p className="text-xs sm:text-[13px] text-stone-300 leading-relaxed font-sans mb-6">
              Menembus tirai debu fana, mendirikan fondasi Dao sejati, dan mengukir namamu di sembilan benua. Jelajahi dunia terbuka tanpa batas, pelajari manual esoteris, dan taklukkan labirin kuno.
            </p>

            {/* Feature Highlights Grid */}
            <div className="space-y-3 font-sans text-xs">
              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#141926]/70 border border-[#322a1d]">
                <Compass className="text-amber-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <div className="text-amber-200 font-semibold">Peta Dunia 5000 × 5000 Tile</div>
                  <div className="text-[11px] text-stone-400">Jelajahi mikro-grid spasial, 6 bioma iklim, dan zona misteri.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#141926]/70 border border-[#322a1d]">
                <Scroll className="text-cyan-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <div className="text-cyan-200 font-semibold">24 Sekte & 15 Hukum Alam Semesta</div>
                  <div className="text-[11px] text-stone-400">Ikuti ujian sekte, pelajari kitab manual, dan ikat Hukum Ilahi.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[#141926]/70 border border-[#322a1d]">
                <Flame className="text-rose-400 shrink-0 mt-0.5" size={16} />
                <div>
                  <div className="text-rose-200 font-semibold">Turn-Based Arena & Monster Spasial</div>
                  <div className="text-[11px] text-stone-400">Pertarungan jurus adaptif, DoT racun, dan bos gua kuno.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Server Status Indicator */}
          <div className="mt-6 pt-4 border-t border-[#262117] flex items-center justify-between text-[11px] font-sans text-stone-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-emerald-400 font-medium">Server Aktif & Sinkron</span>
            </div>
            <span>v1.2.0 • Server Authoritative</span>
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE AUTH FORM */}
        <div className="w-full md:w-7/12 p-6 sm:p-8 md:p-10 flex flex-col justify-center bg-[#0d1017]">

          {/* If currently finalizing Google Signup */}
          {googleSetupData ? (
            <div>
              <div className="mb-6">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/70 text-amber-300 text-xs font-sans">
                  Langkah 2: Identitas Pendekar
                </span>
                <h2 className="text-2xl font-bold font-serif text-[#f5ebd7] mt-2">
                  Ukir Nama & Takdirmu
                </h2>
                <p className="text-xs text-stone-400 font-sans mt-1">
                  Akun Google <span className="text-amber-300">{googleSetupData.email}</span> terverifikasi. Tentukan nama dan jenis kelamin karaktermu di Jianghu.
                </p>
              </div>

              <form onSubmit={handleGoogleFinalize} className="space-y-5 font-sans">
                {/* Character Name Input with Real-time Live Checker */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-stone-300">
                      Nama Pendekar (Wajib 5–7 Huruf)
                    </label>
                    <span className="text-[10px] text-stone-400">
                      Tanpa spasi & tanpa angka
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      maxLength={7}
                      value={characterName}
                      onChange={handleNameChange}
                      placeholder="Contoh: Tianwu"
                      className={`w-full px-4 py-2.5 pr-10 rounded-lg bg-[#141926] border text-sm text-[#f2e7d3] placeholder-stone-500 focus:outline-none transition-all ${
                        nameStatus === 'valid'
                          ? 'border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)] bg-emerald-950/10'
                          : nameStatus === 'invalid'
                          ? 'border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)] bg-rose-950/10'
                          : 'border-[#3f3526] focus:border-amber-500'
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {isNameChecking ? (
                        <Loader2 size={18} className="animate-spin text-amber-400" />
                      ) : nameStatus === 'valid' ? (
                        <CheckCircle2 size={18} className="text-emerald-400 animate-pulse" />
                      ) : nameStatus === 'invalid' ? (
                        <XCircle size={18} className="text-rose-400" />
                      ) : null}
                    </div>
                  </div>

                  {/* Feedback Message */}
                  {nameFeedback && (
                    <p
                      className={`text-[11px] mt-1.5 flex items-center gap-1 ${
                        nameStatus === 'valid'
                          ? 'text-emerald-400 font-medium'
                          : nameStatus === 'invalid'
                          ? 'text-rose-400'
                          : 'text-amber-300'
                      }`}
                    >
                      {nameFeedback}
                    </p>
                  )}
                </div>

                {/* Gender Radio Choice */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-2">
                    Pilih Jenis Kelamin Karakter
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setGender('Laki-laki')}
                      className={`py-2.5 px-4 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                        gender === 'Laki-laki'
                          ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                          : 'bg-[#141926] border-[#3f3526] text-stone-400 hover:border-stone-500'
                      }`}
                    >
                      <span className="text-base">🧙‍♂️</span>
                      <span>Laki-laki (Pria)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGender('Perempuan')}
                      className={`py-2.5 px-4 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                        gender === 'Perempuan'
                          ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                          : 'bg-[#141926] border-[#3f3526] text-stone-400 hover:border-stone-500'
                      }`}
                    >
                      <span className="text-base">🧝‍♀️</span>
                      <span>Perempuan (Wanita)</span>
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-600/70 text-rose-200 text-xs">
                    {errorMessage}
                  </div>
                )}

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={submitting || nameStatus !== 'valid'}
                  className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-[#876e47] via-[#a88958] to-[#876e47] hover:from-[#9c8053] hover:to-[#bfa16d] text-stone-900 font-serif font-bold text-sm tracking-wider shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-stone-900" />
                      <span>Mempersiapkan Takdir...</span>
                    </>
                  ) : (
                    <>
                      <span>Lanjut ke Studio Penampilan</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : isVerifyingOtp ? (
            /* SUB-VIEW: 6-DIGIT EMAIL OTP VERIFICATION */
            <div>
              <div className="mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setIsVerifyingOtp(false);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-amber-300 font-sans mb-3 transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Kembali ke Pengisian Data</span>
                </button>

                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-600/50 text-amber-300">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-serif text-[#f5ebd7]">
                      Verifikasi Kode Email
                    </h2>
                    <p className="text-xs text-stone-400 font-sans">
                      Kode rahasia 6-digit dikirim ke <span className="text-amber-300 font-medium">{email}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Dev Mode Code Quick-Fill Badge */}
              {devOtpCode && (
                <div
                  onClick={fillDevOtp}
                  className="mb-4 p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/50 hover:border-amber-400 cursor-pointer text-xs font-sans text-amber-200 flex items-center justify-between transition-all group"
                  title="Klik untuk mengisi otomatis"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500 text-stone-900 font-bold text-[10px]">
                      DEV MODE
                    </span>
                    <span>Kode Simulasi: <strong className="text-amber-300 tracking-wider font-mono text-sm">{devOtpCode}</strong></span>
                  </div>
                  <span className="text-[11px] text-amber-400 underline group-hover:text-amber-300">
                    Isi Otomatis ⚡
                  </span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-5 font-sans">
                {/* 6 Digit Input Boxes */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 text-center mb-3">
                    Masukkan 6 Digit Angka Verifikasi
                  </label>
                  <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                    {otpValues.map((val, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpInputsRef.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={val}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-mono font-bold rounded-lg bg-[#141926] border text-[#f2e7d3] focus:outline-none transition-all ${
                          val
                            ? 'border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)] bg-amber-950/15'
                            : 'border-[#3f3526] focus:border-amber-500'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Feedback Banners */}
                {errorMessage && (
                  <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-600/70 text-rose-200 text-xs">
                    {errorMessage}
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-600/70 text-emerald-200 text-xs">
                    {successMessage}
                  </div>
                )}

                {/* Submit Verification Button */}
                <button
                  type="submit"
                  disabled={submitting || otpValues.join('').length !== 6}
                  className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-[#876e47] via-[#a88958] to-[#876e47] hover:from-[#9c8053] hover:to-[#bfa16d] text-stone-900 font-serif font-bold text-sm tracking-wider shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-stone-900" />
                      <span>Memverifikasi Kode Segel...</span>
                    </>
                  ) : (
                    <>
                      <span>Verifikasi & Buka Gerbang Jianghu</span>
                      <Check size={16} />
                    </>
                  )}
                </button>

                {/* Resend OTP Action */}
                <div className="pt-2 text-center text-xs text-stone-400">
                  {otpTimer > 0 ? (
                    <span>
                      Kirim ulang kode dalam <strong className="text-amber-300 font-mono">{otpTimer}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 underline font-medium"
                    >
                      <RefreshCw size={13} />
                      <span>Kirim Ulang Kode Verifikasi</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <div>
              {/* TAB SWITCHER: MASUK (LOGIN) VS DAFTAR (REGISTER) */}
              <div className="flex border-b border-[#2d251a] mb-6">
                <button
                  onClick={() => {
                    setMode('login');
                    setIsVerifyingOtp(false);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`flex-1 py-3 text-sm font-serif font-bold tracking-wider text-center transition-all border-b-2 ${
                    mode === 'login'
                      ? 'border-amber-400 text-amber-200'
                      : 'border-transparent text-stone-500 hover:text-stone-300'
                  }`}
                >
                  MASUK AKUN
                </button>

                <button
                  onClick={() => {
                    setMode('register');
                    setIsVerifyingOtp(false);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`flex-1 py-3 text-sm font-serif font-bold tracking-wider text-center transition-all border-b-2 ${
                    mode === 'register'
                      ? 'border-amber-400 text-amber-200'
                      : 'border-transparent text-stone-500 hover:text-stone-300'
                  }`}
                >
                  DAFTAR PENDEKAR BARU
                </button>
              </div>

              {/* FORM MODE: LOGIN */}
              {mode === 'login' ? (
                <form onSubmit={handleEmailLogin} className="space-y-4 font-sans">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      Alamat Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="pendekar@domain.com"
                        className="w-full px-4 py-2.5 pl-10 rounded-lg bg-[#141926] border border-[#3f3526] focus:border-amber-500 text-sm text-[#f2e7d3] placeholder-stone-500 focus:outline-none"
                      />
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      Kata Sandi (Password)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 pl-10 pr-10 rounded-lg bg-[#141926] border border-[#3f3526] focus:border-amber-500 text-sm text-[#f2e7d3] placeholder-stone-500 focus:outline-none"
                      />
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Feedback Banner */}
                  {errorMessage && (
                    <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-600/70 text-rose-200 text-xs">
                      {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-[#876e47] via-[#a88958] to-[#876e47] hover:from-[#9c8053] hover:to-[#bfa16d] text-stone-900 font-serif font-bold text-sm tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-stone-900" />
                        <span>Membuka Gerbang...</span>
                      </>
                    ) : (
                      <>
                        <span>Masuk ke Alam Jianghu</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* FORM MODE: REGISTER (LANGKAH 1 PENGISIAN DATA PENDAFTARAN) */
                <form onSubmit={handleSendOtp} className="space-y-4 font-sans">
                  {/* Character Name with Live Green Checkmark */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-stone-300">
                        Nama Pendekar (Wajib 5–7 Huruf)
                      </label>
                      <span className="text-[10px] text-stone-400">
                        Tanpa spasi & tanpa angka
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        maxLength={7}
                        required
                        value={characterName}
                        onChange={handleNameChange}
                        placeholder="Contoh: Jianwu"
                        className={`w-full px-4 py-2.5 pr-10 rounded-lg bg-[#141926] border text-sm text-[#f2e7d3] placeholder-stone-500 focus:outline-none transition-all ${
                          nameStatus === 'valid'
                            ? 'border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)] bg-emerald-950/10'
                            : nameStatus === 'invalid'
                            ? 'border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)] bg-rose-950/10'
                            : 'border-[#3f3526] focus:border-amber-500'
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        {isNameChecking ? (
                          <Loader2 size={18} className="animate-spin text-amber-400" />
                        ) : nameStatus === 'valid' ? (
                          <CheckCircle2 size={18} className="text-emerald-400 animate-pulse" />
                        ) : nameStatus === 'invalid' ? (
                          <XCircle size={18} className="text-rose-400" />
                        ) : null}
                      </div>
                    </div>

                    {nameFeedback && (
                      <p
                        className={`text-[11px] mt-1.5 flex items-center gap-1 ${
                          nameStatus === 'valid'
                            ? 'text-emerald-400 font-medium'
                            : nameStatus === 'invalid'
                            ? 'text-rose-400'
                            : 'text-amber-300'
                        }`}
                      >
                        {nameFeedback}
                      </p>
                    )}
                  </div>

                  {/* Gender Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      Jenis Kelamin
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setGender('Laki-laki')}
                        className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                          gender === 'Laki-laki'
                            ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-sm'
                            : 'bg-[#141926] border-[#3f3526] text-stone-400 hover:border-stone-500'
                        }`}
                      >
                        <span>🧙‍♂️</span>
                        <span>Laki-laki</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setGender('Perempuan')}
                        className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                          gender === 'Perempuan'
                            ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-sm'
                            : 'bg-[#141926] border-[#3f3526] text-stone-400 hover:border-stone-500'
                        }`}
                      >
                        <span>🧝‍♀️</span>
                        <span>Perempuan</span>
                      </button>
                    </div>
                  </div>

                  {/* Email & Password */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      Alamat Email (Untuk Pengiriman Kode OTP)
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="pendekar@domain.com"
                        className="w-full px-4 py-2.5 pl-10 rounded-lg bg-[#141926] border border-[#3f3526] focus:border-amber-500 text-sm text-[#f2e7d3] placeholder-stone-500 focus:outline-none"
                      />
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      Kata Sandi (Minimal 6 Karakter)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 pl-10 pr-10 rounded-lg bg-[#141926] border border-[#3f3526] focus:border-amber-500 text-sm text-[#f2e7d3] placeholder-stone-500 focus:outline-none"
                      />
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Feedback Banner */}
                  {errorMessage && (
                    <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-600/70 text-rose-200 text-xs">
                      {errorMessage}
                    </div>
                  )}

                  {successMessage && (
                    <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-600/70 text-emerald-200 text-xs">
                      {successMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || nameStatus !== 'valid'}
                    className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-[#876e47] via-[#a88958] to-[#876e47] hover:from-[#9c8053] hover:to-[#bfa16d] text-stone-900 font-serif font-bold text-sm tracking-wider shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-stone-900" />
                        <span>Mengirim Kode Verifikasi...</span>
                      </>
                    ) : (
                      <>
                        <span>Lanjut ke Verifikasi Kode Email</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* DIVIDER: ATAU MASUK DENGAN GOOGLE */}
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#2d251a]" />
                </div>
                <span className="relative px-3 bg-[#0d1017] text-[11px] text-stone-500 font-sans uppercase">
                  Atau Otorisasi Cepat
                </span>
              </div>

              {/* GOOGLE SIGN-IN BUTTON CONTAINER */}
              <div className="space-y-2">
                <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]" />

                {/* Developer Fallback Simulation Button */}
                <button
                  type="button"
                  onClick={handleSimulatedGoogleLogin}
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-full bg-[#161c29] hover:bg-[#20283a] border border-[#3e485e] text-xs font-sans text-stone-300 hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Masuk / Daftar via Google</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
