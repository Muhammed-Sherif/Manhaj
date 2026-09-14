import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BrowseItemCard } from './BrowseItemCard';
import { useBrowseStore } from '../../store/browseStore';
import { useRouter } from 'expo-router';
import { BookOpenIcon, HeartIcon } from 'lucide-react-native';

export const GradeListView = () => {
  const store = useBrowseStore();
  const grades = store.grades;
  const onSelectGrade = store.selectGrade;
  const router = useRouter();

  return (
    <View>

      <Text className="text-slate-800 dark:text-slate-200 font-bold text-xl mb-4">Academic Content</Text>

      {grades.map((grade, index) => (
        <BrowseItemCard
          key={grade.id ?? index}
          title={grade.name}
          description={grade.description}
          onPress={() => onSelectGrade(grade)}
        />
      ))}
      <Text className="text-slate-800 dark:text-slate-200 font-bold text-xl mb-4">religious Content</Text>
      <View className="flex-row justify-between mb-6 gap-2 space-x-4">
        <TouchableOpacity
          className="flex-1 bg-teal-600 dark:bg-teal-700 p-4 rounded-2xl items-center shadow-sm"
          onPress={() => router.push('/mushaf')}
        >
          <BookOpenIcon size={32} color="white" className="mb-2" />
          <Text className="text-white font-bold text-lg">Al-Mushaf</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 bg-amber-500 dark:bg-amber-600 p-4 rounded-2xl items-center shadow-sm"
          onPress={() => router.push('/azkar')}
        >
          <HeartIcon size={32} color="white" className="mb-2" />
          <Text className="text-white font-bold text-lg">Azkar & Duas</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
