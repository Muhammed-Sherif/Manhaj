import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { postAuthLogin, postAuthRegister } from '@manhaj/api-client';

export default function AuthScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleAuth = async () => {
    // In production, integrate with expo-auth-session
    Alert.alert('Google Auth', 'Google authentication will be implemented with expo-auth-session');
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isLogin && !name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);

    try {
      let response;
      if (isLogin) {
        response = await postAuthLogin({ email, password });
      } else {
        response = await postAuthRegister({ name, email, password });
      }

      const authData = response.data;
      setAuth(
        { 
          accessToken: authData.accessToken || '', 
          refreshToken: authData.refreshToken || '' 
        },
        authData.user
      );
      router.replace('/(tabs)');
    } catch (error: any) {
      // Prefer the server's descriptive error message over the generic Axios one
      const serverMessage = error?.response?.data?.error;
      const message = serverMessage || error?.message || 'An unknown error occurred';
      console.error('Authentication error:', message, error?.response?.data);
      Alert.alert('Error', 'Authentication failed: ' + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-4xl font-bold text-teal-600 text-center mb-2">Manhaj</Text>
      <Text className="text-base text-slate-500 text-center mb-8">Offline-First Student Question Bank</Text>

      <TouchableOpacity 
        className="bg-white border border-slate-200 rounded-lg p-4 items-center mb-4"
        onPress={handleGoogleAuth}
      >
        <Text className="text-slate-800 text-base font-semibold">Continue with Google</Text>
      </TouchableOpacity>

      <View className="flex-row items-center my-6">
        <View className="flex-1 h-px bg-slate-200" />
        <Text className="mx-4 text-slate-400">or</Text>
        <View className="flex-1 h-px bg-slate-200" />
      </View>

      {!isLogin && (
        <TextInput
          className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 text-base"
          placeholder="Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      )}

      <TextInput
        className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 text-base"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 text-base"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className={`rounded-lg p-4 items-center mb-4 ${loading ? 'bg-slate-400' : 'bg-teal-600'}`}
        onPress={handleEmailAuth}
        disabled={loading}
      >
        <Text className="text-white text-base font-semibold">
          {loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
        <Text className="text-teal-600 text-center text-sm">
          {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
