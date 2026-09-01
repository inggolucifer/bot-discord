'use client';

import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  avatar: string | null;
  hasCharacter?: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  hasCharacter: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('jianghu_token') : null,
  user: typeof window !== 'undefined' && localStorage.getItem('jianghu_user') ? JSON.parse(localStorage.getItem('jianghu_user') || '{}') : null,
  hasCharacter: typeof window !== 'undefined' && localStorage.getItem('jianghu_user') ? JSON.parse(localStorage.getItem('jianghu_user') || '{}').hasCharacter || false : false,

  initialize: () => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('jianghu_token');
      const storedUser = localStorage.getItem('jianghu_user');

      if (storedToken && storedUser) {
        try {
          const userObj = JSON.parse(storedUser) as User;
          set({
            token: storedToken,
            user: userObj,
            hasCharacter: userObj.hasCharacter || false
          });
        } catch (e) {
          console.error("Failed to parse stored user", e);
        }
      }
    }
  },

  login: (token, user) => {
    localStorage.setItem('jianghu_token', token);
    localStorage.setItem('jianghu_user', JSON.stringify(user));
    set({ token, user, hasCharacter: user.hasCharacter || false });
  },

  logout: () => {
    localStorage.removeItem('jianghu_token');
    localStorage.removeItem('jianghu_user');
    set({ token: null, user: null, hasCharacter: false });
    window.location.href = '/';
  }
}));
