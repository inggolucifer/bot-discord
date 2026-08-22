'use client';

import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  avatar: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('jianghu_token') : null,
  user: typeof window !== 'undefined' && localStorage.getItem('jianghu_user')
    ? JSON.parse(localStorage.getItem('jianghu_user') as string)
    : null,

  login: (token, user) => {
    localStorage.setItem('jianghu_token', token);
    localStorage.setItem('jianghu_user', JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('jianghu_token');
    localStorage.removeItem('jianghu_user');
    set({ token: null, user: null });
    window.location.href = '/';
  }
}));
