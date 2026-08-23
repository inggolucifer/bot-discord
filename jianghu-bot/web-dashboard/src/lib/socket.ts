import { io } from 'socket.io-client';

const URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') : 'http://localhost:3001';

export const socket = io(URL, {
  path: '/api/socket.io',
  autoConnect: false,
  transports: ['websocket', 'polling'], // Fallback mechanism for better stability behind proxies
  reconnectionAttempts: 5,
});
