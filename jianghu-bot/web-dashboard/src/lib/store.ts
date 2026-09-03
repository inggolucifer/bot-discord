'use client';

import { create } from 'zustand';
import api from './api';

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

  initialize: async () => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('jianghu_token');
      const storedUser = localStorage.getItem('jianghu_user');

      if (storedToken && storedUser) {
        try {
          const userObj = JSON.parse(storedUser) as User;

          // Trigger migration to ensure cookies are set if they aren't
          try {
             const res = await api.post('/auth/migrate', { token: storedToken });
             if (res.data.token) {
                 localStorage.setItem('jianghu_token', res.data.token);
                 set({
                   token: res.data.token,
                   user: userObj,
                   hasCharacter: userObj.hasCharacter || false
                 });
                 return;
             }
          } catch (migrateErr) {
             console.error("Migration failed, might already be on cookie or token is invalid.", migrateErr);
          }

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

  logout: async () => {
    try {
        await api.post('/auth/logout');
    } catch (e) {
        console.error("Logout API failed", e);
    }
    localStorage.removeItem('jianghu_token');
    localStorage.removeItem('jianghu_user');
    set({ token: null, user: null, hasCharacter: false });
    window.location.href = '/';
  }
}));
