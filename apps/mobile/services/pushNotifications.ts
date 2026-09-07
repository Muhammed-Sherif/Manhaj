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
        await syncContentFromServer();
    }
};

const CONTENT_UPDATE_TASK = 'manhaj-content-update';

TaskManager.defineTask(CONTENT_UPDATE_TASK, async ({ data, error }) => {
    if (error) return;
    const notification = data as { notification?: { request?: { content?: { data?: Record<string, unknown> } } } };
    if (notification.notification?.request?.content?.data?.type === 'content-updated') {
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

    const permissions = await Notifications.getPermissionsAsync();
    let status = permissions.status;
    if (status !== 'granted') {
        status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
    );

    await postStudentDevicesRegister({
        pushToken: token.data,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
};
