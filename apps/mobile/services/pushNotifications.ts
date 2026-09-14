import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { postStudentDevicesRegister } from '@manhaj/api-client';
import { getAutoDownloadEnabled, syncContentFromServer } from './contentSyncService';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

const handleContentUpdated = async (source: string) => {
    console.log(`[ContentSync] (${source}) content-updated notification received`);
    try {
        const autoDownload = await getAutoDownloadEnabled();
        console.log(`[ContentSync] (${source}) auto-download enabled: ${autoDownload}`);
        if (autoDownload) {
            const startedAt = Date.now();
            await syncContentFromServer();
            console.log(`[ContentSync] (${source}) sync completed in ${Date.now() - startedAt}ms`);
        } else {
            console.log(`[ContentSync] (${source}) skipped sync (auto-download disabled)`);
        }
    } catch (error) {
        console.error(`[ContentSync] (${source}) sync failed:`, error);
        throw error;
    }
};

export const scheduleTaskReminders = async () => {
    // Cancel all existing scheduled reminders first
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule daily reminder at 8:00 AM
    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Daily Tasks",
            body: "Don't forget to complete your daily Zekr and Wird targets!",
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 8,
            minute: 0,
        },
    });

    // Schedule daily reminder at 8:00 PM for reviewables
    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Spaced Repetition Review",
            body: "You have flashcards and cases due for review today.",
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 20,
            minute: 0,
        },
    });
};

const CONTENT_UPDATE_TASK = 'manhaj-content-update';

TaskManager.defineTask<Notifications.NotificationTaskPayload>(CONTENT_UPDATE_TASK, async ({ data, error }) => {
    console.log('[ContentSync] background task triggered', { error: error?.message });
    if (error) {
        console.error('[ContentSync] background task error:', error);
        return;
    }
    const payload = data as any;
    let body: any = null;
    try {
        body = payload?.data?.body ? JSON.parse(payload.data.body) : null;
    } catch (parseError) {
        console.warn('[ContentSync] failed to parse task payload body:', parseError, 'raw:', payload?.data?.body);
    }
    console.log('[ContentSync] background task payload:', JSON.stringify(payload));
    if (body?.type === 'content-updated') {
        console.log('[ContentSync] background task matched content-updated type');
        try {
            await handleContentUpdated('background-task');
        } catch {
            // already logged inside handleContentUpdated
        }
    } else {
        console.log(`[ContentSync] background task ignored (type: ${body?.type ?? 'none'})`);
    }
});

void Notifications.registerTaskAsync(CONTENT_UPDATE_TASK);

Notifications.addNotificationReceivedListener((notification) => {
    const type = notification.request.content.data?.type;
    console.log('[ContentSync] notification received in foreground, data.type:', type);
    if (type === 'content-updated') {
        void handleContentUpdated('foreground-listener').catch((error) => console.warn('[ContentSync] push content sync failed', error));
    }
});

export const registerForPushNotifications = async (): Promise<void> => {
    if (Platform.OS === 'web') return;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    const permissions = await Notifications.getPermissionsAsync();
    let status = permissions.status;
    if (status !== 'granted') {
        status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (projectId) {
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        const expoPushToken = tokenData.data;

        await postStudentDevicesRegister({
            pushToken: expoPushToken,
            platform: Platform.OS
        }).catch((error) => console.warn('Failed to register device token', error));
    }
};
