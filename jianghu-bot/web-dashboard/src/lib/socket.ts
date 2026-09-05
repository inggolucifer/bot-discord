import { io } from 'socket.io-client';

// Helper to safely construct the base URL without path issues
const getBaseUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return 'http://localhost:3001';

  try {
    // We use the global Window URL object in browser, or global Node URL in server.
    const parsedUrl = new globalThis.URL(apiUrl);
    return `${parsedUrl.protocol}//${parsedUrl.host}`;
  } catch (error) {
    // Fallback if the URL parsing fails (e.g. invalid string in env)
    return apiUrl.replace(/\/api\/?$/, '');
  }
};

const BASE_URL: string = getBaseUrl();

export const socket = io(BASE_URL, {
  path: '/api/socket.io',
  autoConnect: false,
  transports: ['websocket', 'polling'], // Fallback mechanism for better stability behind proxies
  reconnectionAttempts: 5,
  withCredentials: true,
});
