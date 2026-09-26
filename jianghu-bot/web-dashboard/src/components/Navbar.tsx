'use client';

import { useAuthStore, useUIStore } from '@/lib/store';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import {
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  LogOut,
  User,
  Compass,
  Map,
  Shield,
  Swords,
  Backpack,
  Landmark,
  Store,
  BookOpen,
  Layers,
  Award,
  Home,
  Scroll,
  HeartPulse,
  Flame,
  Globe2,
} from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { showMobileMapNav, setShowMobileMapNav, isLandingMenu } = useUIStore();
  const pathname = usePathname();
  const isMapRoute = pathname === '/world' || pathname === '/explore' || (pathname === '/' && !isLandingMenu);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Reset mobile menu and map nav visibility on route change
  useEffect(() => {
    setOpenDropdown(null);
    setIsMobileMenuOpen(false);
    setShowMobileMapNav(false);
  }, [pathname, setShowMobileMapNav]);

  const handleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    if (!clientId || clientId === 'YOUR_APPLICATION_ID_HERE') {
      setErrorMsg('Konfigurasi login Discord belum diatur.');
      return;
    }

    const redirectUri = encodeURIComponent(
      process.env.NEXT_PUBLIC_URL
        ? `${process.env.NEXT_PUBLIC_URL}/auth/callback`
        : 'http://localhost:3000/auth/callback'
    );
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify`;
  };

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setOpenDropdown(null);
  };

  // Streamlined nav groups for desktop dropdowns
  const karakterLinks = [
    { href: '/profile', label: 'Profil Pendekar', icon: User },
    { href: '/character', label: 'Peralatan & Busana', icon: Shield },
    { href: '/cultivation', label: 'Kultivasi & Ranah', icon: Flame },
    { href: '/skills', label: 'Kitab & Jurus', icon: Scroll },
    { href: '/skill-tree', label: 'Pohon Dao', icon: Layers },
    { href: '/condition', label: 'Kondisi Tubuh', icon: HeartPulse },
  ];

  const duniaLinks = [
    { href: '/world', label: 'Peta Benua', icon: Map },
    { href: '/explore', label: 'Eksplorasi Spasial', icon: Compass },
    { href: '/arena', label: 'Arena Duel', icon: Swords },
    { href: '/world-boss', label: 'World Boss', icon: Globe2 },
    { href: '/sect-arena', label: 'Turnamen Sekte', icon: Award },
  ];

  const sosialLinks = [
    { href: '/sect', label: 'Balai Sekte', icon: Landmark },
    { href: '/market', label: 'Pasar Lelang', icon: Store },
    { href: '/assets', label: 'Lahan & Properti', icon: Landmark },
    { href: '/leaderboard', label: 'Papan Peringkat', icon: Award },
  ];

  // In map route on mobile, auto-hide navbars unless user clicks the summon button
  const isMobileNavHidden = isMapRoute && !showMobileMapNav;

  return (
    <>
      {/* Floating Small Pill Button to Summon Navbars when on Map in Mobile */}
      {isMobileNavHidden && (
        <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[60] lg:hidden animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-auto">
          <button
            onClick={() => setShowMobileMapNav(true)}
            className="bg-[#0b0e15]/95 hover:bg-[#141a26] border-b-2 border-x border-[#c5a880]/80 text-[#c5a880] px-3.5 py-1 rounded-b-xl shadow-[0_4px_20px_rgba(0,0,0,0.9)] backdrop-blur-md flex items-center gap-1.5 text-[11px] font-serif font-bold tracking-wider hover:text-amber-200 transition-all cursor-pointer group active:scale-95 select-none"
            title="Tampilkan Menu Navigasi"
          >
            <ChevronDown className="w-3.5 h-3.5 text-amber-400 group-hover:translate-y-0.5 transition-transform" />
            <span>Navigasi</span>
          </button>
        </div>
      )}

      {/* Top Header Navbar - Clean, Minimalist Wuxia */}
      <header
        className={cn(
          'bg-[#090c13]/95 border-b border-[#2b3345] sticky top-0 z-50 backdrop-blur-md shadow-md transition-all duration-300 ease-in-out lg:overflow-visible',
          isMobileNavHidden
            ? 'max-lg:-translate-y-full max-lg:opacity-0 max-lg:pointer-events-none max-lg:max-h-0 max-lg:border-b-0 max-lg:overflow-hidden'
            : 'translate-y-0 opacity-100 max-h-16'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-15 flex justify-between items-center relative">
          
          {/* Left: Clean Brand Logo */}
          <Link
            href="/"
            className="font-serif font-bold text-base sm:text-lg tracking-wider text-amber-200 hover:text-amber-100 transition-colors select-none shrink-0"
          >
            JIANGHU
          </Link>

          {/* Center: Desktop Navigation Links (Simple, Direct & Easy) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2" ref={dropdownRef}>
            {/* 1. Beranda */}
            <Link
              href="/"
              className={cn(
                'px-3 py-1.5 text-xs xl:text-sm font-serif rounded-lg transition-colors',
                pathname === '/'
                  ? 'text-amber-200 bg-[#c5a880]/15 font-bold border border-[#c5a880]/40'
                  : 'text-stone-300 hover:text-amber-200 hover:bg-white/5'
              )}
            >
              Beranda
            </Link>

            {/* 2. Karakter (Dropdown) */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('karakter')}
                className={cn(
                  'px-3 py-1.5 text-xs xl:text-sm font-serif rounded-lg transition-colors flex items-center gap-1 cursor-pointer',
                  pathname.startsWith('/profile') || pathname.startsWith('/character') || pathname.startsWith('/cultivation') || pathname.startsWith('/skills') || pathname.startsWith('/skill-tree') || pathname.startsWith('/condition') || openDropdown === 'karakter'
                    ? 'text-amber-200 bg-[#c5a880]/15 font-bold border border-[#c5a880]/40'
                    : 'text-stone-300 hover:text-amber-200 hover:bg-white/5'
                )}
              >
                <span>Karakter</span>
                <ChevronDown className={cn('w-3.5 h-3.5 opacity-70 transition-transform', openDropdown === 'karakter' ? 'rotate-180 text-amber-300' : '')} />
              </button>

              {openDropdown === 'karakter' && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-[#0e121b] border border-[#2b3345] rounded-xl shadow-2xl p-1.5 z-[70] animate-in fade-in zoom-in-95 duration-100">
                  {karakterLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpenDropdown(null)}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors',
                          pathname === item.href
                            ? 'bg-[#c5a880]/20 text-amber-200 font-bold'
                            : 'text-stone-300 hover:text-amber-200 hover:bg-white/5'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Dunia (Dropdown) */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('dunia')}
                className={cn(
                  'px-3 py-1.5 text-xs xl:text-sm font-serif rounded-lg transition-colors flex items-center gap-1 cursor-pointer',
                  pathname.startsWith('/world') || pathname.startsWith('/explore') || pathname.startsWith('/arena') || pathname.startsWith('/world-boss') || pathname.startsWith('/sect-arena') || openDropdown === 'dunia'
                    ? 'text-amber-200 bg-[#c5a880]/15 font-bold border border-[#c5a880]/40'
                    : 'text-stone-300 hover:text-amber-200 hover:bg-white/5'
                )}
              >
                <span>Dunia</span>
                <ChevronDown className={cn('w-3.5 h-3.5 opacity-70 transition-transform', openDropdown === 'dunia' ? 'rotate-180 text-amber-300' : '')} />
              </button>

              {openDropdown === 'dunia' && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-[#0e121b] border border-[#2b3345] rounded-xl shadow-2xl p-1.5 z-[70] animate-in fade-in zoom-in-95 duration-100">
                  {duniaLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpenDropdown(null)}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors',
                          pathname === item.href
                            ? 'bg-[#c5a880]/20 text-amber-200 font-bold'
                            : 'text-stone-300 hover:text-amber-200 hover:bg-white/5'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Tas (Direct 1-Click Link - Easy & Fast!) */}
            <Link
              href="/inventory"
              className={cn(
                'px-3 py-1.5 text-xs xl:text-sm font-serif rounded-lg transition-colors flex items-center gap-1.5',
                pathname === '/inventory'
                  ? 'text-amber-200 bg-[#c5a880]/15 font-bold border border-[#c5a880]/40'
                  : 'text-stone-300 hover:text-amber-200 hover:bg-white/5'
              )}
            >
              <Backpack className="w-3.5 h-3.5 opacity-80" />
              <span>Tas</span>
            </Link>

            {/* 5. Sekte & Pasar (Dropdown) */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('sosial')}
                className={cn(
                  'px-3 py-1.5 text-xs xl:text-sm font-serif rounded-lg transition-colors flex items-center gap-1 cursor-pointer',
                  pathname.startsWith('/sect') || pathname.startsWith('/market') || pathname.startsWith('/assets') || pathname.startsWith('/leaderboard') || openDropdown === 'sosial'
                    ? 'text-amber-200 bg-[#c5a880]/15 font-bold border border-[#c5a880]/40'
                    : 'text-stone-300 hover:text-amber-200 hover:bg-white/5'
                )}
              >
                <span>Sekte & Pasar</span>
                <ChevronDown className={cn('w-3.5 h-3.5 opacity-70 transition-transform', openDropdown === 'sosial' ? 'rotate-180 text-amber-300' : '')} />
              </button>

              {openDropdown === 'sosial' && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-[#0e121b] border border-[#2b3345] rounded-xl shadow-2xl p-1.5 z-[70] animate-in fade-in zoom-in-95 duration-100">
                  {sosialLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpenDropdown(null)}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors',
                          pathname === item.href
                            ? 'bg-[#c5a880]/20 text-amber-200 font-bold'
                            : 'text-stone-300 hover:text-amber-200 hover:bg-white/5'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 6. Pustaka (Direct 1-Click Link) */}
            <Link
              href="/almanack"
              className={cn(
                'px-3 py-1.5 text-xs xl:text-sm font-serif rounded-lg transition-colors flex items-center gap-1.5',
                pathname === '/almanack'
                  ? 'text-amber-200 bg-[#c5a880]/15 font-bold border border-[#c5a880]/40'
                  : 'text-stone-300 hover:text-amber-200 hover:bg-white/5'
              )}
            >
              <BookOpen className="w-3.5 h-3.5 opacity-80" />
              <span>Pustaka</span>
            </Link>
          </nav>

          {/* Right Header: Tianji Pill + Profile/Auth + Mobile Hide Button + Mobile Menu Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Hide Button when navbars are active in mobile map */}
            {isMapRoute && showMobileMapNav && (
              <button
                onClick={() => setShowMobileMapNav(false)}
                className="lg:hidden p-1 px-2.5 rounded-lg bg-[#141a26] hover:bg-[#1e2738] border border-[#c5a880]/60 text-amber-300 text-xs font-serif flex items-center gap-1 cursor-pointer shadow-md active:scale-95"
                title="Sembunyikan Navigasi (Layar Penuh Peta)"
              >
                <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px]">Tutup</span>
              </button>
            )}

            {/* Simple Tianji Hub Pill */}
            <Link
              href="/daily-hub"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/40 hover:bg-amber-950/70 border border-amber-600/40 hover:border-amber-400 text-amber-200 text-xs font-serif transition-colors"
              title="Misi & Pencerahan Harian"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="font-semibold text-[11px] sm:text-xs">Tianji</span>
            </Link>

            {/* User Profile or Login */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 p-1 px-2 rounded-full hover:bg-white/5 border border-transparent hover:border-[#c5a880]/30 transition-all group"
                  title="Buka Lembar Profil Pendekar"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#c5a880]/70 bg-gradient-to-b from-[#1e2538] to-[#0c0f17] flex items-center justify-center text-amber-300 shadow-[0_2px_8px_rgba(0,0,0,0.6)] group-hover:border-amber-300 group-hover:shadow-[0_0_12px_rgba(197,168,128,0.35)] transition-all shrink-0">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-xs font-serif text-stone-200 group-hover:text-amber-200 hidden xl:inline max-w-[100px] truncate font-medium">
                    {user.username}
                  </span>
                </Link>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="hidden md:inline-flex border-[#2b3345] hover:border-red-900/60 text-stone-400 hover:text-red-300 hover:bg-red-950/20 px-2.5 py-1 h-7 sm:h-8 text-xs rounded-lg transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-3 h-3 mr-1" />
                  Logout
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleLogin}
                variant="destructive"
                size="sm"
                className="bg-amber-900 hover:bg-amber-800 text-amber-100 text-xs font-serif font-bold px-3 py-1 h-8 rounded-lg"
              >
                Login
              </Button>
            )}

            {/* Mobile Menu Hamburger Toggle */}
            <button
              className="lg:hidden p-2 text-stone-300 hover:text-amber-200 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-amber-300" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Center Bottom Pull Tab to Hide Nav in Mobile Map */}
        {isMapRoute && showMobileMapNav && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 pointer-events-auto lg:hidden">
            <button
              onClick={() => setShowMobileMapNav(false)}
              className="px-3 py-0.5 rounded-b-md bg-[#090c13]/95 border-b border-x border-[#c5a880]/70 text-[#c5a880] text-[10px] font-serif flex items-center gap-1 transition-all shadow-md cursor-pointer hover:text-amber-200"
              title="Sembunyikan Navigasi"
            >
              <ChevronUp size={11} className="text-amber-400" />
              <span>Sembunyikan</span>
            </button>
          </div>
        )}
      </header>

      {/* Mobile Drawer (Clean, Uncluttered, Direct Links - Zero Sideways Scroll) */}
      <div
        className={cn(
          'fixed inset-0 top-14 z-40 bg-[#080b11]/98 backdrop-blur-xl transition-all duration-200 ease-out lg:hidden flex flex-col overflow-y-auto overflow-x-hidden border-t border-[#2b3345] pb-24',
          isMobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
        )}
      >
        <div className="w-full max-w-full px-4 py-4 space-y-4">
          
          {/* User Profile Bar in Mobile Menu */}
          {user ? (
            <div className="bg-[#10141f] border border-[#2b3345] rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full border border-[#c5a880]/70 bg-gradient-to-b from-[#1e2538] to-[#0c0f17] flex items-center justify-center text-amber-300 shadow-[0_2px_8px_rgba(0,0,0,0.6)] shrink-0">
                  <User className="w-4 h-4 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-serif font-bold text-amber-200 text-sm truncate">{user.username}</h4>
                  <span className="text-[10px] text-stone-400 font-serif">Kultivator Jianghu</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { logout(); closeMobileMenu(); }}
                className="border-red-900/50 text-red-400 hover:bg-red-950/30 text-xs px-2.5 py-1 h-7 rounded-lg shrink-0"
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="bg-[#10141f] border border-[#2b3345] rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs text-stone-300 font-serif">Silakan masuk ke akun Jianghu</span>
              <Button
                onClick={handleLogin}
                size="sm"
                variant="destructive"
                className="bg-amber-900 hover:bg-amber-800 text-amber-100 text-xs font-serif font-bold px-3 py-1 h-7"
              >
                Login
              </Button>
            </div>
          )}

          {/* Quick Access 4-Tile Grid */}
          <div className="grid grid-cols-4 gap-2">
            <Link
              href="/"
              onClick={closeMobileMenu}
              className="bg-[#10141f] hover:bg-[#161c2b] border border-[#252e40] rounded-xl p-2.5 flex flex-col items-center justify-center text-center transition-colors"
            >
              <Home className="w-4 h-4 text-amber-400 mb-1" />
              <span className="text-[11px] font-serif text-stone-200">Beranda</span>
            </Link>
            <Link
              href="/world"
              onClick={closeMobileMenu}
              className="bg-[#10141f] hover:bg-[#161c2b] border border-[#252e40] rounded-xl p-2.5 flex flex-col items-center justify-center text-center transition-colors"
            >
              <Map className="w-4 h-4 text-amber-300 mb-1" />
              <span className="text-[11px] font-serif text-amber-300 font-bold">Peta</span>
            </Link>
            <Link
              href="/inventory"
              onClick={closeMobileMenu}
              className="bg-[#10141f] hover:bg-[#161c2b] border border-[#252e40] rounded-xl p-2.5 flex flex-col items-center justify-center text-center transition-colors"
            >
              <Backpack className="w-4 h-4 text-amber-400 mb-1" />
              <span className="text-[11px] font-serif text-stone-200">Tas</span>
            </Link>
            <Link
              href="/daily-hub"
              onClick={closeMobileMenu}
              className="bg-[#10141f] hover:bg-[#161c2b] border border-[#252e40] rounded-xl p-2.5 flex flex-col items-center justify-center text-center transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-400 mb-1" />
              <span className="text-[11px] font-serif text-stone-200">Tianji</span>
            </Link>
          </div>

          {/* Group 1: Karakter & Kultivasi */}
          <div className="bg-[#0e121b] border border-[#252e40] rounded-xl p-3 space-y-1">
            <span className="text-[10px] font-serif uppercase tracking-widest text-[#c5a880] font-bold block mb-1 px-1">
              Karakter & Kultivasi
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {karakterLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
                      pathname === item.href
                        ? 'bg-[#c5a880]/20 text-amber-200 font-bold'
                        : 'text-stone-300 hover:text-amber-200 hover:bg-white/5 bg-[#121622]/60'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Group 2: Dunia & Pertarungan */}
          <div className="bg-[#0e121b] border border-[#252e40] rounded-xl p-3 space-y-1">
            <span className="text-[10px] font-serif uppercase tracking-widest text-[#c5a880] font-bold block mb-1 px-1">
              Dunia & Pertarungan
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {duniaLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
                      pathname === item.href
                        ? 'bg-[#c5a880]/20 text-amber-200 font-bold'
                        : 'text-stone-300 hover:text-amber-200 hover:bg-white/5 bg-[#121622]/60'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Group 3: Sekte, Pasar & Lainnya */}
          <div className="bg-[#0e121b] border border-[#252e40] rounded-xl p-3 space-y-1">
            <span className="text-[10px] font-serif uppercase tracking-widest text-[#c5a880] font-bold block mb-1 px-1">
              Komunitas & Referensi
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {sosialLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
                      pathname === item.href
                        ? 'bg-[#c5a880]/20 text-amber-200 font-bold'
                        : 'text-stone-300 hover:text-amber-200 hover:bg-white/5 bg-[#121622]/60'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
              <Link
                href="/almanack"
                onClick={closeMobileMenu}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg text-xs transition-colors col-span-2',
                  pathname === '/almanack'
                    ? 'bg-[#c5a880]/20 text-amber-200 font-bold'
                    : 'text-stone-300 hover:text-amber-200 hover:bg-white/5 bg-[#121622]/60'
                )}
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                <span>Pustaka & Ensiklopedia Jianghu</span>
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (5 Touch-Optimized Pillars - Auto-hidden on map) */}
      <nav
        className={cn(
          'lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#090c13]/95 backdrop-blur-xl border-t border-[#2b3345] px-2 py-1 shadow-lg max-w-full overflow-hidden transition-all duration-300 ease-in-out',
          isMobileNavHidden
            ? 'translate-y-full opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100'
        )}
      >
        <div className="grid grid-cols-5 items-center w-full max-w-md mx-auto">
          {/* 1. Beranda */}
          <Link
            href="/"
            onClick={closeMobileMenu}
            className={cn(
              'flex flex-col items-center justify-center py-1 rounded-lg transition-colors min-h-[44px]',
              pathname === '/' ? 'text-amber-300 font-bold' : 'text-stone-400 hover:text-stone-200'
            )}
          >
            <Home className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] font-serif">Beranda</span>
          </Link>

          {/* 2. Karakter */}
          <Link
            href="/profile"
            onClick={closeMobileMenu}
            className={cn(
              'flex flex-col items-center justify-center py-1 rounded-lg transition-colors min-h-[44px]',
              pathname.startsWith('/profile') || pathname.startsWith('/character')
                ? 'text-amber-300 font-bold'
                : 'text-stone-400 hover:text-stone-200'
            )}
          >
            <User className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] font-serif">Karakter</span>
          </Link>

          {/* 3. Dunia */}
          <Link
            href="/world"
            onClick={closeMobileMenu}
            className={cn(
              'flex flex-col items-center justify-center py-1 rounded-lg transition-colors min-h-[44px]',
              pathname === '/world' ? 'text-amber-300 font-bold' : 'text-stone-400 hover:text-stone-200'
            )}
          >
            <Map className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] font-serif">Dunia</span>
          </Link>

          {/* 4. Tas */}
          <Link
            href="/inventory"
            onClick={closeMobileMenu}
            className={cn(
              'flex flex-col items-center justify-center py-1 rounded-lg transition-colors min-h-[44px]',
              pathname === '/inventory' ? 'text-amber-300 font-bold' : 'text-stone-400 hover:text-stone-200'
            )}
          >
            <Backpack className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] font-serif">Tas</span>
          </Link>

          {/* 5. Menu */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={cn(
              'flex flex-col items-center justify-center py-1 rounded-lg transition-colors min-h-[44px] cursor-pointer',
              isMobileMenuOpen ? 'text-amber-300 font-bold' : 'text-stone-400 hover:text-stone-200'
            )}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4 mb-0.5" /> : <Menu className="w-4 h-4 mb-0.5" />}
            <span className="text-[10px] font-serif">{isMobileMenuOpen ? 'Tutup' : 'Menu'}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
