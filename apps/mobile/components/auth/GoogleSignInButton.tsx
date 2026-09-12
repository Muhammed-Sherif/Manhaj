import { authClient } from '@/lib/auth-client';
import { useAuthStore } from '@/store';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { TouchableOpacity, Text, Image, ActivityIndicator, Alert } from 'react-native';
import * as Linking from 'expo-linking';

export function GoogleSignInButton() {
    const { setAuth } = useAuthStore();
    const  router = useRouter();
    const [loading, setLoading] = useState(false);
    const handleGoogleAuth = async () => {
      try {
        setLoading(true);
        const res = await authClient.signIn.social({
          provider: 'google',
          callbackURL: Linking.createURL('/(tabs)'),
        });
        console.log(res)
        if (res?.error) {
          throw new Error(res.error.message || 'Google authentication failed');
        }
  
        // Sync session into zustand auth store
        const session = await authClient.getSession();
        if (session?.data) {
          const sessionData = session.data as any;
          const token = sessionData?.token || sessionData?.session?.token || '';
          const user = sessionData?.user || { id: '', email: '', name: '' };
          await setAuth(
            {
              accessToken: token,
              refreshToken: token,
            },
            user
          );
          router.replace('/(tabs)');
        }
      } catch (error: any) {
        const message = error?.message || 'Google authentication failed';
        console.error('Google auth error:', message);
        Alert.alert('Google Sign-In', message);
      } finally {
        setLoading(false)
      }
    };
  return (
    <TouchableOpacity
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 items-center mb-4 flex-row justify-center gap-2 shadow-sm"
      onPress={handleGoogleAuth}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#0d9488" />
      ) : (
        <>
          <Image
            source={require('../../assets/images/google.webp')}
            className="w-5 h-5"
            resizeMode="contain"
          />
          <Text className="text-slate-800 dark:text-slate-100 text-base font-semibold">Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
