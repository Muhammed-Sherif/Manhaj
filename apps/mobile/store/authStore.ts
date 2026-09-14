import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  isAuthenticated: boolean;
  isHydrated: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'student' | 'admin';
    gradeId?: string | null;
    grade?: string | null;
    termId: string | null;
  };
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (tokens: { accessToken: string; refreshToken: string }, user: any) => Promise<void>;
  updateTokens: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
  updateUser: (updates: Partial<AuthState['user']>) => Promise<void>;
  logout: () => Promise<void>;
  loadAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isHydrated: false,
  user: null,
  accessToken: null,
  refreshToken: null,

  setAuth: async (tokens, user) => {
    await SecureStore.setItemAsync('accessToken', tokens.accessToken);
    await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    set({
      isAuthenticated: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    });
  },

  updateTokens: async (tokens) => {
    await SecureStore.setItemAsync('accessToken', tokens.accessToken);
    await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  },

  updateUser: async (updates) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;
    const user = { ...currentUser, ...updates };
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    set({ user });
  },

  logout: async () => {
    try {
      const { authClient } = await import('../lib/auth-client');
      await authClient.signOut();
    } catch {}
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
    set({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
    });
  },

  loadAuth: async () => {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      const userStr = await SecureStore.getItemAsync('user');

      if (accessToken && refreshToken && userStr) {
        set({
          isAuthenticated: true,
          accessToken,
          refreshToken,
          user: JSON.parse(userStr),
        });
      }
    } catch (error) {
      console.error('Failed to load auth:', error);
    } finally {
      set({ isHydrated: true });
    }
  },
}));
