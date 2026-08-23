import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "Jianghu RP - Meta Economy Dashboard",
  description: "Web Dashboard for Jianghu RP Discord Bot",
};

import Navbar from "@/components/Navbar";
import GlobalChatWrapper from '@/components/chat/GlobalChatWrapper';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} ${playfair.variable} antialiased min-h-screen flex flex-col relative`}>
        <div className="wuxia-bg"></div>
        <div className="bamboo-overlay-left hidden md:block"></div>
        <div className="bamboo-overlay-right hidden md:block"></div>

        <Navbar />

        {/* Main Content Area */}
        <main className="flex-grow container mx-auto p-4 md:p-8 relative z-10">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-black/90 border-t border-[#333] p-6 text-center text-xs text-gray-500 mt-auto relative z-10">
          <p>© {new Date().getFullYear()} Jianghu Roleplay Server. All Rights Reserved.</p>
        </footer>
        <GlobalChatWrapper />
      </body>
    </html>
  );
}
