import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "Jianghu RP - Meta Economy Dashboard",
  description: "Web Dashboard for Jianghu RP Discord Bot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} ${playfair.variable} antialiased min-h-screen flex flex-col`}>
        {/* Navigation Bar Placeholder */}
        <header className="bg-black/80 border-b border-[#333] p-4 sticky top-0 z-50">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold text-[#c5a880] tracking-wider">JIANGHU RP</h1>
            <nav className="hidden md:flex gap-6 text-sm">
              <a href="/" className="hover:text-[#c5a880] transition-colors">Karakter</a>
              <a href="/inventory" className="hover:text-[#c5a880] transition-colors">Inventory</a>
              <a href="/market" className="hover:text-[#c5a880] transition-colors">Pasar</a>
            </nav>
            <div className="flex gap-4">
               {/* Login Button Placeholder */}
               <button className="bg-[#8b0000] hover:bg-red-800 text-white px-4 py-2 rounded text-sm transition-colors border border-red-900 shadow-[0_0_10px_rgba(139,0,0,0.5)]">
                 Login Discord
               </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-grow container mx-auto p-4 md:p-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-black/90 border-t border-[#333] p-6 text-center text-xs text-gray-500 mt-auto">
          <p>© {new Date().getFullYear()} Jianghu Roleplay Server. All Rights Reserved.</p>
        </footer>
      </body>
    </html>
  );
}
