'use client';
import { useEffect } from 'react';
import { socket } from '@/lib/socket';
import { useAuthStore } from '@/lib/store';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/Toast';

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token: storeToken } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    const currentToken = storeToken || localStorage.getItem('jianghu_token');
    if (currentToken) {
      socket.auth = { token: currentToken };
      if (!socket.connected) socket.connect();
    } else {
      socket.auth = {};
      if (socket.connected) socket.disconnect();
    }

    const onUserUpdate = (data: any) => {
       queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
       queryClient.invalidateQueries({ queryKey: ['inventory'] });
       queryClient.invalidateQueries({ queryKey: ['cultivation'] });
       queryClient.invalidateQueries({ queryKey: ['market_shop'] });
       queryClient.invalidateQueries({ queryKey: ['market_auctions'] });
       queryClient.invalidateQueries({ queryKey: ['market_listings'] });
       queryClient.invalidateQueries({ queryKey: ['market_my_listings'] });
       queryClient.invalidateQueries({ queryKey: ['arenaOpponents'] });
       if (data && data.message) {
           // Provide fallback for toast structure
           try {
             toast.show({ message: data.message, type: 'info' });
           } catch (e) {
             console.log(e);
           }
       }
    };

    socket.on('user_update', onUserUpdate);
    return () => { socket.off('user_update', onUserUpdate); };
  }, [storeToken, queryClient]);
  return <>{children}</>;
}
