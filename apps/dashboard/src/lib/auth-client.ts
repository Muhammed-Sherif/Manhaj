import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || 'https://manhaj-api-five.vercel.app',
});

export const { useSession, signIn, signOut, signUp } = authClient;
