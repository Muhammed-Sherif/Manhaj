import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { BookOpenIcon, ClockIcon, CheckCircleIcon, FlagIcon } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Mock data - in production, this would come from local SQLite
  const recentProgress = [
    {
      id: '1',
      subject: 'Cardiology',
      lecture: 'Heart Failure',
      progress: 12,
      total: 50,
      lastStudied: '2 hours ago',
    },
    {
      id: '2',
      subject: 'Pharmacology',
      lecture: 'Antibiotics',
      progress: 8,
      total: 30,
      lastStudied: 'Yesterday',
    },
  ];

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 p-6">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-slate-800">
            Welcome back, {user?.name || 'Student'}!
          </Text>
          <Text className="text-slate-500 mt-1">Ready to continue learning?</Text>
        </View>

        {/* Continue Solving - Prominent Section */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-slate-800 mb-3">Continue Solving</Text>

          {recentProgress.length > 0 ? (
            <TouchableOpacity
              className="bg-teal-600 rounded-xl p-5 shadow-sm"
              onPress={() => router.push('/solve')}
            >
              <View className="flex-row items-center mb-3">
                <View className="bg-teal-500 rounded-full p-2 mr-3">
                  <BookOpenIcon size={20} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-lg">
                    {recentProgress[0].subject}
                  </Text>
                  <Text className="text-teal-100 text-sm">
                    {recentProgress[0].lecture}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="bg-teal-700 rounded-full h-2 mb-1">
                    <View
                      className="bg-white rounded-full h-2"
                      style={{ width: `${(recentProgress[0].progress / recentProgress[0].total) * 100}%` }}
                    />
                  </View>
                  <Text className="text-teal-100 text-xs">
                    {recentProgress[0].progress} of {recentProgress[0].total} questions
                  </Text>
                </View>
                <View className="flex-row items-center ml-3">
                  <ClockIcon size={16} color="white" />
                  <Text className="text-teal-100 text-xs ml-1">
                    {recentProgress[0].lastStudied}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="bg-slate-200 rounded-xl p-5 items-center justify-center"
              onPress={() => router.push('/browse')}
            >
              <BookOpenIcon size={32} color="#94a3b8" />
              <Text className="text-slate-500 font-semibold mt-2">Start Your First Lecture</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recent Progress */}
        {recentProgress.length > 1 && (
          <View>
            <Text className="text-lg font-semibold text-slate-800 mb-3">Recent Progress</Text>

            {recentProgress.slice(1).map((item) => (
              <TouchableOpacity
                key={item.id}
                className="bg-white rounded-xl p-4 mb-3 shadow-sm"
                onPress={() => router.push('/solve')}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="font-semibold text-slate-800">{item.subject}</Text>
                    <Text className="text-slate-500 text-sm">{item.lecture}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <CheckCircleIcon size={20} color="#0d9488" />
                    <Text className="text-teal-600 ml-1 font-semibold">
                      {item.progress}/{item.total}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View className="mt-6">
          <Text className="text-lg font-semibold text-slate-800 mb-3">Quick Actions</Text>

          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-white rounded-xl p-4 shadow-sm items-center"
              onPress={() => router.push('/browse')}
            >
              <BookOpenIcon size={24} color="#0d9488" />
              <Text className="text-slate-800 font-semibold mt-2">Browse</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-white rounded-xl p-4 shadow-sm items-center"
              onPress={() => router.push('/review')}
            >
              <FlagIcon size={24} color="#0d9488" />
              <Text className="text-slate-800 font-semibold mt-2">Review</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
