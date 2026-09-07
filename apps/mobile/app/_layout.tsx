import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { registerForPushNotifications } from '../services/pushNotifications';
import { syncPendingChanges } from '../services/syncService';
import '../global.css';

const queryClient = new QueryClient();

function AppLayout() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, loadAuth } = useAuthStore();


  useEffect(() => {
    void loadAuth();
  }, [loadAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      void registerForPushNotifications().catch((error) => {
        console.warn('Push registration failed', error);
      });

      const sync = () => {
        void syncPendingChanges().catch((error) => {
          console.warn('Background sync failed', error);
        });
      };
      const appStateSubscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') sync();
      });
      const networkSubscription = NetInfo.addEventListener((state) => {
        if (state.isConnected) sync();
      });
      sync();

      return () => {
        appStateSubscription.remove();
        networkSubscription();
      };
    }
  }, [isAuthenticated]);

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { paddingTop: insets.top },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="solve" />
        <Stack.Screen name="lecture" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppLayout />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
