import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jianghu World - Player Dashboard",
  description: "Web Dashboard for Jianghu World Discord RPG Bot",
  manifest: "/manifest.json",
};

import Navbar from "@/components/Navbar";
import GlobalChatWrapper from '@/components/chat/GlobalChatWrapper';
import AuthInitializer from "@/components/AuthInitializer";
import { ToastContainer } from "@/components/ui/ToastContainer";
import ReactQueryProvider from "@/components/ReactQueryProvider";
import SocketProvider from "@/components/SocketProvider";
import ProductTour from "@/components/ui/tour/ProductTour";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen flex flex-col relative">
        <ReactQueryProvider>
          <SocketProvider>
            <AuthInitializer />
        <div className="wuxia-bg"></div>
        <div className="bamboo-overlay-left hidden md:block"></div>
        <div className="bamboo-overlay-right hidden md:block"></div>

        <Navbar />

        {/* Main Content Area */}
        <main className="flex-grow w-full h-full relative z-10">
          {children}
        </main>

        <GlobalChatWrapper />
        <ToastContainer />
        <ProductTour />
          </SocketProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
