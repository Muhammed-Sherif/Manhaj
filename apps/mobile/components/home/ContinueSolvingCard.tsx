import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpenIcon, ClockIcon } from 'lucide-react-native';

export interface ProgressItem {
  id?: string;
  subject: string;
  lecture: string;
  progress: number;
  total: number;
  lastStudied: string;
}

interface ContinueSolvingCardProps {
  item: ProgressItem;
  lectureId?: string | null;
  questionIndex?: number;
  onPress?: () => void;
}

export function ContinueSolvingCard({
  item,
  lectureId,
  questionIndex = 0,
  onPress,
}: ContinueSolvingCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    router.push({
      pathname: '/solve',
      params: {
        lectureId: lectureId ?? item.id,
        questionIndex: questionIndex.toString(),
      },
    });
  };

  const progressPercentage =
    item.total > 0
      ? Math.min(100, Math.max(0, (item.progress / item.total) * 100))
      : 0;

  return (
    <TouchableOpacity
      className="bg-teal-600 active:bg-teal-700 rounded-2xl p-5 shadow-sm shadow-teal-900/20"
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View className="flex-row items-center mb-3.5">
        <View className="bg-teal-500/80 rounded-full p-2 mr-3">
          <BookOpenIcon size={20} color="white" />
        </View>
        <View className="flex-1">
          <Text className="text-white font-bold text-lg" numberOfLines={1}>
            {item.subject}
          </Text>
          <Text className="text-teal-100 text-sm mt-0.5" numberOfLines={1}>
            {item.lecture}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <View className="bg-teal-700/80 rounded-full h-2 mb-1.5 overflow-hidden">
            <View
              className="bg-white rounded-full h-2"
              style={{ width: `${progressPercentage}%` }}
            />
          </View>
          <Text className="text-teal-100 text-xs font-medium">
            {item.progress} of {item.total} questions
          </Text>
        </View>
        <View className="flex-row items-center ml-3 bg-teal-700/40 px-2.5 py-1 rounded-full">
          <ClockIcon size={14} color="white" />
          <Text className="text-teal-100 text-xs font-medium ml-1">
            {item.lastStudied}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
