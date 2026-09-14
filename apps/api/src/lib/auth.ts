import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins';
import { expo } from '@better-auth/expo';
import bcrypt from 'bcryptjs';
import {
  getDb,
} from '@manhaj/db';
import { betterAuthUser, betterAuthAccount, betterAuthSession, betterAuthVerification } from '@manhaj/db';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL  || 'https://manhaj-api-five.vercel.app',
  secret: process.env.BETTER_AUTH_SECRET || 'manhaj-better-auth-secret-key-12345',
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema: {
      user: betterAuthUser,
      session: betterAuthSession,
      account: betterAuthAccount,
      verification: betterAuthVerification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password: string) => {
        return await bcrypt.hash(password, 10);
      },
      verify: async ({ password, hash }: { password: string; hash: string }) => {
        return await bcrypt.compare(password, hash);
      },
    },
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'student',
        input: true,
      },
      termId: {
        type: 'string',
        required: false,
      },
    },
  },
  plugins: [
    bearer(),
    expo(),
  ],
  trustedOrigins: [
    'http://localhost:5173',
    'https://manhaj-api-five.vercel.app',
    'http://10.0.2.2:3000',
    'http://127.0.0.1:5173',
    ...(process.env.DASHBOARD_URL ? [process.env.DASHBOARD_URL] : []),
    'exp://',
    'exp://**',
    'exp://*/**',
    'exp://192.168.*.*:*/**',
    'exp+*://**',
    'exp+*://*/**',
    'exp+manhaj://',
    'exp+manhaj://**',
    'exp+manhaj://*/**',
    'exp+manhaj://expo-development-client',
    'exp+manhaj://expo-development-client/**',
    'manhaj://',
    'manhaj://**',
    'manhaj://*/**',
    'http://192.168.*:*',
    'http://192.168.*.*:*',
    'http://192.168.*:*/**',
    'http://192.168.*.*:*/**',
    'com.manhaj.student:///(tabs)'
  ],
});



