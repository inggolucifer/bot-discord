'use client';

import { useAuthStore } from '@/lib/store';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';
 // Need to check if FallbackImage exists, if not we will fix it later.

export default function Navbar() {
  const { user, logout } = useAuthStore();
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Prevent scroll when mobile menu is open
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

  const handleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    if (!clientId || clientId === 'YOUR_APPLICATION_ID_HERE') {
      setErrorMsg("Konfigurasi login belum lengkap (NEXT_PUBLIC_DISCORD_CLIENT_ID belum diatur). Hubungi admin.");
      return;
    }

    const redirectUri = encodeURIComponent(
      process.env.NEXT_PUBLIC_URL ? `${process.env.NEXT_PUBLIC_URL}/auth/callback` : 'http://localhost:3000/auth/callback'
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

  const navLinks = {
    utama: [
      { href: "/", label: "Karakter" },
      { href: "/inventory", label: "Inventory" },
      { href: "/pet", label: "Pet" },
      { href: "/assets", label: "Assets" },
    ],
    ekonomi: [
      { href: "/market", label: "Pasar" },
      { href: "/barter", label: "Barter" },
      { href: "/worker", label: "Pekerja" },
    ],
    komunitas: [
      { href: "/sect", label: "Sekte" },
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/tournament", label: "Turnamen" },
    ],
    referensi: [
      { href: "/almanack", label: "Almanack" }
    ]
  };

  return (
    <header className="bg-black/90 border-b border-[#333] sticky top-0 z-50 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex justify-between items-center">

        {/* Logo */}
        <Link href="/" className="text-xl font-bold font-serif text-[#c5a880] tracking-wider hover:text-yellow-200 transition-colors flex items-center z-50">
          JIANGHU RP
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1" ref={dropdownRef}>
          {navLinks.utama.map(link => (
            <Link key={link.href} href={link.href} className="px-3 py-2 text-sm text-gray-300 hover:text-[#c5a880] hover:bg-[#c5a880]/10 rounded-md transition-colors">
              {link.label}
            </Link>
          ))}

          {/* Dropdown Ekonomi */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('ekonomi')}
              className="px-3 py-2 text-sm text-gray-300 hover:text-[#c5a880] hover:bg-[#c5a880]/10 rounded-md transition-colors flex items-center gap-1"
            >
              Ekonomi <ChevronDown className="w-4 h-4" />
            </button>
            {openDropdown === 'ekonomi' && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-[#111] border border-[#333] rounded-md shadow-xl py-1 z-50">
                {navLinks.ekonomi.map(link => (
                  <Link key={link.href} href={link.href} onClick={() => setOpenDropdown(null)} className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#c5a880]/10 hover:text-[#c5a880]">
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Dropdown Komunitas */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('komunitas')}
              className="px-3 py-2 text-sm text-gray-300 hover:text-[#c5a880] hover:bg-[#c5a880]/10 rounded-md transition-colors flex items-center gap-1"
            >
              Komunitas <ChevronDown className="w-4 h-4" />
            </button>
            {openDropdown === 'komunitas' && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-[#111] border border-[#333] rounded-md shadow-xl py-1 z-50">
                {navLinks.komunitas.map(link => (
                  <Link key={link.href} href={link.href} onClick={() => setOpenDropdown(null)} className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#c5a880]/10 hover:text-[#c5a880]">
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {navLinks.referensi.map(link => (
            <Link key={link.href} href={link.href} className="px-3 py-2 text-sm text-gray-300 hover:text-[#c5a880] hover:bg-[#c5a880]/10 rounded-md transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Section (Auth & Mobile Toggle) */}
        <div className="flex items-center gap-2 lg:gap-4 z-50">
          {errorMsg && (
            <span className="text-[#8b0000] text-xs font-semibold hidden sm:inline">{errorMsg}</span>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-300 hidden sm:inline">{user.username}</span>
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full border border-[#c5a880]" />
              ) : (
                <div className="w-8 h-8 rounded-full border border-[#c5a880] bg-[#333] flex items-center justify-center text-xs">?</div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="border-[#333] text-gray-400 hover:text-white hover:bg-black/50 px-2 py-1 h-8 text-xs sm:px-3 sm:py-2 sm:h-9 sm:text-sm"
              >
                Logout
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleLogin}
              variant="destructive"
              size="sm"
              className="shadow-[0_0_10px_rgba(139,0,0,0.5)] px-2 py-1 h-8 text-xs sm:px-3 sm:py-2 sm:h-9 sm:text-sm"
            >
              Login Discord
            </Button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden p-2 text-gray-300 hover:text-[#c5a880]"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay / Drawer */}
      <div
        className={cn(
          "fixed inset-0 top-16 bg-black/95 backdrop-blur-xl z-40 transition-transform duration-300 ease-in-out overflow-y-auto lg:hidden flex flex-col",
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="p-4 flex flex-col gap-2 h-full">
          {errorMsg && (
            <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-md text-red-500 text-sm mb-4">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1 mb-6">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">Utama</div>
            {navLinks.utama.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className="block px-3 py-3 text-base text-gray-200 hover:bg-[#c5a880]/10 hover:text-[#c5a880] rounded-md"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="space-y-1 mb-6">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">Ekonomi</div>
            {navLinks.ekonomi.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className="block px-3 py-3 text-base text-gray-200 hover:bg-[#c5a880]/10 hover:text-[#c5a880] rounded-md"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="space-y-1 mb-6">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">Komunitas</div>
            {navLinks.komunitas.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className="block px-3 py-3 text-base text-gray-200 hover:bg-[#c5a880]/10 hover:text-[#c5a880] rounded-md"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="space-y-1 mb-6">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">Referensi</div>
            {navLinks.referensi.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className="block px-3 py-3 text-base text-gray-200 hover:bg-[#c5a880]/10 hover:text-[#c5a880] rounded-md"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-auto pt-6 border-t border-[#333]">
             {user && (
               <Button
                 variant="outline"
                 onClick={() => { logout(); closeMobileMenu(); }}
                 className="w-full justify-center border-[#333] text-gray-400"
               >
                 Logout
               </Button>
             )}
          </div>
        </div>
      </div>
    </header>
  );
}
