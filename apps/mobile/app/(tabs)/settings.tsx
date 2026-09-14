import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { CheckIcon, ChevronRightIcon, LogOutIcon, MoonIcon, SunIcon, MonitorIcon, RefreshCwIcon } from 'lucide-react-native';
import { getStudentProfile, patchStudentProfile, getStudentGradesWithTerms } from '@manhaj/api-client';
import { useAuthStore } from '../../store/authStore';
import { getAutoDownloadEnabled, setAutoDownloadEnabled } from '../../services/contentSyncService';
import { syncPendingChanges } from '../../services/syncService';
import Modal from '../../components/Modal';
import { setColorScheme, getPersistedColorScheme } from '../../components/ThemeProvider';

interface GradeWithTerms {
    id?: string;
    name?: string;
    terms?: Array<{ id?: string; name?: string }>;
}

export default function SettingsScreen() {
    const router = useRouter();
    const { user, updateUser, logout } = useAuthStore();
    // Local state tracks the user's *preference* (light | dark | system).
    // nativewind's useColorScheme() only returns 'light' | 'dark', never 'system',
    // so we keep the choice ourselves and initialize from SQLite.
    const [themeChoice, setThemeChoice] = useState<'light' | 'dark' | 'system'>(
        getPersistedColorScheme,
    );
    const [grades, setGrades] = useState<GradeWithTerms[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [autoDownload, setAutoDownload] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [profile, gradeTree, autoDownloadEnabled] = await Promise.all([
                    getStudentProfile(),
                    getStudentGradesWithTerms(),
                    getAutoDownloadEnabled(),
                ]);
                const currentTermId = profile.data.termId;
                const matchedGrade = gradeTree.data.find((g) => g.terms?.some((t) => t.id === currentTermId));
                await updateUser({
                    termId: currentTermId,
                    gradeId: matchedGrade?.id ?? null,
                    grade: matchedGrade?.name ?? null,
                });
                setGrades(gradeTree.data);
                setAutoDownload(autoDownloadEnabled);

            } catch {
                Alert.alert('Unable to load terms', 'Connect to the internet and try again.');
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [updateUser]);

    const toggleAutoDownload = async (value: boolean) => {
        setAutoDownload(value);
        await setAutoDownloadEnabled(value);
    };

    const handleManualSync = async () => {
        if (isSyncing) return;

        const network = await NetInfo.fetch();
        if (!network.isConnected) {
            Alert.alert('No internet', 'Connect to the internet and try again.');
            return;
        }

        setIsSyncing(true);
        try {
            const result = await syncPendingChanges();
            if (result.success) {
                setLastSyncedAt(formatTime(new Date()));
                Alert.alert('Sync complete', 'Your content is up to date.');
            } else {
                Alert.alert('Sync failed', 'Some items could not be synced. Please try again.');
            }
        } catch {
            Alert.alert('Sync failed', 'An error occurred while syncing. Please try again.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleThemeChange = (scheme: 'light' | 'dark' | 'system') => {
        setColorScheme(scheme);   // persists to SQLite + calls nwColorScheme.set()
        setThemeChoice(scheme);   // updates local checkmark
    };

    const selectTerm = async (termId: string, gradeId?: string, gradeName?: string) => {
        const network = await NetInfo.fetch();
        if (!network.isConnected) {
            Alert.alert('Internet required', 'Term selection needs an internet connection.');
            return;
        }

        setSaving(true);
        try {
            await patchStudentProfile({ termId });
            await updateUser({ termId, gradeId, grade: gradeName });
        } catch {
            Alert.alert('Unable to save term', 'Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out',
                style: 'destructive',
                onPress: async () => {
                    await logout();
                    router.replace('/auth');
                },
            },
        ]);
    };

    return (
        <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900 p-6">
            <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100">Settings</Text>
            <Text className="mt-2 mb-6 text-slate-500 dark:text-slate-400">Manage your account and preferences.</Text>

            {user ? (
                <View className="mb-6 rounded-xl bg-white dark:bg-slate-800 p-4 shadow-sm">
                    <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">{user.name || 'Student'}</Text>
                    <Text className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{user.email}</Text>
                </View>
            ) : null}

            <View className="mb-6 flex-row items-center justify-between rounded-xl bg-white dark:bg-slate-800 px-4 py-3 shadow-sm">
                <View className="flex-1 pr-4">
                    <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">Auto-Download Content</Text>
                    <Text className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Automatically sync new content when notified.</Text>
                </View>
                <Switch
                    value={autoDownload}
                    onValueChange={(value) => void toggleAutoDownload(value)}
                    trackColor={{ false: '#cbd5e1', true: '#0d9488' }}
                    thumbColor="#ffffff"
                />
            </View>

            {/* Manual Sync Button */}
            <View className="mb-6 rounded-xl bg-white dark:bg-slate-800 px-4 py-3 shadow-sm">
                <TouchableOpacity
                    className="flex-row items-center justify-between"
                    activeOpacity={0.7}
                    disabled={isSyncing}
                    onPress={() => void handleManualSync()}
                >
                    <View className="flex-1 pr-4">
                        <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">Sync Content Now</Text>
                        <Text className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            {isSyncing
                                ? 'Syncing...'
                                : lastSyncedAt
                                  ? `Last synced at ${lastSyncedAt}`
                                  : 'Manually download the latest content from the server.'}
                        </Text>
                    </View>
                    {isSyncing ? (
                        <ActivityIndicator size="small" color="#0d9488" />
                    ) : (
                        <RefreshCwIcon size={20} color="#0d9488" />
                    )}
                </TouchableOpacity>
            </View>

            <Text className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Appearance</Text>

            <View className="mb-6 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
                <TouchableOpacity
                    className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700"
                    onPress={() => void handleThemeChange('light')}
                >
                    <View className="flex-row items-center">
                        <SunIcon size={20} color="#f59e0b" />
                        <Text className="ml-3 text-base text-slate-800 dark:text-slate-100">Light</Text>
                    </View>
                    {themeChoice === 'light' && <CheckIcon size={18} color="#0d9488" />}
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700"
                    onPress={() => void handleThemeChange('dark')}
                >
                    <View className="flex-row items-center">
                        <MoonIcon size={20} color="#6366f1" />
                        <Text className="ml-3 text-base text-slate-800 dark:text-slate-100">Dark</Text>
                    </View>
                    {themeChoice === 'dark' && <CheckIcon size={18} color="#0d9488" />}
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-row items-center justify-between px-4 py-3"
                    onPress={() => void handleThemeChange('system')}
                >
                    <View className="flex-row items-center">
                        <MonitorIcon size={20} color="#64748b" />
                        <Text className="ml-3 text-base text-slate-800 dark:text-slate-100">System</Text>
                    </View>
                    {themeChoice === 'system' && <CheckIcon size={18} color="#0d9488" />}
                </TouchableOpacity>
            </View>

            <Text className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Academic Term</Text>

            {loading ? (
                <Text className="text-slate-500 dark:text-slate-400">Loading terms...</Text>
            ) : (
                <TouchableOpacity
                    className="mb-6 flex-row items-center justify-between rounded-xl bg-white dark:bg-slate-800 px-4 py-3 shadow-sm"
                    onPress={() => setModalVisible(true)}
                >
                    <View className="flex-1">
                        <Text className="text-base font-semibold text-slate-800 dark:text-slate-100">Select Academic Term</Text>
                        <Text className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            {user?.termId
                                ? `${user.grade ? `${user.grade} • ` : ''}${
                                      grades
                                          .flatMap((grade) => grade.terms || [])
                                          .find((term) => term.id === user.termId)?.name || 'Selected'
                                  }`
                                : 'Tap to select year and term'}
                        </Text>
                    </View>
                    <ChevronRightIcon size={20} color="#64748b" />
                </TouchableOpacity>
            )}

            <Modal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                title="Select Academic Term"
            >
                {grades.map((grade) => (
                    <View key={grade.id} className="mb-4">
                        <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">{grade.name}</Text>
                        {grade.terms?.map((term) => (
                            <TouchableOpacity
                                key={term.id}
                                className="flex-row items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700"
                                disabled={saving}
                                onPress={() => {
                                    if (term.id) {
                                        void selectTerm(term.id, grade.id, grade.name);
                                        setModalVisible(false);
                                    }
                                }}
                            >
                                <Text className="text-slate-700 dark:text-slate-300">{term.name}</Text>
                                {user?.termId === term.id ? <CheckIcon size={18} color="#0d9488" /> : null}
                            </TouchableOpacity>
                        ))}
                    </View>
                ))}
            </Modal>

            {/* Log Out Button */}
            <View className="mt-6 mb-12">
                <TouchableOpacity
                    onPress={handleLogout}
                    activeOpacity={0.7}
                    className="flex-row items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 py-3.5 px-4 shadow-sm"
                >
                    <LogOutIcon size={18} color="#ef4444" />
                    <Text className="ml-2 text-base font-semibold text-red-600 dark:text-red-400">Log Out</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}