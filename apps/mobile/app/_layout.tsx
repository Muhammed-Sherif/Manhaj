import { useEffect } from 'react';
import { AppState, View, LogBox } from 'react-native';

LogBox.ignoreLogs(['[Reanimated] dependencies should only be used in web implementation']);
import NetInfo from '@react-native-community/netinfo';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useAuthStore } from '../store/authStore';
import { useProgressStore } from '../store/progressStore';
import { registerForPushNotifications } from '../services/pushNotifications';
import { syncPendingChanges } from '../services/syncService';
import { ThemeProvider } from '../components/ThemeProvider';
import '../global.css';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { processRecurringTasks } from '../services/taskRecurrenceService';

const BACKGROUND_RECURRENCE_TASK = 'background-recurrence-task';

TaskManager.defineTask(BACKGROUND_RECURRENCE_TASK, async () => {
  try {
    await processRecurringTasks();
    return BackgroundTask.BackgroundTaskResult.NewData;
  } catch (err) {
    console.error('Background Recurrence Task Failed:', err);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

const queryClient = new QueryClient();

function AppLayout() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, loadAuth } = useAuthStore();
  const { loadProgress } = useProgressStore();
  const isDark = useColorScheme().colorScheme === 'dark';


  useEffect(() => {
    void loadAuth();
    void loadProgress();
  }, [loadAuth, loadProgress]);

  useEffect(() => {
    if (isAuthenticated) {
      void registerForPushNotifications().catch((error) => {
        console.warn('Push registration failed', error);
      });

      void BackgroundTask.registerTaskAsync(BACKGROUND_RECURRENCE_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        startOnBoot: true,      // android only
      }).catch((error) => {
        console.warn('Background recurrence task registration failed', error);
      });

      const sync = () => {
        void syncPendingChanges().catch((error) => {
          console.warn('Background sync failed', error);
        });
        void processRecurringTasks().catch((error) => {
          console.warn('Foreground recurrence check failed', error);
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
    <View className={`flex-1 ${isDark ? 'dark' : 'light'}`}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
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
        <Stack.Screen name="study-unit" />
        <Stack.Screen name="video" />
        <Stack.Screen name="pdf" />
        <Stack.Screen name="custom-study" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppLayout />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
