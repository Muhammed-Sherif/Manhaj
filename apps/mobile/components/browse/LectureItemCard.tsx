import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRightIcon, BookOpenIcon, FileTextIcon, VideoIcon } from 'lucide-react-native';
import type { Lecture } from '@manhaj/api-client';

export interface LectureItemCardProps {
  lecture: Lecture;
  onPress: (lecture: Lecture) => void;
}

export const LectureItemCard: React.FC<LectureItemCardProps> = ({ lecture, onPress }) => {
  return (
    <TouchableOpacity
      className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 shadow-sm"
      onPress={() => onPress(lecture)}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start">
        <View className="bg-teal-100 dark:bg-teal-900/30 rounded-lg p-2 mr-3">
          <BookOpenIcon size={20} color="#0d9488" />
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-slate-800 dark:text-slate-100">{lecture.name}</Text>
          {!!lecture.description && (
            <Text className="text-slate-500 dark:text-slate-400 text-sm mt-1">{lecture.description}</Text>
          )}
        </View>
        <ChevronRightIcon size={20} color="#94a3b8" />
      </View>
    </TouchableOpacity>
  );
};
