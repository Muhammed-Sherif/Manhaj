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

const handleContentUpdated = async () => {
    
    if (await getAutoDownloadEnabled()) {
        console.log(true)
        await syncContentFromServer();
    }
};

const CONTENT_UPDATE_TASK = 'manhaj-content-update';

TaskManager.defineTask<Notifications.NotificationTaskPayload>(CONTENT_UPDATE_TASK, async ({ data, error }) => {
    if (error) return;
    const payload = data as any;
    if (payload?.data?.body && JSON.parse(payload.data.body).type === 'content-updated') {
        console.log("content updated", data)
        await handleContentUpdated();
    }
});

void Notifications.registerTaskAsync(CONTENT_UPDATE_TASK);

Notifications.addNotificationReceivedListener((notification) => {
    if (notification.request.content.data?.type === 'content-updated') {
        void handleContentUpdated().catch((error) => console.warn('Push content sync failed', error));
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
            deviceToken: expoPushToken,
            platform: Platform.OS
        }).catch((error) => console.warn('Failed to register device token', error));
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
            hour: 8,
            minute: 0,
            repeats: true,
        } as any,
    });

    // Schedule daily reminder at 8:00 PM for reviewables
    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Spaced Repetition Review",
            body: "You have flashcards and cases due for review today.",
        },
        trigger: {
            hour: 20,
            minute: 0,
            repeats: true,
        } as any,
    });
};
