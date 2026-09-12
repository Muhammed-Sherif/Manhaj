import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CheckCircleIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { type Lecture } from '@manhaj/api-client';

export interface LectureQuestionsCardProps {
  lecture;
  onStartSolving?: () => void;
}

export const LectureQuestionsCard: React.FC<LectureQuestionsCardProps> = ({
  lecture,
  onStartSolving,
}) => {
  const router = useRouter();

  const handleSolveAll = () => {
    if (onStartSolving) {
      onStartSolving();
      return;
    }
    if (!lecture.id) return;
    router.push(`/solve?mode=solve&lectureId=${lecture.id}`);
  };

  const handleSolveUnsolved = () => {
    if (!lecture.id) return;
    router.push(`/solve?mode=unsolved&lectureId=${lecture.id}`);
  };

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100">Practice Questions</Text>
      </View>
      <View className="flex-row gap-3 items-stretch mb-3">
        <TouchableOpacity
          className="flex-1 bg-teal-600 rounded-xl p-4 items-center justify-center shadow-sm active:bg-teal-700"
          onPress={handleSolveAll}
          disabled={lecture.questions?.length === 0}
          style={{ opacity: lecture.questions?.length === 0 ? 0.6 : 1 }}
        >
          <Text className="text-white font-semibold text-base text-center">
            {lecture.questions?.length > 0
              ? `Solve All (${lecture.questions?.length} questions)`
              : 'No questions available yet'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-slate-600 dark:bg-slate-700 rounded-xl px-4 py-4 items-center justify-center shadow-sm active:bg-slate-700 dark:active:bg-slate-600"
          onPress={handleSolveUnsolved}
          disabled={lecture.questions?.length === 0}
          style={{ opacity: lecture.questions?.length === 0 ? 0.6 : 1 }}
        >
          <Text className="text-white font-semibold text-sm text-center">
            Solve Unsolved
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
