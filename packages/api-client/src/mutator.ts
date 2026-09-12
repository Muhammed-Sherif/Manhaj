import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

declare const process: any;
declare const require: any;

const getBaseURL = (): string => {
  try {
    const viteUrl = (import.meta as any)?.env?.VITE_API_URL;
    if (viteUrl) return viteUrl;
  } catch {}

  if (typeof process !== 'undefined' && process?.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    return 'http://localhost:3000';
  }

  return 'http://10.0.2.2:3000';
};

// Configure axios with base URL from environment variable
export const apiClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor for secure token handling
apiClient.interceptors.request.use(async (config) => {
  let accessToken: string | null = null;

  // Web storage (browser)
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      accessToken =
        window.localStorage.getItem('manhaj_access_token') ||
        window.localStorage.getItem('accessToken');
    } catch {}
  } else {
    // Mobile storage (expo-secure-store)
    try {
      const SecureStore = require('expo-secure-store');
      if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
        accessToken = await SecureStore.getItemAsync('accessToken');
      }
    } catch {}
  }

  if (accessToken) {
    if (typeof config.headers?.set === 'function') {
      config.headers.set('x-auth-token', accessToken);
      config.headers.set('Authorization', `Bearer ${accessToken}`);
    } else {
      (config.headers as any) = config.headers || {};
      (config.headers as any)['x-auth-token'] = accessToken;
      (config.headers as any)['Authorization'] = `Bearer ${accessToken}`;
    }
  }

  return config;
});

// Handle 401 unauthorized in browser by clearing stale tokens
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      const storedToken =
        window.localStorage.getItem('manhaj_access_token') ||
        window.localStorage.getItem('accessToken');
      if (storedToken) {
        window.localStorage.removeItem('manhaj_access_token');
        window.localStorage.removeItem('accessToken');
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export const customAxios = async <T = any, V = any>(
  config: AxiosRequestConfig<V>,
  options: AxiosRequestConfig<V> = {}
): Promise<import('axios').AxiosResponse<T>> => {
  return apiClient.request<T>({ ...config, ...options });
};