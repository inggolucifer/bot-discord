'use client';

import { useAuthStore } from '@/lib/store';
import Link from 'next/link';

export default function Navbar() {
  const { user, logout } = useAuthStore();

  const handleLogin = () => {
    // Replace with your actual Discord OAuth URL
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || 'YOUR_CLIENT_ID';
    const redirectUri = encodeURIComponent(
      process.env.NEXT_PUBLIC_URL ? `${process.env.NEXT_PUBLIC_URL}/auth/callback` : 'http://localhost:3000/auth/callback'
    );
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify`;
  };

  return (
    <header className="bg-black/80 border-b border-[#333] p-4 sticky top-0 z-50 backdrop-blur-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-[#c5a880] tracking-wider hover:text-yellow-200 transition-colors">
          JIANGHU RP
        </Link>
        <nav className="hidden md:flex gap-6 text-sm">
          <Link href="/" className="hover:text-[#c5a880] transition-colors">Karakter</Link>
          <Link href="/inventory" className="hover:text-[#c5a880] transition-colors">Inventory</Link>
          <Link href="/market" className="hover:text-[#c5a880] transition-colors">Pasar</Link>
        </nav>
        <div className="flex gap-4 items-center">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-300 hidden md:inline">{user.username}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {user.avatar && <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full border border-[#c5a880]" />}
              <button
                onClick={logout}
                className="bg-black hover:bg-[#1a1a1a] text-gray-400 px-3 py-1.5 rounded text-xs transition-colors border border-[#333]"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="bg-[#8b0000] hover:bg-red-800 text-white px-4 py-2 rounded text-sm transition-colors border border-red-900 shadow-[0_0_10px_rgba(139,0,0,0.5)]"
            >
              Login Discord
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
