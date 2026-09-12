import React, { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import type { UseFormHandleSubmit } from 'react-hook-form';
import { authClient } from '../../lib/auth-client';
import { useAuthStore } from '../../store/authStore';
import type { AuthFormData } from './types';

interface AuthSubmitButtonProps {
  isLogin: boolean;
  isSubmitting?: boolean;
  handleSubmit: UseFormHandleSubmit<AuthFormData>;
}

export function AuthSubmitButton({
  isLogin,
  isSubmitting = false,
  handleSubmit,
}: AuthSubmitButtonProps) {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: AuthFormData) => {
    setLoading(true);
    const email = (data.email ?? '').trim().toLowerCase();
    const password = data.password ?? '';
    const name = (data.name ?? '').trim();

    try {
      if (isLogin) {
        const res = await authClient.signIn.email({
          email,
          password,
        });

        if (res.error) {
          throw new Error(res.error.message || 'Invalid email or password');
        }

        const authData = res.data as any;
        const token = authData?.token || authData?.session?.token || '';
        const user = authData?.user || { id: '', email, name: '' };
        await setAuth(
          {
            accessToken: token,
            refreshToken: token,
          },
          user
        );
      } else {
        const res = await authClient.signUp.email({
          name,
          email,
          password,
        });

        if (res.error) {
          throw new Error(res.error.message || 'Registration failed');
        }

        const authData = res.data as any;
        const token = authData?.token || authData?.session?.token || '';
        const user = authData?.user || { id: '', email, name };
        await setAuth(
          {
            accessToken: token,
            refreshToken: token,
          },
          user
        );
      }

      router.replace('/(tabs)');
    } catch (error: any) {
      const message = error?.message || 'Authentication failed';
      console.error('Authentication error:', message);
      Alert.alert('Authentication Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const isBusy = loading || isSubmitting;

  return (
    <TouchableOpacity
      className={`rounded-lg p-4 items-center mb-4 mt-2 shadow-sm ${
        isBusy ? 'bg-teal-400' : 'bg-teal-600 active:bg-teal-700'
      }`}
      onPress={handleSubmit(onSubmit)}
      disabled={isBusy}
      activeOpacity={0.8}
    >
      {isBusy ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <Text className="text-white text-base font-semibold">
          {isLogin ? 'Login' : 'Create Account'}
        </Text>
      )}
    </TouchableOpacity>
  );
}
