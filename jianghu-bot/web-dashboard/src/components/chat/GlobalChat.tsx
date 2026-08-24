'use client';

import { useState, useEffect, useRef } from 'react';
import { socket } from '@/lib/socket';
import { useAuthStore } from '@/lib/store';
import { MessageSquare, X, Send, User } from 'lucide-react';
import FallbackImage from '@/components/FallbackImage';

interface ChatMessage {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  message: string;
  timestamp: string;
}

export default function GlobalChat({ onPlayerClick }: { onPlayerClick: (discordId: string) => void }) {
  const { user, token: storeToken } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Gunakan storeToken dari Zustand jika ada, kalau tidak ambil dari localStorage.
    // storeToken akan re-trigger effect ini kalau berubah (misal habis login).
    const currentToken = storeToken || localStorage.getItem('jianghu_token');

    if (currentToken) {
      socket.auth = { token: currentToken };
    } else {
      socket.auth = {}; // Clear token jika tidak login
    }

    // Putuskan dulu kalau sedang terkoneksi tapi token berubah
    if (socket.connected) {
       socket.disconnect();
    }
    socket.connect();

    function onConnect() {
      setIsConnected(true);
      setConnectionError(null);
    }
    function onDisconnect() {
      setIsConnected(false);
    }
    function onChatHistory(history: ChatMessage[]) {
      setMessages(history);
    }
    function onNewMessage(msg: ChatMessage) {
      setMessages(prev => [...prev, msg]);
    }
    function onConnectError(err: Error) {
        console.error('Socket connect error:', err.message);
        setIsConnected(false);
        setConnectionError('Koneksi Gagal');
        // Stop retrying if it's an auth error or if we've failed repeatedly
        if (err.message.includes('Authentication error')) {
            socket.disconnect();
        }
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('chat_history', onChatHistory);
    socket.on('new_message', onNewMessage);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('chat_history', onChatHistory);
      socket.off('new_message', onNewMessage);
      socket.disconnect();
    };
  }, [storeToken]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    socket.emit('send_message', {
      user: {
        id: (user as unknown as { userId: string, id: string }).userId || user.id,
        name: user.username,
        avatar: user.avatar
      },
      message: input.trim()
    });

    setInput('');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-[#1a1a1a]/95 backdrop-blur-md border border-[#c5a880]/50 rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.8)] w-[320px] sm:w-[380px] h-[450px] flex flex-col mb-4 overflow-hidden">
          {/* Header */}
          <div className="bg-black border-b border-[#333] p-3 flex justify-between items-center">
            <h3 className="text-[#c5a880] font-bold flex items-center gap-2">
              <MessageSquare size={16} /> Chat Global
              <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} title={isConnected ? 'Terhubung' : 'Terputus'}></span>
                  {!isConnected && <span className="text-[10px] text-gray-400">{connectionError || 'Menyambung...'}</span>}
              </div>
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {messages.length === 0 ? (
              <p className="text-center text-xs text-gray-500 mt-10">Belum ada pesan. Mulai obrolan!</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.user.id === ((user as unknown as { userId: string, id: string })?.userId || user?.id) ? 'flex-row-reverse' : ''}`}>
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0 border border-[#444] overflow-hidden cursor-pointer hover:border-[#c5a880] transition-colors"
                    onClick={() => onPlayerClick(msg.user.id)}
                    title="Lihat Profil"
                  >
                    {msg.user.avatar ? (
                      <FallbackImage
                         src={msg.user.avatar}
                         alt={msg.user.name}
                         fallbackNode={<div className="bg-gray-800 w-full h-full flex items-center justify-center text-xs">👤</div>}
                      />
                    ) : (
                      <div className="bg-gray-800 w-full h-full flex items-center justify-center text-xs"><User size={14}/></div>
                    )}
                  </div>
                  <div className={`flex flex-col ${msg.user.id === ((user as unknown as { userId: string, id: string })?.userId || user?.id) ? 'items-end' : 'items-start'} max-w-[75%]`}>
                    <span
                        className="text-[10px] text-gray-400 mb-0.5 cursor-pointer hover:text-[#c5a880] transition-colors"
                        onClick={() => onPlayerClick(msg.user.id)}
                    >
                        {msg.user.name}
                    </span>
                    <div className={`p-2 rounded-lg text-sm ${msg.user.id === ((user as unknown as { userId: string, id: string })?.userId || user?.id) ? 'bg-[#8b0000]/60 text-white rounded-tr-none' : 'bg-black/60 text-gray-200 border border-[#333] rounded-tl-none'}`}>
                      {msg.message}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-black border-t border-[#333]">
            {user ? (
                <form onSubmit={handleSend} className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isConnected ? "Ketik pesan..." : (connectionError || "Menyambungkan...")}
                    className="flex-1 bg-[#1a1a1a] border border-[#444] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c5a880] transition-colors disabled:opacity-50"
                    maxLength={200}
                    disabled={!isConnected}
                />
                <button
                    type="submit"
                    disabled={!input.trim() || !isConnected}
                    className="bg-[#8b0000] hover:bg-red-800 disabled:bg-gray-700 text-white p-2 rounded transition-colors flex items-center justify-center disabled:opacity-50"
                >
                    <Send size={16} />
                </button>
                </form>
            ) : (
                <p className="text-xs text-center text-gray-500 py-2">Anda harus login untuk chat.</p>
            )}
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#8b0000] hover:bg-red-800 text-white rounded-full p-3 shadow-lg border border-[#c5a880]/30 transition-all hover:scale-105 animate-bounce-slow"
        >
          <MessageSquare size={24} />
        </button>
      )}
    </div>
  );
}
