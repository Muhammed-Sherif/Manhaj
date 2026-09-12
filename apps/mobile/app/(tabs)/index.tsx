import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useProgressStore } from '../../store/progressStore';
import { BookOpenIcon, FlagIcon } from 'lucide-react-native';
import { ContinueSolvingCard, EmptyProgressCard } from '../../components/home';
import { scheduleTaskReminders } from '../../services/pushNotifications';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { lastProgress, loadProgress } = useProgressStore();

  useEffect(() => {
    loadProgress();
    scheduleTaskReminders().catch(console.error);
  }, []);

  const formatLastStudied = (timestamp: string | null) => {
    if (!timestamp) return 'Recently';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const recentProgress = lastProgress ? [
    {
      id: lastProgress.lectureId || '1',
      subject: lastProgress.subjectName || 'Unknown Subject',
      lecture: lastProgress.lectureName || 'Unknown Lecture',
      progress: lastProgress.questionIndex + 1,
      total: lastProgress.totalQuestions,
      lastStudied: formatLastStudied(lastProgress.lastStudied),
    },
  ] : [];

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView className="flex-1 p-6">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Welcome back, {user?.name || 'Student'}!
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 mt-1">Ready to continue learning?</Text>
        </View>

        {/* Continue Solving - Prominent Section */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Continue Solving</Text>

          {recentProgress.length > 0 ? (
            <ContinueSolvingCard
              item={recentProgress[0]}
              lectureId={lastProgress?.lectureId}
              questionIndex={lastProgress?.questionIndex}
            />
          ) : (
            <EmptyProgressCard />
          )}
        </View>

        {/* Quick Actions */}
        <View className="mt-6">
          <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Quick Actions</Text>

          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm items-center"
              onPress={() => router.push('/browse')}
            >
              <BookOpenIcon size={24} color="#0d9488" />
              <Text className="text-slate-800 dark:text-slate-100 font-semibold mt-2">Browse</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm items-center"
              onPress={() => router.push('/review')}
            >
              <FlagIcon size={24} color="#0d9488" />
              <Text className="text-slate-800 dark:text-slate-100 font-semibold mt-2">Errors</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm items-center"
              onPress={() => router.push('/flashcards' as any)}
            >
              <BookOpenIcon size={24} color="#0d9488" />
              <Text className="text-slate-800 dark:text-slate-100 font-semibold mt-2">SRS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
