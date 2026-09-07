import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'student' | 'admin';
    termId: string | null;
  } | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (tokens: { accessToken: string; refreshToken: string }, user: any) => void;
  updateUser: (updates: Partial<AuthState['user']>) => Promise<void>;
  logout: () => Promise<void>;
  loadAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,

  setAuth: (tokens, user) => {
    SecureStore.setItemAsync('accessToken', tokens.accessToken);
    SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
    SecureStore.setItemAsync('user', JSON.stringify(user));
    set({
      isAuthenticated: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
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
    }
  },
}));
