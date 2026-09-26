'use client';

import { create } from 'zustand';
import api from './api';

interface User {
  id: string;
  username: string;
  avatar: string | null;
  hasCharacter?: boolean;
  appearanceCompleted?: boolean;
  character?: {
    characterName?: string;
    realm?: string;
    gender?: string;
    body?: {
      face?: string;
      frontHair?: string;
      backHair?: string;
      outfit?: string;
    };
  } | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  hasCharacter: boolean;
  appearanceCompleted: boolean;
  login: (token: string, user: User) => void;
  setAppearanceCompleted: (completed: boolean, updatedBody?: any) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  hasCharacter: false,
  appearanceCompleted: false,

  initialize: async () => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('jianghu_token');
      const storedUser = localStorage.getItem('jianghu_user');

      if (storedToken && storedUser) {
        try {
          const userObj = JSON.parse(storedUser) as User;
          
          set({
            token: storedToken,
            user: userObj,
            hasCharacter: userObj.hasCharacter || false,
            appearanceCompleted: userObj.appearanceCompleted || false
          });

          // Verifikasi ke server lewat /api/auth/me untuk kepastian authoritative
          try {
            const meRes = await api.get('/auth/me');
            if (meRes.data?.success && meRes.data?.user) {
              const freshUser = meRes.data.user;
              localStorage.setItem('jianghu_user', JSON.stringify(freshUser));
              set({
                user: freshUser,
                hasCharacter: !!freshUser.hasCharacter,
                appearanceCompleted: !!freshUser.appearanceCompleted
              });
            }
          } catch (meErr) {
            console.warn('[AUTH] Sesi kadaluarsa atau tidak valid:', meErr);
          }
        } catch (e) {
          console.error('Failed to parse stored user', e);
        }
      }
    }
  },

  login: (token, user) => {
    localStorage.setItem('jianghu_token', token);
    localStorage.setItem('jianghu_user', JSON.stringify(user));
    set({
      token,
      user,
      hasCharacter: user.hasCharacter || false,
      appearanceCompleted: user.appearanceCompleted || false
    });
  },

  setAppearanceCompleted: (completed, updatedBody) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser: User = {
        ...currentUser,
        appearanceCompleted: completed,
        character: currentUser.character ? {
          ...currentUser.character,
          body: updatedBody || currentUser.character.body
        } : null
      };
      localStorage.setItem('jianghu_user', JSON.stringify(updatedUser));
      set({
        user: updatedUser,
        appearanceCompleted: completed
      });
    } else {
      set({ appearanceCompleted: completed });
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout API failed', e);
    }
    localStorage.removeItem('jianghu_token');
    localStorage.removeItem('jianghu_user');
    set({
      token: null,
      user: null,
      hasCharacter: false,
      appearanceCompleted: false
    });
    window.location.href = '/';
  }
}));

export type UIModal = 'dashboard' | 'inventory' | 'sect' | 'cultivation' | 'pet' | 'assets' | 'stats' | 'achievements' | 'settings' | 'npcInteraction' | null;

interface UIState {
  activeModal: UIModal;
  setActiveModal: (modal: UIModal) => void;
  closeModal: () => void;
  isMapFullscreen: boolean;
  setMapFullscreen: (val: boolean) => void;
  showMobileMapNav: boolean;
  setShowMobileMapNav: (val: boolean) => void;
  toggleMobileMapNav: () => void;
  isTileInspectorActive: boolean;
  setIsTileInspectorActive: (val: boolean) => void;
  activeNpcId: string | null;
  setActiveNpcId: (id: string | null) => void;
  isLandingMenu: boolean;
  setIsLandingMenu: (val: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeModal: null, // Default shows no modal (hidden)
  setActiveModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null, activeNpcId: null }),
  isMapFullscreen: true,
  setMapFullscreen: (val) => set({ isMapFullscreen: val }),
  showMobileMapNav: false,
  setShowMobileMapNav: (val) => set({ showMobileMapNav: val }),
  toggleMobileMapNav: () => set((state) => ({ showMobileMapNav: !state.showMobileMapNav })),
  isTileInspectorActive: false,
  setIsTileInspectorActive: (val) => set({ isTileInspectorActive: val }),
  activeNpcId: null,
  setActiveNpcId: (id) => set({ activeNpcId: id, activeModal: id ? 'npcInteraction' : null }),
  isLandingMenu: true,
  setIsLandingMenu: (val) => set({ isLandingMenu: val })
}));
